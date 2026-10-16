import { LightningElement } from 'lwc';
import { href } from 'c/portalApi';

// Visual-only in the local harness, like loginPanel. In Experience Cloud this
// frames the site's registration page (see docs/EXPERIENCE_CLOUD.md).
export default class AccountRequestPanel extends LightningElement {
    note = '';

    get loginHref() {
        return href('/login');
    }

    handleSubmit(event) {
        event.preventDefault();
        this.note = 'Thanks. The range office will verify your eligibility and email you.';
    }
}
