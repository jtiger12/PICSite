import { LightningElement } from 'lwc';

export default class GovBanner extends LightningElement {
    expanded = false;

    toggle() {
        this.expanded = !this.expanded;
    }
}
