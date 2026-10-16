import { LightningElement, wire } from 'lwc';
import { graphql, href, refreshGraphQL, MY_REQUESTS_QUERY, toRequests, STATUS_STEPS, SIDE_STATUSES } from 'c/portalApi';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'attention', label: 'Needs attention' },
    { value: 'complete', label: 'Complete' }
];

const isActive = (r) => !['Complete', 'Declined'].includes(r.status);
const needsAttention = (r) => r.status === 'Needs info';

export default class RequestTracker extends LightningElement {
    requests = [];
    selectedId;
    filter = 'all';
    loading = true;
    error;
    wantedId;
    refreshed = false;
    wiredResult;

    connectedCallback() {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        this.wantedId = params && params.get('id');
    }

    @wire(graphql, { query: MY_REQUESTS_QUERY })
    wiredRequests(result) {
        this.wiredResult = result;
        const { data, errors } = result;
        if (data) {
            const list = toRequests(data);
            // Deep link to a request the cached result does not have yet (just
            // submitted): ask Lightning Data Service for a fresh copy, once.
            if (this.wantedId && !this.refreshed && !list.some((r) => r.id === this.wantedId)) {
                this.refreshed = true;
                Promise.resolve(refreshGraphQL(result)).catch(() => {});
            }
            this.requests = list;
            this.loading = false;
            this.error = undefined;
            if (!list.some((r) => r.id === this.selectedId)) {
                this.selectedId = list.some((r) => r.id === this.wantedId) ? this.wantedId : list[0] && list[0].id;
            }
        } else if (errors) {
            this.loading = false;
            this.error = 'Your requests could not be loaded. Please refresh the page or contact the range office.';
        }
    }

    get tiles() {
        const all = this.requests;
        return [
            { label: 'Active requests', value: all.filter(isActive).length, cls: 'tile' },
            { label: 'Need your attention', value: all.filter(needsAttention).length, cls: all.some(needsAttention) ? 'tile tile--warn' : 'tile' },
            { label: 'Scheduled', value: all.filter((r) => r.status === 'Scheduled').length, cls: 'tile tile--ok' },
            { label: 'Completed', value: all.filter((r) => r.status === 'Complete').length, cls: 'tile' }
        ];
    }

    get filters() {
        return FILTERS.map((f) => ({ ...f, selected: f.value === this.filter ? 'true' : 'false', cls: f.value === this.filter ? 'filter filter--on' : 'filter' }));
    }

    get filteredRequests() {
        const list = this.requests.filter((r) => {
            if (this.filter === 'active') return isActive(r);
            if (this.filter === 'attention') return needsAttention(r);
            if (this.filter === 'complete') return r.status === 'Complete';
            return true;
        });
        return list.map((r) => ({ ...r, cls: r.id === this.selectedId ? 'req req--on' : 'req', pressed: r.id === this.selectedId ? 'true' : 'false' }));
    }

    get isEmpty() {
        return this.filteredRequests.length === 0;
    }

    get selected() {
        return this.requests.find((r) => r.id === this.selectedId);
    }

    // Side states (Needs info, Declined) hold the stepper at the last main step reached.
    get activeIndex() {
        const r = this.selected;
        if (!r) return 0;
        const main = STATUS_STEPS.indexOf(r.status);
        if (main >= 0) return r.status === 'Complete' ? STATUS_STEPS.length : main;
        const reached = [...r.timeline].reverse().find((t) => STATUS_STEPS.includes(t.status));
        return reached ? STATUS_STEPS.indexOf(reached.status) : 0;
    }

    get sideNote() {
        const r = this.selected;
        return r && SIDE_STATUSES[r.status] ? SIDE_STATUSES[r.status].note : '';
    }

    get sideNoteClass() {
        const r = this.selected;
        const tone = r && SIDE_STATUSES[r.status] ? SIDE_STATUSES[r.status].tone : 'warn';
        return `side side--${tone}`;
    }

    get canUpload() {
        return Boolean(this.selected && this.selected.status === 'Needs info' && this.selected.recordId);
    }

    get timeline() {
        const r = this.selected;
        if (!r) return [];
        return [...r.timeline].reverse().map((t, i) => ({ ...t, key: t.id || `${t.status}-${t.date}`, cls: i === 0 ? 'tl tl--latest' : 'tl' }));
    }

    get newRequestHref() {
        return href('/request');
    }

    get contactHref() {
        const r = this.selected;
        return r ? `mailto:usarmy.testrange@army.mil?subject=${encodeURIComponent(r.id + ' - ' + r.title)}` : 'mailto:usarmy.testrange@army.mil';
    }

    select(event) {
        this.selectedId = event.currentTarget.dataset.id;
        const detail = this.template.querySelector('#detail');
        if (detail && window.innerWidth < 960 && detail.scrollIntoView) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setFilter(event) {
        this.filter = event.currentTarget.dataset.filter;
        const visible = this.filteredRequests;
        if (!visible.some((r) => r.id === this.selectedId) && visible.length) this.selectedId = visible[0].id;
    }
}
