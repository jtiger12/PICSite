// Slide decks for the non-browser parts of the video: title and chapter
// cards, diagrams, checklists and code views. A deck is one HTML page holding
// several slides; record.mjs switches slides (crossfade) and reveals items
// with window.__deck.show(i) / step(n) / focus(n), so nothing flashes between
// slides the way a page load would.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REPO = join(new URL('../../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const STAR = `data:image/png;base64,${readFileSync(join(REPO, 'src/assets/img/army-logo-dark.png')).toString('base64')}`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #16181c;
    color: rgba(255, 255, 255, 0.92); font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
body::before { content: ''; position: fixed; inset: 0;
    background: radial-gradient(1200px 700px at 88% -12%, rgba(255, 204, 1, 0.10), transparent 60%),
                radial-gradient(900px 600px at -8% 112%, rgba(115, 179, 231, 0.07), transparent 60%); }
.slide { position: absolute; inset: 0; padding: 104px 140px 90px; box-sizing: border-box; display: flex;
    flex-direction: column; opacity: 0; transition: opacity 450ms ease; }
.slide.on { opacity: 1; }
.eyebrow { display: inline-flex; align-items: center; gap: 14px; margin: 0 0 18px; color: #ffcc01;
    font-weight: 700; font-size: 20px; letter-spacing: 0.22em; text-transform: uppercase; }
.eyebrow::before { content: ''; width: 4px; height: 1.1em; background: #ffcc01; }
h1 { margin: 0 0 22px; font-size: 76px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }
h2 { margin: 0 0 34px; font-size: 50px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.12; }
h3 { margin: 0 0 12px; font-size: 27px; font-weight: 700; }
p { margin: 0; }
.lead { font-size: 30px; line-height: 1.45; color: #aeb4bc; max-width: 62ch; }
.muted { color: #aeb4bc; }
.gold { color: #ffcc01; }
code, .mono { font-family: 'Cascadia Mono', Consolas, 'Courier New', monospace; }
code { color: #ffcc01; font-size: 0.92em; }
.card { background: #212429; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 28px 32px; box-sizing: border-box; }
.card--gold { border-color: rgba(255, 204, 1, 0.55); box-shadow: 0 0 0 1px rgba(255, 204, 1, 0.15) inset; }
.grid { display: grid; gap: 26px; }
.cols-2 { grid-template-columns: 1fr 1fr; }
.cols-3 { grid-template-columns: repeat(3, 1fr); }
.cols-4 { grid-template-columns: repeat(4, 1fr); }
[data-step] { transition: opacity 380ms ease, transform 380ms ease; }
[data-step].hidden { opacity: 0; transform: translateY(10px); }
ul.list, ol.list { margin: 0; padding: 0; list-style: none; display: grid; gap: 18px; font-size: 28px; line-height: 1.4; }
ol.list { counter-reset: n; }
ol.list > li { counter-increment: n; display: grid; grid-template-columns: 54px 1fr; align-items: start; }
ol.list > li::before { content: counter(n); display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 50%; background: #ffcc01; color: #111; font-weight: 800; font-size: 21px; margin-top: 2px; }
ul.list > li { display: grid; grid-template-columns: 44px 1fr; }
ul.list > li::before { content: '✓'; color: #4ade80; font-weight: 800; }
ul.list.todo > li::before { content: '□'; color: #ffcc01; font-weight: 700; }
.small { font-size: 22px; }
table.t { width: 100%; border-collapse: collapse; font-size: 25px; }
table.t th { text-align: left; padding: 14px 18px; color: #aeb4bc; font-size: 17px; letter-spacing: 0.14em; text-transform: uppercase;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18); }
table.t td { padding: 16px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.10); vertical-align: top; }
.pill { display: inline-block; padding: 6px 14px; border-radius: 999px; background: rgba(255, 204, 1, 0.14);
    border: 1px solid rgba(255, 204, 1, 0.45); font-size: 20px; font-weight: 600; }
.arrow { color: #ffcc01; font-size: 40px; text-align: center; align-self: center; }
.term { background: #0d0f12; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 16px; padding: 30px 36px;
    font: 500 30px/1.7 'Cascadia Mono', Consolas, monospace; }
.term .p { color: #4ade80; }
.term .c { color: #6b7079; }

/* code viewer */
.code { flex: 1; min-height: 0; display: flex; flex-direction: column; border-radius: 18px; overflow: hidden;
    background: #0f1114; border: 1px solid rgba(255, 255, 255, 0.14); }
.code-head { display: flex; align-items: center; gap: 12px; padding: 16px 24px; background: #1b1e23;
    border-bottom: 1px solid rgba(255, 255, 255, 0.10); font: 600 21px 'Cascadia Mono', Consolas, monospace; color: #aeb4bc; }
.code-head i { width: 13px; height: 13px; border-radius: 50%; background: #3a3e45; display: inline-block; }
.code-head span { margin-left: 10px; color: #fff; }
.code-view { position: relative; flex: 1; overflow: hidden; }
.code-lines { position: absolute; left: 0; right: 0; top: 0; padding: 18px 0; transition: transform 900ms cubic-bezier(.3,.7,.2,1);
    font: 400 22px/34px 'Cascadia Mono', Consolas, monospace; white-space: pre; }
.ln { display: grid; grid-template-columns: 74px 1fr; padding-right: 30px; transition: opacity 400ms ease, background 400ms ease; }
.ln .no { color: #4b5058; text-align: right; padding-right: 22px; user-select: none; }
.ln.dim { opacity: 0.35; }
.ln.hl { background: rgba(255, 204, 1, 0.09); box-shadow: inset 4px 0 0 #ffcc01; }
.code-note { margin-top: 22px; font-size: 27px; color: #aeb4bc; min-height: 40px; transition: opacity 300ms ease; }
.tk-c { color: #6b7d6a; font-style: italic; }
.tk-s { color: #a5d6a7; }
.tk-k { color: #82b1ff; }
.tk-d { color: #ffcc01; }
.tk-p { color: #f8bbd0; }
`;

const SCRIPT = `
window.__deck = (() => {
    const slides = [...document.querySelectorAll('.slide')];
    let cur = -1;
    function show(i) {
        slides.forEach((s, k) => s.classList.toggle('on', k === i));
        cur = i;
        step(0);
        if (slides[i] && slides[i].dataset.focus) focus(0);
    }
    function step(n) {
        const s = slides[cur];
        if (!s) return;
        s.querySelectorAll('[data-step]').forEach((el) => el.classList.toggle('hidden', Number(el.dataset.step) > n));
    }
    function focus(n) {
        const s = slides[cur];
        if (!s || !s.dataset.focus) return;
        const spec = JSON.parse(s.dataset.focus)[n];
        if (!spec) return;
        const lines = [...s.querySelectorAll('.ln')];
        lines.forEach((ln) => {
            const no = Number(ln.dataset.l);
            const on = no >= spec.from && no <= spec.to;
            ln.classList.toggle('hl', on);
            ln.classList.toggle('dim', !on);
        });
        const view = s.querySelector('.code-view');
        const lh = 34;
        // Centre the focus; if it is taller than the view, show its first lines.
        const tall = (spec.to - spec.from + 3) * lh > view.clientHeight;
        const want = tall ? (spec.from - 3) * lh + 18 : ((spec.from + spec.to) / 2 - 1) * lh + 18 - view.clientHeight / 2 + lh / 2;
        const y = Math.max(0, Math.min(want, lines.length * lh + 36 - view.clientHeight));
        s.querySelector('.code-lines').style.transform = 'translateY(' + (-y) + 'px)';
        const note = s.querySelector('.code-note');
        if (note) note.innerHTML = spec.note || '';
    }
    return { show, step, focus };
})();
`;

export function deck(slides) {
    return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${slides.join('\n')}<script>${SCRIPT}</script></body></html>`;
}

// ---------- slide builders ----------

export function titleSlide() {
    return `<section class="slide" style="justify-content:center;align-items:flex-start">
        <img src="${STAR}" style="height:150px;object-fit:cover;object-position:top;width:122px;margin-bottom:46px" alt="">
        <p class="eyebrow">Walkthrough for the Salesforce LWC team</p>
        <h1 style="font-size:96px">PICSite: Test on Army Ranges</h1>
        <p class="lead">Pages, components, data, automation and deployment for the Experience Cloud (LWR) build.</p>
    </section>`;
}

const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function chaptersSlide(timings) {
    const at = (n) => fmt(timings.scenes.find((s) => s.n === n).start);
    const row = (n, name, extra = '') => `<div style="display:grid;grid-template-columns:96px 1fr;gap:10px;align-items:baseline">
        <span class="mono gold" style="font-size:25px">${at(n)}</span><span style="font-size:27px">${name}${extra}</span></div>`;
    return `<section class="slide">
        <p class="eyebrow">Chapters</p>
        <h2 style="margin-bottom:30px">Jump to what you need</h2>
        <div class="grid" style="grid-template-columns:1.05fr 1fr;gap:30px;flex:1">
            <div class="card" style="display:grid;gap:16px;align-content:start">
                <p class="muted" style="font-size:19px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Everyone</p>
                ${row(1, 'Introduction')}
                <p style="font-size:24px;margin:8px 0 2px"><b>Page tour</b> <span class="muted">· what each page does, its components, data and Builder setup</span></p>
                ${row(2, 'Home')}${row(3, 'Ranges')}${row(4, 'Request an account')}${row(5, 'Sign in')}${row(6, 'Submit a test request')}${row(7, 'Track requests')}
            </div>
            <div style="display:grid;gap:26px;align-content:start">
                <div class="card card--gold" style="display:grid;gap:14px">
                    <p class="gold" style="font-size:19px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">LWC developers</p>
                    ${row(8, 'How the code fits together')}
                </div>
                <div class="card" style="display:grid;gap:14px">
                    <p class="muted" style="font-size:19px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Admins · whoever sets up the org</p>
                    ${row(9, 'Salesforce data and automation')}${row(10, 'Deploying to Experience Cloud')}
                </div>
                <div class="card" style="display:grid;gap:14px">
                    <p class="muted" style="font-size:19px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Everyone</p>
                    ${row(11, 'Preview only vs. the org')}${row(12, 'Before launch')}
                </div>
            </div>
        </div>
    </section>`;
}

export function endSlide() {
    return `<section class="slide" style="justify-content:center;align-items:center;text-align:center">
        <img src="${STAR}" style="height:120px;object-fit:cover;object-position:top;width:98px;margin-bottom:36px" alt="">
        <h1 style="font-size:64px">PICSite</h1>
        <p class="lead" style="max-width:none">web.git.mil/atec/PICSite</p>
        <p class="lead" style="max-width:none;margin-top:10px"><code>docs/EXPERIENCE_CLOUD.md</code> · <code>README.md</code></p>
    </section>`;
}

// A free-form slide: eyebrow, heading and body HTML.
export function slide(eyebrow, heading, body, style = '') {
    return `<section class="slide" style="${style}">
        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
        ${heading ? `<h2>${heading}</h2>` : ''}
        ${body}
    </section>`;
}

// ---------- code viewer ----------

function highlight(src, lang) {
    const out = [];
    const re = lang === 'css'
        ? /(\/\*[\s\S]*?\*\/)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|(--[\w-]+)|(@import|:root)/g
        : /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(@\w+)|\b(import|export|from|const|let|var|function|return|class|extends|async|await|if|else|new|default|static|get|set|query|uiapi)\b/g;
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
        out.push(esc(src.slice(last, m.index)));
        const cls = m[1] ? 'tk-c' : m[2] ? 'tk-s' : m[3] ? (lang === 'css' ? 'tk-p' : 'tk-d') : 'tk-k';
        out.push(m[0].split('\n').map((part) => `<span class="${cls}">${esc(part)}</span>`).join('\n'));
        last = m.index + m[0].length;
    }
    out.push(esc(src.slice(last)));
    return out.join('');
}

// file: repo-relative path. focuses: [{ find, lines, note }] - the focus
// starts at the first line containing `find` and spans `lines` lines.
export function codeSlide(file, focuses, opts = {}) {
    const src = readFileSync(join(REPO, file), 'utf8').replace(/\r\n/g, '\n').replace(/\t/g, '    ');
    const lang = file.endsWith('.css') ? 'css' : 'js';
    const rawLines = src.split('\n');
    const spec = focuses.map((f) => {
        const idx = rawLines.findIndex((l) => l.includes(f.find));
        if (idx < 0) throw new Error(`codeSlide: "${f.find}" not found in ${file}`);
        return { from: idx + 1, to: idx + (f.lines || 1), note: f.note || '' };
    });
    const lines = highlight(src, lang).split('\n');
    const body = lines.map((l, i) => `<div class="ln" data-l="${i + 1}"><span class="no">${i + 1}</span><span>${l || ' '}</span></div>`).join('');
    return `<section class="slide" data-focus='${JSON.stringify(spec).replace(/'/g, '&#39;')}' style="padding:80px 120px 70px">
        ${opts.eyebrow ? `<p class="eyebrow">${opts.eyebrow}</p>` : ''}
        <div class="code">
            <div class="code-head"><i></i><i></i><i></i><span>${esc(file)}</span></div>
            <div class="code-view"><div class="code-lines">${body}</div></div>
        </div>
        <p class="code-note"></p>
    </section>`;
}
