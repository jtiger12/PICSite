import { LightningElement } from 'lwc';
import { href } from 'c/portalApi';

export default class SiteFooter extends LightningElement {
    get rangesHref() {
        return href('/ranges');
    }
    get howItWorksHref() {
        return href('/#how-it-works');
    }
    get requestHref() {
        return href('/request');
    }
    get trackHref() {
        return href('/track');
    }
    get requestAccountHref() {
        return href('/login#request-account');
    }
    get loginHref() {
        return href('/login');
    }
}
