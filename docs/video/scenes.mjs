// What happens on screen in each scene, keyed to the narration clock.
//
// Each scene: { n, signIn?, setup(h), steps: [[at, fn], ...] }. `at` is a
// number of seconds into the scene, 'pN' (paragraph N starts), 'sN' (sentence
// N starts), optionally with an offset such as 's7+2.5'; indexes are 0-based
// and follow the narration in script.md (see out/audio/timings.json). `h` is
// the helper object from record.mjs. Labels show the LWC tag and, after the
// dot, the Experience Builder name, data source or field.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deck, titleSlide, chaptersSlide, endSlide, slide, codeSlide } from './lib/slides.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const timings = JSON.parse(readFileSync(join(here, 'out', 'audio', 'timings.json'), 'utf8'));

const tag = (name, sub) => (sub ? `${name}<small>${sub}</small>` : name);

// ---------- selectors (Playwright CSS reaches into open shadow roots) ----------
const HEADER = 'c-site-header header';
const NAV = (text) => `c-site-header a.link:has-text("${text}")`;
const NAV_BTN = (text) => `c-site-header .nav-actions a:has-text("${text}")`;
const FORM = 'c-request-form';
const FIELD = (name) => `${FORM} [data-field="${name}"]`;
const CONTINUE = `${FORM} button:has-text("Continue")`;
const TRACK = 'c-request-tracker';

// ---------- slide decks ----------
const introDeck = deck([
    slide('The repository', 'Two halves', `
        <div class="grid cols-2" style="gap:40px;align-content:start">
            <div class="card card--gold" data-step="1">
                <h3><code style="font-size:30px">force-app/</code> <span class="muted" style="font-size:22px;font-weight:500">deploys to the org</span></h3>
                <ul class="list small" style="margin-top:18px">
                    <li>21 Lightning Web Components</li><li>Custom objects and fields</li>
                    <li>Three record-triggered flows</li><li>Permission sets, sharing set, label, tabs</li>
                </ul>
            </div>
            <div class="card" data-step="2">
                <h3><code style="font-size:30px">src/</code> + <code style="font-size:30px">scripts/</code> <span class="muted" style="font-size:22px;font-weight:500">local preview only</span></h3>
                <ul class="list small" style="margin-top:18px">
                    <li>The same components, on mock data</li><li>Mock GraphQL and createRecord</li>
                    <li>Mock sign-in from <code>.env</code></li><li><code>npm run dev</code>, with hot reload</li>
                </ul>
            </div>
        </div>
        <p class="lead" data-step="3" style="margin-top:40px">Then: the six pages, the code, the data model and deployment.</p>`)
]);

const lwcTree = (() => {
    const shared = ['portalApi', 'portalModel', 'picStyles'];
    const all = ['accountRequestPanel', 'capabilityList', 'ctaBand', 'eventBanner', 'fileUploader', 'govBanner', 'heroBanner', 'loginPanel',
        'processStepper', 'quickAccessPanel', 'rangeExplorer', 'rangeFinder', 'requestForm', 'requestTracker', 'siteFooter', 'siteHeader', 'statusChip', 'valueProps'];
    return slide('force-app/main/default/lwc', '21 components', `
        <div class="grid" style="grid-template-columns:2.3fr 1fr;gap:40px">
            <div class="card" style="padding:36px 40px"><p class="muted" style="font-size:24px;margin-bottom:26px">Page sections and parts (template + CSS)</p>
                <div class="grid cols-3" style="gap:22px 26px">${all.map((c) => `<span class="mono" style="font-size:29px">${c}</span>`).join('')}</div></div>
            <div class="card card--gold" data-step="1" style="padding:36px 40px"><p class="gold" style="font-size:24px;margin-bottom:26px">Shared modules (no template)</p>
                <div style="display:grid;gap:22px">${shared.map((c) => `<span class="mono" style="font-size:34px">${c}</span>`).join('')}</div>
                <p class="muted" style="font-size:22px;margin-top:30px">Data access, the model, and the shared CSS</p></div>
        </div>`);
})();

const codeDeck = deck([
    lwcTree,
    codeSlide('force-app/main/default/lwc/portalApi/portalApi.js', [
        { find: "from 'lightning/uiGraphQLApi'", lines: 6, note: 'Platform imports: GraphQL wire adapter, <code>createRecord</code>, user and site base path' },
        { find: 'export const RANGES_QUERY', lines: 20, note: '<code>RANGES_QUERY</code>: ranges with their capability groups' },
        { find: 'export const MY_REQUESTS_QUERY', lines: 18, note: '<code>MY_REQUESTS_QUERY</code>: <code>first: 200</code>, sharing does the filtering' },
        { find: 'export function submitRequest', lines: 3, note: '<code>submitRequest</code> = <code>createRecord</code> on <code>Test_Request__c</code>' },
        { find: 'export const BASE_PATH', lines: 2, note: '<code>href()</code> prefixes <code>@salesforce/community/basePath</code>' }
    ]),
    codeSlide('force-app/main/default/lwc/portalModel/portalModel.js', [
        { find: 'export const STATUS_STEPS', lines: 6, note: 'Status steps and option lists (values are picklist API names)' },
        { find: 'export function toRequests', lines: 5, note: 'GraphQL result → template shape' },
        { find: 'export function toRequestFields', lines: 22, note: 'Form → <code>Test_Request__c</code> fields, empties dropped' }
    ]),
    codeSlide('force-app/main/default/lwc/requestTracker/requestTracker.js', [
        { find: '@wire(graphql, { query: MY_REQUESTS_QUERY })', lines: 23, note: 'Components wire the queries directly, then shape with <code>c/portalModel</code>' }
    ]),
    codeSlide('src/assets/global.css', [
        { find: ':root {', lines: 26, note: 'Design tokens: paste into Builder › Settings › Advanced › Head Markup' }
    ]),
    slide('Local preview', 'Two modules swapped, everything else real', `
        <div class="grid" style="grid-template-columns:1fr 90px 1fr;gap:20px;align-items:center">
            <div class="card" data-step="1"><p class="muted small">scripts/sync-lwr-modules.mjs</p>
                <p style="font-size:28px;margin-top:10px">Registers every <code>force-app</code> component as <code>c/&lt;name&gt;</code> for the open-source LWR server</p></div>
            <div class="arrow" data-step="1">→</div>
            <div class="card card--gold" data-step="1"><p class="gold small">src/mock/&lt;name&gt;/ wins</p>
                <p style="font-size:28px;margin-top:10px"><code>c/portalApi</code>: mock GraphQL in UI API shape<br><code>c/fileUploader</code>: plain file input</p></div>
        </div>
        <div class="grid cols-2" style="gap:26px;margin-top:34px" data-step="2">
            <div class="card"><p style="font-size:26px"><code>c/portalModel</code> and every component run unchanged</p></div>
            <div class="card"><p style="font-size:26px"><code>src/modules/picsite/*</code>: the six pages, as composed in Builder</p></div>
        </div>`),
    slide('Run it', 'Local preview', `
        <div class="term" style="max-width:1100px">
            <div><span class="p">&gt;</span> npm install</div>
            <div><span class="p">&gt;</span> copy .env.example .env <span class="c"># set the mock account</span></div>
            <div><span class="p">&gt;</span> npm run dev</div>
            <div class="c" style="margin-top:14px">Application is available at: http://localhost:3000</div>
        </div>
        <p class="lead" style="margin-top:36px" data-step="1">Edits reload in the browser as you save.</p>`)
]);

const dataDeck = deck([
    slide('Data model', 'Six objects, three master-detail pairs', `
        <div class="grid cols-2" style="gap:24px">
            <div class="card" data-step="1"><h3>Test_Range__c <span class="gold">→</span> Capability_Group__c</h3>
                <p class="muted small">Summary, Test_Types__c, Stats__c (JSON), Status__c (Open / Coming soon), Latitude / Longitude · items per test type and range environment</p></div>
            <div class="card" data-step="2"><h3>Test_Event__c <span class="gold">→</span> Event_Session__c</h3>
                <p class="muted small">Events such as the quarterly DDIL series, with dated sessions</p></div>
            <div class="card" data-step="3"><h3>Test_Request__c <span class="gold">→</span> Request_Activity__c</h3>
                <p class="muted small">The request, and its activity timeline</p></div>
            <div class="card card--gold" data-step="4"><h3>Account</h3>
                <p class="small"><code>License_ID__c</code> · <code>CAGE_Code__c</code></p></div>
        </div>`),
    slide('Automation', 'Three record-triggered flows', `
        <div class="grid cols-3" style="gap:24px">
            <div class="card" data-step="1"><p class="gold small" style="margin-bottom:10px">On create</p><h3>PIC_Request_Created</h3>
                <p class="muted small">First activity + confirmation email</p></div>
            <div class="card" data-step="2"><p class="gold small" style="margin-bottom:10px">On every status change</p><h3>PIC_Request_Status_Changed</h3>
                <p class="muted small">Activity + email to the contact, linking to <code>/track</code> via the <code>PIC_Portal_URL</code> label</p></div>
            <div class="card" data-step="3"><p class="gold small" style="margin-bottom:10px">5 days in Needs info</p><h3>PIC_Request_Needs_Info_Reminder</h3>
                <p class="muted small">Scheduled path: reminder email</p></div>
        </div>`),
    slide('Range office', 'Works the records in Lightning', `
        <div class="card" style="max-width:1200px">
            <table class="t"><tr><th>Field on Test_Request__c</th><th>Range office</th><th>Customer</th></tr>
            <tr><td><code>Status__c</code></td><td>Edit</td><td>Read only</td></tr>
            <tr><td><code>Status_Note__c</code></td><td>Edit</td><td>Read only</td></tr>
            <tr><td><code>Next_Action__c</code></td><td>Edit</td><td>Read only</td></tr>
            <tr><td><code>Range_POC__c</code></td><td>Edit</td><td>Read only</td></tr></table>
        </div>
        <p class="lead" style="margin-top:30px">Tabs for ranges, events and requests come with the package.</p>`),
    slide('Access', 'Three permission sets, one sharing set', `
        <div class="card"><table class="t">
            <tr><th>Who</th><th>Gets</th></tr>
            <tr data-step="1"><td><code>PICSite_Customer</code></td><td>Community users: submit and read their account's requests</td></tr>
            <tr data-step="1"><td><code>PICSite_Guest</code></td><td>The site's guest user: public pages</td></tr>
            <tr data-step="1"><td><code>PICSite_Range_Office</code></td><td>Internal staff: View All / Modify All on requests, the tabs</td></tr>
            <tr data-step="2"><td>Sharing set <code>PICSite_Customer</code></td><td><code>Test_Request__c</code> is private; Edit for everyone on the same account</td></tr>
            <tr data-step="3"><td><code>site-config/</code> sharing rules</td><td>Ranges and events: public read only, reachable by guests</td></tr>
        </table></div>`),
    slide('Reference data', 'Ranges and events from data/', `
        <div class="term" style="font-size:26px">
            <div><span class="p">&gt;</span> sf data import tree --files data/Test_Range__c.json,data/Test_Event__c.json -o picsite</div>
            <div class="c" style="margin-top:8px"># Code__c is an external ID: re-running updates in place</div>
            <div style="margin-top:22px" data-step="1"><span class="p">&gt;</span> npm run sample-data <span class="c"># regenerate the JSON from src/mock/portalApi/data.js</span></div>
        </div>`)
]);

const deployDeck = deck([
    slide('Deployment order', 'Org and site', `
        <ol class="list">
            <li data-step="1"><span>Scratch org from <code>config/project-scratch-def.json</code>, or a sandbox with Digital Experiences and flows deploying active</span></li>
            <li data-step="2"><span><code>sf project deploy start --source-dir force-app</code> <span class="muted small">(stops on the sharing set if there's no Customer Community profile)</span></span></li>
            <li data-step="3"><span><code>sf community create</code>: Build Your Own (LWR), URL prefix <code>picsite</code></span></li>
            <li data-step="4"><span>Import the reference data from <code>data/</code></span></li>
            <li data-step="4"><span>Deploy <code>site-config</code>: guest sharing rules</span></li>
        </ol>`),
    slide('Setup', 'Then in Setup', `
        <ol class="list">
            <li data-step="1"><span>Custom label <code>PIC_Portal_URL</code> = the site's URL</span></li>
            <li data-step="2"><span>Assign <code>PICSite_Range_Office</code>, and <code>PICSite_Guest</code> to the guest user</span></li>
            <li data-step="3"><span>Email deliverability: <b>All email</b> while testing</span></li>
            <li data-step="4"><span>First customer users: Contact on the Account, Customer Community user, <code>PICSite_Customer</code>, site member</span></li>
        </ol>`),
    slide('Experience Builder', 'Then in Builder', `
        <ol class="list" style="font-size:26px;gap:14px">
            <li data-step="1"><span>Head markup: the <code>--pic-*</code> design tokens · theme background <code>#16181C</code></span></li>
            <li data-step="2"><span>Header region: Gov Banner + Site Header · footer region: Site Footer</span></li>
            <li data-step="3"><span>Build each page from the component lists in <code>docs/EXPERIENCE_CLOUD.md</code></span></li>
            <li data-step="4"><span>Request and Track: <b>Requires Login</b></span></li>
            <li data-step="5"><span>Static resources: official Army logo, hero artwork · set the logo URL on header, footer and tracker</span></li>
            <li data-step="6"><span>On .mil: host the Inter font as a static resource, not Google Fonts</span></li>
        </ol>`),
    slide('Reference', 'Every value and command', `<div class="card card--gold" style="max-width:1100px">
        <p style="font-size:44px;font-weight:800"><code style="font-size:44px">docs/EXPERIENCE_CLOUD.md</code></p>
        <p class="lead" style="margin-top:16px">Deployment order, site settings, head markup, page compositions with property values, access model</p></div>`)
]);

const previewDeck = deck([
    slide('Preview only', 'What exists only in the preview', `
        <div class="card"><table class="t">
            <tr><th>Preview</th><th>In the org</th></tr>
            <tr data-step="1"><td>Mock backend + <code>.env</code> account</td><td>The site's login page</td></tr>
            <tr data-step="2"><td>Sign-in and account request forms</td><td>Panels frame the standard login and self-registration</td></tr>
            <tr data-step="3"><td>Plain file input</td><td><code>lightning-file-upload</code></td></tr>
            <tr data-step="4"><td>Mock data, submissions in sessionStorage</td><td>GraphQL and <code>createRecord</code></td></tr>
        </table></div>
        <p class="lead" style="margin-top:30px" data-step="5">Everything else, the components, the model and the styles, is the same code.</p>`)
]);

const launchDeck = deck([
    slide('Before launch', 'Open items', `
        <ul class="list todo">
            <li data-step="1"><span>Range offices confirm the range capabilities (public sources, October 2026); open questions in the README</span></li>
            <li data-step="2"><span>Atterbury-Muscatatuck: switch <code>Status__c</code> to Open once designated</span></li>
            <li data-step="3"><span>Official reverse Army logo from Brand Central · hero artwork · range office email address</span></li>
        </ul>`)
]);

// ---------- scenes ----------
export const scenes = [
    {
        n: 0,
        async setup(h) {
            await h.deck(deck([titleSlide(), chaptersSlide(timings)]));
            await h.cursor(false);
            await h.show(0);
        },
        steps: [[4.6, (h) => h.show(1)]]
    },
    {
        n: 1,
        async setup(h) {
            await h.goto('/');
            await h.moveTo(1500, 760, 200);
        },
        steps: [
            ['s1+3', (h) => h.glideBy(420, 5000)],
            ['s3', (h) => h.callout('No Apex · reads: UI API <b>GraphQL</b> wire adapter · writes: <b>Lightning Data Service</b> · after a submit: <b>flows</b>')],
            ['p2-0.4', async (h) => { await h.deck(introDeck); await h.cursor(false); await h.show(0); }],
            ['s4+2.5', (h) => h.reveal(1)],
            ['s5', (h) => h.reveal(2)],
            ['p3', (h) => h.reveal(3)]
        ]
    },
    {
        n: 2,
        async setup(h) {
            await h.goto('/');
            await h.moveTo(1450, 820, 200);
        },
        steps: [
            ['s1', async (h) => {
                await h.label('gov', 'c-gov-banner', tag('c-gov-banner', 'PIC Gov Banner'), { pos: 'inside-right', pad: 2 });
                await h.sleep(1500);
                await h.label('hdr', HEADER, tag('c-site-header', 'PIC Site Header · logo, navigation, sign in'), { pos: 'below', pad: 2 });
            }],
            ['s2', (h) => h.callout('Builder: <b>Gov Banner</b> and <b>Site Header</b> in the header region, <b>Site Footer</b> in the footer region, once for every page')],
            ['p1', async (h) => {
                await h.clearAll();
                await h.label('hero', 'c-hero-banner section.hero', tag('c-hero-banner', 'PIC Hero Banner'), { pos: 'inside', pad: 0 });
            }],
            ['s3+6', async (h) => {
                await h.label('qa', 'c-quick-access-panel', tag('c-quick-access-panel', 'shortcuts'), { pos: 'above' });
                await h.move('c-quick-access-panel a >> nth=0');
            }],
            ['s3+10', (h) => h.move('c-quick-access-panel a >> nth=3')],
            ['s4', (h) => h.callout('Every text is a Builder property: eyebrow, title, subtitle, button labels and URLs')],
            ['p2-0.3', async (h) => {
                await h.clearAll();
                await h.glideTo('c-value-props', 150, 1500);
                await h.label('vp', 'c-value-props', tag('c-value-props', 'PIC Value Props'), { pos: 'inside' });
            }],
            ['s6', async (h) => {
                await h.unlabel('vp');
                await h.glideTo('c-event-banner', 220, 1400);
                await h.label('ev', 'c-event-banner', tag('c-event-banner', 'reads EVENTS_QUERY · first active Test_Event__c'), { pos: 'above' });
            }],
            ['s7+3', async (h) => {
                await h.move('c-event-banner a:has-text("Sign up")');
                await h.callout('Sign up → <code>/request?event=&lt;Code__c&gt;</code>');
            }],
            ['p3', async (h) => {
                await h.clearAll();
                await h.glideTo('c-range-explorer', 110, 1600);
                await h.label('rx', 'c-range-explorer .tabs', tag('c-range-explorer', 'PIC Range Explorer · reads RANGES_QUERY'), { pos: 'above' });
            }],
            ['s8+2', (h) => h.click('c-range-explorer .tab:has-text("Camp Grayling")')],
            ['s9+3', async (h) => {
                await h.unlabel('rx');
                await h.label('stats', 'c-range-explorer article.panel .stats', tag('Stats__c', 'JSON'), { pos: 'above' });
            }],
            ['s9+7', async (h) => {
                await h.unlabel('stats');
                await h.glideBy(420, 1500);
                await h.label('caps', 'c-range-explorer article.panel .caps', tag('Capability_Group__c', 'one card per test type + range environment'), { pos: 'inside' });
            }],
            ['s10+1', (h) => h.callout('One GraphQL query: <code>Test_Range__c</code> with its <code>Capability_Group__c</code> children')],
            ['p4', async (h) => {
                await h.clearAll();
                await h.glideTo('c-process-stepper', 140, 1500);
                await h.label('ps', 'c-process-stepper ol.steps', tag('c-process-stepper', 'PIC Process Stepper · mode="static"'), { pos: 'above' });
            }],
            ['s12', (h) => h.move('c-process-stepper a.desc-link')],
            ['s12+2.5', (h) => h.move('c-process-stepper a.desc-btn')],
            ['p5', async (h) => {
                await h.clearAll();
                await h.glideTo('c-cta-band', 260, 1300);
                await h.label('cta', 'c-cta-band', tag('c-cta-band', 'PIC CTA Band'), { pos: 'above' });
            }],
            ['p5+2.2', async (h) => {
                await h.glideBy(900, 1400);
                await h.label('ft', 'c-site-footer', tag('c-site-footer', 'PIC Site Footer'), { pos: 'inside' });
            }],
            ['p6', async (h) => {
                await h.clearAll();
                await h.scrollTop(1200);
                await h.label('hiw', NAV('How it works'), tag('/#how-it-works'), { pos: 'below', pad: 4 });
                await h.move(NAV('How it works'));
                await h.callout('Builder: put the stepper in a section whose <b>Section ID</b> is <code>how-it-works</code>');
            }]
        ]
    },
    {
        n: 3,
        async setup(h) {
            await h.goto('/ranges');
            await h.moveTo(1450, 820, 200);
        },
        steps: [
            ['s1', (h) => h.label('hero', 'c-hero-banner section.hero', tag('c-hero-banner', 'Compact ✔'), { pos: 'inside', pad: 0 })],
            ['p1', async (h) => {
                await h.clearLabels();
                await h.glideTo('c-range-finder', 105, 1500);
                await h.label('rf', 'c-range-finder .head', tag('c-range-finder', 'PIC Range Finder · mode="browse"'), { pos: 'right' });
            }],
            ['s3+0.5', async (h) => {
                await h.unlabel('rf');
                await h.type('c-range-finder input.box-input', 'hpm', { delay: 160 });
            }],
            ['s4', (h) => h.label('opts', 'c-range-finder ul.options', tag('suggestions', 'match % per capability'), { pos: 'right' })],
            ['s4+4', async (h) => {
                await h.unlabel('opts');
                await h.click('c-range-finder li.option >> nth=0');
            }],
            ['s5-1.5', (h) => h.type('c-range-finder input.box-input', 'gps denied', { delay: 110 })],
            ['s5+3', (h) => h.click('c-range-finder li.option >> nth=0')],
            ['s5+6', (h) => h.label('top', 'c-range-finder li.res >> nth=0', tag('best match first', 'met / not met, and where it was found'), { pos: 'above' })],
            ['p2', async (h) => {
                await h.clearLabels();
                await h.callout('Scoring: <code>rangeFinder/rangeSearch.js</code>, over test types, capability items, <code>Stats__c</code>, state and summary terrain words');
            }],
            ['s7', (h) => h.callout('Shorthand and synonyms live in <code>rangeSearch.js</code>: HPM, HEL, EW, C-UAS, HE, FTS, PNT, BVLOS…')],
            ['s8', (h) => h.callout('New <code>Capability_Group__c</code> items are searchable as soon as they\'re entered: no code change')],
            ['p3', async (h) => {
                await h.uncallout();
                await h.move('c-range-finder li.res >> nth=0 >> a:has-text("Request a test here")');
                await h.label('req', 'c-range-finder li.res >> nth=0 >> a:has-text("Request a test here")', tag('/request?range=&lt;Code__c&gt;'), { pos: 'right' });
            }],
            ['p4', async (h) => {
                await h.clearAll();
                await h.glideTo('c-range-explorer', 100, 1800);
                await h.label('rx', 'c-range-explorer .head', tag('c-range-explorer', 'expanded: every range stacked'), { pos: 'right' });
            }],
            ['s10+4', async (h) => {
                await h.unlabel('rx');
                await h.glideBy(1500, 3800);
            }],
            ['s11-0.5', async (h) => {
                await h.glideTo('c-range-explorer article.panel:has-text("Atterbury-Muscatatuck")', 130, 1800);
                await h.label('soon', 'c-range-explorer article.panel:has-text("Atterbury-Muscatatuck") .soon', tag('Status__c = Coming soon', 'shown, not requestable'), { pos: 'above' });
            }],
            ['p5', async (h) => {
                await h.clearLabels();
                await h.callout('Guests: deploy <code>site-config</code> sharing rules once the site exists, and assign <code>PICSite_Guest</code> to the guest user');
            }]
        ]
    },
    {
        n: 4,
        async setup(h) {
            await h.goto('/');
            await h.moveTo(1300, 600, 200);
        },
        steps: [
            [0.4, async (h) => {
                await h.click(NAV_BTN('Request an account'));
                await h.waitFor('c-account-request-panel form');
                await h.sleep(400);
            }],
            ['s1', (h) => h.label('arp', 'c-account-request-panel form', tag('c-account-request-panel', 'PIC Account Request Panel'), { pos: 'above' })],
            ['s2', (h) => h.callout('A page of its own: full width on phones, and no <code>#fragment</code> links (they can\'t reach into a shadow root)')],
            ['p1', async (h) => {
                await h.uncallout();
                await h.type('c-account-request-panel input[autocomplete="name"]', 'Alex Morgan');
            }],
            ['s4', (h) => h.type('c-account-request-panel input[autocomplete="organization"]', 'JDrone LLC')],
            ['s4+3', (h) => h.type('c-account-request-panel input[autocomplete="email"]', 'alex.morgan@jdrone.example', { delay: 45 })],
            ['s4+6.5', (h) => h.type('c-account-request-panel input[placeholder="If you have one"]', 'ab123', { delay: 120 })],
            ['s5', (h) => h.label('cage', 'c-account-request-panel input[placeholder="If you have one"]', tag('CAGE code', 'optional'), { pos: 'below' })],
            ['p2', async (h) => {
                await h.clearLabels();
                await h.click('c-account-request-panel button[type="submit"]');
                await h.sleep(600);
                await h.label('note', 'c-account-request-panel .note', tag('preview stand-in'), { pos: 'above' });
            }],
            ['s7', (h) => h.callout('Org: put this panel on the <b>self-registration page</b> (Administration › Login &amp; Registration) as the visual frame')],
            ['p3', async (h) => {
                await h.clearAll();
                await h.panel(`<p class="eyebrow">When the range office approves</p><h3>Standard Salesforce setup</h3>
                    <ol>
                        <li data-step="1">A <b>Contact</b> on the customer's Account</li>
                        <li data-step="1">Fill <code>Account.License_ID__c</code> and <code>Account.CAGE_Code__c</code></li>
                        <li data-step="2">Enable as a <b>Customer Community</b> user</li>
                        <li data-step="2">Assign <code>PICSite_Customer</code></li>
                        <li data-step="2">Add the profile to the site's <b>Members</b></li>
                    </ol>
                    <p data-step="3" style="margin-top:22px;color:#ffcc01">The request form pre-fills those Account fields for every user on the account.</p>`);
                await h.panelStep(0);
            }],
            ['s10', (h) => h.panelStep(1)],
            ['s11', (h) => h.panelStep(2)],
            ['s12', (h) => h.panelStep(3)],
            ['p4', async (h) => {
                await h.unpanel();
                await h.label('btn', NAV_BTN('Request an account'), tag('/request-account'), { pos: 'below', pad: 4 });
                await h.move(NAV_BTN('Request an account'));
            }],
            ['s14', (h) => h.callout('Self-registration page at another URL? Give it <code>/request-account</code> in Builder, or update the three links')],
            ['p5', async (h) => {
                await h.clearAll();
                await h.label('cur', 'c-site-header [aria-current="page"]', tag('aria-current="page"', 'path after the base path'), { pos: 'below', pad: 4 });
            }]
        ]
    },
    {
        n: 5,
        async setup(h) {
            await h.goto('/');
            await h.moveTo(1300, 600, 200);
        },
        steps: [
            [0.4, async (h) => {
                await h.click(NAV_BTN('Sign in'));
                await h.waitFor('c-login-panel form');
                await h.sleep(300);
            }],
            ['s0+3', (h) => h.label('lp', 'c-login-panel form', tag('c-login-panel', 'PIC Login Panel'), { pos: 'above' })],
            ['s2', async (h) => {
                await h.unlabel('lp');
                await h.callout('Preview only: <code>scripts/mock-backend.mjs</code> checks the <code>.env</code> account on the server · session in an httpOnly cookie');
                await h.type('c-login-panel input[name="username"]', h.account.username, { delay: 160 });
            }],
            ['s2+3', (h) => h.type('c-login-panel input[name="password"]', h.account.password, { delay: 90 })],
            ['s3+1.5', async (h) => {
                await h.click('c-login-panel button[type="submit"]');
                await h.waitFor('c-site-header .account');
                await h.sleep(500);
                await h.uncallout();
                await h.label('acct', 'c-site-header .nav-actions', tag('signed in', 'company · Sign out'), { pos: 'below', pad: 4 });
            }],
            ['p2', async (h) => {
                await h.clearAll();
                await h.goto('/login');
                await h.label('frame', 'c-login-panel form', tag('org: standard Login Form goes here'), { pos: 'above' });
                await h.callout('Org: keep the site\'s own <b>Login page</b>: it owns authentication, lockout and password reset');
            }],
            ['s8', (h) => h.label('forgot', 'c-login-panel .small-link', tag('preview stand-in'), { pos: 'below' })],
            ['p3', async (h) => {
                await h.clearAll();
                await h.move('c-login-panel button:has-text("CAC")');
                await h.label('cac', 'c-login-panel button:has-text("CAC")', tag('placeholder', 'DoD identity provider'), { pos: 'below' });
            }],
            ['s10', (h) => h.click('c-login-panel button:has-text("CAC")')],
            ['p4', async (h) => {
                await h.clearAll();
                await h.panel(`<p class="eyebrow">Page access (Builder › Page Properties)</p><h3>Public or Requires Login</h3>
                    <table><tr><th>Page</th><th>Access</th></tr>
                    <tr data-step="1"><td>Home · Ranges · Login · Request an account</td><td>Public</td></tr>
                    <tr data-step="2"><td>Submit a test request · Track requests</td><td style="color:#ffcc01">Requires Login</td></tr></table>`);
                await h.panelStep(0);
            }],
            ['s12', (h) => h.panelStep(1)],
            ['s13', (h) => h.panelStep(2)],
            ['p5', async (h) => {
                await h.unpanel();
                await h.label('sess', 'c-site-header .nav-actions', tag('getSession()', 'c/portalApi'), { pos: 'below', pad: 4 });
            }],
            ['s15', (h) => h.callout('Org: <code>getSession()</code> uses <code>@salesforce/user/isGuest</code> · Sign out → <code>/secur/logout.jsp</code>')]
        ]
    },
    {
        n: 6,
        signIn: true,
        async setup(h) {
            await h.goto('/');
            await h.moveTo(1300, 600, 200);
        },
        steps: [
            [0.4, async (h) => {
                await h.click(NAV('Request a test'));
                await h.waitFor(`${FORM} .needs`);
                await h.sleep(400);
            }],
            ['s1', (h) => h.label('rf', `${FORM} c-process-stepper`, tag('c-request-form', 'PIC Test Request Form · five steps'), { pos: 'above' })],
            ['s2', async (h) => {
                await h.unlabel('rf');
                await h.glideTo(`${FORM} .needs`, 220, 1300);
                await h.label('needs', `${FORM} .needs`, tag('What you\'ll need'), { pos: 'above' });
            }],
            ['p1', async (h) => {
                await h.clearLabels();
                await h.glideTo(`${FORM} form`, 120, 1400);
                await h.label('org', FIELD('organization'), tag('pre-filled', 'Account.Name'), { pos: 'above', pad: 4 });
                await h.label('uei', FIELD('uei'), tag('pre-filled', 'Account.CAGE_Code__c'), { pos: 'above', pad: 4 });
            }],
            ['s3+6', (h) => h.callout('The mock account has only the company and CAGE code. In the org, contact, license ID, email and phone come from the user and Account')],
            ['s3+7.5', async (h) => {
                await h.typeQuick(FIELD('contactName'), 'Alex Morgan', { shown: 5 });
                await h.fill(FIELD('licenseId'), 'LIC-20417');
                await h.fill(FIELD('email'), 'alex.morgan@jdrone.example', { move: false });
            }],
            ['s4+3', (h) => h.callout('<code>CURRENT_USER_QUERY</code> → <code>toUser()</code> in <code>c/portalModel</code>')],
            ['p2', async (h) => {
                await h.clearAll();
                await h.click(CONTINUE);
                await h.sleep(500);
                await h.glideTo(`${FORM} form`, 120, 900);
            }],
            ['s5+4', (h) => h.click(`${FORM} label:has-text("Counter-UAS")`)],
            ['s6', (h) => h.typeQuick(FIELD('systemName'), 'Interceptor X2 HPM', { shown: 8 })],
            ['s6+3', async (h) => {
                await h.click(`${FORM} label.check:has-text("Directed energy")`);
                await h.click(`${FORM} label.check:has-text("Electronic attack")`);
                await h.label('fx', `${FORM} .checks`, tag('Effects__c', 'counter-UAS only'), { pos: 'above' });
            }],
            ['p3', async (h) => {
                await h.clearAll();
                await h.click(CONTINUE);
                await h.sleep(600);
                await h.glideTo(`${FORM} c-range-finder`, 130, 1000);
                await h.label('finder', `${FORM} c-range-finder .search`, tag('c-range-finder', 'mode="select"'), { pos: 'above' });
            }],
            ['s8+2', async (h) => {
                await h.unlabel('finder');
                await h.click(`${FORM} c-range-finder button:has-text("Set as preferred")`);
            }],
            ['s8+4.5', (h) => h.click(`${FORM} c-range-finder button:has-text("Set as alternate"):not([disabled])`)],
            ['s10-0.5', async (h) => {
                await h.glideTo(FIELD('startDate'), 360, 900);
                await h.fill(FIELD('startDate'), '2026-12-07');
                await h.fill(FIELD('endDate'), '2026-12-11');
            }],
            ['s10+3.5', async (h) => {
                await h.fill(FIELD('durationDays'), '5', { move: false });
                await h.click(FIELD('flexible'));
            }],
            ['p4-0.5', async (h) => {
                await h.click(CONTINUE);
                await h.sleep(300);
                await h.glideTo(`${FORM} form`, 120, 700);
                await h.typeQuick(FIELD('objectives'), 'Defeat Group 1-2 targets with HPM at 0.5-2 km; measure dwell time.', { shown: 7 });
            }],
            ['s11+4', (h) => h.click(`${FORM} label.check:has-text("RF emitters")`)],
            ['s12-1', async (h) => {
                await h.click(CONTINUE);
                await h.sleep(300);
                await h.glideTo(FIELD('attest'), 520, 900);
            }],
            ['s12+2', (h) => h.click(FIELD('attest'))],
            ['p5', (h) => h.label('sub', `${FORM} button[type="submit"]`, tag('submitRequest()', 'createRecord(Test_Request__c)'), { pos: 'above' })],
            ['p5+3', async (h) => {
                await h.unlabel('sub');
                await h.click(`${FORM} button[type="submit"]`);
                await h.waitFor(`${FORM} .success`);
                await h.sleep(300);
                await h.scrollTo(`${FORM} .success`, 120, 900);
            }],
            ['s14', (h) => h.callout('Never sent: <code>Status__c</code>, <code>Next_Action__c</code>, <code>Range_POC__c</code>: defaults, read-only for customers')],
            ['p6', async (h) => {
                await h.clearAll();
                await h.label('num', `${FORM} .success h2`, tag('request number'), { pos: 'above' });
                await h.label('up', `${FORM} c-file-uploader`, tag('c-file-uploader', 'bound to the new record'), { pos: 'above' });
            }],
            ['s16', async (h) => {
                await h.clearLabels();
                await h.move(`${FORM} a:has-text("Track this request")`);
                await h.label('trk', `${FORM} a:has-text("Track this request")`, tag('/track?id=…'), { pos: 'below' });
            }]
        ]
    },
    {
        n: 7,
        signIn: true,
        async setup(h) {
            await h.goto('/track');
            await h.waitFor(`${TRACK} .tile`);
            await h.moveTo(1500, 700, 200);
        },
        steps: [
            ['s1', (h) => h.label('trk', `${TRACK} .layout`, tag('c-request-tracker', 'PIC Test Status Tracker'), { pos: 'above' })],
            ['s1+4', (h) => h.callout('Sharing does the filtering: the <code>PICSite_Customer</code> sharing set · no where clause')],
            ['s2', (h) => h.callout('<code>MY_REQUESTS_QUERY</code> · <code>first: 200</code> · one response, filtered in the browser')],
            ['p1', async (h) => {
                await h.clearAll();
                await h.label('tiles', `${TRACK} .tiles`, tag('status tiles', 'click to open'), { pos: 'above' });
            }],
            ['s4', async (h) => {
                await h.unlabel('tiles');
                await h.click(`${TRACK} .tile:has-text("Active requests")`);
                await h.sleep(500);
                await h.label('pick', `${TRACK} dialog.picker .picker-body`, tag('picker', 'typeahead filter'), { pos: 'above' });
            }],
            ['s5', async (h) => {
                await h.page.keyboard.type('hpm', { delay: 180 });
            }],
            ['s5+2', async (h) => {
                await h.unlabel('pick');
                await h.press('Enter');
                await h.sleep(900);
            }],
            ['p2', async (h) => {
                await h.scrollTo(`${TRACK} .layout`, 110, 900);
                await h.move(`${TRACK} .rail-btn`, { ms: 800 });
                await h.sleep(500);
                await h.label('panel', `${TRACK} .list-panel`, tag('hover or tab', 'the whole list opens'), { pos: 'right' });
            }],
            ['s7+3', async (h) => {
                await h.unlabel('panel');
                await h.type(`${TRACK} .list-panel .search-input`, 'dugway', { delay: 150 });
            }],
            ['s7+8', async (h) => {
                await h.press('Control+A');
                await h.press('Backspace');
            }],
            ['p3', async (h) => {
                await h.click(`${TRACK} .list-panel .req:has-text("TR-2026-0137")`);
                await h.moveTo(1600, 760, 700);
                await h.sleep(500);
                await h.label('side', `${TRACK} .detail .side .side-text`, tag('the range office\'s question', 'latest Needs info activity'), { pos: 'above' });
            }],
            ['s8+6', (h) => h.label('upl', `${TRACK} .detail .side c-file-uploader`, tag('c-file-uploader'), { pos: 'right' })],
            ['p4', async (h) => {
                await h.clearLabels();
                await h.glideTo(`${TRACK} .timeline-title`, 150, 1500);
                await h.label('climb', `${TRACK} .timeline`, tag('grey = ahead', 'gold = done'), { pos: 'right' });
            }],
            ['p5', async (h) => {
                await h.clearLabels();
                await h.glideTo(`${TRACK} .tiles`, 140, 1200);
                await h.click(`${TRACK} .tile:has-text("Completed")`);
                await h.sleep(1200);
                await h.glideTo(`${TRACK} .timeline-title`, 150, 1300);
                await h.label('gold', `${TRACK} .timeline`, tag('Complete', 'all gold'), { pos: 'right' });
            }],
            ['s11+3', (h) => h.callout('<code>Request_Activity__c</code> rows are written by the flows, in system context')],
            ['s12', (h) => h.callout('<code>/track?id=TR-2026-0137</code> opens that request directly')]
        ]
    },
    {
        n: 8,
        async setup(h) {
            await h.deck(codeDeck);
            await h.cursor(false);
            await h.show(0);
        },
        steps: [
            ['s3', (h) => h.reveal(1)],
            ['p1-0.3', async (h) => { await h.show(1); }],
            ['s5', (h) => h.focus(1)],
            ['s5+7', (h) => h.focus(2)],
            ['s5+12', (h) => h.focus(3)],
            ['s6', (h) => h.focus(4)],
            ['p2-0.3', (h) => h.show(2)],
            ['s7+9', (h) => h.focus(1)],
            ['s7+13', (h) => h.focus(2)],
            ['p3-0.3', (h) => h.show(3)],
            ['p4-0.3', (h) => h.show(4)],
            ['p5-0.3', (h) => h.show(5)],
            ['s14+1', (h) => h.reveal(1)],
            ['s15', (h) => h.reveal(2)],
            ['p6-0.3', (h) => h.show(6)],
            ['s17', (h) => h.reveal(1)]
        ]
    },
    {
        n: 9,
        async setup(h) {
            await h.deck(dataDeck);
            await h.cursor(false);
            await h.show(0);
        },
        steps: [
            ['s1', (h) => h.reveal(1)],
            ['s2', (h) => h.reveal(2)],
            ['s3', (h) => h.reveal(3)],
            ['s4', (h) => h.reveal(4)],
            ['p1-0.3', (h) => h.show(1)],
            ['s6', (h) => h.reveal(1)],
            ['s7', (h) => h.reveal(2)],
            ['s8', (h) => h.reveal(3)],
            ['p2-0.3', (h) => h.show(2)],
            ['p3-0.3', async (h) => { await h.show(3); await h.reveal(1); }],
            ['s12', (h) => h.reveal(2)],
            ['s13', (h) => h.reveal(3)],
            ['p4-0.3', (h) => h.show(4)],
            ['s16', (h) => h.reveal(1)]
        ]
    },
    {
        n: 10,
        async setup(h) {
            await h.deck(deployDeck);
            await h.cursor(false);
            await h.show(0);
        },
        steps: [
            ['s1', (h) => h.reveal(1)],
            ['s2', (h) => h.reveal(2)],
            ['s4', (h) => h.reveal(3)],
            ['s5', (h) => h.reveal(4)],
            ['p2-0.3', (h) => h.show(1)],
            ['s6+1', (h) => h.reveal(1)],
            ['s6+4', (h) => h.reveal(2)],
            ['s6+8', (h) => h.reveal(3)],
            ['s6+11', (h) => h.reveal(4)],
            ['p3-0.3', (h) => h.show(2)],
            ['s7+1', (h) => h.reveal(1)],
            ['s7+6', (h) => h.reveal(2)],
            ['s7+11', (h) => h.reveal(3)],
            ['s8', (h) => h.reveal(4)],
            ['s9', (h) => h.reveal(5)],
            ['s10', (h) => h.reveal(6)],
            ['p4-0.3', (h) => h.show(3)]
        ]
    },
    {
        n: 11,
        async setup(h) {
            await h.deck(previewDeck);
            await h.cursor(false);
            await h.show(0);
        },
        steps: [
            ['s1', (h) => h.reveal(1)],
            ['s2', (h) => h.reveal(2)],
            ['s3', (h) => h.reveal(3)],
            ['s4', (h) => h.reveal(4)],
            ['s5', (h) => h.reveal(5)]
        ]
    },
    {
        n: 12,
        async setup(h) {
            await h.deck(launchDeck);
            await h.cursor(false);
            await h.show(0);
        },
        steps: [
            ['s1', (h) => h.reveal(1)],
            ['s2', (h) => h.reveal(2)],
            ['s3', (h) => h.reveal(3)],
            ['p1-0.3', async (h) => {
                await h.goto('/');
                await h.cursor(false);
            }],
            ['s5', (h) => h.glideBy(300, 6000)]
        ]
    },
    {
        n: 13,
        async setup(h) {
            await h.deck(deck([endSlide()]));
            await h.cursor(false);
            await h.show(0);
        },
        steps: []
    }
];
