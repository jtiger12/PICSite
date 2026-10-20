import { LightningElement } from 'lwc';
import { href, signIn, BRAND } from 'c/portalApi';

// Sign-in goes through c/portalApi. In the local harness that is the mock
// backend (scripts/mock-backend.mjs, account in .env). In Experience Cloud the
// site's own login page handles authentication: signIn() only explains that,
// and this component becomes the styled wrapper around the standard login
// flow. Requesting an account is its own page (accountRequestPanel at
// /request-account).
export default class LoginPanel extends LightningElement {
    signInNote = '';
    signInError = false;
    signingIn = false;

    get requestAccountHref() {
        return href('/request-account');
    }

    get noteClass() {
        return this.signInError ? 'note note--error' : 'note';
    }

    get signInLabel() {
        return this.signingIn ? 'Signing in…' : 'Sign in';
    }

    // CAC / PIV is an Experience Cloud concern; the local harness (BRAND from
    // the mock portalApi) has no identity provider to send anyone to.
    get showCac() {
        return BRAND.cacSignIn;
    }

    showNote(message, isError) {
        this.signInNote = message;
        this.signInError = Boolean(isError);
    }

    async handleSignIn(event) {
        event.preventDefault();
        if (this.signingIn) return;
        const username = this.template.querySelector('[name="username"]').value.trim();
        const password = this.template.querySelector('[name="password"]').value;
        if (!username || !password) {
            this.showNote('Enter your username and password.', true);
            return;
        }
        this.signingIn = true;
        this.showNote('');
        try {
            await signIn(username, password);
            window.location.assign(href('/track'));
        } catch (error) {
            this.showNote(error.message, true);
            this.signingIn = false;
        }
    }

    handleCac() {
        this.showNote('CAC / PIV sign-in will redirect to the DoD identity provider once configured.');
    }

    handleForgot() {
        this.showNote('Password reset is handled by the Experience Cloud login page once deployed.');
    }
}
