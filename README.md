# PICSite - Test on Army Ranges portal

Customer-facing portal for licensed customers to submit UAS, counter-UAS and
long-range fires test requests on Army test ranges, track submission status,
and browse range capabilities. Built as Lightning Web Components for an
Experience Cloud (LWR) site, with a local LWR harness for previewing without
an org. Data access is platform-native (GraphQL wire adapter, Lightning Data
Service, Flows); there is no Apex.

Design notes, tokens and the site map are in [DESIGN.md](DESIGN.md).
Org deployment, page compositions and the access model are in
[docs/EXPERIENCE_CLOUD.md](docs/EXPERIENCE_CLOUD.md).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (the launcher picks the next free port if 3000 is
taken). Routes: `/`, `/ranges`, `/request`, `/track`, `/login`,
`/request-account`.

`npm run dev` regenerates `lwr.config.json` module aliases from
`force-app/main/default/lwc` so every SFDX component resolves as `c/<name>`,
swaps in the harness mocks from `src/mock/`, loads `.env`, then runs the LWR
dev server (hot reload on) with a small mock backend in front of it
(`scripts/mock-backend.mjs`). Re-run it after adding a component or changing
`.env` or `scripts/`. `npm run dev -- --port 3001` picks another port. The
harness runs on mock data; mock submissions live in `sessionStorage` for the
browser session.

### Mock account

Copy `.env.example` to `.env` (ignored by git, Docker and `sf deploy`) and set
the mock account. Sign in at `/login` with its username and password: the
header then shows the company with *Sign out*, and the request form pre-fills
the organization and CAGE code. The backend checks the password and
keeps the session in an httpOnly cookie, so the password never reaches the
browser; restarting `npm run dev` signs you out. Routes: `POST /api/login`,
`POST /api/logout`, `GET /api/session`. Without a `.env`, or in the static
build below (no backend), sign-in explains that and the request form falls
back to the built-in demo user.

## Run the built site

```bash
npm start
```

Serves the production build (`lwr start`) on http://localhost:3000, or
`PORT`. Every step is skipped when it has nothing to do:

- `npm ci` only when `package-lock.json` differs from the last install
- `lwr build` into `site/` only when `src/`, `force-app/main/default/lwc` or
  `lwr.config.json` changed since the last build

`npm start -- --rebuild` forces a build. `npm run serve` serves the existing
`site/` as-is. Requires Node 22+.

## Run in Docker

On the target machine (Docker 23+ with Compose v2; the Dockerfile needs
BuildKit):

```bash
docker compose up -d --build
```

The image builds the site inside a `node:22-slim` container and serves it on
port 3000. The runtime image keeps only the generated `site/` and `express`,
the server `lwr start` uses for it, so it is the Node base image plus about
6 MB. Docker's layer cache skips steps whose inputs did not change:
reinstalling only when `package*.json` changed, rebuilding only when sources
did. Set `NODE_IMAGE` to use another glibc-based Node 22 base image (e.g.
Iron Bank); it can go in a `.env` file next to `docker-compose.yml`.
`docker compose logs -f picsite` follows output, `docker compose down` stops
it.

On Docker Desktop (or any containerd image store), BuildKit's timestamped
provenance gives every build a new image ID, so the command above restarts the
container even when nothing changed. To make an unchanged rerun a no-op:

```bash
BUILDX_NO_DEFAULT_ATTESTATIONS=1 docker compose up -d --build
```

Like `npm start`, the container serves the harness with mock data, for demos
and review. The real site deploys to Experience Cloud (below).

### Hostinger VPS

The demo runs on the Hostinger VPS `srv828657.hstgr.cloud` at
http://168.231.74.69:3000/. Every push to `main` on GitHub redeploys it:
[deploy.yml](.github/workflows/deploy.yml) opens an SSH session to the VPS and
pipes in [scripts/deploy-vps.sh](scripts/deploy-vps.sh), which updates the
checkout under `/src/PICSite` and runs `docker compose up -d --build`. The
workflow needs one repository secret, `VPS_SSH_KEY`: a private key whose public
half is attached to the VPS (hPanel > VPS > SSH keys). The same script deploys
by hand from any machine whose key is on the VPS:

```bash
ssh root@srv828657.hstgr.cloud 'bash -s' < scripts/deploy-vps.sh
```

## Layout

```
force-app/main/default/
  lwc/                        the deployable components (c/ namespace)
    picStyles/                shared CSS module: container, buttons, cards, form fields
    portalModel/              pure data model: status steps, option lists, GraphQL -> template
                              shaping, form -> Test_Request__c field mapping, href prefixing
    portalApi/                data seam: GraphQL queries + wire adapter re-exports, createRecord,
                              site base path (swapped for src/mock/portalApi in the harness)
    fileUploader/             lightning-file-upload wrapper bound to a request record
    govBanner, siteHeader, siteFooter
    heroBanner, quickAccessPanel, valueProps, eventBanner, ctaBand, processStepper
    rangeExplorer, capabilityList, rangeFinder (capability search + rangeSearch.js scoring)
    requestForm, requestTracker, statusChip, loginPanel, accountRequestPanel
  objects/                    Test_Range__c + Capability_Group__c, Test_Event__c + Event_Session__c,
                              Test_Request__c + Request_Activity__c, Account.License_ID__c + CAGE_Code__c
  flows/                      PIC_Request_Created, PIC_Request_Status_Changed,
                              PIC_Request_Needs_Info_Reminder (scheduled path, 5 days)
  permissionsets/             PICSite_Customer, PICSite_Guest, PICSite_Range_Office
  sharingSets/                PICSite_Customer: community users see their account's requests
  labels/, tabs/              PIC_Portal_URL for the flow emails; tabs for the range office
site-config/                  guest-user sharing rules (deploy after the site exists)
config/project-scratch-def.json
data/                         sample ranges and events for `sf data import tree`
docs/EXPERIENCE_CLOUD.md      deployment order, head markup, page compositions, access
src/                          local harness only (ignored by .forceignore)
  mock/portalApi/             same exports as c/portalApi over mock GraphQL responses
  mock/fileUploader/          plain file input stand-in for lightning-file-upload
  modules/picsite/<page>/     page compositions for the LWR routes
  layouts/main.html           document shell: Inter font + global.css
  assets/global.css           :root design tokens
  assets/img/contours.svg     placeholder hero background
scripts/                      dev launcher, mock backend (/api, .env account) and alias generator
```

Components use plain HTML/CSS and the `--pic-*` tokens only (no SLDS), so
they render the same in the harness and in Experience Cloud. The one base
component, `lightning-file-upload`, is isolated inside `c/fileUploader`.

## Data access

- **Reads** are UI API GraphQL queries wired straight into the components:
  `@wire(graphql, { query: RANGES_QUERY })` in `rangeExplorer` and `rangeFinder`, `EVENTS_QUERY`
  in `eventBanner`, `MY_REQUESTS_QUERY` in `requestTracker`, and all three
  plus `CURRENT_USER_QUERY` in `requestForm`. `c/portalModel` turns the
  results into the shapes the templates expect.
- **Writes**: `submitRequest()` in `c/portalApi` calls `createRecord` on
  `Test_Request__c`. The record-triggered flows log the first activity, email
  the contact, mirror every later status change into the activity timeline,
  and remind the customer after five days in *Needs info*.
- **Attachments**: after submit, the success panel (and the tracker for
  requests in *Needs info*) shows `c/fileUploader` bound to the request.
- **Links**: `href()` from `c/portalApi` prefixes the site base path, so the
  components work at `/` locally and under `/picsite/` in the org.
- **Harness swap**: `scripts/sync-lwr-modules.mjs` aliases any
  `src/mock/<name>/<name>.js` over the force-app component of the same name.
  The mock `graphql` is a wire adapter that answers the query tokens with
  mock records in UI API response shape, so the shaping code runs unchanged.

## Deploying to Experience Cloud

The short version (details, head markup and page-by-page compositions in
[docs/EXPERIENCE_CLOUD.md](docs/EXPERIENCE_CLOUD.md)):

1. `sf org create scratch -f config/project-scratch-def.json -a picsite -d`
   (or use a sandbox with Digital Experiences enabled).
2. `sf project deploy start --source-dir force-app -o picsite`
3. `sf community create --name PICSite --template-name "Build Your Own (LWR)" --url-path-prefix picsite -o picsite`
4. `sf data import tree --files data/Test_Range__c.json,data/Test_Event__c.json -o picsite`
5. `sf project deploy start --source-dir site-config -o picsite` (guest sharing rules)
6. Set the `PIC_Portal_URL` custom label, assign the permission sets, paste
   the head markup, build the pages, mark `/request` and `/track` as
   *Requires Login*, and set email deliverability to *All email*.

## Content still to confirm

- Range capabilities come from public sources (army.mil, DVIDS, the ranges'
  own pages, FAA airspace records, October 2026) plus Dugway's fires lines
  from the current site; the range offices should confirm them. Open points:
  Dugway's runway length (sources give 6,000-11,000 ft) and its "None" for
  counter-drone instrumentation; Camp Grayling's acreage (148,000 vs nearly
  200,000) and whether the BVLOS corridor is operational; West Cibola's and
  the Morocco complex's boundaries, airspace and coordinates (the mock uses
  Laguna Army Airfield and Tan-Tan); dates for the next quarterly DDIL event.
  Edit `src/mock/portalApi/data.js`, then `npm run sample-data` rewrites
  `data/*.json`.
- Atterbury-Muscatatuck is *Coming soon*: the Indiana delegation asked the
  Army to designate it on Sept 30, 2026; switch `Status__c` to *Open* once
  it is.
- The Army logo: the header and footer use `src/assets/img/army-logo-dark.png`,
  made from `army-logo.jpg` (the stacked logo for light backgrounds, from the
  Family and MWR Brand Central *NEW U.S. Army Logo* collection) by cropping,
  making the white background transparent and turning the black "U.S. ARMY"
  wordmark white, as in the official reverse version. Before launch, replace
  it with Brand Central's own reverse file ("NEW Army Logo 1 Rev -
  Horizontal", or "NEW US Army Logo 2 - Vertical" rev) at
  https://www.mwrbrandcentral.com/collections/26115 (sign-in required).
- Hero imagery: `contours.svg` is a placeholder.
- Range office contact address (`usarmy.testrange@army.mil` is a placeholder).
- The site URL in the `PIC_Portal_URL` custom label.
