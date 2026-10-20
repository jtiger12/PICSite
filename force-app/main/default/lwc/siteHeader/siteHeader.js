import { LightningElement, api } from 'lwc';
import { href, getSession, signOut, BRAND } from 'c/portalApi';

// Top-level entries; one with `children` renders as a dropdown (hover or the
// caret button on desktop, inline links in the mobile menu).
const LINKS = [
    {
        label: 'Ranges',
        href: '/ranges',
        children: [
            { label: 'Range capabilities', href: '/ranges' },
            { label: 'Range availability', href: '/availability' }
        ]
    },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Request a test', href: '/request' },
    { label: 'Track requests', href: '/track' }
];

export default class SiteHeader extends LightningElement {
    @api siteTitle = 'Test on Army Ranges';
    // The official Army logo file, unaltered (BRAND in c/portalApi points at
    // src/assets/img/army-logo-dark.png, the reverse logo for dark
    // backgrounds); in Builder point it at a static resource. The local
    // harness's mock portalApi substitutes its own mark.
    @api logoUrl = BRAND.logoUrl;
    @api logoAlt = BRAND.logoAlt;
    logoFailed = false;
    menuOpen = false;
    // Label of the dropdown opened with its caret (touch and keyboard).
    openMenu = '';
    path = '/';
    session = null;

    connectedCallback() {
        this.path = typeof window !== 'undefined' ? window.location.pathname : '/';
        getSession().then((session) => {
            this.session = session;
        });
    }

    // Signed in: the account name and Sign out replace Sign in / Request an
    // account. The org's session carries no account here, hence the fallback.
    get signedIn() {
        return Boolean(this.session && this.session.signedIn);
    }

    get accountLabel() {
        const account = this.session && this.session.account;
        return (account && (account.company || account.username)) || 'Signed in';
    }

    get accountTitle() {
        const account = this.session && this.session.account;
        if (!account) return null;
        return `Signed in as ${account.username}${account.cageCode ? ` · CAGE ${account.cageCode}` : ''}`;
    }

    handleSignOut() {
        signOut();
    }

    get links() {
        return LINKS.map((l) => {
            const url = href(l.href);
            const children = (l.children || []).map((c) => {
                const childUrl = href(c.href);
                const childCurrent = this.isCurrent(childUrl);
                return { label: c.label, href: childUrl, current: childCurrent ? 'page' : null, cls: childCurrent ? 'sub sub--current' : 'sub' };
            });
            const current = this.isCurrent(url) || children.some((c) => c.current);
            const open = this.openMenu === l.label;
            return {
                label: l.label,
                href: url,
                children,
                hasChildren: children.length > 0,
                current: current ? 'page' : null,
                cls: current ? 'link link--current' : 'link',
                groupCls: open ? 'group group--open' : 'group',
                expanded: open ? 'true' : 'false',
                menuId: `menu-${l.label.toLowerCase().replace(/[^a-z]+/g, '-')}`,
                caretLabel: `Show ${l.label} pages`
            };
        });
    }

    // Dropdowns open on hover (CSS); the caret button also toggles them for
    // touch and keyboard, and Escape or leaving the group closes them.
    toggleDropdown(event) {
        const label = event.currentTarget.dataset.label;
        this.openMenu = this.openMenu === label ? '' : label;
    }

    handleGroupKey(event) {
        if (event.key === 'Escape' && this.openMenu) {
            this.openMenu = '';
            const caret = event.currentTarget.querySelector('.caret');
            if (caret) caret.focus();
        }
    }

    handleGroupBlur(event) {
        if (!event.currentTarget.contains(event.relatedTarget)) this.openMenu = '';
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
