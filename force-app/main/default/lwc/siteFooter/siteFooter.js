import { LightningElement, api } from 'lwc';
import { href, BRAND } from 'c/portalApi';

export default class SiteFooter extends LightningElement {
    // Same official Army logo file as the header (see siteHeader), and the
    // organisation / official-site lines of the bottom bar; all from BRAND so
    // the local harness can substitute demo values.
    @api logoUrl = BRAND.logoUrl;
    @api logoAlt = BRAND.logoAlt;
    @api orgLine = BRAND.orgLine;
    @api siteLine = BRAND.siteLine;
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
