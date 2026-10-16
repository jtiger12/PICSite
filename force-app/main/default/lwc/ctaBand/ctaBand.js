import { LightningElement, api } from 'lwc';
import { href } from 'c/portalApi';

export default class CtaBand extends LightningElement {
    @api eyebrow;
    @api title = '';
    @api text;
    @api buttonLabel;
    @api buttonHref = '#';

    get buttonUrl() {
        return href(this.buttonHref);
    }
}
