// Injected into every recorded page (Playwright addInitScript). Draws the
// video's annotations on top of the site without touching it: component
// labels that track their element through scrolling, a callout box, a
// centered panel, and a visible mouse cursor (headless recordings have none).
// Everything lives in one fixed, click-through layer on <html>.
(() => {
    if (window.__pic) return;

    const CSS = `
        #__pic_layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; }
        .pic-box { position: fixed; border: 2px solid #ffcc01; border-radius: 10px;
            box-shadow: 0 0 0 4px rgba(255, 204, 1, 0.18), 0 0 24px rgba(255, 204, 1, 0.25);
            opacity: 0; transition: opacity 260ms ease; }
        .pic-tag { position: fixed; padding: 5px 12px; border-radius: 8px; background: #ffcc01; color: #111;
            font: 600 17px/1.25 'Cascadia Mono', Consolas, 'Courier New', monospace; white-space: nowrap;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45); opacity: 0; transition: opacity 260ms ease; }
        .pic-tag small { font: 500 14px/1 'Inter', 'Segoe UI', sans-serif; opacity: 0.75; margin-left: 8px; }
        .pic-on { opacity: 1; }
        .pic-callout { position: fixed; right: 48px; bottom: 48px; max-width: 720px; padding: 18px 24px;
            border-radius: 14px; background: rgba(17, 19, 23, 0.94); border: 1px solid rgba(255, 255, 255, 0.16);
            border-left: 5px solid #ffcc01; color: #fff; font: 500 21px/1.45 'Inter', 'Segoe UI', sans-serif;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55); opacity: 0; transform: translateY(10px);
            transition: opacity 260ms ease, transform 260ms ease; }
        .pic-callout.pic-on { opacity: 1; transform: none; }
        .pic-callout code, .pic-panel code { font: 600 0.92em 'Cascadia Mono', Consolas, monospace; color: #ffcc01; }
        .pic-shade { position: fixed; inset: 0; background: rgba(8, 9, 11, 0.62); opacity: 0; transition: opacity 300ms ease; }
        .pic-panel { position: fixed; left: 50%; top: 50%; width: 1080px; max-height: 860px; overflow: hidden;
            transform: translate(-50%, -46%); padding: 44px 52px; border-radius: 22px; background: #1b1e23;
            border: 1px solid rgba(255, 255, 255, 0.14); color: #fff; font: 400 24px/1.5 'Inter', 'Segoe UI', sans-serif;
            box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6); opacity: 0; transition: opacity 300ms ease, transform 300ms ease; }
        .pic-panel.pic-on { opacity: 1; transform: translate(-50%, -50%); }
        .pic-panel h3 { margin: 0 0 22px; font: 800 34px/1.2 'Inter', 'Segoe UI', sans-serif; }
        .pic-panel .eyebrow { margin: 0 0 10px; color: #ffcc01; font: 700 16px/1 'Inter', sans-serif; letter-spacing: 0.2em; text-transform: uppercase; }
        .pic-panel ol, .pic-panel ul { margin: 0; padding-left: 1.3em; }
        .pic-panel li { margin: 0 0 12px; }
        .pic-panel table { width: 100%; border-collapse: collapse; }
        .pic-panel td, .pic-panel th { padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.12); text-align: left; }
        .pic-panel th { color: #aeb4bc; font-size: 17px; letter-spacing: 0.12em; text-transform: uppercase; }
        .pic-cursor { position: fixed; left: 0; top: 0; width: 30px; height: 30px; margin: -3px 0 0 -4px;
            transition: transform 40ms linear; filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6)); }
        .pic-ripple { position: fixed; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
            border: 3px solid #ffcc01; animation: pic-ripple 520ms ease-out forwards; }
        @keyframes pic-ripple { from { transform: scale(0.4); opacity: 1; } to { transform: scale(3.2); opacity: 0; } }
    `;

    let layer = null;
    let beat = null;
    const labels = new Map();
    let callout = null;
    let shade = null;
    let panel = null;
    let cursor = null;

    function ensureLayer() {
        if (layer && layer.isConnected) return layer;
        layer = document.createElement('div');
        layer.id = '__pic_layer';
        const style = document.createElement('style');
        style.textContent = CSS;
        layer.appendChild(style);
        (document.documentElement || document).appendChild(layer);
        cursor = document.createElement('div');
        cursor.className = 'pic-cursor';
        cursor.innerHTML =
            '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2 L4 19 L8.6 14.8 L11.6 21.6 L14.6 20.3 L11.7 13.6 L18 13.6 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
        cursor.style.transform = `translate(${lastX}px, ${lastY}px)`;
        layer.appendChild(cursor);
        // An invisible 2px dot repainted on demand: the DevTools screencast only
        // sends a frame when something repaints, and the last steps of a CSS
        // transition can otherwise go missing from the recording.
        beat = document.createElement('div');
        Object.assign(beat.style, { position: 'fixed', right: '0', bottom: '0', width: '2px', height: '2px', background: 'rgba(0,0,0,0.01)' });
        layer.appendChild(beat);
        return layer;
    }

    let pumpUntil = 0;
    let pumping = false;
    const flip = () => { beat.style.background = beat.style.background === 'rgba(0, 0, 0, 0.01)' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.01)'; };
    function pump(ms = 900) {
        ensureLayer();
        pumpUntil = Math.max(pumpUntil, performance.now() + ms);
        if (pumping) return;
        pumping = true;
        const frame = () => {
            flip();
            if (performance.now() < pumpUntil) requestAnimationFrame(frame);
            else pumping = false;
        };
        requestAnimationFrame(frame);
    }
    // Baseline: at least two frames a second whatever happens.
    setInterval(() => { if (beat) flip(); }, 500);

    let lastX = 960;
    let lastY = 620;
    window.addEventListener('mousemove', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
        ensureLayer();
        cursor.style.transform = `translate(${lastX}px, ${lastY}px)`;
    }, true);
    window.addEventListener('mousedown', (e) => {
        ensureLayer();
        const r = document.createElement('div');
        r.className = 'pic-ripple';
        r.style.left = `${e.clientX}px`;
        r.style.top = `${e.clientY}px`;
        layer.appendChild(r);
        setTimeout(() => r.remove(), 600);
    }, true);

    // LWC hosts are inline elements around block content and can report a
    // zero-height box; fall back to the union of what they render.
    function rectOf(el) {
        let r = el.getBoundingClientRect();
        if ((r.height < 2 || r.width < 2) && el.shadowRoot) {
            const kids = [...el.shadowRoot.children].filter((k) => k.tagName !== 'STYLE');
            const rs = kids.map((k) => k.getBoundingClientRect()).filter((x) => x.width > 0 && x.height > 0);
            if (rs.length) {
                const left = Math.min(...rs.map((x) => x.left));
                const top = Math.min(...rs.map((x) => x.top));
                const right = Math.max(...rs.map((x) => x.right));
                const bottom = Math.max(...rs.map((x) => x.bottom));
                r = { left, top, right, bottom, width: right - left, height: bottom - top };
            }
        }
        return r;
    }

    function place(entry) {
        const r = rectOf(entry.el);
        const pad = entry.pad;
        const visible = r.bottom > 0 && r.top < innerHeight && r.width > 0;
        entry.box.style.left = `${r.left - pad}px`;
        entry.box.style.top = `${r.top - pad}px`;
        entry.box.style.width = `${r.width + pad * 2}px`;
        entry.box.style.height = `${r.height + pad * 2}px`;
        const tagH = 36;
        let tx = Math.max(12, Math.min(r.left - pad, innerWidth - entry.tag.offsetWidth - 12));
        let ty = r.top - pad - tagH - 6;
        if (entry.pos === 'inside' || (entry.pos === 'above' && ty < 84)) ty = Math.max(r.top - pad + 10, 84);
        if (entry.pos === 'below') ty = r.bottom + pad + 8;
        if (entry.pos === 'right') {
            tx = Math.min(r.right + pad + 12, innerWidth - entry.tag.offsetWidth - 12);
            ty = Math.max(r.top, 84);
        }
        if (entry.pos === 'inside-right') {
            tx = r.right - pad - entry.tag.offsetWidth - 16;
            ty = r.top + Math.max(0, (r.height - tagH) / 2);
        }
        entry.tag.style.left = `${tx}px`;
        entry.tag.style.top = `${ty}px`;
        entry.box.style.visibility = entry.tag.style.visibility = visible ? 'visible' : 'hidden';
        entry.box.style.display = entry.noBox ? 'none' : 'block';
    }

    function loop() {
        for (const entry of labels.values()) {
            if (entry.el.isConnected) place(entry);
        }
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function fadeOut(node) {
        if (!node) return;
        node.classList.remove('pic-on');
        setTimeout(() => node.remove(), 320);
    }

    window.__pic = {
        rectOf,
        pump,
        label(id, el, html, opts = {}) {
            ensureLayer();
            this.unlabel(id);
            const box = document.createElement('div');
            box.className = 'pic-box';
            const tag = document.createElement('div');
            tag.className = 'pic-tag';
            tag.innerHTML = html;
            layer.appendChild(box);
            layer.appendChild(tag);
            const entry = { el, box, tag, pad: opts.pad ?? 6, pos: opts.pos || 'above', noBox: Boolean(opts.noBox) };
            labels.set(id, entry);
            place(entry);
            requestAnimationFrame(() => { box.classList.add('pic-on'); tag.classList.add('pic-on'); });
            pump();
        },
        unlabel(id) {
            const entry = labels.get(id);
            if (!entry) return;
            labels.delete(id);
            fadeOut(entry.box);
            fadeOut(entry.tag);
            pump();
        },
        clearLabels() {
            for (const id of [...labels.keys()]) this.unlabel(id);
        },
        callout(html, opts = {}) {
            ensureLayer();
            fadeOut(callout);
            callout = document.createElement('div');
            callout.className = 'pic-callout';
            callout.innerHTML = html;
            if (opts.left) { callout.style.left = '48px'; callout.style.right = 'auto'; }
            if (opts.top) { callout.style.top = '110px'; callout.style.bottom = 'auto'; }
            layer.appendChild(callout);
            requestAnimationFrame(() => callout.classList.add('pic-on'));
            pump();
        },
        clearCallout() {
            fadeOut(callout);
            callout = null;
            pump();
        },
        panel(html) {
            ensureLayer();
            this.clearPanel();
            shade = document.createElement('div');
            shade.className = 'pic-shade';
            panel = document.createElement('div');
            panel.className = 'pic-panel';
            panel.innerHTML = html;
            layer.insertBefore(shade, cursor);
            layer.insertBefore(panel, cursor);
            requestAnimationFrame(() => { shade.style.opacity = '1'; panel.classList.add('pic-on'); });
            pump();
        },
        // Reveal list items / rows in the panel one at a time: data-step="n".
        step(n) {
            if (!panel) return;
            panel.querySelectorAll('[data-step]').forEach((x) => {
                x.style.transition = 'opacity 300ms ease';
                x.style.opacity = Number(x.dataset.step) <= n ? '1' : '0.12';
            });
            pump();
        },
        clearPanel() {
            if (shade) { const s = shade; s.style.opacity = '0'; setTimeout(() => s.remove(), 320); }
            fadeOut(panel);
            shade = panel = null;
            pump();
        },
        clearAll() {
            this.clearLabels();
            this.clearCallout();
            this.clearPanel();
        },
        cursor(visible) {
            ensureLayer();
            cursor.style.display = visible ? 'block' : 'none';
        },
        // Nudge a repaint so the screencast has a fresh frame.
        tick() {
            ensureLayer();
            cursor.style.transform = `translate(${lastX}px, ${lastY}px)`;
            layer.style.outline = layer.style.outline ? '' : '0px solid transparent';
        }
    };
})();
