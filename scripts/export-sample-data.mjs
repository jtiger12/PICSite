// Writes data/Test_Range__c.json, data/Test_Event__c.json and
// data/Range_Block__c.json (the `sf data import tree` sample data) from the
// harness mock records in src/mock/portalApi/data.js, so the org samples and
// the local harness show the same ranges, events and blocked days. Run after
// editing the mock: npm run sample-data. Block dates are relative to the day
// the script runs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { RANGE_NODES, EVENT_NODES, RANGE_BLOCK_NODES } = await import(pathToFileURL(join(root, 'src', 'mock', 'portalApi', 'data.js')).href);

const value = (field) => (field ? field.value : null);
const nodes = (connection) => (connection ? connection.edges.map((e) => e.node) : []);
const refName = (code) => String(code).replace(/(^|[^a-z0-9])([a-z0-9])/gi, (m, sep, c) => c.toUpperCase());

// Copies the listed { value } fields into a plain record, skipping nulls.
function fields(node, names) {
    const out = {};
    names.forEach((name) => {
        const v = value(node[name]);
        if (v !== null && v !== undefined) out[name] = v;
    });
    return out;
}

const ranges = RANGE_NODES.map((n) => {
    const ref = `Range${refName(value(n.Code__c))}`;
    const groups = nodes(n.Capability_Groups__r).map((g, i) => ({
        attributes: { type: 'Capability_Group__c', referenceId: `${ref}Group${i + 1}` },
        ...fields(g, ['Name', 'Test_Type__c', 'Items__c', 'Sort_Order__c'])
    }));
    return {
        attributes: { type: 'Test_Range__c', referenceId: ref },
        ...fields(n, ['Name', 'Code__c', 'State__c', 'Summary__c', 'Stats__c', 'Test_Types__c', 'Status__c', 'Latitude__c', 'Longitude__c', 'Active__c', 'Sort_Order__c']),
        ...(groups.length ? { Capability_Groups__r: { records: groups } } : {})
    };
});

const events = EVENT_NODES.map((n) => {
    const ref = `Event${refName(value(n.Code__c))}`;
    const sessions = nodes(n.Event_Sessions__r).map((s, i) => ({
        attributes: { type: 'Event_Session__c', referenceId: `${ref}Session${i + 1}` },
        ...fields(s, ['Start_Date__c', 'End_Date__c', 'Location__c'])
    }));
    return {
        attributes: { type: 'Test_Event__c', referenceId: ref },
        ...fields(n, ['Name', 'Code__c', 'Lead__c', 'Active__c', 'Sort_Order__c']),
        ...(sessions.length ? { Event_Sessions__r: { records: sessions } } : {})
    };
});

// Blocks reference their range by the range file's referenceId, which
// `sf data import tree` resolves when both files are in one import.
const blocks = RANGE_BLOCK_NODES.map((n, i) => ({
    attributes: { type: 'Range_Block__c', referenceId: `Block${i + 1}` },
    Range__c: `@Range${refName(value(n.Range__r.Code__c))}`,
    ...fields(n, ['Start_Date__c', 'End_Date__c', 'Type__c', 'Public_Label__c', 'Public__c'])
}));

const write = (name, records) => writeFileSync(join(root, 'data', name), `${JSON.stringify({ records }, null, 4)}\n`);
write('Test_Range__c.json', ranges);
write('Test_Event__c.json', events);
write('Range_Block__c.json', blocks);
console.log(`data/: ${ranges.length} ranges (${ranges.reduce((n, r) => n + (r.Capability_Groups__r ? r.Capability_Groups__r.records.length : 0), 0)} capability groups), ${events.length} events, ${blocks.length} range blocks`);
