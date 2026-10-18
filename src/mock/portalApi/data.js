// Mock records for the local LWR harness, in the same shape UI API GraphQL
// returns them (every field wrapped as { value }, children as connections), so
// the shaping code in c/portalModel runs unchanged against this data.
//
// Range capabilities come from public sources (army.mil, DVIDS, the ranges'
// own pages, FAA airspace records), gathered October 2026; events in
// parentheses give the year a capability was publicly shown. Dugway's
// "Range", "Munition type" and impact-area lines are carried over from the
// current ATEC site. No vendor or product names: capabilities are described
// by type. scripts/export-sample-data.mjs writes data/*.json from this file.

export const f = (value) => ({ value: value === undefined ? null : value });
export const conn = (nodes) => ({ edges: nodes.map((node) => ({ node })) });

let seq = 0;
const id = (prefix) => `${prefix}MOCK${String(++seq).padStart(10, '0')}`;

const DRONE = 'Drone / Counter-Drone';
const FIRES = 'Long-Range Fires';
const INTERCEPTOR = 'Low-Cost Interceptor';
const ENVIRONMENT = 'Range environment';

const group = (testType, name, items, order) => ({
    Id: id('a01'),
    Name: f(name),
    Test_Type__c: f(testType),
    Items__c: f(items.join('\n')),
    Sort_Order__c: f(order)
});

// Groups are listed as [testType, name, items]; sort order follows the list.
const range = ({ code, name, state, summary, stats, testTypes, status = 'Open', lat, lng, order, groups = [] }) => ({
    Id: id('a00'),
    Name: f(name),
    Code__c: f(code),
    State__c: f(state),
    Summary__c: f(summary),
    Stats__c: f(JSON.stringify(stats)),
    Test_Types__c: f(testTypes.join(';')),
    Status__c: f(status),
    Latitude__c: f(lat),
    Longitude__c: f(lng),
    Active__c: f(true),
    Sort_Order__c: f(order),
    Capability_Groups__r: conn(groups.map(([testType, label, items], i) => group(testType, label, items, i + 1)))
});

export const RANGE_NODES = [
    range({
        code: 'dpg',
        name: 'Dugway Proving Ground',
        state: 'UT',
        order: 1,
        lat: 40.232,
        lng: -112.747,
        summary:
            "The Army's chemical and biological defense proving ground in Utah's West Desert, Tooele County: nearly 800,000 acres of salt flats, desert and mountains under nearly 8,000 square miles of restricted airspace, with up to 100 kilometers of long-range fires range. Open to industry for drone, counter-drone, long-range fires and interceptor testing.",
        stats: [
            { label: 'Acres', value: '800,000' },
            { label: 'Restricted airspace', value: '8,000 sq mi' },
            { label: 'Fires range', value: '100 km' },
            { label: 'Elevation', value: '4,500-7,000 ft' }
        ],
        testTypes: [DRONE, FIRES, INTERCEPTOR],
        groups: [
            [DRONE, 'UAS operations', ['Group 5 UAS launch and recovery from Michael Army Airfield', 'Air-launched effects, captive carry and free flight (2023)']],
            [DRONE, 'Kinetic', ['Projectile and rocket / missile']],
            [
                DRONE,
                'Non-kinetic',
                [
                    'Denied, Degraded, Intermittent and Limited: Electronic Attack / Conventional Threat',
                    'Directed Energy: High Energy Laser / High Power Microwave',
                    'GPS interference testing under FAA notice (2026)',
                    'High energy laser demonstrations against Group 1-3 UAS (2025-2026)',
                    'Directed energy shoot-off: three lasers and a high power microwave (Dec 2026)'
                ]
            ],
            [DRONE, 'Instrumentation', ['None']],
            [FIRES, 'Range', ['< 75 km, no Flight Termination System (FTS) required', '75-100 km, requires coordination, FTS required']],
            [FIRES, 'Munition type', ['High explosive - limited', 'Inert']],
            [FIRES, 'Impact area', ['Instrumentation - limited', 'Four major impact areas and 91 artillery firing points', 'HIMARS live fire during a corps exercise (2026)']],
            [INTERCEPTOR, 'Live fire', ['Rocket-powered counter-UAS interceptor flight test (2026)']],
            [
                ENVIRONMENT,
                'Airspace',
                [
                    'Restricted areas R-6402A and R-6402B',
                    'Joint airspace with the Utah Test and Training Range, about half of it restricted up to 58,000 ft',
                    'Nearly 8,000 square miles of restricted airspace available to industry'
                ]
            ],
            [
                ENVIRONMENT,
                'Terrain and climate',
                [
                    'Salt flats (playa), mixed desert and mountains',
                    'Electronically and acoustically quiet, far from light pollution and development',
                    'Summer highs above 100°F; winds up to 60 mph'
                ]
            ],
            [ENVIRONMENT, 'Airfields', ['Michael Army Airfield: main runway over 6,000 ft with jet-arresting gear, three airstrips']],
            [ENVIRONMENT, 'Spectrum and instrumentation', ['Test grid with meteorological, dissemination and referee sensors']],
            [ENVIRONMENT, 'Specialty facilities', ['Chemical and biological defense test facilities, including a BSL-3 aerosol chamber', 'Smoke and obscurants testing']],
            [ENVIRONMENT, 'Support', ['On-post lodging and RV park', 'Foreign nationals: request access a month ahead']]
        ]
    }),
    range({
        code: 'wcr',
        name: 'West Cibola Range',
        state: 'AZ',
        order: 2,
        // Laguna Army Airfield, Yuma Proving Ground; West Cibola's own
        // coordinates aren't published.
        lat: 32.864,
        lng: -114.393,
        summary:
            "A newly opened part of Yuma Proving Ground in Arizona's Sonoran Desert, inside the proving ground's nearly 2,000 square miles of restricted airspace. Currently open to industry for drone and counter-drone testing.",
        stats: [
            { label: 'Restricted airspace', value: '2,000 sq mi' },
            { label: 'UAS focus', value: 'Group 1-2' },
            { label: 'Region', value: 'Sonoran Desert' }
        ],
        testTypes: [DRONE],
        groups: [
            [DRONE, 'UAS operations', ['Group 1-2 small UAS focus; Groups 3-5 mainly at White Sands', 'UAV operations sites and airdrop zones on Cibola Range']],
            [
                DRONE,
                'Kinetic',
                ['Interceptor drones, missiles and guided rockets against UAS at Yuma Proving Ground (2021-2024)', 'Group 3 kinetic effector shoot-off (2026)']
            ],
            [
                DRONE,
                'Non-kinetic',
                [
                    'RF jamming and electronic warfare (2024-2025)',
                    'High power microwave (2022)',
                    'High energy laser, 10 kW class (2022)',
                    'Emitters that replicate real-world electromagnetic environments'
                ]
            ],
            [
                DRONE,
                'Test lanes',
                [
                    'Three permanent counter-UAS test lanes (2026)',
                    'Swarm targets, up to 50 at once (2024)',
                    'Primary interagency counter-small-UAS test range (2025)'
                ]
            ],
            [
                ENVIRONMENT,
                'Airspace',
                [
                    'Yuma restricted areas R-2306, R-2307 and R-2308, up to 80,000 ft MSL (R-2307 unlimited)',
                    'Counter-UAS work inside restricted airspace instead of the national airspace system'
                ]
            ],
            [
                ENVIRONMENT,
                'Spectrum and instrumentation',
                [
                    'More than 500 permanent radio frequencies and a spectrum management office',
                    'Tracking radars, laser trackers, cine and video theodolites, multi-target differential GPS',
                    'Data and video telemetry with real-time mission control'
                ]
            ],
            [ENVIRONMENT, 'Terrain and climate', ['Sonoran Desert ringed by mountains on three sides', 'Clear, stable air; highs above 90°F for more than seven months a year']],
            [ENVIRONMENT, 'Airfields', ['Laguna Army Airfield: two runways of about 6,000 ft']]
        ]
    }),
    range({
        code: 'cgr',
        name: 'Camp Grayling',
        state: 'MI',
        order: 3,
        lat: 44.68,
        lng: -84.729,
        summary:
            "Camp Grayling Joint Maneuver Training Center, the largest National Guard training center, in northern Michigan's pine forests and lakes. Part of the National All-Domain Warfighting Center with Alpena's airspace and Lake Huron, and host of the Army's quarterly electromagnetic unreliability (DDIL) test events for industry.",
        stats: [
            { label: 'Acres', value: '148,000' },
            { label: 'Restricted airspace', value: 'To 23,000 ft' },
            { label: 'Billeting', value: '8,000 beds' }
        ],
        testTypes: [DRONE],
        groups: [
            [
                DRONE,
                'UAS operations',
                [
                    'Groups 1-3, VTOL and tethered UAS (2026)',
                    'Day and night UAS operations',
                    'National Range for Deep UAS Training (2026)',
                    'Beyond-line-of-sight (BVLOS) UAS flights over Lake Huron (R-4207)'
                ]
            ],
            [
                DRONE,
                'Electromagnetic environment',
                [
                    'Quarterly electromagnetic unreliability (DDIL) test events with ATEC (first held Sept 2026)',
                    'GPS (PNT) and RF denied scenarios',
                    'Up to 6,000 frequencies',
                    'GPS interference training injects'
                ]
            ],
            [DRONE, 'Counter-UAS', ['Dedicated industry counter-UAS test area for kinetic and non-kinetic systems, low-signal environment', 'RF jamming and passive detection (2026)']],
            [DRONE, 'Kinetic', ['Two impact areas for indirect fire and aerial weapons up to 500 lb', '104 firing points for tube artillery and mortars; MLRS/HIMARS firing area']],
            [
                ENVIRONMENT,
                'Airspace',
                ['Restricted areas R-4201A and R-4201B, surface to 23,000 ft MSL', 'Alpena special-use airspace, configurable from 300 ft AGL to 50,000 ft', 'R-4207 over Lake Huron, surface to 45,000 ft']
            ],
            [
                ENVIRONMENT,
                'Terrain and climate',
                ['Sandy plains with jack pine, oak and aspen forest', 'Rivers and lakes, including Lake Margrethe', 'Cold-weather testing; winters colder than Alaska']
            ],
            [ENVIRONMENT, 'Maritime', ['Lake Huron for unmanned surface and undersea vehicles', 'Littoral quarry training area']],
            [ENVIRONMENT, 'Urban and cyber', ['Urban combined arms training facility and three shoot houses', 'Live cyber attack and defense exercises on a statewide cyber range']],
            [ENVIRONMENT, 'Airfields and support', ['Grayling Army Airfield: two 5,000 ft runways', 'Alpena: 9,000 ft and 5,000 ft runways', '8,000 transient beds at Grayling']]
        ]
    }),
    range({
        code: 'csh',
        name: 'Camp Shelby',
        state: 'MS',
        order: 4,
        lat: 31.19,
        lng: -89.2,
        summary:
            "Camp Shelby Joint Forces Training Center, the Mississippi National Guard's post in the DeSoto National Forest south of Hattiesburg: more than 134,000 acres under restricted airspace to FL290, with a UAS flight center and a live-fire counter-UAS range.",
        stats: [
            { label: 'Acres', value: '134,000+' },
            { label: 'Restricted airspace', value: 'To FL290' },
            { label: 'Training areas', value: '64' }
        ],
        testTypes: [DRONE],
        groups: [
            [
                DRONE,
                'UAS operations',
                ['UAS Flight Center at Hagler Army Heliport: 5,000 ft runway with UAS catch cables and nets', 'Swarm threat replication, about 100 drones from one ground station (2026)']
            ],
            [
                DRONE,
                'Counter-UAS',
                [
                    'Live-fire counter-small-UAS range (Range 13)',
                    'RF detection, handheld and directional jamming, and fire-control optics assessed (2026)',
                    'Multi-sensor counter-UAS lanes at Hagler and the urban training facility (2026)'
                ]
            ],
            [
                DRONE,
                'Kinetic',
                [
                    '115 artillery and 15 mortar firing points; MLRS reduced-range practice rockets only',
                    "Air-to-ground ranges inside R-4401 (live munitions need 45 days' coordination)"
                ]
            ],
            [ENVIRONMENT, 'Airspace', ['Restricted areas R-4401A-E, surface to FL290', 'Adjacent De Soto military operations areas']],
            [ENVIRONMENT, 'Terrain and climate', ['Pine forest and wetlands in the DeSoto National Forest', 'Black Creek and Leaf River drainages', 'Summer heat']],
            [ENVIRONMENT, 'Urban', ['Urban combined arms training facility, urban assault course and 14 villages']],
            [ENVIRONMENT, 'Airfields', ['Hagler Army Heliport: 5,000 ft runway', 'Shelby Auxiliary Field One: 3,500 ft assault landing zone']]
        ]
    }),
    range({
        code: 'amtec',
        name: 'Multidomain Training Area, AMTEC',
        state: 'Morocco',
        order: 5,
        // Tan-Tan; the range complex's own coordinates aren't published.
        lat: 28.438,
        lng: -11.103,
        summary:
            "The range complex of the Africa Multidomain Training and Experimentation Center (AMTEC), a U.S. Africa Command and Royal Moroccan Armed Forces project near Tan-Tan on Morocco's Atlantic coast. Open to industry for long-range fires across the full electromagnetic spectrum; full build-out by 2030.",
        stats: [
            { label: 'Region', value: 'Atlantic coastal desert' },
            { label: 'Partners', value: 'AFRICOM and Morocco' },
            { label: 'Build-out', value: '2030' }
        ],
        testTypes: [FIRES],
        groups: [
            [
                FIRES,
                'Live fire',
                ['Precision munitions beyond 290 km (2026)', 'Industry low-cost cruise missile live fire (2026)', 'HIMARS live fire near Tan-Tan and Cap Draa (2024-2025)']
            ],
            [FIRES, 'Instrumentation', ['Expeditionary test site: communications, weather, targeting and missile performance data']],
            [ENVIRONMENT, 'Electromagnetic environment', ['Testing across the full electromagnetic spectrum', 'Contested-environment conditions']],
            [ENVIRONMENT, 'Terrain and climate', ['Coastal desert about 25 km inland from the Atlantic', 'About 100 mm of rain a year']],
            [ENVIRONMENT, 'Program', ['Drone Academy and Innovation and Experimentation Center in development', 'Counter-drone live-fire demonstration during African Lion (2026)']]
        ]
    }),
    range({
        code: 'atm',
        name: 'Atterbury-Muscatatuck',
        state: 'IN',
        order: 6,
        status: 'Coming soon',
        // Camp Atterbury; Muscatatuck is at about 39.051, -85.536.
        lat: 39.35,
        lng: -86.03,
        summary:
            "Indiana National Guard complex pairing Camp Atterbury's 34,000-acre maneuver and live-fire ranges and R-3401 restricted airspace with the Muscatatuck Training Center, a 1,000-acre real city with tunnels, a cyber range and clearance for electronic attack. Proposed for the Army's industry test-range program (Sept 2026).",
        stats: [
            { label: 'Acres', value: '34,000+ and 1,000' },
            { label: 'Restricted airspace', value: 'To FL250' },
            { label: 'Urban', value: '1.5M sq ft under roof' }
        ],
        testTypes: [DRONE],
        groups: [
            [
                DRONE,
                'UAS operations',
                [
                    'Camp Atterbury: UAS fly inside R-3401 without an FAA authorization while it is active',
                    'Camp Atterbury: 1,800 ft paved UAS runway and launch and recovery area',
                    'Muscatatuck: Class 1 UAS in Class G and custom-managed airspace over the urban site',
                    'Blue UAS or a waiver required for commercial drones'
                ]
            ],
            [
                DRONE,
                'Counter-UAS',
                [
                    'Camp Atterbury: high power microwave defeated 61 of 61 drones, including a 49-drone swarm (2025)',
                    'Camp Atterbury: gun-based kinetic counter-drone demonstration (2024)',
                    'Camp Atterbury: air defense ranges; target drones approved 14 days ahead'
                ]
            ],
            [
                DRONE,
                'Electromagnetic environment',
                ['Muscatatuck: clearance for ground-based electronic attack', 'Muscatatuck: GPS and communications denial', 'Camp Atterbury: four electronic threat emitters (Range 36)']
            ],
            [DRONE, 'Experimentation', ['Technology readiness experimentation (T-REX) campaigns (2023-2025)', 'One-way attack drone development (2026)']],
            [
                ENVIRONMENT,
                'Urban and subterranean',
                [
                    'Muscatatuck: real vacated city with 190+ structures',
                    '1.8 miles of tunnels, a cave complex and a subway station',
                    'Collapsed structures, a flooded neighborhood, a five-story hospital and a prison'
                ]
            ],
            [
                ENVIRONMENT,
                'Cyber and RF',
                [
                    'Muscatatuck: cyber range with a cyber electromagnetic activities (CEMA) environment',
                    'Closed 3G/4G LTE cellular network (5G planned)',
                    'Working micro-grid, water treatment plant and traffic signals',
                    'Simulated internet and social media'
                ]
            ],
            [ENVIRONMENT, 'Live fire', ['Camp Atterbury: 80+ artillery and mortar firing points, up to 155mm', 'MLRS reduced-range practice rockets only']],
            [ENVIRONMENT, 'Airspace', ['R-3401A surface to FL250 (FL400 on request) and R-3401B', 'Racer military operations areas; Jefferson Range R-3403 nearby']],
            [
                ENVIRONMENT,
                'Terrain and airfields',
                ['Wooded hills, open ground and marsh at Camp Atterbury', 'Reservoir and river at Muscatatuck', 'Himsel Army Airfield']
            ]
        ]
    })
];

const session = (start, end, where) => ({ Id: id('a04'), Start_Date__c: f(start), End_Date__c: f(end), Location__c: f(where) });

// Quarterly at Camp Grayling. The first ran Sept 13-18, 2026; later dates
// aren't announced, so the event has no sessions and the banner shows the
// lead text alone. Add sessions here as dates are published.
export const EVENT_NODES = [
    {
        Id: id('a03'),
        Name: f('Electromagnetic Unreliability (DDIL) Test Events'),
        Code__c: f('emu-ddil'),
        Lead__c: f(
            'Quarterly at Camp Grayling, Michigan: test drones and counter-drone systems under GPS- and RF-denied electronic warfare conditions. The first ran Sept 13-18, 2026. Sign up and the range concierge will place you in the next window.'
        ),
        Active__c: f(true),
        Sort_Order__c: f(1),
        // e.g. conn([session('2026-12-13', '2026-12-18', 'Camp Grayling, MI')])
        Event_Sessions__r: conn([])
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

// The account signed in through the mock backend (scripts/mock-backend.mjs,
// configured in .env) as a User node. It keeps the demo user's Id so
// CURRENT_USER_ID still matches; .env has no contact details, so the form
// collects those.
export const accountUserNode = (account) => ({
    ...USER_NODE,
    Name: f(''),
    Email: f(''),
    Phone: f(''),
    CompanyName: f(account.company),
    Account: {
        Name: f(account.company),
        License_ID__c: f(''),
        CAGE_Code__c: f(account.cageCode)
    }
});

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
        title: 'DDIL test event: Group 2 UAS under GPS and RF denial',
        testType: 'UAS',
        range: 'Camp Grayling',
        start: '2026-09-13',
        end: '2026-09-18',
        status: 'Complete',
        updated: '2026-09-25',
        owner: 'Event coordination cell',
        nextAction: '',
        timeline: [
            ['Submitted', '2026-08-10', 'Event sign-up received.'],
            ['Under review', '2026-08-12', 'Eligibility confirmed.'],
            ['Coordination', '2026-08-20', 'Slot assigned in the PNT- and RF-denied scenario.'],
            ['Scheduled', '2026-09-01', 'Confirmed for Sept 13-18.'],
            ['Complete', '2026-09-25', 'Test report delivered.']
        ]
    })
];

export const nextId = (prefix) => id(prefix);
