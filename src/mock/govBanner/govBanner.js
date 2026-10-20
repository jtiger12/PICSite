import { LightningElement } from 'lwc';

// Harness-only stand-in for c/govBanner (see scripts/sync-lwr-modules.mjs).
// The public demo runs on a non-.mil domain, where the "official website"
// banner plus a sign-in form reads as phishing to web proxies, so the banner's
// slot shows a demonstration notice instead. Experience Cloud keeps the real
// c/govBanner.
export default class GovBanner extends LightningElement {}
