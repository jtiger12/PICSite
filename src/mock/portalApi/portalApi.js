// Harness-only stand-in for c/portalApi. scripts/sync-lwr-modules.mjs aliases
// `c/portalApi` to this file when `npm run dev` runs, because the open-source
// LWR stack cannot resolve lightning/uiGraphQLApi or lightning/uiRecordApi.
// It exports the same names as the platform module:
//   - `graphql` is a wire adapter (LWC WireAdapter protocol) that answers the
//     query tokens below with mock data in UI API GraphQL response shape,
//   - `submitRequest` appends to the mock request list so the tracker shows
//     the new request on the next visit, just like the org would.
import { toRequestFields, toSubmitted, DEFAULT_NEXT_ACTION, isoDate, prefixHref } from 'c/portalModel';
import { RANGE_NODES, EVENT_NODES, REQUEST_NODES, USER_NODE, conn, f, activity, nextId } from './data';

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

// On the platform these are gql documents; here they are just tokens the mock
// adapter dispatches on.
export const RANGES_QUERY = 'PicRanges';
export const EVENTS_QUERY = 'PicEvents';
export const MY_REQUESTS_QUERY = 'PicMyRequests';
export const CURRENT_USER_QUERY = 'PicCurrentUser';

export const gql = (strings, ...values) => strings.reduce((out, s, i) => out + s + (i < values.length ? values[i] : ''), '');

const LATENCY_MS = 150;

const RESOLVERS = {
    PicRanges: () => ({ uiapi: { query: { Test_Range__c: conn(RANGE_NODES) } } }),
    PicEvents: () => ({ uiapi: { query: { Test_Event__c: conn(EVENT_NODES) } } }),
    PicMyRequests: () => ({ uiapi: { query: { Test_Request__c: conn(REQUEST_NODES) } } }),
    PicCurrentUser: (variables) => ({
        uiapi: { query: { User: conn(variables && variables.userId && variables.userId !== USER_NODE.Id ? [] : [USER_NODE]) } }
    })
};

// Minimal wire adapter: LWC calls update(config) whenever the (reactive)
// config changes, and we answer asynchronously the way the real adapter does.
export class graphql {
    constructor(dataCallback) {
        this.dataCallback = dataCallback;
        this.timer = null;
    }

    connect() {}

    disconnect() {
        clearTimeout(this.timer);
    }

    update(config) {
        clearTimeout(this.timer);
        const resolve = config && RESOLVERS[config.query];
        this.timer = setTimeout(() => {
            if (resolve) {
                this.dataCallback({ data: resolve(config.variables), errors: undefined });
            } else {
                this.dataCallback({ data: undefined, errors: [{ message: `Mock portalApi: unknown query ${config && config.query}` }] });
            }
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
