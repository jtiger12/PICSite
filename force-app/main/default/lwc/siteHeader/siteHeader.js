import { LightningElement, api } from 'lwc';
import { href } from 'c/portalApi';

const LINKS = [
    { label: 'Ranges', href: '/ranges' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Request a test', href: '/request' },
    { label: 'Track requests', href: '/track' }
];

export default class SiteHeader extends LightningElement {
    @api siteTitle = 'Test on Army Ranges';
    menuOpen = false;
    path = '/';

    connectedCallback() {
        this.path = typeof window !== 'undefined' ? window.location.pathname : '/';
    }

    get links() {
        return LINKS.map((l) => {
            const url = href(l.href);
            const current = url === this.path || `${url}/` === this.path;
            return { ...l, href: url, current: current ? 'page' : null, cls: current ? 'link link--current' : 'link' };
        });
    }

    get homeHref() {
        return href('/');
    }

    get loginHref() {
        return href('/login');
    }

    get requestAccountHref() {
        return href('/login#request-account');
    }

    get navClass() {
        return this.menuOpen ? 'nav nav--open' : 'nav';
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }
}
