# PICSite on Experience Cloud (LWR)

How to stand the portal up in an org: what the package contains, the
deployment order, how each Experience Builder page is composed, the head
markup that carries the design tokens, and the access model for guests,
customers and the range office. No Apex is involved anywhere.

## 1. What `force-app` deploys

| Folder | Contents |
|---|---|
| `lwc/` | The portal components. Data access goes through `c/portalApi` (GraphQL wire adapter + `createRecord`), shaping and option lists live in `c/portalModel`, `c/fileUploader` wraps `lightning-file-upload`. Exposed components carry a `PIC` master label. |
| `objects/` | `Test_Range__c` + `Capability_Group__c` (master-detail), `Test_Event__c` + `Event_Session__c` (master-detail), `Test_Request__c` + `Request_Activity__c` (master-detail), and `Account.License_ID__c`. |
| `flows/` | `PIC_Request_Created` (first activity + confirmation email), `PIC_Request_Status_Changed` (activity + email on every status change), `PIC_Request_Needs_Info_Reminder` (scheduled path, 5 days after a request enters Needs info). |
| `permissionsets/` | `PICSite_Customer` (community users), `PICSite_Guest` (public pages), `PICSite_Range_Office` (internal staff, with the three tabs). |
| `sharingSets/` | `PICSite_Customer`: Customer Community users get Edit on `Test_Request__c` where `Account__c` = their contact's account. |
| `labels/` | `PIC_Portal_URL`, the site URL the flow emails link to. Set it after the site exists. |
| `tabs/` | Tabs for ranges, events and requests so the range office can work the records in Lightning. |

Outside `force-app`:

| Path | Purpose |
|---|---|
| `site-config/` | Guest-user sharing rules on `Test_Range__c` and `Test_Event__c`. They reference the site by name, so deploy them only after the site exists. |
| `config/project-scratch-def.json` | Scratch org with Digital Experiences enabled and flows deploying active. |
| `data/` | Sample ranges (Dugway with its capability groups, four pending ranges) and the 2027 EMU event for `sf data import tree`. |

### Sharing model

| Object | Internal OWD | External OWD | Who sees what |
|---|---|---|---|
| `Test_Range__c`, `Test_Event__c` | Public Read Only | Public Read Only | Authenticated users read everything active. Guests need the sharing rules in `site-config/` (guest users ignore OWD). Children follow the parent. |
| `Test_Request__c` | Private | Private | The submitting user owns the record. The sharing set extends Edit to every community user on the same account. Range office staff get View All / Modify All from `PICSite_Range_Office`. |
| `Request_Activity__c` | Controlled by parent | Controlled by parent | Visible wherever the request is. Written by the flows in system context, so customers need no Create permission. |

Customers cannot write `Status__c`, `Status_Note__c`, `Next_Action__c` or
`Range_POC__c` (read-only in `PICSite_Customer`), and `submitRequest` never
sends them: Status takes its picklist default (Submitted) and Next Action its
field default.

## 2. Deployment order

Scratch org (replace `picsite` with your alias; `--target-dev-hub` as needed):

```bash
sf org create scratch -f config/project-scratch-def.json -a picsite -d -y 30
```

```bash
sf project deploy start --source-dir force-app -o picsite
```

If the deploy stops on `SharingSet`, the org has no `Customer Community User`
profile (no Customer Community licence, or Digital Experiences not enabled).
Enable Digital Experiences, or edit `profiles` in
`force-app/main/default/sharingSets/PICSite_Customer.sharingSet-meta.xml` to
the community profile you will use, and redeploy.

Create the site (template `Build Your Own (LWR)`), then wait for the
creation email or poll with `sf community list`:

```bash
sf community create --name PICSite --template-name "Build Your Own (LWR)" --url-path-prefix picsite --description "Test on Army Ranges" -o picsite
```

Seed the reference data (ranges with capability groups, the event with its
sessions; `Code__c` is an external ID so re-running updates in place):

```bash
sf data import tree --files data/Test_Range__c.json,data/Test_Event__c.json -o picsite
```

Guest access to the public pages, once the site named `PICSite` exists:

```bash
sf project deploy start --source-dir site-config -o picsite
```

Then, in Setup:

1. **Custom label** `PIC_Portal_URL`: set it to the site's URL without a
   trailing slash, e.g. `https://<domain>.my.site.com/picsite`. The flow
   emails append `/track?id=TR-2026-0001`.
2. **Permission sets**: assign `PICSite_Range_Office` to range office users
   and `PICSite_Guest` to the site's guest user (Builder > Settings >
   General > Guest User Profile opens the profile; assign the permission set
   from there, or give the guest profile Read on the four reference objects).
3. **Deliverability** (Setup > Email > Deliverability): sandboxes and scratch
   orgs default to *System email only*, which silently drops the flow emails.
   Set *All email* while testing. The Send Email action sends as the user who
   changed the status; switch the action's sender to an org-wide address in
   Flow Builder if the range office wants a shared mailbox as sender.
4. **Customer users**: create a Contact on a customer Account (fill
   `Account.License_ID__c`), enable it as a Customer user with the
   `Customer Community User` profile, assign `PICSite_Customer`, and add the
   site membership (Builder > Administration > Members > the profile).

A sandbox follows the same order; `sf project deploy start --source-dir
force-app -o <sandbox>` needs *Deploy processes and flows as active* enabled
in Process Automation Settings, otherwise the three flows arrive inactive and
must be activated by hand.

## 3. Site settings

- **Head markup** (Builder > Settings > Advanced > Edit Head Markup): paste
  the block below. It is the `:root` block from `src/assets/global.css` plus
  the `html` rule that sets the page background and font. If your org's
  builder rejects `<style>` in head markup, paste the same CSS into Theme >
  Edit CSS instead; the components only ever read the variables.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<style>
:root {
    --pic-page: #16181c;
    --pic-surface: #212429;
    --pic-surface-2: #272a2f;
    --pic-footer: #15171a;
    --pic-border: rgba(255, 255, 255, 0.12);
    --pic-border-strong: rgba(255, 255, 255, 0.22);
    --pic-text: rgba(255, 255, 255, 0.92);
    --pic-text-2: #aeb4bc;
    --pic-accent: #ffcc01;
    --pic-accent-hover: #e6b800;
    --pic-ink: #1b1b1b;
    --pic-link: #73b3e7;
    --pic-ok: #4ade80;
    --pic-warn: #fbbf24;
    --pic-danger: #f87171;
    --pic-radius: 16px;
    --pic-radius-lg: 24px;
    --pic-radius-btn: 12px;
    --pic-container: 1265px;
    --pic-gutter: 24px;
    --pic-font: 'Inter', system-ui, Avenir, Helvetica, Arial, sans-serif;
    --pic-ease: 160ms ease;
    --pic-shadow-card: 0 8px 24px rgba(255, 255, 255, 0.08);
    --pic-shadow-glass: 0 24px 48px rgba(0, 0, 0, 0.35);
}
html, body {
    background: var(--pic-page);
    color: var(--pic-text);
    font-family: var(--pic-font);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
}
@media (prefers-reduced-motion: reduce) {
    :root { --pic-ease: 0ms linear; }
}
</style>
```

- **Fonts on .mil**: Google Fonts is for development only. Upload the Inter
  woff2 files as a static resource (`Inter`), replace the three `<link>` lines
  with an `@font-face` block in the same `<style>` that points at
  `/picsite/sfsites/c/resource/Inter/Inter-Variable.woff2` (adjust the path
  prefix), and drop the Google domains from the CSP list.
- **CSP** (Builder > Settings > Security & Privacy): keep *Strict CSP*. While
  Google Fonts is in use add `https://fonts.googleapis.com` (style) and
  `https://fonts.gstatic.com` (font) as trusted sites.
- **Theme**: set the site background to `#16181C` and text to white in
  Theme > Colors so the LWR shell matches before the components paint, and
  pick the full-width layout.
- **Hero image**: `heroBanner` defaults to the harness asset
  `/assets/img/contours.svg`. Upload the artwork as a static resource or CMS
  image and set *Background image URL* on each hero instance.
- **Page access**: `/request` and `/track` are *Requires Login* (Page
  Properties > Page Access). Home, Ranges, Login and Request an account
  stay public.
- **Links**: every portal link goes through `href()` in `c/portalApi`, which
  prefixes `@salesforce/community/basePath` (for the site above, `/picsite`).
  Builder properties such as *Primary button URL* can be entered either as
  `/request` or `/picsite/request`; both resolve to the same page.
- **Guest GraphQL**: the public pages read ranges and events through the
  GraphQL wire adapter as the guest user, which the platform supports from
  API 61 (Summer '24). The project is on API 64.

## 4. Page compositions

Build Your Own (LWR) gives every page a header and footer region. Put
`PIC Gov Banner` then `PIC Site Header` in the header region and
`PIC Site Footer` in the footer region once; the per-page lists below are the
content region, top to bottom, with the property values from the harness
pages in `src/modules/picsite/*/*.html`.

### Home `/` (public)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `Test on Army Ranges`; Title `Accelerate your drone, counter-drone and long-range fires solutions.`; Subtitle `U.S. Army ranges give private industry access to massive, specialized, realistic environments for rapid prototyping, proving system components and conducting full-scale experiments.`; Primary button `Request a test` → `/request`; Secondary button `Explore range capabilities` → `/ranges`; Show quick access panel ✔ |
| PIC Value Props | – |
| PIC Event Banner | – (shows the first active `Test_Event__c`) |
| PIC Range Explorer | Show all ranges stacked ✘ (tabs) |
| PIC Process Stepper | Eyebrow `How it works`; Title `From request to range in five steps`; Mode `static` |
| PIC CTA Band | Eyebrow `Ready to test?`; Title `Submit a test request`; Text `Licensed customers can submit UAS, counter-UAS and long-range fires requests online and track every step through to the test window.`; Button `Start a request` → `/request` |

The header's *How it works* link targets `/#how-it-works`. In the harness
the stepper sits in a `<section id="how-it-works">` inside the home page
component's shadow root, which the browser can't scroll to from the URL, so
`src/modules/picsite/home/home.js` scrolls to it itself; in Builder drop the
stepper inside a section whose *Section ID* (Advanced) is `how-it-works`, or
point the link at `/` if the template has no anchor option.

### Ranges `/ranges` (public)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `Ranges`; Title `Range capabilities`; Subtitle `Five Army test ranges across the United States and partner nations. Compare terrain, airspace, instrumentation and the test types each range supports.`; Compact ✔ |
| PIC Range Finder | Eyebrow `Find a range`; Title `Search ranges by capability` |
| PIC Range Explorer | Show all ranges stacked ✔ |
| PIC CTA Band | Eyebrow `Not sure which range fits?`; Title `Tell us about the test and we'll match the range`; Text `Submit a request with your objectives and preferred dates. The range office reviews it and coordinates the right range, airspace and instrumentation.`; Button `Request a test` → `/request` |

### Submit a test request `/request` (Requires Login)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `For licensed customers`; Title `Submit a test request`; Subtitle `Tell us what you're testing, where and when. The range office reviews every request and coordinates airspace, impact areas and instrumentation.`; Compact ✔ |
| PIC Test Request Form | – |

The form pre-fills organization, contact, licence ID, email and phone from
the signed-in user's record and account (`License_ID__c`), accepts
`?range=<Code__c>` and `?event=<Code__c>` deep links, creates the
`Test_Request__c`, and then shows `lightning-file-upload` bound to the new
record so attachments land on the request.

The range step embeds the range finder (`rangeFinder`, `mode="select"`)
instead of dropdowns: the customer describes what the range must support,
starting from the test type chosen in the step before, and picks the
preferred and alternate range from the ranked matches.

**Range finder search.** Ranges are scored on their own data: test types,
`Capability_Group__c` items, `Stats__c`, state and region, and terrain words
in the summary (each criterion scores 0-100%, the range score is the
average). Shorthand such as HPM, HEL, EW, C-UAS, HE and FTS, and the
synonyms behind it, live in `rangeFinder/rangeSearch.js`. Ranges with
`Pending__c` set only have a test type, region and summary to match, so they
rank below Dugway until their capability groups are entered; no code change
is needed when they are.

### Track requests `/track` (Requires Login)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `Test status tracker`; Title `Your test requests`; Subtitle `Every request moves through review, coordination and scheduling. Open a request to see where it is and what happens next.`; Compact ✔ |
| PIC Test Status Tracker | – |

The tracker lists every request the user can see (sharing does the
filtering), selects `?id=<request number>` when present, refreshes the
GraphQL result once if that number is not in the cached list yet (the form's
*Track this request* link), and offers the file uploader on requests in
*Needs info*.

### Login `/login` (public)

Keep the site's own Login page (it owns authentication and password reset).
Put `PIC Login Panel` on it as the visual frame and keep the standard Login
Form component inside the page; `loginPanel`'s own form is a harness
stand-in only. The header, footer and quick-access *Sign in* links target
`/login`; the panel links across to `/request-account`.

### Request an account `/request-account` (public)

Requesting an account is its own page rather than a second form on the login
page: each form gets the full width on mobile, and the links need no
`#fragment` (an `id` inside a component's shadow root can't be reached from
the URL). Put `PIC Account Request Panel` on the site's self-registration
page (Administration > Login & Registration) as the visual frame, the same
way as the login panel: its form is a harness stand-in. The header, footer
and quick-access *Request an account* links target `/request-account`, so
give that page that URL or update the three `href`s.

## 5. Data access, for maintainers

- `c/portalApi` exports `graphql` and `gql` (re-exported from
  `lightning/uiGraphQLApi`), four query documents (`RANGES_QUERY`,
  `EVENTS_QUERY`, `MY_REQUESTS_QUERY`, `CURRENT_USER_QUERY`), `submitRequest`
  (`createRecord` on `Test_Request__c`), `href`, and the model re-exports.
  Components wire queries directly: `@wire(graphql, { query: RANGES_QUERY })`.
- `c/portalModel` is pure JavaScript: status steps, option lists (whose
  `value`s are the picklist API names), `toRanges` / `toEvents` /
  `toRequests` / `toUser` (GraphQL result → template shape), and
  `toRequestFields` (form payload → record fields, empties dropped).
- Child ordering happens in JavaScript (`Sort_Order__c`, `Activity_Date__c`),
  so the queries only page (`first:`) their child relationships.
- `Stats__c` on a range is a JSON array of `{label, value}` pairs; bad JSON
  renders as no stats rather than an error.
- The GraphQL cache is per page session. After `createRecord`, the form
  sends the user to `/track?id=<number>`; the tracker calls `refreshGraphQL`
  once when that number is missing from the cached list.

## 6. Local harness

`npm run dev` still runs everything on mock data. `scripts/sync-lwr-modules.mjs`
aliases `c/portalApi` and `c/fileUploader` to `src/mock/<name>/` because the
open-source LWR stack cannot resolve `lightning/uiGraphQLApi`,
`lightning/uiRecordApi` or `lightning-file-upload`. The mock `graphql` is a
real wire adapter that answers the same query tokens with mock records in UI
API response shape, so the shaping code in `c/portalModel` is exercised
locally; mock submissions persist in `sessionStorage` for the session so the
tracker shows them after the page hop.
