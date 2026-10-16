import { LightningElement, api, wire } from 'lwc';
import { graphql, href, RANGES_QUERY, toRanges } from 'c/portalApi';
import { buildIndex, rankRanges, suggest, starterTerms } from './rangeSearch';

// Capability-based range search. Visitors type what they need ("counter
// drone, high power microwave, restricted airspace"), pick suggested
// capabilities or keep free text, and ranges are ranked by how many of those
// criteria each one lists.
//
// mode="browse" (the /ranges page): a page section; cards link to the request
// form with that range pre-selected.
// mode="select" (inside requestForm): cards set the preferred / alternate
// range through a `rangeselect` event ({ role, id }); criteria changes are
// reported through `criteriachange` ({ criteria }) so the form can keep them
// across steps.
export default class RangeFinder extends LightningElement {
    @api mode = 'browse';
    @api eyebrow = 'Find a range';
    @api heading = 'Search ranges by capability';
    @api label = 'Describe what you need to test';
    @api preferredId = '';
    @api alternateId = '';

    @api
    get criteria() {
        return this.chips;
    }
    set criteria(value) {
        this.chips = Array.isArray(value) ? value.filter(Boolean) : [];
    }

    chips = [];
    query = '';
    open = false;
    activeIndex = -1;
    index;
    error;
    // Ranking is read by several getters per render; keyed so it runs once.
    cache = { key: null, value: null };

    @wire(graphql, { query: RANGES_QUERY })
    wiredRanges({ data, errors }) {
        if (data) {
            this.index = buildIndex(toRanges(data));
            this.error = undefined;
        } else if (errors) {
            this.error = 'Range information is temporarily unavailable. Please try again shortly.';
        }
    }

    // ----- layout -----
    get isBrowse() {
        return this.mode !== 'select';
    }
    get isSelect() {
        return this.mode === 'select';
    }
    get sectionClass() {
        return this.isBrowse ? 'section' : 'embedded';
    }
    get containerClass() {
        return this.isBrowse ? 'container' : '';
    }
    get loading() {
        return !this.index && !this.error;
    }

    // ----- search box -----
    get chipItems() {
        return this.chips.map((label, index) => ({ key: `${index}-${label}`, label, index, removeLabel: `Remove ${label}` }));
    }
    get placeholder() {
        return this.chips.length ? 'Add another need' : 'e.g. counter drone, high power microwave, restricted airspace';
    }
    get suggestions() {
        if (!this.index || !this.query.trim()) return [];
        return suggest(this.index, this.query, { exclude: this.chips });
    }
    get suggestionItems() {
        const names = new Map(this.index ? this.index.ranges.map((r) => [r.id, r.name]) : []);
        return this.suggestions.map((s, i) => {
            const active = i === this.activeIndex;
            return {
                ...s,
                id: `finder-option-${i}`,
                selected: active ? 'true' : 'false',
                cls: active ? 'option option--active' : 'option',
                where: s.rangeIds.length === 1 ? names.get(s.rangeIds[0]) : `${s.rangeIds.length} ranges`
            };
        });
    }
    get showOptions() {
        return this.open && this.suggestions.length > 0;
    }
    get optionsClass() {
        return this.showOptions ? 'options options--open' : 'options';
    }
    get expanded() {
        return this.showOptions ? 'true' : 'false';
    }
    get activeDescendant() {
        return this.showOptions && this.activeIndex >= 0 ? `finder-option-${this.activeIndex}` : null;
    }
    get helpText() {
        if (this.query.trim()) return 'Pick a suggestion, or press Enter to search for exactly what you typed.';
        return 'Add as many needs as you like: test type, effect, munition, airspace, terrain or location.';
    }
    get showStarters() {
        return !this.chips.length && !this.query.trim() && this.starters.length > 0;
    }
    get starters() {
        return this.index ? starterTerms(this.index) : [];
    }

    // ----- ranking -----
    get liveCriteria() {
        const typed = this.query.trim();
        return typed ? [...this.chips, typed] : this.chips;
    }
    get ranking() {
        if (!this.index) return { matched: [], unmatched: [], criteria: [] };
        const key = this.liveCriteria.join('\u0001');
        if (this.cache.key !== key || this.cache.index !== this.index) {
            this.cache.key = key;
            this.cache.index = this.index;
            this.cache.value = rankRanges(this.index, this.liveCriteria);
        }
        return this.cache.value;
    }
    get hasCriteria() {
        return this.ranking.criteria.length > 0;
    }
    get hasResults() {
        return this.ranking.matched.length > 0;
    }
    get results() {
        return this.ranking.matched.map((m, i) => {
            const { range } = m;
            const isPreferred = range.id === this.preferredId;
            const isAlternate = range.id === this.alternateId;
            let cls = 'card res';
            if (isPreferred) cls += ' res--preferred';
            else if (isAlternate) cls += ' res--alternate';
            return {
                id: range.id,
                rank: i + 1,
                name: range.name,
                state: range.state,
                pending: range.pending,
                percent: m.percent,
                barStyle: `width: ${Math.max(m.percent, 4)}%`,
                cls,
                checks: m.checks.map((c, j) => ({
                    key: `${j}-${c.criterion}`,
                    label: c.criterion,
                    via: c.via && c.via.toLowerCase() !== c.criterion.toLowerCase() ? c.via : '',
                    met: c.met,
                    cls: c.met ? 'check check--met' : 'check',
                    srText: c.met ? 'Meets:' : 'Not listed:'
                })),
                requestHref: href(`/request?range=${encodeURIComponent(range.id)}`),
                isPreferred,
                preferPressed: isPreferred ? 'true' : 'false',
                preferLabel: isPreferred ? 'Preferred' : 'Set as preferred',
                preferClass: isPreferred ? 'btn btn--primary btn--sm' : 'btn btn--secondary btn--sm',
                altPressed: isAlternate ? 'true' : 'false',
                altLabel: isAlternate ? 'Alternate' : 'Set as alternate',
                altClass: isAlternate ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'
            };
        });
    }
    get unmatchedText() {
        const names = this.ranking.unmatched.map((r) => r.name);
        return names.length ? `No match yet: ${names.join(', ')}` : '';
    }
    get ghosts() {
        return this.index ? this.index.ranges.map((r) => ({ id: r.id, name: r.name, state: r.state })) : [];
    }
    get statusText() {
        if (!this.hasCriteria) return '';
        const { matched } = this.ranking;
        if (!matched.length) return 'No ranges match yet.';
        const best = matched[0];
        return `${matched.length} ${matched.length === 1 ? 'range matches' : 'ranges match'}. Best: ${best.range.name}, ${best.percent}%.`;
    }

    // ----- select mode summary -----
    rangeName(id) {
        const range = id && this.index && this.index.ranges.find((r) => r.id === id);
        return range ? `${range.name}, ${range.state}` : '';
    }
    get preferredName() {
        return this.rangeName(this.preferredId) || 'Not chosen yet';
    }
    get alternateName() {
        return this.rangeName(this.alternateId) || 'None';
    }
    get preferredClass() {
        return this.preferredId ? 'picked-value' : 'picked-value picked-value--empty';
    }
    get alternateClass() {
        return this.alternateId ? 'picked-value' : 'picked-value picked-value--empty';
    }

    // ----- handlers -----
    focusInput(event) {
        if (event.target.closest && event.target.closest('button')) return;
        const input = this.template.querySelector('.box-input');
        if (input) input.focus();
    }

    handleInput(event) {
        this.query = event.target.value;
        this.open = true;
        this.activeIndex = -1;
    }

    handleFocus() {
        this.open = true;
    }

    handleBlur() {
        this.open = false;
        this.activeIndex = -1;
    }

    handleKeyDown(event) {
        const count = this.suggestions.length;
        switch (event.key) {
            case 'ArrowDown':
                if (!count) return;
                event.preventDefault();
                this.open = true;
                this.activeIndex = (this.activeIndex + 1) % count;
                break;
            case 'ArrowUp':
                if (!count) return;
                event.preventDefault();
                this.open = true;
                this.activeIndex = this.activeIndex <= 0 ? count - 1 : this.activeIndex - 1;
                break;
            case 'Enter':
                // Never let Enter submit a surrounding form.
                event.preventDefault();
                if (this.showOptions && this.activeIndex >= 0) this.addChip(this.suggestions[this.activeIndex].label);
                else if (this.query.trim()) this.addChip(this.query.trim());
                break;
            case 'Escape':
                if (this.showOptions) {
                    event.preventDefault();
                    this.open = false;
                    this.activeIndex = -1;
                } else if (this.query) {
                    event.preventDefault();
                    this.query = '';
                }
                break;
            case 'Backspace':
                if (!this.query && this.chips.length) this.removeAt(this.chips.length - 1);
                break;
            default:
        }
    }

    handleOptionMouseDown(event) {
        // mousedown + preventDefault keeps focus in the input (no blur first).
        event.preventDefault();
        this.addChip(event.currentTarget.dataset.label);
    }

    addStarter(event) {
        this.addChip(event.currentTarget.dataset.label);
        const input = this.template.querySelector('.box-input');
        if (input) input.focus();
    }

    removeChip(event) {
        event.stopPropagation();
        this.removeAt(Number(event.currentTarget.dataset.index));
    }

    addChip(label) {
        const text = String(label || '').trim();
        this.query = '';
        this.activeIndex = -1;
        if (!text || this.chips.some((c) => c.toLowerCase() === text.toLowerCase())) return;
        this.chips = [...this.chips, text];
        this.notifyCriteria();
    }

    removeAt(index) {
        this.chips = this.chips.filter((c, i) => i !== index);
        this.notifyCriteria();
    }

    notifyCriteria() {
        this.dispatchEvent(new CustomEvent('criteriachange', { detail: { criteria: [...this.chips] } }));
    }

    handlePrefer(event) {
        const { id } = event.currentTarget.dataset;
        this.select('preferred', id === this.preferredId ? '' : id);
    }

    handleAlternate(event) {
        const { id } = event.currentTarget.dataset;
        this.select('alternate', id === this.alternateId ? '' : id);
    }

    clearChoice(event) {
        this.select(event.currentTarget.dataset.role, '');
    }

    select(role, id) {
        this.dispatchEvent(new CustomEvent('rangeselect', { detail: { role, id } }));
    }
}
