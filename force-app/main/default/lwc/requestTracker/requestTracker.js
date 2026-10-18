import { LightningElement, api, wire } from 'lwc';
import { graphql, href, refreshGraphQL, MY_REQUESTS_QUERY, toRequests, STATUS_STEPS, SIDE_STATUSES } from 'c/portalApi';

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'attention', label: 'Needs attention' },
    { value: 'complete', label: 'Complete' }
];

const isActive = (r) => !['Complete', 'Declined'].includes(r.status);
const needsAttention = (r) => r.status === 'Needs info';
const isScheduled = (r) => r.status === 'Scheduled';
const isComplete = (r) => r.status === 'Complete';

// Summary tiles. Clicking one opens what it counts: the request itself when
// there is one, a picker when there are several.
const TILES = [
    { key: 'active', label: 'Active requests', match: isActive },
    { key: 'attention', label: 'Need your attention', match: needsAttention, tone: 'warn' },
    { key: 'scheduled', label: 'Scheduled', match: isScheduled, tone: 'ok' },
    { key: 'complete', label: 'Completed', match: isComplete }
];

const inFilter = (r, filter) => {
    if (filter === 'active') return isActive(r);
    if (filter === 'attention') return needsAttention(r);
    if (filter === 'complete') return isComplete(r);
    return true;
};

// Everything a customer might type to find a request: number, title, range,
// dates, status, test type, point of contact and the activity notes.
const searchTextOf = (r) =>
    [r.id, r.title, r.testType, r.range, r.window, r.status, r.updated, r.owner, r.nextAction, ...r.timeline.map((t) => `${t.status} ${t.note}`)]
        .join(' ')
        .toLowerCase();

// Every word typed must appear somewhere in the request, in any order.
const matchesWords = (r, query) =>
    query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((w) => r.searchText.includes(w));

export default class RequestTracker extends LightningElement {
    // The request list collapses behind the star of the official Army logo
    // (the same unaltered file siteHeader uses, cropped to the star by CSS);
    // in Builder point it at the static resource.
    @api starUrl = '/assets/img/army-logo-dark.png';
    requests = [];
    selectedId;
    filter = 'all';
    query = '';
    pickerKey = null;
    pickerQuery = '';
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
            this.requests = list.map((r) => ({ ...r, searchText: searchTextOf(r) }));
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
        return TILES.map((t) => {
            const value = this.requests.filter(t.match).length;
            return { key: t.key, label: t.label, value, disabled: value === 0, cls: t.tone && value ? `tile tile--${t.tone}` : 'tile' };
        });
    }

    get pickerMatches() {
        const tile = TILES.find((t) => t.key === this.pickerKey);
        return tile ? this.requests.filter(tile.match) : [];
    }

    get pickerTitle() {
        const tile = TILES.find((t) => t.key === this.pickerKey);
        return tile ? `${tile.label} (${this.pickerMatches.length})` : '';
    }

    get pickerItems() {
        return this.pickerMatches.filter((r) => matchesWords(r, this.pickerQuery));
    }

    get pickerEmpty() {
        return Boolean(this.pickerKey) && this.pickerItems.length === 0;
    }

    get pickerMatchCount() {
        const n = this.pickerItems.length;
        return `${n} ${n === 1 ? 'match' : 'matches'}`;
    }

    get filters() {
        return FILTERS.map((f) => ({ ...f, selected: f.value === this.filter ? 'true' : 'false', cls: f.value === this.filter ? 'filter filter--on' : 'filter' }));
    }

    get filteredRequests() {
        const list = this.requests.filter((r) => inFilter(r, this.filter) && matchesWords(r, this.query));
        return list.map((r) => ({ ...r, cls: r.id === this.selectedId ? 'req req--on' : 'req', pressed: r.id === this.selectedId ? 'true' : 'false' }));
    }

    get isEmpty() {
        return this.filteredRequests.length === 0;
    }

    get matchCount() {
        const n = this.filteredRequests.length;
        return `${n} ${n === 1 ? 'match' : 'matches'}`;
    }

    get emptyTitle() {
        return this.query.trim() ? 'No matching requests' : 'No requests here yet';
    }

    get emptyText() {
        return this.query.trim()
            ? `Nothing matches "${this.query.trim()}". Try fewer or different words.`
            : 'Submit a test request and it will appear in this list with its status.';
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

    // The range office's own words for a side state: the latest Needs info
    // question (or Declined reason) from the activity, else the generic note.
    get sideEntry() {
        const r = this.selected;
        if (!r || !SIDE_STATUSES[r.status]) return null;
        return [...r.timeline].reverse().find((t) => t.status === r.status && t.note) || null;
    }

    get sideNote() {
        const r = this.selected;
        if (!r || !SIDE_STATUSES[r.status]) return '';
        return this.sideEntry ? this.sideEntry.note : SIDE_STATUSES[r.status].note;
    }

    get sideSource() {
        return this.sideEntry ? `Range office · ${this.sideEntry.date}` : '';
    }

    get sideNoteClass() {
        const r = this.selected;
        const tone = r && SIDE_STATUSES[r.status] ? SIDE_STATUSES[r.status].tone : 'warn';
        return `side side--${tone}`;
    }

    get canUpload() {
        return Boolean(this.selected && this.selected.status === 'Needs info' && this.selected.recordId);
    }

    // Reads as a climb: Submitted at the bottom, newest activity above it, and
    // the steps still ahead greyed out at the top. A declined request has none.
    get timeline() {
        const r = this.selected;
        if (!r) return [];
        const upcoming =
            r.status === 'Declined'
                ? []
                : STATUS_STEPS.slice(this.activeIndex + 1)
                      .map((status, i) => ({ key: `upcoming-${status}`, status, date: i === 0 ? 'Next' : 'Upcoming', note: '', cls: 'tl tl--upcoming' }))
                      .reverse();
        const done = [...r.timeline].reverse().map((t, i) => ({ ...t, key: t.id || `${t.status}-${t.date}`, cls: i === 0 ? 'tl tl--done tl--latest' : 'tl tl--done' }));
        return [...upcoming, ...done];
    }

    get requestCount() {
        return this.requests.length;
    }

    get railLabel() {
        return `Your requests (${this.requestCount})`;
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
        if (window.innerWidth < 960) this.scrollToDetail();
    }

    // The tiles sit above the detail, so whatever they open is scrolled into view.
    openTile(event) {
        const tile = TILES.find((t) => t.key === event.currentTarget.dataset.key);
        const matches = tile ? this.requests.filter(tile.match) : [];
        if (matches.length === 1) {
            this.selectedId = matches[0].id;
            this.scrollToDetail();
        } else if (matches.length > 1) {
            this.pickerKey = tile.key;
            this.pickerQuery = '';
            this.template.querySelector('.picker').showModal();
            // showModal focuses the close button first; start in the filter instead.
            this.template.querySelector('.picker-search').focus();
        }
    }

    pickRequest(event) {
        this.selectedId = event.currentTarget.dataset.id;
        this.closePicker();
        this.scrollToDetail();
    }

    handlePickerSearch(event) {
        this.pickerQuery = event.target.value;
    }

    // Enter in the filter opens the top match.
    handlePickerKeydown(event) {
        const top = this.pickerItems[0];
        if (event.key !== 'Enter' || !top) return;
        event.preventDefault();
        this.selectedId = top.id;
        this.closePicker();
        this.scrollToDetail();
    }

    closePicker() {
        const dialog = this.template.querySelector('.picker');
        if (dialog && dialog.open) dialog.close();
    }

    // The body fills the dialog, so a click landing on the dialog element itself is on the backdrop.
    handlePickerBackdrop(event) {
        if (event.target === event.currentTarget) this.closePicker();
    }

    // Fires for the close button, a pick, the backdrop and Esc alike.
    handlePickerClose() {
        this.pickerKey = null;
        this.pickerQuery = '';
    }

    scrollToDetail() {
        const detail = this.template.querySelector('.detail');
        if (detail && detail.scrollIntoView) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Searching narrows the list but leaves the open request in the detail pane.
    handleSearch(event) {
        this.query = event.target.value;
    }

    setFilter(event) {
        this.filter = event.currentTarget.dataset.filter;
        const visible = this.filteredRequests;
        if (!visible.some((r) => r.id === this.selectedId) && visible.length) this.selectedId = visible[0].id;
    }
}
