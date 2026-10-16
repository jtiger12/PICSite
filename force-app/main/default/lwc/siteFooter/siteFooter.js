import { LightningElement, api } from 'lwc';
import { href } from 'c/portalApi';

export default class SiteFooter extends LightningElement {
    // Same official Army logo file as the header (see siteHeader).
    @api logoUrl = '/assets/img/army-logo.svg';
    logoFailed = false;

    get showLogo() {
        return Boolean(this.logoUrl) && !this.logoFailed;
    }

    hideLogo() {
        this.logoFailed = true;
    }

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
        return href('/request-account');
    }
    get loginHref() {
        return href('/login');
    }
}
