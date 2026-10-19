// Turns the recorded frames and the narration into the finished video.
//
// For each scene: the screencast frames (out/frames/sceneNN) become 30 fps
// H.264 with each frame held until the next one arrived, the narration
// (out/audio/sceneNN.wav) is placed at its lead-in, and both are cut to the
// scene length from timings.json. The scenes are joined, then chapter markers
// (same times as the chapter card) and sentence-level English captions are
// added. Outputs, all in out/:
//   PICSite-walkthrough.mp4   video with chapters and a switchable caption track
//   PICSite-walkthrough.srt   the captions as a sidecar file
//   chapters.txt              chapter list to paste into a message or channel
//
//   node assemble.mjs          all scenes
//   node assemble.mjs 2 7      re-encode only these scenes, then rebuild the whole file
//   node assemble.mjs --join   rebuild the whole file from the scenes already encoded
import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const WORK = join(OUT, 'scenes');
mkdirSync(WORK, { recursive: true });
const timings = JSON.parse(readFileSync(join(OUT, 'audio', 'timings.json'), 'utf8'));
const joinOnly = process.argv.includes('--join');
const only = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const FPS = 30;
const pad = (n) => String(n).padStart(2, '0');

function ffmpeg(args) {
    const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
    if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

// Scene length snapped to whole frames so video and audio cut identically.
const frameLen = (sec) => Math.round(sec * FPS) / FPS;

function sceneVideo(scene) {
    const dir = join(OUT, 'frames', `scene${pad(scene.n)}`);
    const meta = JSON.parse(readFileSync(join(dir, 'frames.json'), 'utf8'));
    const L = frameLen(scene.length);
    // DevTools timestamps are wall-clock seconds; fall back to arrival time
    // if a browser ever reports another clock.
    const rel = (f) => (Math.abs(f.ts - f.at) < 2 ? f.ts : f.at) - meta.t0;
    const frames = meta.frames.map((f) => ({ file: f.f, t: rel(f) })).sort((a, b) => a.t - b.t);
    if (!frames.length) throw new Error(`scene ${scene.n}: no frames recorded`);
    // The picture at t=0 is the last frame that arrived before the scene began.
    let firstIdx = frames.findLastIndex((f) => f.t <= 0);
    if (firstIdx < 0) firstIdx = 0;
    const kept = frames.slice(firstIdx).filter((f, i) => i === 0 || f.t < L);
    kept[0] = { ...kept[0], t: 0 };
    const lines = ['ffconcat version 1.0'];
    for (let i = 0; i < kept.length; i++) {
        const end = i + 1 < kept.length ? kept[i + 1].t : L;
        const d = end - kept[i].t;
        if (d <= 0.0005) continue;
        lines.push(`file '${kept[i].file}'`, `duration ${d.toFixed(4)}`);
    }
    lines.push(`file '${kept[kept.length - 1].file}'`);
    const list = join(dir, 'frames.ffconcat');
    writeFileSync(list, `${lines.join('\n')}\n`);
    const fade = 0.35;
    const out = join(WORK, `scene${pad(scene.n)}.video.mp4`);
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', list,
        '-vf', `fps=${FPS},scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p,fade=t=in:st=0:d=${fade},fade=t=out:st=${(L - fade).toFixed(3)}:d=${fade}`,
        '-t', L.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-tune', 'stillimage', '-r', String(FPS), '-an', out]);
    return out;
}

function sceneAudio(scene) {
    const L = frameLen(scene.length);
    const out = join(WORK, `scene${pad(scene.n)}.audio.m4a`);
    if (scene.audio) {
        const delay = Math.round(scene.voiceOffset * 1000);
        ffmpeg(['-i', join(OUT, 'audio', scene.audio),
            '-af', `aresample=48000,adelay=delays=${delay}:all=1,apad,afade=t=out:st=${(L - 0.3).toFixed(3)}:d=0.3`,
            '-t', L.toFixed(3), '-ac', '2', '-c:a', 'aac', '-b:a', '160k', out]);
    } else {
        ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', L.toFixed(3), '-c:a', 'aac', '-b:a', '160k', out]);
    }
    return out;
}

function buildScene(scene) {
    const v = sceneVideo(scene);
    const a = sceneAudio(scene);
    const out = join(WORK, `scene${pad(scene.n)}.mp4`);
    ffmpeg(['-i', v, '-i', a, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-t', frameLen(scene.length).toFixed(3), out]);
    console.log(`scene ${pad(scene.n)}  ${frameLen(scene.length).toFixed(2)}s`);
}

// ---------- chapters and captions on the joined timeline ----------
const fmtClock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const fmtSrt = (sec) => {
    const ms = Math.max(0, Math.round(sec * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const plainTitle = (t) => t.replace(/`/g, '');

// Starts on the joined timeline, from the frame-snapped scene lengths.
const starts = [];
{
    let clock = 0;
    for (const s of timings.scenes) {
        starts.push(clock);
        clock += frameLen(s.length);
    }
}
const total = starts[starts.length - 1] + frameLen(timings.scenes[timings.scenes.length - 1].length);

function captions() {
    const cues = [];
    timings.scenes.forEach((s, k) => {
        if (!s.sentences) return;
        for (const sen of s.sentences) {
            const words = sen.text.split(/\s+/);
            const t0 = starts[k] + s.voiceOffset + sen.start;
            const t1 = starts[k] + s.voiceOffset + sen.end;
            // At most ~12 words per cue, two lines; time shared by word count.
            const parts = Math.ceil(words.length / 12);
            const per = Math.ceil(words.length / parts);
            for (let p = 0; p < parts; p++) {
                const chunk = words.slice(p * per, (p + 1) * per);
                const a = t0 + ((t1 - t0) * (p * per)) / words.length;
                const b = t0 + ((t1 - t0) * Math.min(words.length, (p + 1) * per)) / words.length;
                const mid = Math.ceil(chunk.length / 2);
                const text = chunk.length > 6 ? `${chunk.slice(0, mid).join(' ')}\n${chunk.slice(mid).join(' ')}` : chunk.join(' ');
                cues.push({ a, b: Math.max(a + 0.8, b - 0.05), text });
            }
        }
    });
    return cues.map((c, i) => `${i + 1}\n${fmtSrt(c.a)} --> ${fmtSrt(c.b)}\n${c.text}\n`).join('\n');
}

function chaptersMeta() {
    const lines = [';FFMETADATA1', 'title=PICSite walkthrough for the Salesforce LWC team'];
    timings.scenes.forEach((s, k) => {
        if (s.n === 13) return; // the end card belongs to the last chapter
        const end = k + 1 < timings.scenes.length && timings.scenes[k + 1].n !== 13 ? starts[k + 1] : total;
        lines.push('[CHAPTER]', 'TIMEBASE=1/1000', `START=${Math.round(starts[k] * 1000)}`, `END=${Math.round(end * 1000)}`, `title=${plainTitle(s.title)}`);
    });
    return `${lines.join('\n')}\n`;
}

for (const s of timings.scenes) {
    if (joinOnly || (only.length && !only.includes(s.n))) continue;
    buildScene(s);
}

const missing = timings.scenes.filter((s) => !existsSync(join(WORK, `scene${pad(s.n)}.mp4`)));
if (missing.length) {
    console.log(`not joining yet: scenes ${missing.map((s) => s.n).join(', ')} are not built`);
    process.exit(0);
}

writeFileSync(join(WORK, 'scenes.ffconcat'), `ffconcat version 1.0\n${timings.scenes.map((s) => `file 'scene${pad(s.n)}.mp4'`).join('\n')}\n`);
ffmpeg(['-f', 'concat', '-safe', '0', '-i', join(WORK, 'scenes.ffconcat'), '-c', 'copy', join(WORK, 'joined.mp4')]);
writeFileSync(join(OUT, 'PICSite-walkthrough.srt'), captions());
writeFileSync(join(WORK, 'chapters.ffmeta'), chaptersMeta());
ffmpeg(['-i', join(WORK, 'joined.mp4'), '-i', join(WORK, 'chapters.ffmeta'), '-i', join(OUT, 'PICSite-walkthrough.srt'),
    '-map', '0:v', '-map', '0:a', '-map', '2:s', '-map_metadata', '1', '-map_chapters', '1',
    // The offline voice comes out around -24 dB; lift it for laptop speakers,
    // with a limiter so peaks never clip.
    '-c:v', 'copy', '-af', 'volume=5dB,alimiter=limit=0.89:level=false', '-c:a', 'aac', '-b:a', '160k', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-metadata:s:s:0', 'title=English',
    '-movflags', '+faststart', join(OUT, 'PICSite-walkthrough.mp4')]);

const chapterList = timings.scenes.filter((s) => s.n !== 13).map((s) => `${fmtClock(starts[timings.scenes.indexOf(s)])} ${plainTitle(s.title)}`);
writeFileSync(join(OUT, 'chapters.txt'), `PICSite walkthrough (${fmtClock(total)})\n\n${chapterList.join('\n')}\n`);
console.log(`\nout/PICSite-walkthrough.mp4  ${fmtClock(total)}\n${chapterList.join('\n')}`);
