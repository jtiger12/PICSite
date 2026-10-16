import { LightningElement, api } from 'lwc';
import { href } from 'c/portalApi';

export default class HeroBanner extends LightningElement {
    @api eyebrow;
    @api title = '';
    @api subtitle;
    @api ctaLabel;
    @api ctaHref = '#';
    @api secondaryLabel;
    @api secondaryHref = '#';
    @api showQuickAccess = false;
    @api compact = false;
    // Swap for a static resource / CMS image URL in Experience Cloud.
    @api imageUrl = '/assets/img/contours.svg';

    get sectionClass() {
        return this.compact ? 'hero hero--compact' : 'hero';
    }

    get innerClass() {
        return this.showQuickAccess ? 'container inner inner--split' : 'container inner';
    }

    get bgStyle() {
        return this.imageUrl ? `background-image: url('${this.imageUrl}')` : '';
    }

    get ctaUrl() {
        return href(this.ctaHref);
    }

    get secondaryUrl() {
        return href(this.secondaryHref);
    }

    get hasActions() {
        return Boolean(this.ctaLabel || this.secondaryLabel);
    }
}
