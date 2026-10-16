import { LightningElement } from 'lwc';
import { href } from 'c/portalApi';

// Visual-only in the local harness. In Experience Cloud the site's own login
// page handles authentication; this component becomes the styled wrapper
// around the standard login flow. Requesting an account is its own page
// (accountRequestPanel at /request-account).
export default class LoginPanel extends LightningElement {
    signInNote = '';

    get requestAccountHref() {
        return href('/request-account');
    }

    handleSignIn(event) {
        event.preventDefault();
        this.signInNote = 'Sign-in is handled by the Experience Cloud login page once deployed.';
    }

    handleCac() {
        this.signInNote = 'CAC / PIV sign-in will redirect to the DoD identity provider once configured.';
    }

    handleForgot() {
        this.signInNote = 'Password reset is handled by the Experience Cloud login page once deployed.';
    }
}
