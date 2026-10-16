// Mock records for the local LWR harness, in the same shape UI API GraphQL
// returns them (every field wrapped as { value }, children as connections), so
// the shaping code in c/portalModel runs unchanged against this data.
// Capability data for Dugway is carried over from the current site; the
// other ranges are placeholders (Pending__c) until the range offices confirm.

export const f = (value) => ({ value: value === undefined ? null : value });
export const conn = (nodes) => ({ edges: nodes.map((node) => ({ node })) });

let seq = 0;
const id = (prefix) => `${prefix}MOCK${String(++seq).padStart(10, '0')}`;

const group = (testType, name, items, order) => ({
    Id: id('a01'),
    Name: f(name),
    Test_Type__c: f(testType),
    Items__c: f(items.join('\n')),
    Sort_Order__c: f(order)
});

const range = ({ code, name, state, summary, stats, testTypes, pending = false, order, groups = [] }) => ({
    Id: id('a00'),
    Name: f(name),
    Code__c: f(code),
    State__c: f(state),
    Summary__c: f(summary),
    Stats__c: f(JSON.stringify(stats)),
    Test_Types__c: f(testTypes.join(';')),
    Pending__c: f(pending),
    Active__c: f(true),
    Sort_Order__c: f(order),
    Capability_Groups__r: conn(groups)
});

export const RANGE_NODES = [
    range({
        code: 'dpg',
        name: 'Dugway Proving Ground',
        state: 'UT',
        order: 1,
        summary:
            'With more than 800,000 acres and up to 100 kilometers of long-range fires test range, Dugway Proving Ground offers expansive land and restricted airspace for the most demanding test missions.',
        stats: [
            { label: 'Acres', value: '800,000+' },
            { label: 'Fires range', value: '100 km' },
            { label: 'Airspace', value: 'Restricted' }
        ],
        testTypes: ['Drone / Counter-Drone', 'Long-Range Fires'],
        groups: [
            group('Drone / Counter-Drone', 'Kinetic', ['Projectile and rocket / missile'], 1),
            group(
                'Drone / Counter-Drone',
                'Non-kinetic',
                [
                    'Denied, Degraded, Intermittent and Limited: Electronic Attack / Conventional Threat',
                    'Directed Energy: High Energy Laser / High Power Microwave'
                ],
                2
            ),
            group('Drone / Counter-Drone', 'Instrumentation', ['None'], 3),
            group('Long-Range Fires', 'Range', ['< 75 km, no Flight Termination System (FTS) required', '75-100 km, requires coordination, FTS required'], 4),
            group('Long-Range Fires', 'Munition type', ['High explosive - limited', 'Inert'], 5),
            group('Long-Range Fires', 'Impact area', ['Instrumentation - limited'], 6)
        ]
    }),
    range({
        code: 'wcr',
        name: 'West Cibola Range',
        state: 'AZ',
        order: 2,
        pending: true,
        summary: 'Desert test range within the Yuma Proving Ground complex. Capability details are being finalized with the range office.',
        stats: [{ label: 'Region', value: 'Southwest' }],
        testTypes: ['Drone / Counter-Drone']
    }),
    range({
        code: 'cgr',
        name: 'Camp Grayling',
        state: 'MI',
        order: 3,
        pending: true,
        summary: 'Northern forested and lake terrain. Capability details are being finalized with the range office.',
        stats: [{ label: 'Region', value: 'Great Lakes' }],
        testTypes: ['Drone / Counter-Drone']
    }),
    range({
        code: 'csh',
        name: 'Camp Shelby',
        state: 'MS',
        order: 4,
        pending: true,
        summary: 'Southern pine and mixed terrain. Hosts the September 2027 EMU test event. Capability details are being finalized with the range office.',
        stats: [{ label: 'Region', value: 'Gulf South' }],
        testTypes: ['Drone / Counter-Drone']
    }),
    range({
        code: 'amtec',
        name: 'AMTEC',
        state: 'Morocco',
        order: 5,
        pending: true,
        summary: 'Partner-nation test site. Capability details are being finalized with the range office.',
        stats: [{ label: 'Region', value: 'International' }],
        testTypes: ['Drone / Counter-Drone']
    })
];

const session = (start, end, where) => ({ Id: id('a04'), Start_Date__c: f(start), End_Date__c: f(end), Location__c: f(where) });

export const EVENT_NODES = [
    {
        Id: id('a03'),
        Name: f('2027 Electromagnetic Unreliability Test Events'),
        Code__c: f('emu-2027'),
        Lead__c: f('Sign up in the request form.'),
        Active__c: f(true),
        Sort_Order__c: f(1),
        Event_Sessions__r: conn([
            session('2027-02-01', '2027-02-05', 'Dugway Proving Ground, UT'),
            session('2027-06-14', '2027-06-18', 'Yuma Proving Ground, AZ'),
            session('2027-09-20', '2027-09-24', 'Camp Shelby, MS')
        ])
    }
];

export const USER_NODE = {
    Id: id('005'),
    Name: f('Jordan Reyes'),
    Email: f('jordan.reyes@northstar-autonomy.example'),
    Phone: f(''),
    CompanyName: f('Northstar Autonomy LLC'),
    AccountId: f('001MOCK0000000001'),
    ContactId: f('003MOCK0000000001'),
    Account: {
        Name: f('Northstar Autonomy LLC'),
        License_ID__c: f('LIC-44871')
    }
};

export const activity = (status, date, note) => ({
    Id: id('a05'),
    Status__c: f(status),
    Activity_Date__c: f(date),
    Note__c: f(note),
    CreatedDate: f(`${date}T15:00:00.000Z`)
});

const request = ({ name, title, testType, range: rangeName, start, end, status, updated, owner, nextAction, timeline }) => ({
    Id: id('a02'),
    Name: f(name),
    Title__c: f(title),
    Test_Type__c: f(testType),
    Status__c: f(status),
    Start_Date__c: f(start),
    End_Date__c: f(end),
    Range_POC__c: f(owner),
    Next_Action__c: f(nextAction),
    CreatedDate: f(`${timeline[0][1]}T14:00:00.000Z`),
    LastModifiedDate: f(`${updated}T16:30:00.000Z`),
    Range__r: rangeName ? { Name: f(rangeName) } : null,
    Request_Activities__r: conn(timeline.map(([s, d, n]) => activity(s, d, n)))
});

export const REQUEST_NODES = [
    request({
        name: 'TR-2026-0142',
        title: 'Group 3 UAS endurance and EA resilience',
        testType: 'UAS',
        range: 'Dugway Proving Ground',
        start: '2026-11-09',
        end: '2026-11-13',
        status: 'Coordination',
        updated: '2026-10-12',
        owner: 'R. Alvarez, Range Operations',
        nextAction: 'Range office will confirm frequency allocation by Oct 20.',
        timeline: [
            ['Submitted', '2026-09-28', 'Request received.'],
            ['Under review', '2026-10-01', 'Technical review by the range safety office.'],
            ['Coordination', '2026-10-12', 'Airspace and frequency deconfliction in progress with R-6402 controlling agency.']
        ]
    }),
    request({
        name: 'TR-2026-0137',
        title: 'Counter-UAS HPM engagement, Group 1-2 targets',
        testType: 'Counter-UAS',
        range: 'Dugway Proving Ground',
        start: '2026-12-07',
        end: '2026-12-11',
        status: 'Needs info',
        updated: '2026-10-09',
        owner: 'K. Osei, Directed Energy Test Branch',
        nextAction: 'Upload the requested documents to continue review.',
        timeline: [
            ['Submitted', '2026-09-20', 'Request received.'],
            ['Under review', '2026-09-24', 'Review started.'],
            ['Needs info', '2026-10-09', 'Please attach the HPM emitter safety data sheet and intended power levels.']
        ]
    }),
    request({
        name: 'TR-2026-0119',
        title: 'Long-range fires, inert rounds to 60 km',
        testType: 'Long-Range Fires',
        range: 'Dugway Proving Ground',
        start: '2026-10-26',
        end: '2026-10-30',
        status: 'Scheduled',
        updated: '2026-10-05',
        owner: 'R. Alvarez, Range Operations',
        nextAction: 'Arrive Oct 25 for check-in; see the confirmation packet.',
        timeline: [
            ['Submitted', '2026-08-14', 'Request received.'],
            ['Under review', '2026-08-18', 'Review complete; no FTS required under 75 km.'],
            ['Coordination', '2026-09-02', 'Impact area and instrumentation reserved.'],
            ['Scheduled', '2026-10-05', 'Confirmed for Oct 26-30. Safety brief at 0700 on Oct 26.']
        ]
    }),
    request({
        name: 'TR-2026-0088',
        title: 'EMU test event participation - June session',
        testType: 'UAS',
        range: 'Yuma Proving Ground',
        start: '2026-06-14',
        end: '2026-06-18',
        status: 'Complete',
        updated: '2026-06-22',
        owner: 'Event coordination cell',
        nextAction: '',
        timeline: [
            ['Submitted', '2026-03-02', 'Event sign-up received.'],
            ['Under review', '2026-03-05', 'Eligibility confirmed.'],
            ['Coordination', '2026-04-10', 'Slot assigned.'],
            ['Scheduled', '2026-05-01', 'Confirmed.'],
            ['Complete', '2026-06-22', 'Test report delivered.']
        ]
    })
];

export const nextId = (prefix) => id(prefix);
