# PICSite design system and site map

Customer-facing portal for licensed customers to request UAS, counter-UAS and
long-range fires testing on Army test ranges, track the status of a submission,
and browse each range's capabilities.

Visual reference: https://drones.mil/air (dark Air Marketplace theme).
Layout reference for the submission + tracking pages:
https://drones.mil/air/vendor-onboarding.
Content source: https://testrange.army.mil/ArmyRangeReservation/s/ (Aura site
being replaced).

## Tokens

Defined once as CSS custom properties on `:root` (see
`src/assets/global.css` for the local harness; in Experience Cloud paste the
same block into Settings → Advanced → Head Markup or the theme's CSS overrides).
Components only ever reference the variables.

| Token | Value | Use |
|---|---|---|
| `--pic-page` | `#16181C` | page background |
| `--pic-surface` | `#212429` | cards |
| `--pic-surface-2` | `#272A2F` | CTA bands, raised panels |
| `--pic-footer` | `#15171A` | footer |
| `--pic-border` | `rgba(255,255,255,.12)` | card borders |
| `--pic-border-strong` | `rgba(255,255,255,.22)` | glass panel borders |
| `--pic-text` | `rgba(255,255,255,.92)` | body text |
| `--pic-text-2` | `#AEB4BC` | muted text, eyebrows |
| `--pic-accent` | `#FFCC01` | Army gold: buttons, eyebrow bar, active step |
| `--pic-accent-hover` | `#E6B800` | button hover |
| `--pic-ink` | `#1B1B1B` | text on gold |
| `--pic-link` | `#73B3E7` | inline links |
| `--pic-ok / --pic-warn / --pic-danger` | `#4ADE80 / #FBBF24 / #F87171` | status chips |
| `--pic-radius` | `16px` | cards |
| `--pic-radius-lg` | `24px` | hero glass panel |
| `--pic-radius-btn` | `12px` | buttons |
| `--pic-container` | `1265px` | content width, 24px side gutter |

Type: Inter (Google Fonts locally; self-host for .mil deployment).

| Role | Size / weight / tracking |
|---|---|
| Hero h1 | 64px / 800 / -0.02em, line-height 1.05 |
| Page h1 | 44px / 800 |
| Section h2 | 28px / 700 |
| CTA h4 | 34px / 800 |
| Card title | 20px / 700 |
| Body | 16px / 400 / 1.6 |
| Eyebrow | 12.8px / 600 / 0.22em uppercase, muted, with a 3px gold bar on the left in heroes |

Motion: 160ms ease on hover (card border brightens, button darkens, 1px lift).
Respect `prefers-reduced-motion`.

## Page pattern

Every section is `eyebrow → h2 → content`. Content is cards on the page
background. Buttons are gold with ink text. Secondary buttons are outlined
with the strong border.

## Site map (first release)

| Route | Audience | Composition |
|---|---|---|
| `/` Home | public | govBanner, siteHeader, heroBanner + quickAccessPanel, valueProps, rangeExplorer, eventBanner, processStepper ("how it works"), ctaBand, siteFooter |
| `/ranges` Ranges & capabilities | public | heroBanner (short), rangeExplorer (expanded), ctaBand |
| `/request` Submit a test request | licensed customer | heroBanner (short), valueProps ("what you'll need"), processStepper (form progress), requestForm, ctaBand (help) |
| `/track` Track requests | licensed customer | heroBanner (short), requestTracker (list + detail with timeline stepper) |
| `/login` Sign in / request access | public | loginPanel |

Authentication is the Experience Cloud site's own login; `/request` and `/track`
are authenticated pages. In the local harness `/login` is visual only.

## Components (`force-app/main/default/lwc`)

Layout: `govBanner`, `siteHeader`, `siteFooter`
Blocks: `heroBanner`, `quickAccessPanel`, `valueProps`, `sectionHeading`,
`ctaBand`, `eventBanner`, `processStepper`, `statusChip`
Ranges: `rangeExplorer`, `capabilityList`
Portal: `requestForm`, `requestTracker`, `loginPanel`
Services (no template): `portalApi` (data access: GraphQL wire adapter,
`createRecord`, site base path; swapped for `src/mock/portalApi` in the
harness), `portalModel` (pure model: status steps, option lists, response
shaping, field mapping), `picStyles` (shared CSS module: buttons, cards,
eyebrow)
Wrappers: `fileUploader` (`lightning-file-upload` bound to a request; plain
file input in the harness)

## Request status model

`Submitted → Under review → Coordination → Scheduled → Complete`, with
`Needs info` and `Declined` as side states. The tracker renders the five
main states as the same horizontal stepper used on the vendor onboarding page.
