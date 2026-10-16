import { LightningElement, wire } from 'lwc';
import {
    graphql,
    href,
    RANGES_QUERY,
    EVENTS_QUERY,
    CURRENT_USER_QUERY,
    CURRENT_USER_ID,
    toRanges,
    toEvents,
    toUser,
    TEST_TYPES,
    UAS_GROUPS,
    EFFECTS,
    MUNITIONS,
    HAZARDS,
    submitRequest
} from 'c/portalApi';

const STEPS = ['Organization', 'Test type', 'Range & dates', 'Test details', 'Review & submit'];

const STEP_TITLES = ['Who is requesting the test', 'What you are testing', 'Where and when', 'Test details', 'Review and submit'];

// Required fields per step; the key is the step index.
const REQUIRED = {
    0: ['organization', 'contactName', 'licenseId', 'email'],
    1: ['testType', 'systemName'],
    2: ['rangeId', 'startDate', 'endDate'],
    3: ['objectives'],
    4: ['attest']
};

// Fields the signed-in user's record pre-fills on the first step.
const USER_FIELDS = ['organization', 'contactName', 'licenseId', 'email', 'phone'];

const blankForm = (user) => ({
    organization: (user && user.organization) || '',
    uei: '',
    contactName: (user && user.name) || '',
    licenseId: (user && user.licenseId) || '',
    email: (user && user.email) || '',
    phone: (user && user.phone) || '',
    testType: '',
    systemName: '',
    uasGroup: '',
    effects: [],
    munition: MUNITIONS[0].value,
    maxRangeKm: '',
    rangeId: '',
    altRangeId: '',
    startDate: '',
    endDate: '',
    durationDays: '',
    eventId: '',
    flexible: false,
    objectives: '',
    instrumentation: '',
    hazards: [],
    personnel: '',
    attest: false
});

const labelOf = (options, value) => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : '';
};

export default class RequestForm extends LightningElement {
    stepIndex = 0;
    form = blankForm();
    errors = {};
    submitting = false;
    submitError = '';
    submitted;

    ranges = [];
    events = [];
    user;
    userVars = { userId: CURRENT_USER_ID };
    userApplied = false;
    deepLinks = {};

    needs = [
        { num: '01', title: 'A licensed account', text: 'Requests are accepted from licensed customers and sponsored organizations only.' },
        { num: '02', title: 'Test description', text: 'The system under test, objectives and the profile you intend to fly or fire.' },
        { num: '03', title: 'Preferred dates', text: 'An earliest start, latest end and how many range days you need.' },
        { num: '04', title: 'Safety data', text: 'Hazard information for munitions, lasers, emitters or hazardous materials.' }
    ];

    connectedCallback() {
        // Deep links from the ranges page and event banner are applied once
        // the matching list has loaded.
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            this.deepLinks = { range: params.get('range'), event: params.get('event') };
        }
    }

    // ----- data -----
    @wire(graphql, { query: RANGES_QUERY })
    wiredRanges({ data }) {
        if (!data) return;
        this.ranges = toRanges(data);
        const wanted = this.deepLinks.range;
        if (wanted && !this.form.rangeId && this.ranges.some((r) => r.id === wanted)) {
            this.form = { ...this.form, rangeId: wanted };
        }
    }

    @wire(graphql, { query: EVENTS_QUERY })
    wiredEvents({ data }) {
        if (!data) return;
        this.events = toEvents(data);
        const wanted = this.deepLinks.event;
        if (wanted && !this.form.eventId && this.events.some((e) => e.id === wanted)) {
            this.form = { ...this.form, eventId: wanted };
        }
    }

    @wire(graphql, { query: CURRENT_USER_QUERY, variables: '$userVars' })
    wiredUser({ data }) {
        if (!data) return;
        this.user = toUser(data);
        // Pre-fill the organization step once, never over something already typed.
        if (this.user && !this.userApplied) {
            this.userApplied = true;
            const defaults = blankForm(this.user);
            const patch = {};
            USER_FIELDS.forEach((key) => {
                if (!this.form[key] && defaults[key]) patch[key] = defaults[key];
            });
            this.form = { ...this.form, ...patch };
        }
    }

    // ----- step state -----
    get stepLabels() {
        return STEPS;
    }
    get stepTitle() {
        return STEP_TITLES[this.stepIndex];
    }
    get isStep0() {
        return this.stepIndex === 0;
    }
    get isStep1() {
        return this.stepIndex === 1;
    }
    get isStep2() {
        return this.stepIndex === 2;
    }
    get isStep3() {
        return this.stepIndex === 3;
    }
    get isStep4() {
        return this.stepIndex === 4;
    }
    get isFirst() {
        return this.stepIndex === 0;
    }
    get isLast() {
        return this.stepIndex === STEPS.length - 1;
    }
    get submitLabel() {
        return this.submitting ? 'Submitting…' : 'Submit request';
    }
    get trackHref() {
        return href(this.submitted ? `/track?id=${encodeURIComponent(this.submitted.id)}` : '/track');
    }

    // ----- derived option lists -----
    get cls() {
        const out = {};
        Object.keys(this.form).forEach((k) => {
            out[k] = this.errors[k] ? 'input input--error' : 'input';
        });
        return out;
    }
    get testTypeOptions() {
        return TEST_TYPES.map((t) => ({ ...t, selected: t.value === this.form.testType, cls: t.value === this.form.testType ? 'choice choice--selected' : 'choice' }));
    }
    get isUas() {
        return this.form.testType === 'uas';
    }
    get isCuas() {
        return this.form.testType === 'cuas';
    }
    get isLrf() {
        return this.form.testType === 'lrf' || this.form.testType === 'lci';
    }
    get showUasGroup() {
        return this.isUas || this.isCuas;
    }
    get uasGroupOptions() {
        return [''].concat(UAS_GROUPS).map((g) => ({ value: g, label: g || 'Select a group', selected: g === this.form.uasGroup }));
    }
    get effectOptions() {
        return EFFECTS.map((e) => ({ ...e, checked: this.form.effects.includes(e.value) }));
    }
    get munitionOptions() {
        return MUNITIONS.map((o) => ({ ...o, selected: o.value === this.form.munition }));
    }
    get rangeOptions() {
        return this.ranges.map((r) => ({ value: r.id, label: `${r.name} | ${r.state}`, selected: r.id === this.form.rangeId }));
    }
    get altRangeOptions() {
        return this.ranges.filter((r) => r.id !== this.form.rangeId).map((r) => ({ value: r.id, label: `${r.name} | ${r.state}`, selected: r.id === this.form.altRangeId }));
    }
    get eventOptions() {
        return this.events.map((e) => ({ value: e.id, label: e.title, selected: e.id === this.form.eventId }));
    }
    get hazardOptions() {
        return HAZARDS.map((h) => ({ ...h, checked: this.form.hazards.includes(h.value) }));
    }

    get reviewRows() {
        const f = this.form;
        const range = this.ranges.find((r) => r.id === f.rangeId);
        const alt = this.ranges.find((r) => r.id === f.altRangeId);
        const type = TEST_TYPES.find((t) => t.value === f.testType);
        const event = this.events.find((e) => e.id === f.eventId);
        const rows = [
            ['Organization', f.organization],
            ['Point of contact', `${f.contactName} · ${f.email}${f.phone ? ' · ' + f.phone : ''}`],
            ['License / sponsor', f.licenseId],
            ['Test type', type ? type.label : ''],
            ['System under test', f.systemName],
            ['UAS group', this.showUasGroup ? f.uasGroup : ''],
            ['Effects', this.isCuas ? f.effects.map((v) => labelOf(EFFECTS, v)).join(', ') : ''],
            ['Munition', this.isLrf ? labelOf(MUNITIONS, f.munition) : ''],
            ['Maximum range', this.isLrf && f.maxRangeKm ? `${f.maxRangeKm} km` : ''],
            ['Preferred range', range ? `${range.name}, ${range.state}` : ''],
            ['Alternate range', alt ? `${alt.name}, ${alt.state}` : ''],
            ['Window', `${f.startDate} to ${f.endDate}${f.durationDays ? ` (${f.durationDays} days)` : ''}${f.flexible ? ' · flexible' : ''}`],
            ['Test event', event ? event.title : ''],
            ['Objectives', f.objectives],
            ['Instrumentation', f.instrumentation],
            ['Hazards', f.hazards.map((v) => labelOf(HAZARDS, v)).join(', ')],
            ['Personnel', f.personnel]
        ];
        return rows.filter(([, v]) => v).map(([label, value]) => ({ label, value }));
    }

    // ----- handlers -----
    handleInput(event) {
        const { field } = event.target.dataset;
        this.form = { ...this.form, [field]: event.target.value };
        if (this.errors[field]) this.errors = { ...this.errors, [field]: '' };
    }

    handleCheck(event) {
        const { field } = event.target.dataset;
        this.form = { ...this.form, [field]: event.target.checked };
        if (this.errors[field]) this.errors = { ...this.errors, [field]: '' };
    }

    handleMulti(event) {
        const { field } = event.target.dataset;
        const { value, checked } = event.target;
        const current = this.form[field];
        this.form = { ...this.form, [field]: checked ? [...current, value] : current.filter((v) => v !== value) };
    }

    handleTestType(event) {
        this.form = { ...this.form, testType: event.target.value };
        this.errors = { ...this.errors, testType: '' };
    }

    validate() {
        const errors = {};
        (REQUIRED[this.stepIndex] || []).forEach((field) => {
            const v = this.form[field];
            if (v === '' || v === false || v == null) errors[field] = 'Required';
        });
        if (this.stepIndex === 0 && this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email)) errors.email = 'Enter a valid email address';
        if (this.stepIndex === 2 && this.form.startDate && this.form.endDate && this.form.endDate < this.form.startDate) errors.endDate = 'Latest end must be after the earliest start';
        if (this.stepIndex === 4 && !this.form.attest) errors.attest = 'Please confirm before submitting';
        this.errors = errors;
        return Object.keys(errors).length === 0;
    }

    next() {
        if (!this.validate()) return;
        this.stepIndex += 1;
        this.scrollToTop();
    }

    back() {
        this.stepIndex -= 1;
        this.errors = {};
        this.scrollToTop();
    }

    scrollToTop() {
        const el = this.template.querySelector('.head--spaced');
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (!this.validate()) return;
        this.submitting = true;
        this.submitError = '';
        try {
            const f = this.form;
            const range = this.ranges.find((r) => r.id === f.rangeId);
            const alt = this.ranges.find((r) => r.id === f.altRangeId);
            const testEvent = this.events.find((e) => e.id === f.eventId);
            const type = TEST_TYPES.find((t) => t.value === f.testType);
            const user = this.user || {};
            this.submitted = await submitRequest({
                ...f,
                title: f.systemName ? `${type.label}: ${f.systemName}` : `${type.label} test`,
                testTypeLabel: type.label,
                uasGroup: this.showUasGroup ? f.uasGroup : '',
                effects: this.isCuas ? f.effects : [],
                munition: this.isLrf ? f.munition : '',
                maxRangeKm: this.isLrf ? f.maxRangeKm : '',
                rangeName: range ? range.name : '',
                rangeRecordId: range ? range.recordId : null,
                altRangeRecordId: alt ? alt.recordId : null,
                eventRecordId: testEvent ? testEvent.recordId : null,
                accountId: user.accountId || null,
                contactId: user.contactId || null,
                window: `${f.startDate} - ${f.endDate}`
            });
            this.scrollToTop();
        } catch (e) {
            this.submitError = `Something went wrong submitting the request. ${describeError(e)}Please try again or contact the range office.`;
        } finally {
            this.submitting = false;
        }
    }

    startAnother() {
        this.submitted = undefined;
        this.form = blankForm(this.user);
        this.errors = {};
        this.stepIndex = 0;
    }
}

// Lightning Data Service errors carry the useful text in body.message or
// body.output.errors[]; anything else is left out of the customer message.
function describeError(e) {
    const body = e && e.body;
    if (body) {
        const fieldErrors = body.output && body.output.errors ? body.output.errors.map((x) => x.message).filter(Boolean) : [];
        const text = [body.message].concat(fieldErrors).filter(Boolean).join(' ');
        if (text) return `${text} `;
    }
    return '';
}
