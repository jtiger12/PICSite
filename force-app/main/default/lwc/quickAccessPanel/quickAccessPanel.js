import { LightningElement } from 'lwc';
import { href } from 'c/portalApi';

export default class QuickAccessPanel extends LightningElement {
    items = [
        { label: 'Sign in to your account', href: '/login', isLogin: true },
        { label: 'Request an account', href: '/login#request-account', isAccount: true },
        { label: 'Range capabilities', href: '/ranges', isRanges: true },
        { label: 'Track a test request', href: '/track', isTrack: true }
    ];

    get renderItems() {
        return this.items.map((item) => ({ ...item, href: href(item.href) }));
    }
}
