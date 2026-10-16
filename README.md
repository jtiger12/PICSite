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
taken). Routes: `/`, `/ranges`, `/request`, `/track`, `/login`.

`npm run dev` regenerates `lwr.config.json` module aliases from
`force-app/main/default/lwc` so every SFDX component resolves as `c/<name>`,
swaps in the harness mocks from `src/mock/`, then starts `lwr dev`. Re-run it
after adding a component. The harness runs entirely on mock data; mock
submissions live in `sessionStorage` for the browser session.

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
did. Set `PICSITE_PORT` to publish a different host port, and `NODE_IMAGE` to
use another glibc-based Node 22 base image (e.g. Iron Bank); both can go in a
`.env` file next to `docker-compose.yml`. `docker compose logs -f picsite`
follows output, `docker compose down` stops it.

On Docker Desktop (or any containerd image store), BuildKit's timestamped
provenance gives every build a new image ID, so the command above restarts the
container even when nothing changed. To make an unchanged rerun a no-op:

```bash
BUILDX_NO_DEFAULT_ATTESTATIONS=1 docker compose up -d --build
```

Like `npm start`, the container serves the harness with mock data, for demos
and review. The real site deploys to Experience Cloud (below).

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
    rangeExplorer, capabilityList
    requestForm, requestTracker, statusChip, loginPanel
  objects/                    Test_Range__c + Capability_Group__c, Test_Event__c + Event_Session__c,
                              Test_Request__c + Request_Activity__c, Account.License_ID__c
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
scripts/                      dev launcher and alias generator
```

Components use plain HTML/CSS and the `--pic-*` tokens only (no SLDS), so
they render the same in the harness and in Experience Cloud. The one base
component, `lightning-file-upload`, is isolated inside `c/fileUploader`.

## Data access

- **Reads** are UI API GraphQL queries wired straight into the components:
  `@wire(graphql, { query: RANGES_QUERY })` in `rangeExplorer`, `EVENTS_QUERY`
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

- Capability lists for West Cibola, Camp Grayling, Camp Shelby and AMTEC are
  placeholders (`Pending__c` in `data/Test_Range__c.json` and
  `src/mock/portalApi/data.js`); only Dugway's are carried over from the
  current site.
- Hero imagery and the official Army mark: `contours.svg` and the inline star
  are placeholders.
- Range office contact address (`usarmy.testrange@army.mil` is a placeholder).
- The site URL in the `PIC_Portal_URL` custom label.
