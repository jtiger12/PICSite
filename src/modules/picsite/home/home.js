import { LightningElement } from 'lwc';

// The header and footer link to /#how-it-works, but the section sits in this
// component's shadow root, where the browser's own #fragment scrolling can't
// reach it. Scroll to it here: on load, and when the hash changes on this page.
// (In Builder the anchor is the page section's ID instead; see the docs.)
export default class Home extends LightningElement {
    handledInitialHash = false;
    onHashChange = () => this.scrollToHash('smooth');

    connectedCallback() {
        // Also runs during the static build, where there is no window.
        if (typeof window !== 'undefined') window.addEventListener('hashchange', this.onHashChange);
    }

    disconnectedCallback() {
        if (typeof window !== 'undefined') window.removeEventListener('hashchange', this.onHashChange);
    }

    renderedCallback() {
        if (this.handledInitialHash) return;
        this.handledInitialHash = true;
        // Ranges and events above the section load asynchronously and push it
        // down, so scroll now and once more after they render, unless the
        // visitor has scrolled in the meantime.
        const top = this.scrollToHash('auto');
        if (top !== undefined) {
            setTimeout(() => {
                if (Math.abs(window.scrollY - top) < 2) this.scrollToHash('auto');
            }, 600);
        }
    }

    scrollToHash(behavior) {
        const id = decodeURIComponent(window.location.hash.slice(1));
        const target = id && this.template.querySelector(`#${CSS.escape(id)}`);
        if (!target) return undefined;
        target.scrollIntoView({ behavior, block: 'start' });
        return window.scrollY;
    }
}
