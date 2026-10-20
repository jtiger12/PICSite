// Harness-only stand-in for c/portalApi. scripts/sync-lwr-modules.mjs aliases
// `c/portalApi` to this file when `npm run dev` runs, because the open-source
// LWR stack cannot resolve lightning/uiGraphQLApi or lightning/uiRecordApi.
// It exports the same names as the platform module:
//   - `graphql` is a wire adapter (LWC WireAdapter protocol) that answers the
//     query tokens below with mock data in UI API GraphQL response shape,
//   - `submitRequest` appends to the mock request list so the tracker shows
//     the new request on the next visit, just like the org would,
//   - `getSession` / `signIn` / `signOut` talk to the mock backend that
//     `npm run dev` mounts (scripts/mock-backend.mjs, account in .env).
import { toRequestFields, toSubmitted, DEFAULT_NEXT_ACTION, isoDate, prefixHref } from 'c/portalModel';
import { RANGE_NODES, EVENT_NODES, REQUEST_NODES, USER_NODE, accountUserNode, conn, f, activity, nextId } from './data';

export {
    STATUS_STEPS,
    SIDE_STATUSES,
    TEST_TYPES,
    UAS_GROUPS,
    EFFECTS,
    MUNITIONS,
    HAZARDS,
    DEFAULT_NEXT_ACTION,
    ACCEPTED_FILE_TYPES,
    ATTACHMENT_HINT,
    toRanges,
    toEvents,
    toRequests,
    toUser,
    formatWindow,
    formatDate
} from 'c/portalModel';

export const CURRENT_USER_ID = USER_NODE.Id;

// The harness serves the routes at the domain root.
export const BASE_PATH = '';
export const href = (path) => prefixHref(BASE_PATH, path);

// The public demo runs on a non-.mil domain, where official Army insignia and
// "official website" wording next to a sign-in form read as phishing to web
// proxies (and would mislead anyone who lands there), so the harness brands
// itself as a demonstration with a mascot of its own. c/govBanner is swapped
// for a demonstration strip the same way (src/mock/govBanner).
export const BRAND = {
    logoUrl: '/assets/img/demo-mascot.svg',
    logoAlt: 'Demo mascot: a German Shepherd',
    starUrl: '/assets/img/demo-mascot.svg',
    orgLine: 'PICSite demonstration',
    siteLine: 'Sample data only. Not an official U.S. Government website.',
    cacSignIn: false
};

// On the platform these are gql documents; here they are just tokens the mock
// adapter dispatches on.
export const RANGES_QUERY = 'PicRanges';
export const EVENTS_QUERY = 'PicEvents';
export const MY_REQUESTS_QUERY = 'PicMyRequests';
export const CURRENT_USER_QUERY = 'PicCurrentUser';

export const gql = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] : ''), '');

const LATENCY_MS = 150;

// ----- session -----
// `npm run dev` mounts scripts/mock-backend.mjs: sign-in is checked against
// the mock account in .env and the session is an httpOnly cookie, so the
// password never reaches the browser. The static build (npm start, Docker)
// has no backend; there getSession() reports `available: false` and the
// current user falls back to the built-in demo user.
const SIGNED_OUT = { available: true, signedIn: false, account: null };
const NO_BACKEND = { available: false, signedIn: false, account: null };
const JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

let sessionPromise;

// { available, signedIn, account: { username, company, cageCode } | null },
// fetched once per page load (every harness route is a full page load).
export function getSession() {
    if (!sessionPromise) {
        sessionPromise = fetch('/api/session', { credentials: 'same-origin', headers: JSON_HEADERS })
            .then(async (res) => {
                if (!res.ok) return NO_BACKEND;
                const { account } = await res.json();
                return account ? { available: true, signedIn: true, account } : SIGNED_OUT;
            })
            .catch(() => NO_BACKEND);
    }
    return sessionPromise;
}

export async function signIn(username, password) {
    let res;
    try {
        res = await fetch('/api/login', { method: 'POST', credentials: 'same-origin', headers: JSON_HEADERS, body: JSON.stringify({ username, password }) });
    } catch (e) {
        throw new Error('Could not reach the sign-in service.');
    }
    if (res.status === 404 || res.status === 405) throw new Error('Sign-in needs the local dev server: run npm run dev.');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Sign-in failed.');
    sessionPromise = Promise.resolve({ available: true, signedIn: true, account: body.account });
    return sessionPromise;
}

// Ends the session and leaves the page, like the org's logout URL does.
export async function signOut() {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    sessionPromise = Promise.resolve(SIGNED_OUT);
    window.location.assign(href('/'));
}

async function currentUserNode() {
    const session = await getSession();
    if (session.signedIn) return accountUserNode(session.account);
    return session.available ? null : USER_NODE;
}

const RESOLVERS = {
    PicRanges: () => ({ uiapi: { query: { Test_Range__c: conn(RANGE_NODES) } } }),
    PicEvents: () => ({ uiapi: { query: { Test_Event__c: conn(EVENT_NODES) } } }),
    PicMyRequests: () => ({ uiapi: { query: { Test_Request__c: conn(REQUEST_NODES) } } }),
    PicCurrentUser: async (variables) => {
        const node = variables && variables.userId && variables.userId !== USER_NODE.Id ? null : await currentUserNode();
        return { uiapi: { query: { User: conn(node ? [node] : []) } } };
    }
};

// Minimal wire adapter: LWC calls update(config) whenever the (reactive)
// config changes, and we answer asynchronously the way the real adapter does.
// Resolvers may return a promise; an answer that arrives after a newer
// update() or a disconnect() is dropped.
export class graphql {
    constructor(dataCallback) {
        this.dataCallback = dataCallback;
        this.timer = null;
        this.generation = 0;
    }

    connect() {}

    disconnect() {
        clearTimeout(this.timer);
        this.generation++;
    }

    update(config) {
        clearTimeout(this.timer);
        const generation = ++this.generation;
        const resolve = config && RESOLVERS[config.query];
        this.timer = setTimeout(async () => {
            const answer = resolve
                ? { data: await resolve(config.variables), errors: undefined }
                : { data: undefined, errors: [{ message: `Mock portalApi: unknown query ${config && config.query}` }] };
            if (generation === this.generation) this.dataCallback(answer);
        }, LATENCY_MS);
    }
}

export function refreshGraphQL() {
    return Promise.resolve();
}

const delay = (value, ms) => new Promise((resolve) => setTimeout(() => resolve(value), ms));

// Each harness route is a full page load, so submitted requests are kept in
// sessionStorage to survive the hop from /request to /track the way
// Lightning Data Service keeps them in the org.
const STORE_KEY = 'picsite.mock.requests';

function restoreSubmitted() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
        saved
            .slice()
            .reverse()
            .forEach((node) => {
                if (node && node.Id && node.Name && !REQUEST_NODES.some((r) => r.Id === node.Id)) REQUEST_NODES.unshift(node);
            });
    } catch (e) {
        // no storage available (SSR, privacy mode): submissions last for the page only
    }
}

function remember(node) {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]');
        sessionStorage.setItem(STORE_KEY, JSON.stringify([node, ...saved]));
    } catch (e) {
        console.warn('[mock portalApi] could not persist the submitted request', e);
    }
}

restoreSubmitted();

export function submitRequest(payload) {
    const fields = toRequestFields(payload);
    const today = isoDate();
    const now = new Date().toISOString();
    const number = `TR-2026-${String(143 + REQUEST_NODES.length).padStart(4, '0')}`;
    const node = {
        Id: nextId('a02'),
        Name: f(number),
        Title__c: f(fields.Title__c || ''),
        Test_Type__c: f(fields.Test_Type__c || ''),
        Status__c: f('Submitted'),
        Start_Date__c: f(fields.Start_Date__c || null),
        End_Date__c: f(fields.End_Date__c || null),
        Range_POC__c: f(null),
        Next_Action__c: f(DEFAULT_NEXT_ACTION),
        CreatedDate: f(now),
        LastModifiedDate: f(now),
        Range__r: payload.rangeName ? { Name: f(payload.rangeName) } : null,
        Request_Activities__r: conn([activity('Submitted', today, 'Request received.')])
    };
    REQUEST_NODES.unshift(node);
    remember(node);
    const record = { id: node.Id, apiName: 'Test_Request__c', fields: { Name: { value: number } } };
    return delay(toSubmitted(record, payload), 600);
}
