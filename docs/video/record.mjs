// Records every scene of the walkthrough as a sequence of screen frames.
//
// Needs `npm run dev` serving the site (PICSITE_URL, default
// http://localhost:3000) and out/audio/timings.json from narrate.ps1. Each
// scene in scenes.mjs runs in a fresh 1920x1080 browser context (installed
// Chrome, headless); its steps are scheduled against the narration clock, so an
// action lands on the paragraph or sentence it belongs to. Frames come from
// the DevTools screencast (sharper than Playwright's built-in recorder) and
// are written to out/frames/sceneNN/ with their timestamps; assemble.mjs
// turns them into video.
//
//   node record.mjs            all scenes
//   node record.mjs 2 7        only scenes 2 and 7
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scenes } from './scenes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, 'out');
const BASE = process.env.PICSITE_URL || 'http://localhost:3000';
const timings = JSON.parse(readFileSync(join(OUT, 'audio', 'timings.json'), 'utf8'));
const overlay = readFileSync(join(here, 'lib', 'overlay.js'), 'utf8');
const only = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');

// The mock account the harness signs in with (repo-root .env, never printed).
function mockAccount() {
    const file = join(here, '..', '..', '.env');
    if (!existsSync(file)) throw new Error('.env not found: copy .env.example to .env (see README)');
    const env = {};
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return { username: env.PICSITE_MOCK_USERNAME, password: env.PICSITE_MOCK_PASSWORD };
}

function helpers(page, t) {
    let T0 = 0;
    let deckCount = 0;
    const late = [];
    const now = () => Date.now() / 1000 - T0;
    // 'p2' = start of paragraph 2, 's7+1.5' = 1.5 s after sentence 7 starts,
    // a number = seconds into the scene.
    const resolve = (at) => {
        if (typeof at === 'number') return at;
        const m = /^([ps])(\d+)([+-][\d.]+)?$/.exec(at);
        if (!m) throw new Error(`bad step time ${at}`);
        const base = m[1] === 'p' ? t.paragraphs[Number(m[2])] : t.sentences[Number(m[2])].start;
        if (base === undefined) throw new Error(`scene ${t.n}: no ${at}`);
        return t.voiceOffset + base + (m[3] ? parseFloat(m[3]) : 0);
    };
    const loc = (sel) => page.locator(sel).first();
    const h = {
        page,
        late,
        account: null,
        start(t0) { T0 = t0; },
        now,
        async until(at) {
            const d = resolve(at) - now();
            if (d > 0) await sleep(d * 1000);
            else if (d < -0.75) late.push(`${at} by ${(-d).toFixed(1)}s`);
        },
        async untilTime(sec) {
            const d = sec - now();
            if (d > 0) await sleep(d * 1000);
        },
        sleep,
        loc,
        async goto(path) {
            await page.goto(path, { waitUntil: 'networkidle' });
            await page.evaluate(() => document.fonts && document.fonts.ready);
            await sleep(700);
        },
        // A network blip (VPN or Wi-Fi switch) aborts in-flight module requests
        // even to localhost and leaves the page half-rendered: reload once.
        async waitFor(sel, timeout = 10000) {
            try {
                await loc(sel).waitFor({ state: 'visible', timeout });
            } catch {
                await page.reload({ waitUntil: 'networkidle' });
                await loc(sel).waitFor({ state: 'visible', timeout });
            }
        },
        async label(id, sel, html, opts = {}) {
            const el = await loc(sel).elementHandle({ timeout: 10000 });
            await page.evaluate(([i, e, x, o]) => window.__pic.label(i, e, x, o), [id, el, html, opts]);
        },
        unlabel: (id) => page.evaluate((i) => window.__pic.unlabel(i), id),
        clearLabels: () => page.evaluate(() => window.__pic.clearLabels()),
        callout: (html, opts = {}) => page.evaluate(([x, o]) => window.__pic.callout(x, o), [html, opts]),
        uncallout: () => page.evaluate(() => window.__pic.clearCallout()),
        panel: (html) => page.evaluate((x) => window.__pic.panel(x), html),
        panelStep: (n) => page.evaluate((x) => window.__pic.step(x), n),
        unpanel: () => page.evaluate(() => window.__pic.clearPanel()),
        clearAll: () => page.evaluate(() => window.__pic.clearAll()),
        cursor: (on) => page.evaluate((v) => window.__pic.cursor(v), on),
        // Smooth-scroll so the element's top sits `offset` px below the viewport top.
        async scrollTo(sel, offset = 130, ms = 1100) {
            const el = await loc(sel).elementHandle({ timeout: 10000 });
            await page.evaluate(([e, o]) => {
                const r = window.__pic.rectOf(e);
                window.scrollTo({ top: Math.max(0, r.top + window.scrollY - o), behavior: 'smooth' });
            }, [el, offset]);
            await sleep(ms);
        },
        // Eased scroll over `ms`, slower and steadier than the browser's smooth scroll.
        async glideBy(dy, ms = 1600) {
            await page.evaluate(([d, dur]) => new Promise((done) => {
                const y0 = window.scrollY;
                const t0 = performance.now();
                const frame = (now) => {
                    const k = Math.min(1, (now - t0) / dur);
                    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                    window.scrollTo(0, y0 + d * e);
                    if (k < 1) requestAnimationFrame(frame); else done();
                };
                requestAnimationFrame(frame);
            }), [dy, ms]);
        },
        async glideTo(sel, offset = 130, ms = 1600) {
            const el = await loc(sel).elementHandle({ timeout: 10000 });
            const dy = await page.evaluate(([e, o]) => window.__pic.rectOf(e).top - o, [el, offset]);
            const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight - window.scrollY);
            await h.glideBy(Math.min(dy, max), ms);
        },
        async scrollTop(ms = 1000) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
            await sleep(ms);
        },
        async scrollBy(dy, ms = 1200) {
            await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'smooth' }), dy);
            await sleep(ms);
        },
        async move(sel, { dx = 0, dy = 0, ms = 650 } = {}) {
            const box = await loc(sel).boundingBox({ timeout: 10000 });
            if (!box) throw new Error(`not visible: ${sel}`);
            await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: Math.max(8, Math.round(ms / 16)) });
        },
        async moveTo(x, y, ms = 650) {
            await page.mouse.move(x, y, { steps: Math.max(8, Math.round(ms / 16)) });
        },
        async click(sel, opts) {
            await h.move(sel, opts);
            await sleep(120);
            await page.mouse.down();
            await sleep(70);
            await page.mouse.up();
            await sleep(180);
        },
        async type(sel, text, { delay = 70 } = {}) {
            await h.click(sel);
            await page.keyboard.type(text, { delay });
        },
        // Type the first few characters visibly, then fill the rest at once:
        // keystrokes cost ~0.2 s each under screencast, which adds up on forms.
        async typeQuick(sel, text, { shown = 12, delay = 45 } = {}) {
            await h.click(sel);
            await page.keyboard.type(text.slice(0, shown), { delay });
            if (text.length > shown) await loc(sel).fill(text);
        },
        // Point at the field and set its value without clicking (a click would
        // open the native date picker).
        async fill(sel, value, { move = true } = {}) {
            if (move) await h.move(sel);
            await loc(sel).fill(value);
        },
        press: (key) => page.keyboard.press(key),
        // Slide decks (lib/slides.mjs) are written to out/slides/ and navigated to:
        // a blank page filled with setContent gets no proper screencast frames.
        async deck(html) {
            const dir = join(OUT, 'slides');
            mkdirSync(dir, { recursive: true });
            const file = join(dir, `scene${pad(t.n)}-${++deckCount}.html`);
            writeFileSync(file, html);
            await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
            await page.evaluate(() => document.fonts.ready);
            await sleep(300);
        },
        // Deck transitions run up to 0.9 s; keep frames coming until they end.
        show: (i) => page.evaluate((x) => { window.__deck.show(x); window.__pic.pump(1300); }, i),
        reveal: (n) => page.evaluate((x) => { window.__deck.step(x); window.__pic.pump(900); }, n),
        focus: (n) => page.evaluate((x) => { window.__deck.focus(x); window.__pic.pump(1400); }, n),
        pump: (ms = 900) => page.evaluate((x) => window.__pic && window.__pic.pump(x), ms).catch(() => {})
    };
    return h;
}

async function recordScene(browser, def) {
    const t = timings.scenes.find((s) => s.n === def.n);
    if (!t) throw new Error(`scene ${def.n} missing from timings.json; run narrate first`);
    const dir = join(OUT, 'frames', `scene${pad(def.n)}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, baseURL: BASE });
    if (def.signIn) {
        const res = await context.request.post(`${BASE}/api/login`, { data: mockAccount() });
        if (!res.ok()) throw new Error(`mock sign-in failed (${res.status()})`);
    }
    await context.addInitScript({ content: overlay });
    const page = await context.newPage();
    const h = helpers(page, t);
    h.account = mockAccount();
    await page.mouse.move(960, 620);
    if (def.setup) await def.setup(h);

    const cdp = await context.newCDPSession(page);
    const frames = [];
    let seq = 0;
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        const f = `f${String(++seq).padStart(6, '0')}.jpg`;
        writeFileSync(join(dir, f), Buffer.from(data, 'base64'));
        frames.push({ f, ts: metadata.timestamp, at: Date.now() / 1000 });
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    await page.evaluate(() => window.__pic && window.__pic.tick());
    await sleep(400);

    const T0 = Date.now() / 1000;
    h.start(T0);
    const failed = [];
    for (const [at, fn] of def.steps) {
        await h.until(at);
        const began = h.now();
        try {
            await fn(h);
        } catch (error) {
            failed.push(`${at}: ${error.message.split('\n')[0]}`);
        }
        // Whatever the step started (hover panel, dialog, page load) gets
        // frames until its transition settles.
        await h.pump(1000);
        if (process.env.DEBUG_STEPS) console.log(`  ${String(at).padEnd(8)} start ${began.toFixed(1)}s  took ${(h.now() - began).toFixed(1)}s`);
    }
    await h.untilTime(t.length);
    await page.evaluate(() => window.__pic && window.__pic.tick());
    await sleep(250);
    await cdp.send('Page.stopScreencast');
    await sleep(150);
    writeFileSync(join(dir, 'frames.json'), JSON.stringify({ n: def.n, t0: T0, length: t.length, frames }));
    await context.close();
    const skew = frames.length ? (frames[0].ts - frames[0].at).toFixed(3) : 'n/a';
    console.log(`scene ${pad(def.n)}  ${frames.length} frames  clock skew ${skew}s${h.late.length ? `  LATE: ${h.late.join(', ')}` : ''}`);
    for (const f of failed) console.log(`  STEP FAILED ${f}`);
}

// Installed Google Chrome, headless (no browser download). Edge refuses
// Playwright's headless launch on this machine.
const browser = await chromium.launch({ channel: process.env.PICSITE_BROWSER || 'chrome', headless: true });
try {
    for (const def of scenes) {
        if (only.length && !only.includes(def.n)) continue;
        await recordScene(browser, def);
    }
} finally {
    await browser.close();
}
