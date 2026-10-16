// Capability search for c/rangeFinder. Pure functions over the c/portalModel
// range shape (toRanges): build an index once, then suggest capability terms
// for what the visitor is typing and rank ranges by how well they meet each
// criterion. No DOM, so it runs the same in the harness, the org and Node.

// Words that carry no capability meaning in a request like "I need a range to
// test counter drone with live fire".
const STOPWORDS = new Set(
    'a an and or the of for to in on at by with without from into is are be can i we our my me us need needs want wants require requires required test tests testing range ranges site sites capability capabilities support supports supporting area'.split(
        ' '
    )
);

// Shorthand and everyday wording mapped to the terms the range data uses. A
// token keeps matching as itself; these are extra ways for it to match.
const SYNONYMS = {
    uas: ['drone'],
    uav: ['drone'],
    suas: ['drone'],
    drones: ['drone'],
    unmanned: ['drone'],
    cuas: ['counter drone'],
    hpm: ['high power microwave'],
    microwave: ['high power microwave'],
    hel: ['high energy laser'],
    laser: ['high energy laser'],
    lasers: ['high energy laser'],
    de: ['directed energy'],
    // Jamming, "electronic attack" and "electronic warfare" become the ew
    // concept (see CONCEPTS); single words reach it here.
    ea: ['ew'],
    electronic: ['ew'],
    warfare: ['ew'],
    ddil: ['denied degraded intermittent limited', 'denied disrupted intermittent limited'],
    emu: ['electromagnetic unreliability', 'ddil'],
    pnt: ['gps'],
    gnss: ['gps'],
    navwar: ['gps'],
    spoofing: ['gps'],
    cellular: ['lte'],
    cell: ['cellular'],
    phone: ['cellular'],
    mobile: ['cellular'],
    cyberspace: ['cyber'],
    swarms: ['swarm'],
    underground: ['tunnels', 'subterranean'],
    subt: ['subterranean'],
    caves: ['cave'],
    city: ['urban'],
    cities: ['urban'],
    town: ['urban'],
    mout: ['urban'],
    buildings: ['urban', 'structures'],
    cqb: ['shoot houses'],
    winter: ['cold weather'],
    snow: ['cold weather'],
    arctic: ['cold weather'],
    hot: ['heat'],
    sea: ['maritime'],
    water: ['maritime', 'lake'],
    naval: ['maritime'],
    boat: ['unmanned surface'],
    boats: ['unmanned surface'],
    usv: ['unmanned surface'],
    uuv: ['undersea'],
    africa: ['morocco'],
    he: ['high explosive'],
    explosive: ['high explosive'],
    explosives: ['high explosive'],
    lrf: ['long range fires'],
    artillery: ['long range fires'],
    fires: ['long range fires'],
    fts: ['flight termination system'],
    missile: ['rocket missile'],
    missiles: ['rocket missile'],
    rockets: ['rocket'],
    interceptors: ['interceptor'],
    woods: ['forest'],
    wooded: ['forest'],
    trees: ['forest'],
    kinetics: ['kinetic'],
    instrumented: ['instrumentation'],
    utah: ['ut'],
    arizona: ['az'],
    michigan: ['mi'],
    mississippi: ['ms'],
    international: ['morocco']
};

// Multi-word shorthand rewritten before tokenizing ("C-UAS" would otherwise
// split into "c" + "uas").
const PHRASES = [
    [/\bc[\s-]?s?uas\b/g, 'counter drone'],
    [/\bcounter[\s-]?s?u[ae]s\b/g, 'counter drone'],
    [/\bcounter[\s-]?u[ae]v\b/g, 'counter drone'],
    [/\bbeyond[\s-](visual[\s-])?line[\s-]of[\s-]sight\b/g, 'bvlos'],
    [/\blong[\s-]?range\b/g, 'long range'],
    // "Low-Cost Interceptor" (a request test type) is about the interceptor.
    [/\blow[\s-]?cost\b/g, ' ']
];

// Ideas the data words several ways. In range text the concept token is added
// next to the words (so typing "electronic" still finds "Electronic Attack");
// in a query the words are replaced by it, so "electronic attack" matches a
// range that lists jamming, and "GPS denied" doesn't half-match "differential
// GPS" tracking.
const CONCEPTS = [
    { token: 'gpsdenied', pattern: /\b(gps|pnt|gnss)( \(pnt\))?( and (rf|communications))? (denied|denial|interference|jamming|spoofing)\b/g },
    { token: 'ew', pattern: /\b(electronic (attack|warfare)|jamm(ing|ers?)|jam|ew)\b/g }
];

const STATE_NAMES = { UT: 'Utah', AZ: 'Arizona', MI: 'Michigan', MS: 'Mississippi', IN: 'Indiana' };

// Terrain words pulled out of range summaries (word stem -> suggestion label)
// so "desert" or "forest" can be suggested and weighted like a listed
// attribute rather than loose prose.
const TERRAIN = {
    desert: 'Desert',
    forest: 'Forest',
    woodland: 'Woodland',
    lake: 'Lakes',
    pine: 'Pine',
    swamp: 'Swamp',
    wetland: 'Wetlands',
    mountain: 'Mountains',
    coast: 'Coastal',
    maritime: 'Maritime',
    littoral: 'Littoral',
    urban: 'Urban',
    tunnel: 'Tunnels',
    salt: 'Salt flats',
    playa: 'Playa',
    arctic: 'Arctic',
    plains: 'Plains',
    jungle: 'Jungle'
};

// Group names that are headings rather than capabilities ("Range: < 75 km",
// "Airspace: R-6402"); their items are still searched, the name just isn't
// offered as a suggestion.
const HEADING_GROUPS =
    /^(range|munition type|impact area|instrumentation|airspace|airfields( and support)?|terrain and (climate|airfields)|spectrum and instrumentation|support|program|uas operations|live fire|test lanes|experimentation|specialty facilities)$/i;

// Field weights: what a range explicitly lists counts more than a word that
// happens to appear in its summary.
const WEIGHT = { capability: 1, testType: 1, name: 1, stat: 0.9, location: 0.9, terrain: 0.9, group: 0.85, summary: 0.6 };

// A criterion counts as met at or above this score: an exact word in a
// summary (0.6) passes; half of a two-word phrase (0.5) doesn't.
export const MET = 0.55;

// mode "data" keeps the words and adds concept tokens; "query" swaps the
// words for them (see CONCEPTS).
function normalize(text, mode) {
    let s = String(text || '').toLowerCase();
    PHRASES.forEach(([pattern, replacement]) => {
        s = s.replace(pattern, replacement);
    });
    CONCEPTS.forEach(({ token, pattern }) => {
        s = s.replace(pattern, (words) => (mode === 'query' ? ` ${token} ` : `${words} ${token}`));
    });
    return s;
}

export function tokenize(text, mode = 'data') {
    return normalize(text, mode)
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
}

// Query tokens, each with the alternative phrasings it may match as.
function queryTokens(text) {
    return tokenize(text, 'query')
        .filter((t) => !STOPWORDS.has(t) && (t.length > 1 || /\d/.test(t)))
        .map((t) => ({ token: t, alternatives: [[t], ...(SYNONYMS[t] || []).map((s) => tokenize(s, 'query'))] }));
}

// How well one query word matches one word in the data, 0..1. Prefixes count
// so results update while the visitor is still typing ("micro" -> microwave).
function wordMatch(q, d) {
    if (q === d) return 1;
    if (q.length > 3 && (q === `${d}s` || d === `${q}s`)) return 0.95;
    if (d.startsWith(q)) return q.length >= 3 ? 0.85 : 0.6;
    if (q.length >= 4 && d.includes(q)) return 0.5;
    return 0;
}

// Best match of a phrase (all of its words) inside one field's words.
function phraseMatch(words, fieldTokens) {
    let total = 0;
    for (const w of words) {
        let best = 0;
        for (const d of fieldTokens) {
            best = Math.max(best, wordMatch(w, d));
            if (best === 1) break;
        }
        if (best === 0) return 0;
        total += best;
    }
    return total / words.length;
}

function field(kind, text, label) {
    return { kind, text, label: label || text, tokens: tokenize(text), weight: WEIGHT[kind] };
}

// "Directed Energy: High Energy Laser / High Power Microwave" ->
// ["Directed Energy", "High Energy Laser", "High Power Microwave"]. Only splits
// on " / " when every part is at least two words, so "rocket / missile" stays.
function itemTerms(item) {
    const colon = item.indexOf(': ');
    const category = colon > 0 ? item.slice(0, colon) : '';
    const rest = colon > 0 ? item.slice(colon + 2) : item;
    const parts = rest.split(' / ').map((p) => p.trim());
    const split = parts.length > 1 && parts.every((p) => p.split(/\s+/).length >= 2);
    return [...(category ? [category] : []), ...(split ? parts : [rest])];
}

const isNone = (text) => /^\s*(none|n\/a|-)\s*$/i.test(text);

function statTerm(stat) {
    const value = stat.value || '';
    if (/region/i.test(stat.label)) return value;
    // "Restricted" airspace reads as a phrase; numbers read as label: value.
    return /\d/.test(value) ? `${stat.label}: ${value}` : `${value} ${stat.label.toLowerCase()}`;
}

/**
 * Builds the searchable index from toRanges() output.
 * @returns {{ ranges: object[], docs: Map<string, object[]>, terms: object[] }}
 */
export function buildIndex(ranges) {
    const docs = new Map();
    const terms = new Map();
    const addTerm = (label, kind, rangeId) => {
        const key = label.toLowerCase();
        if (!terms.has(key)) terms.set(key, { label, kind, tokens: tokenize(label), rangeIds: new Set() });
        terms.get(key).rangeIds.add(rangeId);
    };

    (ranges || []).forEach((r) => {
        const fields = [field('name', r.name)];
        const stateName = STATE_NAMES[r.state];
        if (r.state) {
            fields.push(field('location', `${r.state} ${stateName || ''}`, stateName ? `${stateName} (${r.state})` : r.state));
            addTerm(stateName ? `${stateName} (${r.state})` : r.state, 'Location', r.id);
        }
        (r.testTypes || []).forEach((t) => {
            fields.push(field('testType', t));
            addTerm(t, 'Test type', r.id);
        });
        (r.capabilities || []).forEach((cap) => {
            (cap.groups || []).forEach((g) => {
                const items = (g.items || []).filter((i) => !isNone(i));
                if (!items.length) return;
                fields.push(field('group', g.label, `${cap.title}: ${g.label}`));
                if (!HEADING_GROUPS.test(g.label)) addTerm(g.label, cap.title, r.id);
                items.forEach((item) => {
                    fields.push(field('capability', item, item));
                    itemTerms(item).forEach((t) => addTerm(t, g.label, r.id));
                });
            });
        });
        (r.stats || []).forEach((s) => {
            const term = statTerm(s);
            fields.push(field(/region/i.test(s.label) ? 'location' : 'stat', `${s.label} ${s.value}`, term));
            addTerm(term, /region/i.test(s.label) ? 'Region' : s.label, r.id);
        });
        if (r.summary) {
            fields.push(field('summary', r.summary, 'Range summary'));
            const words = tokenize(r.summary);
            Object.keys(TERRAIN)
                .filter((t) => words.some((w) => w.startsWith(t)))
                .forEach((t) => {
                    const label = TERRAIN[t];
                    fields.push(field('terrain', `${t} ${label}`, `${label} terrain`));
                    addTerm(label, 'Terrain', r.id);
                });
        }
        docs.set(r.id, fields);
    });

    return { ranges: ranges || [], docs, terms: [...terms.values()] };
}

// Score of one criterion against one range's fields, plus the field that
// matched best (shown on the result card as the reason).
function scoreCriterion(tokens, fields) {
    if (!tokens.length) return { score: 0, via: '' };
    let total = 0;
    let via = '';
    let viaScore = 0;
    tokens.forEach(({ alternatives }) => {
        let best = 0;
        let bestField;
        fields.forEach((f) => {
            alternatives.forEach((words) => {
                const s = phraseMatch(words, f.tokens) * f.weight;
                if (s > best) {
                    best = s;
                    bestField = f;
                }
            });
        });
        total += best;
        if (bestField && best > viaScore) {
            viaScore = best;
            via = bestField.label;
        }
    });
    return { score: total / tokens.length, via };
}

/**
 * Ranks ranges against criteria (each a free-text string). A range's score is
 * the average of its per-criterion scores, so meeting 3 of 4 criteria fully is
 * 75%. Ranges that match nothing are returned separately.
 */
export function rankRanges(index, criteria) {
    const parsed = (criteria || []).map((text) => ({ text, tokens: queryTokens(text) })).filter((c) => c.tokens.length);
    if (!parsed.length) return { matched: [], unmatched: index.ranges.slice(), criteria: [] };

    const scored = index.ranges.map((range, order) => {
        const fields = index.docs.get(range.id) || [];
        const checks = parsed.map((c) => {
            const { score, via } = scoreCriterion(c.tokens, fields);
            return { criterion: c.text, score, met: score >= MET, via: score >= MET ? via : '' };
        });
        const score = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
        return { range, score, percent: Math.round(score * 100), checks, order };
    });

    const matched = scored.filter((s) => s.checks.some((c) => c.met)).sort((a, b) => b.score - a.score || a.order - b.order);
    const unmatched = scored.filter((s) => !s.checks.some((c) => c.met)).map((s) => s.range);
    return { matched, unmatched, criteria: parsed.map((c) => c.text) };
}

/**
 * Capability terms matching what the visitor is typing, best first, each with
 * a 0-100 match score. `exclude` holds labels already chosen as criteria.
 */
export function suggest(index, text, { limit = 6, exclude = [] } = {}) {
    const tokens = queryTokens(text);
    if (!tokens.length) return [];
    const skip = new Set(exclude.map((e) => e.toLowerCase()));
    return index.terms
        .filter((t) => !skip.has(t.label.toLowerCase()))
        .map((term) => {
            let total = 0;
            const covered = new Set();
            tokens.forEach(({ alternatives }) => {
                let best = 0;
                alternatives.forEach((words) => {
                    best = Math.max(best, phraseMatch(words, term.tokens));
                });
                total += best;
                if (best > 0) {
                    term.tokens.forEach((d) => {
                        if (tokens.some((q) => q.alternatives.some((words) => words.some((w) => wordMatch(w, d) > 0)))) covered.add(d);
                    });
                }
            });
            const relevance = total / tokens.length;
            // Prefer terms the query covers more of: "laser" ranks
            // "High Energy Laser" above a longer item that merely contains it.
            const coverage = term.tokens.length ? covered.size / term.tokens.length : 0;
            return { term, score: relevance * (0.8 + 0.2 * coverage) };
        })
        .filter((s) => s.score >= MET)
        .sort((a, b) => b.score - a.score || b.term.rangeIds.size - a.term.rangeIds.size || a.term.label.length - b.term.label.length)
        .slice(0, limit)
        .map(({ term, score }) => ({ label: term.label, kind: term.kind, rangeIds: [...term.rangeIds], percent: Math.round(score * 100) }));
}

/**
 * A few starting points for the empty search box: the test types, then one
 * short capability or attribute per kind (skipping qualifiers like "limited").
 */
export function starterTerms(index, limit = 5) {
    const short = (t) => t.label.split(/\s+/).length <= 3 && !/\d|limited/i.test(t.label);
    const testTypes = index.terms.filter((t) => t.kind === 'Test type');
    const seen = new Set(['Test type', 'Location', 'Region', 'Acres']);
    const others = index.terms.filter((t) => short(t) && !seen.has(t.kind) && seen.add(t.kind));
    return [...testTypes, ...others].slice(0, limit).map((t) => t.label);
}
