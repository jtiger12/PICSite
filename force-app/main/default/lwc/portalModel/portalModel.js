// Pure, environment-independent half of the data seam. Everything here is
// plain JavaScript with no platform imports, so the local LWR harness and the
// Experience Cloud site share one copy of:
//   - the status model and option lists the components render,
//   - the shaping functions that turn a UI API GraphQL response into the
//     object shapes the templates expect (ranges, events, requests, user),
//   - the mapping from the request-form payload to Test_Request__c fields.
// c/portalApi (platform) and src/mock/portalApi (harness) both build on this.

export const STATUS_STEPS = ['Submitted', 'Under review', 'Coordination', 'Scheduled', 'Complete'];

export const SIDE_STATUSES = {
    'Needs info': { tone: 'warn', note: 'The range office needs more information from you.' },
    Declined: { tone: 'danger', note: 'This request could not be accommodated.' }
};

// `value` is the short key the form state uses; `label` doubles as the
// Test_Request__c.Test_Type__c picklist API name.
export const TEST_TYPES = [
    { value: 'uas', label: 'UAS', help: 'Unmanned aircraft systems, Groups 1-5' },
    { value: 'cuas', label: 'Counter-UAS', help: 'Kinetic, electronic attack and directed energy' },
    { value: 'lrf', label: 'Long-Range Fires', help: 'Projectile, rocket and missile up to 100 km' },
    { value: 'lci', label: 'Low-Cost Interceptor', help: 'Interceptor live-fire against representative threats' }
];

export const UAS_GROUPS = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'];

// For the picklists below, `value` is the picklist API name stored on the
// record and `label` is what the form shows.
export const EFFECTS = [
    { value: 'Kinetic', label: 'Kinetic (projectile, rocket, missile)' },
    { value: 'Electronic attack', label: 'Electronic attack' },
    { value: 'Directed energy', label: 'Directed energy (HEL / HPM)' }
];

export const MUNITIONS = [
    { value: 'Inert', label: 'Inert' },
    { value: 'High explosive (limited)', label: 'High explosive (limited)' }
];

export const HAZARDS = [
    { value: 'High explosive', label: 'High explosive' },
    { value: 'Lasers', label: 'Lasers' },
    { value: 'RF emitters', label: 'RF emitters' },
    { value: 'Hazardous materials', label: 'Hazardous materials' }
];

export const DEFAULT_NEXT_ACTION = 'The range office will begin review within 5 business days.';

export const ACCEPTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.png', '.jpg', '.jpeg'];
export const ATTACHMENT_HINT = 'Safety data sheets, test plans, system specifications. PDF or Office documents, 25 MB each.';

// ----- links -----

// Prefixes a site-relative path ('/request?range=dpg') with the site's base
// path ('/picsite'). Anchors, absolute URLs and already-prefixed paths are
// returned unchanged.
export function prefixHref(base, path) {
    const p = path === null || path === undefined ? '' : String(path);
    if (!base || !p.startsWith('/') || p.startsWith('//')) return p;
    if (p === base || p.startsWith(base + '/') || p.startsWith(base + '?') || p.startsWith(base + '#')) return p;
    return base + p;
}

// ----- GraphQL response helpers -----

// UI API GraphQL wraps every field as { value, displayValue }.
function v(field) {
    if (field === null || field === undefined) return null;
    if (typeof field === 'object' && 'value' in field) return field.value;
    return field;
}

function nodes(connection) {
    return ((connection && connection.edges) || []).map((edge) => edge && edge.node).filter(Boolean);
}

function queryNodes(data, objectApiName) {
    const q = data && data.uiapi && data.uiapi.query;
    return nodes(q && q[objectApiName]);
}

function orderOf(record) {
    const n = Number(record.order);
    return record.order === null || record.order === undefined || record.order === '' || Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

const byOrder = (a, b) => orderOf(a) - orderOf(b);

function str(a) {
    return a === null || a === undefined ? '' : String(a);
}

// { lat, lng } in decimal degrees, or null when either is missing.
function coordinates(lat, lng) {
    const la = lat === null || lat === undefined || lat === '' ? NaN : Number(lat);
    const lo = lng === null || lng === undefined || lng === '' ? NaN : Number(lng);
    return Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lng: lo } : null;
}

export function splitMulti(value) {
    return value
        ? String(value)
              .split(';')
              .map((s) => s.trim())
              .filter(Boolean)
        : [];
}

export function splitLines(value) {
    return value
        ? String(value)
              .split(/\r?\n/)
              .map((s) => s.trim())
              .filter(Boolean)
        : [];
}

export function toNumber(value) {
    if (value === '' || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
}

// ----- dates -----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Parses the leading YYYY-MM-DD of an ISO date or datetime without going
// through Date, so the calendar day never shifts with the browser timezone.
export function parseDate(iso) {
    if (!iso) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function isoDate(date) {
    return (date || new Date()).toISOString().slice(0, 10);
}

export function formatDate(iso) {
    const p = parseDate(iso);
    return p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : '';
}

// 'Nov 9 - Nov 13, 2026' for a requested test window.
export function formatWindow(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    if (!a && !b) return '';
    if (!b) return formatDate(start);
    if (!a) return formatDate(end);
    if (a.y === b.y) return `${MONTHS[a.m - 1]} ${a.d} - ${MONTHS[b.m - 1]} ${b.d}, ${a.y}`;
    return `${formatDate(start)} - ${formatDate(end)}`;
}

// 'Feb 1-5' or 'Jun 28 - Jul 2' for an event session (the event title carries the year).
export function formatSpan(start, end) {
    const a = parseDate(start);
    const b = parseDate(end);
    if (!a) return b ? `${MONTHS[b.m - 1]} ${b.d}` : '';
    if (!b) return `${MONTHS[a.m - 1]} ${a.d}`;
    if (a.y === b.y && a.m === b.m) return a.d === b.d ? `${MONTHS[a.m - 1]} ${a.d}` : `${MONTHS[a.m - 1]} ${a.d}-${b.d}`;
    return `${MONTHS[a.m - 1]} ${a.d} - ${MONTHS[b.m - 1]} ${b.d}`;
}

// ----- shaping: GraphQL data -> template shapes -----

// Test_Range__c + Capability_Group__c children -> the rangeExplorer shape.
export function toRanges(data) {
    return queryNodes(data, 'Test_Range__c')
        .map((n) => {
            const groups = nodes(n.Capability_Groups__r)
                .map((g) => ({
                    testType: str(v(g.Test_Type__c)),
                    label: str(v(g.Name)),
                    items: splitLines(v(g.Items__c)),
                    order: v(g.Sort_Order__c)
                }))
                .sort(byOrder);
            const testTypes = splitMulti(v(n.Test_Types__c));
            // Capability cards follow the range's test-type order, then any
            // group whose type is not in that list.
            const titles = [];
            testTypes.concat(groups.map((g) => g.testType)).forEach((t) => {
                if (t && !titles.includes(t) && groups.some((g) => g.testType === t)) titles.push(t);
            });
            const capabilities = titles.map((title) => ({
                title,
                groups: groups.filter((g) => g.testType === title).map(({ label, items }) => ({ label, items }))
            }));
            let stats = [];
            try {
                const parsed = JSON.parse(v(n.Stats__c) || '[]');
                if (Array.isArray(parsed)) {
                    stats = parsed.filter((s) => s && s.label).map((s) => ({ label: str(s.label), value: str(s.value) }));
                }
            } catch (e) {
                stats = [];
            }
            const status = str(v(n.Status__c)) || 'Open';
            return {
                recordId: n.Id,
                id: str(v(n.Code__c)) || n.Id,
                name: str(v(n.Name)),
                state: str(v(n.State__c)),
                summary: str(v(n.Summary__c)),
                stats,
                testTypes,
                status,
                // Coming soon ranges show their capabilities but take no requests yet.
                comingSoon: status === 'Coming soon',
                location: coordinates(v(n.Latitude__c), v(n.Longitude__c)),
                capabilities,
                order: v(n.Sort_Order__c)
            };
        })
        .sort(byOrder);
}

// Test_Event__c + Event_Session__c children -> the eventBanner shape.
export function toEvents(data) {
    return queryNodes(data, 'Test_Event__c')
        .map((n) => ({
            recordId: n.Id,
            id: str(v(n.Code__c)) || n.Id,
            title: str(v(n.Name)),
            lead: str(v(n.Lead__c)),
            sessions: nodes(n.Event_Sessions__r)
                .map((s) => ({
                    id: s.Id,
                    start: str(v(s.Start_Date__c)),
                    end: str(v(s.End_Date__c)),
                    dates: formatSpan(v(s.Start_Date__c), v(s.End_Date__c)),
                    where: str(v(s.Location__c))
                }))
                .sort((a, b) => a.start.localeCompare(b.start)),
            order: v(n.Sort_Order__c)
        }))
        .sort(byOrder);
}

function toRequest(n) {
    const created = str(v(n.CreatedDate));
    const timeline = nodes(n.Request_Activities__r)
        .map((a) => ({
            id: a.Id,
            status: str(v(a.Status__c)),
            date: (str(v(a.Activity_Date__c)) || str(v(a.CreatedDate))).slice(0, 10),
            note: str(v(a.Note__c)),
            createdAt: str(v(a.CreatedDate))
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    // Until the status flows have written an activity, show the submission itself.
    if (!timeline.length) {
        timeline.push({ id: `${n.Id}-submitted`, status: 'Submitted', date: created.slice(0, 10), note: 'Request received.', createdAt: created });
    }
    const updatedAt = str(v(n.LastModifiedDate)) || created;
    return {
        recordId: n.Id,
        id: str(v(n.Name)) || n.Id,
        title: str(v(n.Title__c)) || str(v(n.Name)),
        testType: str(v(n.Test_Type__c)),
        range: (n.Range__r && str(v(n.Range__r.Name))) || 'Range to be confirmed',
        window: formatWindow(v(n.Start_Date__c), v(n.End_Date__c)),
        status: str(v(n.Status__c)) || 'Submitted',
        updated: updatedAt.slice(0, 10),
        updatedAt,
        owner: str(v(n.Range_POC__c)) || 'Unassigned',
        nextAction: str(v(n.Next_Action__c)),
        timeline
    };
}

// Test_Request__c + Request_Activity__c children -> the requestTracker shape, newest first.
export function toRequests(data) {
    return queryNodes(data, 'Test_Request__c')
        .map(toRequest)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// User (with its portal Account) -> the defaults the request form pre-fills.
export function toUser(data) {
    const n = queryNodes(data, 'User')[0];
    if (!n) return null;
    const account = n.Account || null;
    return {
        id: n.Id,
        name: str(v(n.Name)),
        email: str(v(n.Email)),
        phone: str(v(n.Phone)),
        accountId: v(n.AccountId) || null,
        contactId: v(n.ContactId) || null,
        organization: (account && str(v(account.Name))) || str(v(n.CompanyName)),
        licenseId: (account && str(v(account.License_ID__c))) || ''
    };
}

// ----- writes: form payload -> Test_Request__c fields -----

// Status__c is left to its picklist default (Submitted) and Next_Action__c to
// its field default, so customers never write either. Empty values are
// dropped so lookups, numbers, dates and picklists are not sent as ''.
export function toRequestFields(p) {
    const fields = {
        Title__c: p.title,
        Account__c: p.accountId,
        Contact__c: p.contactId,
        Organization__c: p.organization,
        UEI_CAGE__c: p.uei,
        Contact_Name__c: p.contactName,
        License_ID__c: p.licenseId,
        Contact_Email__c: p.email,
        Contact_Phone__c: p.phone,
        Test_Type__c: p.testTypeLabel,
        System_Name__c: p.systemName,
        UAS_Group__c: p.uasGroup,
        Effects__c: (p.effects || []).join(';'),
        Munition__c: p.munition,
        Max_Range_km__c: toNumber(p.maxRangeKm),
        Range__c: p.rangeRecordId,
        Alternate_Range__c: p.altRangeRecordId,
        Start_Date__c: p.startDate,
        End_Date__c: p.endDate,
        Duration_Days__c: toNumber(p.durationDays),
        Event__c: p.eventRecordId,
        Flexible_Dates__c: Boolean(p.flexible),
        Objectives__c: p.objectives,
        Instrumentation__c: p.instrumentation,
        Hazards__c: (p.hazards || []).join(';'),
        Personnel__c: toNumber(p.personnel)
    };
    return Object.keys(fields).reduce((out, key) => {
        const value = fields[key];
        if (value !== '' && value !== null && value !== undefined) out[key] = value;
        return out;
    }, {});
}

// createRecord result + the payload that produced it -> the shape the form's
// success panel and the tracker list both understand.
export function toSubmitted(record, p) {
    const fields = (record && record.fields) || {};
    const name = fields.Name && fields.Name.value;
    const today = isoDate();
    return {
        recordId: record && record.id,
        id: name || (record && record.id) || '',
        title: p.title || '',
        testType: p.testTypeLabel || '',
        range: p.rangeName || 'Range to be confirmed',
        window: formatWindow(p.startDate, p.endDate),
        status: 'Submitted',
        updated: today,
        updatedAt: new Date().toISOString(),
        owner: 'Unassigned',
        timeline: [{ id: 'submitted', status: 'Submitted', date: today, note: 'Request received.', createdAt: '' }],
        nextAction: DEFAULT_NEXT_ACTION
    };
}
