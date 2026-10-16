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
    // The official Army logo file, unaltered: the harness serves
    // src/assets/img/army-logo-dark.png (the reverse logo for dark
    // backgrounds); in Builder point it at a static resource.
    @api logoUrl = '/assets/img/army-logo-dark.png';
    logoFailed = false;
    menuOpen = false;
    path = '/';

    connectedCallback() {
        this.path = typeof window !== 'undefined' ? window.location.pathname : '/';
    }

    get links() {
        return LINKS.map((l) => {
            const url = href(l.href);
            const current = this.isCurrent(url);
            return { ...l, href: url, current: current ? 'page' : null, cls: current ? 'link link--current' : 'link' };
        });
    }

    isCurrent(url) {
        return url === this.path || `${url}/` === this.path;
    }

    // A missing or broken logo file leaves the title on its own rather than
    // a broken-image icon.
    get showLogo() {
        return Boolean(this.logoUrl) && !this.logoFailed;
    }

    hideLogo() {
        this.logoFailed = true;
    }

    get homeHref() {
        return href('/');
    }

    get loginHref() {
        return href('/login');
    }

    get loginCurrent() {
        return this.isCurrent(this.loginHref) ? 'page' : null;
    }

    get requestAccountHref() {
        return href('/request-account');
    }

    get requestAccountCurrent() {
        return this.isCurrent(this.requestAccountHref) ? 'page' : null;
    }

    get navClass() {
        return this.menuOpen ? 'nav nav--open' : 'nav';
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
    }
}
