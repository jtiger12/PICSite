import { LightningElement } from 'lwc';

// Visual-only in the local harness. In Experience Cloud the site's own login
// page handles authentication; this component becomes the styled wrapper
// around the standard login / self-registration flow.
export default class LoginPanel extends LightningElement {
    signInNote = '';
    requestNote = '';

    handleSignIn(event) {
        event.preventDefault();
        this.signInNote = 'Sign-in is handled by the Experience Cloud login page once deployed.';
    }

    handleCac() {
        this.signInNote = 'CAC / PIV sign-in will redirect to the DoD identity provider once configured.';
    }

    handleRequestAccount(event) {
        event.preventDefault();
        this.requestNote = 'Thanks. The range office will verify your eligibility and email you.';
    }
}
