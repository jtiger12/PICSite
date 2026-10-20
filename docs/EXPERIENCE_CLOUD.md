# PICSite on Experience Cloud (LWR)

How to stand the portal up in an org: what the package contains, the
deployment order, how each Experience Builder page is composed, the head
markup that carries the design tokens, and the access model for guests,
customers and the range office. No Apex is involved anywhere.

## 1. What `force-app` deploys

| Folder | Contents |
|---|---|
| `lwc/` | The portal components. Data access goes through `c/portalApi` (GraphQL wire adapter + `createRecord`), shaping and option lists live in `c/portalModel`, `c/fileUploader` wraps `lightning-file-upload`. Exposed components carry a `PIC` master label. |
| `objects/` | `Test_Range__c` + `Capability_Group__c` (master-detail), `Test_Event__c` + `Event_Session__c` (master-detail), `Test_Request__c` + `Request_Activity__c` (master-detail), `Range_Block__c` (lookup to `Test_Range__c`: the blocked days behind the availability calendar, with two list views and a validation rule), and `Account.License_ID__c` + `Account.CAGE_Code__c`. |
| `flows/` | `PIC_Request_Created` (first activity + confirmation email), `PIC_Request_Status_Changed` (activity + email on every status change), `PIC_Request_Needs_Info_Reminder` (scheduled path, 5 days after a request enters Needs info). |
| `permissionsets/` | `PICSite_Customer` (community users), `PICSite_Guest` (public pages), `PICSite_Range_Office` (internal staff, with the four tabs). |
| `sharingSets/` | `PICSite_Customer`: Customer Community users get Edit on `Test_Request__c` where `Account__c` = their contact's account. |
| `labels/` | `PIC_Portal_URL`, the site URL the flow emails link to. Set it after the site exists. |
| `tabs/` | Tabs for ranges, range blocks, events and requests so the range office can work the records in Lightning. |
| `quickActions/` | `Test_Range__c.New_Range_Block`: *New Range Block* on the Range record with the range filled in. Add it to the Range page layout (Mobile & Lightning Actions). |

Outside `force-app`:

| Path | Purpose |
|---|---|
| `site-config/` | Guest-user sharing rules on `Test_Range__c`, `Test_Event__c` and `Range_Block__c` (public blocks only). They reference the site by name, so deploy them only after the site exists. |
| `config/project-scratch-def.json` | Scratch org with Digital Experiences enabled and flows deploying active. |
| `data/` | Sample data for `sf data import tree`: the six ranges with their capability groups (public-source profiles, October 2026; Atterbury-Muscatatuck as *Coming soon*) and the quarterly electromagnetic unreliability (DDIL) event at Camp Grayling, and ten range blocks placed relative to the day the sample was generated. Generated from the harness mock with `npm run sample-data`; edit `src/mock/portalApi/data.js`, not the JSON. |

### Sharing model

| Object | Internal OWD | External OWD | Who sees what |
|---|---|---|---|
| `Test_Range__c`, `Test_Event__c` | Public Read Only | Public Read Only | Authenticated users read everything active. Guests need the sharing rules in `site-config/` (guest users ignore OWD). Children follow the parent. |
| `Range_Block__c` | Public Read Only | Public Read Only | Everyone signed in reads blocks; guests only those with *Show on Public Calendar* set (sharing rule in `site-config/`). The range office creates and edits them. The site's queries filter on `Public__c` too, so a block the office hides is hidden from signed-in customers as well; `Note__c` is readable only by the range office. |
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
sessions, the sample range blocks; `Code__c` is an external ID so re-running
updates ranges and events in place, while blocks are inserted again):

```bash
sf data import tree --files data/Test_Range__c.json,data/Test_Event__c.json,data/Range_Block__c.json -o picsite
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
   `Account.License_ID__c` and `CAGE_Code__c`), enable it as a Customer user with the
   `Customer Community User` profile, assign `PICSite_Customer`, and add the
   site membership (Builder > Administration > Members > the profile).
5. **Range blocks** (the availability calendar's data). On the Test Range
   page layout add the *Range Blocks* related list and the *New Range Block*
   action under Mobile & Lightning Actions, so the office blocks days from
   the Range record with the range filled in. For a calendar view in
   Lightning: Calendar > *Add Calendar from object* > Range Block, field
   range *Start Date* to *End Date*, display field *Label*, filtered by a
   list view (*All Blocks*, *Upcoming Blocks*, or one list view per
   installation or command, each as its own coloured calendar, which keeps
   dozens of ranges readable). New kinds of block are picklist values on
   *Type*; a block with *Show on Public Calendar* cleared stays internal.
   Onboarding a range is data only: a Test Range record, its capability
   groups, and the office's blocks.

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
- **Army logo**: the header and footer show the official U.S. Army logo,
  unaltered (scaled by height only), next to the site title. The dark
  header needs the reverse version (white wordmark): "NEW Army Logo 1 Rev -
  Horizontal" or "NEW US Army Logo 2 - Vertical" rev from the Family and MWR
  Brand Central *NEW U.S. Army Logo* collection
  (https://www.mwrbrandcentral.com/collections/26115, sign-in required);
  the harness uses `src/assets/img/army-logo-dark.png`, derived from the
  positive stacked logo until that file is in hand. Upload it as a static
  resource and set *Army logo URL* on `PIC Site Header` and `PIC Site
  Footer`; if the file can't load they show the title alone.
- **Page access**: `/request` and `/track` are *Requires Login* (Page
  Properties > Page Access). Home, Ranges, Availability, Login and Request
  an account stay public.
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
| PIC Hero Banner | Eyebrow `Test on Army Ranges`; Title `Accelerate your drone, counter-drone and long-range fires solutions.`; Subtitle `U.S. Army now gives private industry access to large, specialized, realistic environments for rapid prototyping, proving system components and conducting full-scale experiments.`; Primary button `Request a test` → `/request`; Secondary button `Explore range capabilities` → `/ranges`; Show quick access panel ✔ |
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
| PIC Hero Banner | Eyebrow `Ranges`; Title `Range capabilities`; Subtitle `Five Army test ranges open to industry in the United States and Morocco, with Indiana coming soon. Compare terrain, airspace, instrumentation and the test types each range supports.`; Compact ✔ |
| PIC Range Finder | Eyebrow `Find a range`; Title `Search ranges by capability` |
| PIC Range Explorer | Show all ranges stacked ✔ |
| PIC CTA Band | Eyebrow `Not sure which range fits?`; Title `Tell us about the test and we'll match the range`; Text `Submit a request with your objectives and preferred dates. The range office reviews it and coordinates the right range, airspace and instrumentation.`; Button `Request a test` → `/request` |

### Availability `/availability` (public)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `Ranges`; Title `Range availability`; Subtitle `The days each range is reserved, closed or in maintenance, as the range office has them. Check a window before you request it; the office confirms every booking.`; Compact ✔ |
| PIC Range Calendar | Eyebrow `Calendar`; Title `Blocked dates`; Lead text as default |
| PIC CTA Band | Eyebrow `Found an open window?`; Title `Request a test for those dates`; Text `Submit the request with your preferred window and an alternate range. The range office confirms availability and coordinates airspace and instrumentation.`; Button `Request a test` → `/request` |

The header's *Ranges* entry is a dropdown built into `PIC Site Header`
(*Range capabilities* → `/ranges`, *Range availability* → `/availability`;
hover or the caret on desktop, inline links in the mobile menu), and the
footer's Portal column links the page too, so the site's own navigation
menu is not used. Create the page with the URL `availability` so those
links resolve.

### Submit a test request `/request` (Requires Login)

| Component | Properties |
|---|---|
| PIC Hero Banner | Eyebrow `For licensed customers`; Title `Submit a test request`; Subtitle `Tell us what you're testing, where and when. The range office reviews every request and coordinates airspace, impact areas and instrumentation.`; Compact ✔ |
| PIC Test Request Form | – |

The form pre-fills organization, CAGE code, contact, licence ID, email and phone from
the signed-in user's record and account (`License_ID__c`, `CAGE_Code__c`), accepts
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
average; a criterion counts as met at 55%). Shorthand such as HPM, HEL,
EW, C-UAS, HE, FTS, PNT and BVLOS, and the synonyms behind it, live in
`rangeFinder/rangeSearch.js`; electronic warfare and GPS denial are matched
as concepts however they're worded (jamming, electronic attack, GPS
interference...). New capability groups are searchable as soon as they're
entered; no code change is needed. *Coming soon* ranges are ranked like the
others but can't be chosen as preferred or alternate, and the form ignores a
`?range=` deep link to one.

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
  `lightning/uiGraphQLApi`), six query documents (`RANGES_QUERY`,
  `EVENTS_QUERY`, `MY_REQUESTS_QUERY`, `CURRENT_USER_QUERY`,
  `RANGE_BLOCKS_QUERY`, `RANGE_BLOCKS_BY_RANGE_QUERY`), `submitRequest`
  (`createRecord` on `Test_Request__c`), `href`, and the model re-exports.
  Components wire queries directly: `@wire(graphql, { query: RANGES_QUERY })`.
- `c/portalModel` is pure JavaScript: status steps, option lists (whose
  `value`s are the picklist API names), `toRanges` / `toEvents` /
  `toRequests` / `toUser` (GraphQL result → template shape), and
  `toRequestFields` (form payload → record fields, empties dropped).
- Child ordering happens in JavaScript (`Sort_Order__c`, `Activity_Date__c`),
  so the queries only page (`first:`) their child relationships.
- Range blocks are inclusive calendar days. `toBlocks` keeps them as
  `YYYY-MM-DD` strings (they compare as text) with the range's `Code__c` as
  `rangeId`, and `overlappingBlocks` is what the request form's notice uses.
  `c/rangeCalendar` asks for public blocks from three months back (`$from`)
  and draws them itself (month grid with bars, or a list; chips to filter up
  to eight ranges, a select beyond that). The form asks for one range's
  blocks (`$code`) from today, so it never loads every range's.
- `Stats__c` on a range is a JSON array of `{label, value}` pairs; bad JSON
  renders as no stats rather than an error.
- `Status__c` on a range is *Open* or *Coming soon*; coming-soon ranges show
  their capabilities with a note and take no requests. `Latitude__c` /
  `Longitude__c` hold the main post or airfield in decimal degrees (where the
  range itself isn't published, as for West Cibola and the Morocco complex).
- Capability groups whose type is *Range environment* (airspace, terrain and
  climate, spectrum and instrumentation, airfields, support) render as their
  own card after the test-type cards.
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
