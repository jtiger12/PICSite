# PICSite walkthrough video

A narrated, chaptered walkthrough of PICSite for the team building it in
Salesforce (LWC on an Experience Cloud LWR site): about 23 minutes. It covers
each page (components, data, Builder setup), the code, the data model and
automation, and deployment.

Everything here regenerates the video from [script.md](script.md), offline:
the narration is Windows text-to-speech, the picture is a scripted headless
browser driving the local preview, and ffmpeg assembles the result. Nothing
is sent to an outside service.

## Output (git-ignored, in `out/`)

| File | What it is |
|---|---|
| `PICSite-walkthrough.mp4` | 1080p video with chapter markers and a switchable English caption track |
| `PICSite-walkthrough.srt` | The captions as a sidecar file |
| `chapters.txt` | Chapter list with start times, to paste into a message or channel |

The video opens with a chapter card (each section's start time and who it's
for). The same times are the MP4's chapter markers, so players that show
chapters let viewers jump straight to a section.

## Rebuild

Needs Windows with PowerShell 7 (`pwsh`), Node 22+, Google Chrome, and the
site's `.env` (the mock account the recording signs in with).

1. Start the site from the repo root: `npm run dev` (http://localhost:3000).
2. Here, once: `npm install` (Playwright, which drives the installed Chrome,
   and a static ffmpeg build).
3. `npm run build`, or the steps one at a time:
   - `npm run narrate`: reads `script.md` and writes `out/audio/sceneNN.wav`
     plus `out/audio/timings.json` (when every sentence starts; scene lengths
     and chapter times come from it).
   - `npm run record`: plays each scene in real time (about 25 minutes) and
     saves frames to `out/frames/`. `node record.mjs 2 7` re-records only
     scenes 2 and 7.
   - `npm run assemble`: encodes the scenes and joins them with chapters and
     captions. `node assemble.mjs 2 7` re-encodes only those scenes, then
     rebuilds the full file.

The full build keeps about 3 GB of frames in `out/frames/`; delete that folder
once the MP4 is final.

## Changing the video

| To change | Edit | Then run |
|---|---|---|
| What is said | the narration (`> ` lines) in `script.md` | narrate, record, assemble |
| How a word is pronounced | the Pronunciation table in `script.md` | narrate, record, assemble |
| What happens on screen | the scene's steps in `scenes.mjs` | record that scene, assemble |
| Slides, diagrams, code views | the decks in `scenes.mjs`, styles in `lib/slides.mjs` | record that scene, assemble |
| Labels, callouts, cursor | `lib/overlay.js` | record, assemble |

Steps in `scenes.mjs` are timed against the narration: `'p2'` is when
paragraph 2 starts, `'s7+1.5'` is 1.5 s after sentence 7 starts (both
0-based), a number is seconds into the scene. If the narration changes, the
steps move with it. `DEBUG_STEPS=1 node record.mjs 7` prints when each step
ran and how long it took.

## Files

| File | Role |
|---|---|
| `script.md` | Narration, shot lists, pronunciation and running order (the source of truth) |
| `narrate.ps1` | Offline text-to-speech with sentence timings (Microsoft Mark, rate −1) |
| `scenes.mjs` | On-screen actions per scene, slide decks |
| `record.mjs` | Headless Chrome at 1920×1080; DevTools screencast frames |
| `assemble.mjs` | ffmpeg: scene encodes, join, chapters, captions |
| `lib/overlay.js` | Labels, callouts, panels and cursor drawn over the recorded page |
| `lib/slides.mjs` | Title, chapter, diagram, checklist and code-view slides |
