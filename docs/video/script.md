# PICSite walkthrough video: script and shot list

**Audience:** the team building PICSite in Salesforce (LWC on an Experience
Cloud LWR site).
**Length:** about 23 minutes. The page tour is 6 pages at about 2 minutes
each, and the video opens with a chapter card so viewers can jump to the
section they need.
**Voice:** offline Windows text-to-speech, so the script never leaves this
machine. Microsoft Mark at rate −1, with a 1.2 s pause between paragraphs
(David and Zira are the alternatives).
**Recording:** 1920×1080, a scripted browser against `npm run dev` (mock data),
signed in as the `.env` mock account where a page needs it. How to rebuild the
video from this script: [README.md](README.md).

Each scene below has a **shot list** (what's on screen, with rough timings
inside the scene) and the **narration** read word for word. Scene length
follows the narration, with on-screen actions held to fit. Labels in
`[brackets]` are overlays drawn on the recording only: component names,
highlights and callouts. The site itself is not changed.

## Pronunciation

The narration stays readable here; the build swaps these in for the voice.

| Written | Spoken |
|---|---|
| LWC / LWR | L W C / L W R |
| GraphQL | graph Q L |
| UAS / counter-UAS | U A S / counter U A S |
| DDIL | D D I L |
| CAGE | cage |
| HPM, HEL, EW, FTS, BVLOS | H P M, H E L, E W, F T S, B V L O S |
| CAC / PIV | cack / P I V |
| DoD | D o D |
| `.env` | dot env |
| `c/portalApi` | C portal A P I |
| `/request` (paths) | slash request |
| `sf` (CLI) | S F |
| JDrone | J drone |
| AMTEC | am-tec |
| portalApi / portalModel / picStyles / fileUploader | portal A P I / portal model / pic styles / file uploader |
| submitRequest / createRecord / toRequestFields | submit request / create record / to request fields |
| toRequests / toUser / rangeSearch | to requests / to user / range search |
| uiGraphQLApi / sync-lwr-modules | U I graph Q L A P I / sync L W R modules |
| lightning-file-upload / site-config | lightning file upload / site config |
| how-it-works / request-account | how it works / request account |
| npm / SLDS / ID / UI / API | N P M / S L D S / I D / U I / A P I |
| http-only | H T T P only |

## Running order

This table is also the chapter list. *Starts* is where each chapter begins in
the finished video; *Narration* is the measured length of the spoken text with
the settings above, and the rest of each scene is on-screen action with no
voice-over. The build recomputes the start times from the final scene lengths
and uses them for the opening chapter card, the MP4's chapter markers and
`chapters.txt` (a plain list to paste into a message or channel).

Times below are from the finished build. Each scene runs its target length,
or longer when the narration plus a 0.8 s lead-in and 1 s tail needs it.

| # | Starts | Chapter | For | Length | Narration |
|---|---|---|---|---|---|
| 0 | 0:00 | Title and chapters | Everyone | 0:30 | 0:20 |
| 1 | 0:30 | Introduction | Everyone | 1:07 | 1:05 |
| 2 | 1:37 | Home `/` | Everyone (page tour) | 2:00 | 1:49 |
| 3 | 3:37 | Ranges `/ranges` | Everyone (page tour) | 2:00 | 1:50 |
| 4 | 5:37 | Request an account `/request-account` | Everyone (page tour) | 2:00 | 1:48 |
| 5 | 7:37 | Sign in `/login` | Everyone (page tour) | 2:00 | 1:40 |
| 6 | 9:37 | Submit a test request `/request` | Everyone (page tour) | 2:03 | 2:01 |
| 7 | 11:40 | Track requests `/track` | Everyone (page tour) | 2:00 | 1:50 |
| 8 | 13:40 | How the code fits together | LWC developers | 3:00 | 2:34 |
| 9 | 16:40 | Salesforce data and automation | Admins and developers | 2:30 | 2:07 |
| 10 | 19:10 | Deploying to Experience Cloud | Whoever sets up the org | 2:00 | 1:35 |
| 11 | 21:10 | Preview only vs. the org | Everyone | 0:45 | 0:37 |
| 12 | 21:55 | Before launch | Everyone | 0:45 | 0:36 |
| 13 | 22:40 | End card | – | 0:05 | – |
| | | **Total** | | **22:45** | |

The page order follows a customer: discover (Home, Ranges), get access
(Request an account, Sign in), then act (Request) and follow up (Track).

---

## 0. Title and chapters (0:30)

**Shot list**
- 0:00 Title card: dark, with the Army star. "PICSite: Test on Army Ranges",
  subtitle "Walkthrough for the Salesforce LWC team". Soft fade in, no voice.
- 0:05 Chapter card, held to the end of the scene, grouped by who it's for.
  The times are the running order's; the build fills in the final ones so
  the card and the player's chapter list always match.

  | Start | Chapter | For |
  |---|---|---|
  | 0:30 | Introduction | Everyone |
  | | **Page tour**: what each page does, its components, its data and its Builder setup | Everyone |
  | 1:37 | Home | |
  | 3:37 | Ranges | |
  | 5:37 | Request an account | |
  | 7:37 | Sign in | |
  | 9:37 | Submit a test request | |
  | 11:40 | Track requests | |
  | 13:40 | How the code fits together | LWC developers |
  | 16:40 | Salesforce data and automation | Admins and developers |
  | 19:10 | Deploying to Experience Cloud | Whoever sets up the org |
  | 21:10 | Preview only vs. the org | Everyone |
  | 21:55 | Before launch | Everyone |

**Narration** (starts with the chapter card)
> The chapters are on screen now, with their start times, and your video
> player lists them too, so you can jump straight to what you need. The page
> tour is for everyone. If you're building the components, the code section
> comes right after it. If you're setting up the org, go to the data model
> and deployment.

---

## 1. Introduction (1:06)

**Shot list**
- 0:00 Home page, top, at rest.
- 0:20 Slow scroll down the home page.
- 0:40 Cut to a diagram slide: `force-app/` (deploys: components, objects,
  flows, access) beside `src/` + `scripts/` (local preview: mock data, mock
  sign-in).

**Narration**
> This is a walkthrough of PICSite, the Test on Army Ranges portal. Licensed
> customers use it to browse Army test ranges, submit UAS, counter-UAS and
> long-range fires test requests, and follow each request through to the test
> window.
>
> It's built as Lightning Web Components for an Experience Cloud site on the
> Build Your Own LWR template, and there's no Apex anywhere. Reads use the UI
> API GraphQL wire adapter, writes use Lightning Data Service, and
> record-triggered flows handle everything after a submit.
>
> The repository has two halves. force-app is what you deploy: twenty-one
> components, the custom objects, three flows, permission sets and a sharing
> set. Everything under src and scripts is a local preview that runs the same
> components on mock data, so you can see and change them without an org.
>
> We'll go page by page first, then the code, the data model, and deployment.

---

## 2. Home `/` (2:00)

**Shot list**
- 0:00 Top of `/`. `[c-gov-banner]` `[c-site-header · PIC Site Header]`.
- 0:15 Highlight the hero. `[c-hero-banner · PIC Hero Banner]`, then
  `[c-quick-access-panel]` on the right.
- 0:35 Scroll to the value props `[c-value-props]`.
- 0:45 Event banner `[c-event-banner · reads EVENTS_QUERY]`; hover Sign up.
- 1:00 Range explorer `[c-range-explorer · reads RANGES_QUERY]`; click two
  range tabs (Dugway, then Camp Grayling).
- 1:25 How it works `[c-process-stepper · mode=static]`; hover "the wizard"
  and the Contact us button.
- 1:40 CTA band `[c-cta-band]`, then the footer `[c-site-footer]`.

**Narration**
> The home page is public. At the top are the government banner and the site
> header, with the official Army logo, the main navigation, and Sign in and
> Request an account. In Builder, the gov banner and header go in the
> template's header region once, and the footer in the footer region, so
> every page gets them.
>
> The hero is PIC Hero Banner: eyebrow, title, subtitle, two buttons, and a
> Quick access panel with shortcuts to sign in, request an account, browse
> ranges and track a request. Every piece of text in it is a Builder
> property, so content changes don't need a deploy.
>
> PIC Value Props gives three reasons to test here. Then PIC Event Banner,
> which reads the first active Test Event record through GraphQL. Today
> that's the quarterly DDIL event at Camp Grayling, and Sign up opens the
> request form with that event already selected.
>
> PIC Range Explorer shows each range as a tab. A tab shows the range's
> summary, its key stats, and its capability groups as cards, one per test
> type, plus a range environment card for airspace, terrain, spectrum and
> support. All of it comes from Test Range and its Capability Group children
> in a single query.
>
> How it works is PIC Process Stepper in static mode: the five steps every
> request moves through. Step one points to the request wizard, or to the
> range office with Contact us.
>
> The page ends with the call-to-action band and the footer.
>
> One Builder detail: the header's How it works link goes to an anchor, so
> put the stepper inside a section whose section ID is how-it-works.

---

## 3. Ranges `/ranges` (2:00)

**Shot list**
- 0:00 Top of `/ranges`. `[c-hero-banner · compact]`.
- 0:10 `[c-range-finder · mode=browse]`. Type "hpm", pause on the suggestion
  list (match percentages), pick one; it becomes a chip.
- 0:35 Type "gps denied", pick it. Results re-rank; highlight the check and
  cross marks and the "found in" notes on the top card.
- 0:55 Callout `[scoring: rangeFinder/rangeSearch.js]`.
- 1:10 Hover "Request a test here" on the top result; show the
  `?range=` link in a callout.
- 1:20 Scroll to `[c-range-explorer · expanded]`: ranges stacked.
- 1:40 Stop on Atterbury-Muscatatuck, "Coming soon".

**Narration**
> Ranges is public too. The short hero at the top is the same Hero Banner
> component with Compact turned on.
>
> Below it is PIC Range Finder, which searches the ranges by capability.
> Type what the test needs, say HPM, or GPS denied, or BVLOS. The suggestions
> show how closely each capability matches, and each one you pick becomes a
> chip. Every range is then scored on how many of your criteria it lists, and
> the results re-rank as you go, best match first, with a check or a cross
> for each criterion and where it was found.
>
> The scoring runs in the browser, in rangeSearch dot JS, over the range data
> already loaded: test types, capability group items, stats, the state, and
> terrain words in the summary. Shorthand like HEL, EW, counter-UAS and FTS,
> and the synonyms behind them, live in that file. When the range office adds
> a capability group, it's searchable straight away, with no code change.
>
> Request a test here opens the request form with that range already chosen,
> through a range parameter carrying the range's code.
>
> Under the finder, Range Explorer runs in expanded mode, so the ranges are
> stacked for comparison instead of tabbed. Atterbury-Muscatatuck is Coming
> soon: its capabilities are listed, but it can't be requested until its
> status is switched to Open.
>
> Ranges and capability groups are public, read-only data. For guests to see
> them, deploy the guest sharing rules in site-config once the site exists,
> and give the site's guest user the PICSite Guest permission set.

---

## 4. Request an account `/request-account` (2:00)

**Shot list**
- 0:00 Click "Request an account" in the header; the page loads.
  `[c-account-request-panel · PIC Account Request Panel]`.
- 0:20 Fill the form slowly: name, organization, work email, CAGE code.
- 0:45 Submit; the harness confirmation note appears. Callout
  `[harness stand-in: org uses self-registration]`.
- 1:05 Slide: the approval checklist (Contact on Account → License ID +
  CAGE Code → Customer Community user → PICSite_Customer → site member).
- 1:35 Back on the page; highlight the header's current-page marker.

**Narration**
> New customers start at Request an account. It's public, and it's a page of
> its own rather than a second form on the sign-in page. That gives each form
> the full width on a phone, and the links don't depend on URL fragments,
> which can't reach inside a component's shadow root.
>
> The panel is PIC Account Request Panel. It asks for a full name, the
> organization, a work email, and the company's CAGE code, its Commercial and
> Government Entity code. The range office verifies the organization and its
> CAGE code before an account is created.
>
> In the org this panel is a visual frame. Put it on the site's
> self-registration page, under Administration, Login and Registration, and
> keep the platform's own registration handling inside it. The form you see
> here is a preview stand-in that only shows a confirmation.
>
> When the range office approves an account, the setup is standard Salesforce.
> Create a Contact on the customer's Account, with the Account's License ID
> and CAGE Code fields filled in. Enable it as a Customer Community user,
> assign the PICSite Customer permission set, and add the profile to the
> site's members. Those two Account fields matter later: the request form
> pre-fills them for every user on that account.
>
> The header, the footer and the quick access panel all link to slash
> request-account. If your self-registration page lives at a different URL,
> give it this one in Builder, or update those three links.
>
> Notice the header marks the page you're on. It compares each link with the
> current path, after the site's base path is applied.

---

## 5. Sign in `/login` (2:00)

**Shot list**
- 0:00 Click "Sign in". `[c-login-panel · PIC Login Panel]`.
- 0:15 Type the mock username and password (masked); Sign in.
- 0:30 Header now shows "JDrone LLC" and Sign out. Callout
  `[harness: scripts/mock-backend.mjs, httpOnly cookie]`.
- 0:50 Callout over the form `[org: standard Login Form goes here]`.
- 1:10 Hover "Sign in with CAC / PIV" `[placeholder for DoD SSO]`.
- 1:25 Slide: page access (public: Home, Ranges, Login, Request an
  account; Requires Login: Request, Track).
- 1:45 Callout `[org: getSession() uses isGuest; Sign out → /secur/logout.jsp]`.

**Narration**
> Sign in is at slash login, framed by PIC Login Panel: a short note on who
> the portal is for, and a link across to request an account.
>
> In this preview the form really signs in. The local dev server reads a mock
> account from a dot env file and checks the password on the server, so it
> never reaches the browser, and the session is an http-only cookie. Here we
> sign in as the mock user from JDrone LLC. The header swaps Sign in and
> Request an account for the company name and Sign out, and the request form
> will pre-fill this account's details.
>
> None of that mock backend exists in the org. Keep the site's own Login
> page, because it owns authentication, lockout and password reset. Put
> Login Panel on it as the frame, and keep the standard Login Form component
> inside it. The panel's own form, and Forgot your password, are preview
> stand-ins.
>
> Sign in with CAC or PIV is a placeholder for the DoD identity provider.
> Once single sign-on is configured, point that button at the provider's
> login URL.
>
> Access is set per page in Builder. Home, Ranges, Login and Request an
> account stay public. Request and Track are marked Requires Login, so a guest
> who follows a link to them is sent here first.
>
> The header asks c slash portalApi for the session. In the org that comes
> from the platform: a signed-in user sees Signed in and Sign out, and Sign
> out goes through the standard logout URL.

---

## 6. Submit a test request `/request` (2:00)

**Shot list**
- 0:00 Click "Request a test". `[c-request-form · PIC Test Request Form]`;
  scroll past "What you'll need".
- 0:15 Step 1, Organization, pre-filled `[CURRENT_USER_QUERY → toUser]`;
  highlight Organization and CAGE code.
- 0:30 Step 2: pick Counter-UAS; the effects options appear.
- 0:45 Step 3: the embedded finder `[c-range-finder · mode=select]`; choose
  a preferred and an alternate range; enter dates.
- 1:05 Step 4: objectives and hazards.
- 1:15 Step 5: review, tick the confirmation, Submit.
- 1:30 Success panel: request number, `[c-file-uploader]`, "Track this
  request". Callout `[submitRequest → createRecord(Test_Request__c)]`.

**Narration**
> Submitting a test request needs a signed-in user. The page is a compact
> hero and PIC Test Request Form, a five-step wizard. Above the form, What
> you'll need lists four things: a CAGE code, a test description, preferred
> dates and safety data.
>
> Step one, Organization, is pre-filled from the signed-in user and their
> account: the organization, CAGE code, contact, license ID, email and phone.
> That's the current user query in GraphQL, shaped by toUser in portalModel.
>
> Step two is the test type: UAS, counter-UAS, long-range fires or low-cost
> interceptor. Each type brings its own fields, such as the UAS group, the
> counter-UAS effects, or the munition and maximum range.
>
> Step three, Range and dates, embeds the range finder in select mode. It
> starts from the test type you picked, ranks the ranges, and you choose a
> preferred and an alternate range. Coming soon ranges are shown but can't be
> chosen. Then the dates, the number of range days, an optional event, and
> whether the dates are flexible.
>
> Step four is test details: objectives, instrumentation, hazards and
> personnel. Step five reviews everything and asks the customer to confirm.
>
> Submit calls submitRequest in portalApi, which is createRecord on Test
> Request, with toRequestFields mapping the form to fields and dropping
> empties. Status, next action and the range point of contact are never sent;
> they take their defaults and are read-only for customers.
>
> The success panel shows the request number and a file uploader bound to the
> new record, so attachments land on the request. Track this request opens
> the tracker on that request.

---

## 7. Track requests `/track` (2:00)

**Shot list**
- 0:00 `/track`. `[c-request-tracker · PIC Test Status Tracker]`; callout
  `[MY_REQUESTS_QUERY · first: 200 · sharing filters]`.
- 0:15 Click the "Active requests" tile; the picker opens; type "hpm",
  press Enter.
- 0:35 Hover the star column; the list slides out. Type "dugway" in its
  search.
- 0:55 Select TR-2026-0137 (Needs info): the yellow banner with the office's
  question and the uploader.
- 1:20 Scroll to Activity: grey steps at the top, gold rope below.
- 1:40 Select TR-2026-0088 (Complete): all gold. Callout
  `[Request_Activity__c written by flows]`.

**Narration**
> Track requests also needs a signed-in user. It lists every request the user
> can see, and sharing does the filtering: the PICSite Customer sharing set
> gives community users the requests on their own account, so the query has
> no where clause. All of them come back in one GraphQL query, up to two
> hundred, and everything else on this page happens in the browser.
>
> The four tiles count active requests, those that need attention, scheduled
> and completed. Click a tile and you get that request, or, when there are
> several, a picker with a filter at the top. Type a few words and press Enter
> to open the top match.
>
> The request list sits in the narrow column on the left, behind the Army
> star, so the request itself gets the full width. Hover over the column, or
> tab to it, and the whole list opens: filter tabs, New request, and a search
> that matches every word you type against the number, title, range, dates,
> status, contact and activity notes.
>
> When a request needs information, the yellow banner shows the range
> office's actual question, taken from the latest Needs info activity, with
> the file uploader right under it.
>
> Activity reads as a climb. Submitted is at the bottom, each status change
> sits above it in gold, and the steps still ahead are grey at the top,
> joined by a rope that's gold up to where the request has reached.
>
> Those activity records are written by the flows, in system context, each
> time the status changes, so customers never need create access to them. And
> a link with an id parameter set to a request number opens that request
> directly.

---

## 8. How the code fits together (3:00)

**Shot list**
- 0:00 Code view: the `force-app/main/default/lwc` tree.
- 0:20 `portalApi/portalApi.js`: highlight the four queries,
  `submitRequest`, `href`.
- 0:55 `portalModel/portalModel.js`: `STATUS_STEPS`, `toRequests`,
  `toRequestFields`.
- 1:20 `requestTracker.js`: the `@wire(graphql, { query: MY_REQUESTS_QUERY })`
  block.
- 1:35 `picStyles/picStyles.css` and the `--pic-*` tokens.
- 1:55 Diagram: `sync-lwr-modules.mjs` aliasing `c/<name>`; `src/mock/portalApi`
  replacing the real one.
- 2:30 Terminal card: `npm install`, `copy .env.example .env`, `npm run dev`.

**Narration**
> Now the code. Everything you deploy is under force-app, main, default. The
> lwc folder has twenty-one components. Most are page sections, and a few are
> shared modules.
>
> c slash portalApi is the only place that talks to Salesforce. It re-exports
> the GraphQL wire adapter from lightning slash uiGraphQLApi, defines the four
> queries, for ranges, events, my requests and the current user, and exports
> submitRequest, which wraps createRecord. It also exports href, which
> prefixes the site's base path, so the same links work at the root in the
> preview and under slash picsite in the org.
>
> c slash portalModel is plain JavaScript with no platform imports: the status
> steps, the option lists, whose values are the picklist API names, and the
> functions that turn GraphQL results into what the templates need, and the
> form back into record fields. Because it's pure, it runs the same in the
> preview and in the org.
>
> Components wire the queries directly. Here's the tracker: wire graphql with
> the my requests query, then toRequests from the model.
>
> c slash picStyles is a shared CSS module for the container, buttons, cards
> and form fields. Every component reads only the dash dash pic design
> tokens, and there's no SLDS, so the components look the same in the preview
> and the org. The tokens go into the site's head markup; the block to paste
> is in the Experience Cloud guide. c slash fileUploader isolates
> lightning-file-upload, the only base component in the project.
>
> The preview works by swapping two modules. scripts slash sync-lwr-modules
> registers every force-app component as c slash its name, and any bundle in
> src slash mock with the same name takes its place. The mock portalApi
> answers the same queries with records in UI API shape, so the real shaping
> code runs unchanged. src slash modules holds the six page compositions,
> matching the Builder pages.
>
> To run it: npm install, copy dot env dot example to dot env, then npm run
> dev, and open localhost three thousand. Edits reload in the browser as you
> save.

---

## 9. Salesforce data and automation (2:30)

**Shot list**
- 0:00 Diagram: three master-detail pairs and the two Account fields.
- 0:40 Diagram: the three flows on the request timeline (create → status
  change → 5-day reminder), the `PIC_Portal_URL` label.
- 1:20 Table: three permission sets, the sharing set, `site-config` sharing
  rules.
- 2:05 The `data/` folder and the `npm run sample-data` command.

**Narration**
> The data model is six custom objects in three master-detail pairs. Test
> Range with Capability Group: a range has a summary, test types, a stats
> field holding JSON, a status of Open or Coming soon, and coordinates, and
> its capability groups list the items for each test type and the range
> environment. Test Event with Event Session, for events like the DDIL
> series. And Test Request with Request Activity, which is the timeline. On
> Account there are two fields, License ID and CAGE Code.
>
> Three record-triggered flows run after a submit. PIC Request Created writes
> the first activity and sends a confirmation email. PIC Request Status
> Changed writes an activity and emails the contact on every status change,
> linking back to the tracker through the PIC Portal URL custom label. And PIC
> Request Needs Info Reminder has a scheduled path that reminds the customer
> five days after a request enters Needs info.
>
> The range office works the records in Lightning, using the three tabs. They
> set the status, the note, the next action and the range point of contact;
> customers can read those fields but not change them.
>
> Access is three permission sets and one sharing set: PICSite Customer for
> community users, PICSite Guest for the public pages, and PICSite Range
> Office for internal staff, with view all and modify all on requests. Test
> Request is private: the submitter owns it, and the sharing set extends edit
> access to everyone on the same account. Ranges and events are public read
> only, and guests reach them through the sharing rules in site-config.
>
> Reference data is in the data folder, loaded with S F data import tree. The
> code field is an external ID, so re-running updates in place. That JSON is
> generated from the preview's mock data, so edit the mock and run npm run
> sample-data.

---

## 10. Deploying to Experience Cloud (2:00)

**Shot list**
- 0:00 Numbered checklist slide, items lighting up in turn, with the
  commands from `docs/EXPERIENCE_CLOUD.md` in a terminal style.
- 1:10 Builder checklist slide: head markup, theme, regions, pages, page
  access, static resources.
- 1:45 Callout: `docs/EXPERIENCE_CLOUD.md` has every value.

**Narration**
> The deployment order matters. Start with a scratch org from the project's
> scratch definition, or a sandbox with Digital Experiences enabled and flows
> deploying as active. Deploy force-app. If it stops on the sharing set, the
> org doesn't have a Customer Community user profile yet.
>
> Create the site with S F community create, using the Build Your Own LWR
> template and the URL prefix picsite. Once it exists, import the reference
> data, then deploy site-config for the guest sharing rules.
>
> Then in Setup: set the PIC Portal URL label to the site's URL, assign the
> range office and guest permission sets, set email deliverability to All
> email while you test, and create the first customer users.
>
> In Builder: paste the head markup with the design tokens, set the theme
> background, put the gov banner and header in the header region and the
> footer in the footer region, then build each page from the component list
> in the Experience Cloud guide, using the property values given there. Mark
> Request and Track as Requires Login. Upload the official Army logo and the
> hero artwork as static resources, and set the logo URL on the header, the
> footer and the tracker. On a dot mil site, host the Inter font as a static
> resource instead of loading it from Google Fonts.
>
> Every value and command in this section is in docs slash Experience Cloud
> dot M D.

---

## 11. Preview only vs. the org (0:45)

**Shot list**
- 0:00 Two-column slide, "Preview" and "Org", one row per item, rows
  appearing with the narration.

**Narration**
> A short list of what exists only in the preview. The mock backend and the
> dot env account: in the org, the site's login page handles sign-in. The
> sign-in and account request forms: in the org these panels frame the
> standard login and self-registration. The plain file input: in the org
> it's lightning-file-upload. And the mock data, with submissions kept in
> session storage: in the org it's GraphQL and createRecord.
>
> Everything else, the components, the model and the styles, is the same code
> in both places.

---

## 12. Before launch (0:45)

**Shot list**
- 0:00 Checklist slide, ticking through the open items.
- 0:35 Closing shot: the home page.

**Narration**
> A few things to settle before launch. The range offices should confirm the
> range capabilities, which come from public sources as of October twenty
> twenty-six; the open questions are listed in the README.
> Atterbury-Muscatatuck switches to Open once the Army designates it. Replace
> the derived Army logo with Brand Central's official reverse file, and
> replace the placeholder hero artwork and the placeholder range office email
> address.
>
> The README and the Experience Cloud guide cover every step in this video.
> Thanks for watching.

---

## 13. End card (0:05)

**On screen:** "PICSite · web.git.mil/atec/PICSite · docs/EXPERIENCE_CLOUD.md".
No narration.
