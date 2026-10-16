import { LightningElement, api, wire } from 'lwc';
import { graphql, href, RANGES_QUERY, toRanges } from 'c/portalApi';

export default class RangeExplorer extends LightningElement {
    // Expanded renders every range stacked (the /ranges page); otherwise tabs.
    @api expanded = false;
    ranges = [];
    selectedId;
    error;

    @wire(graphql, { query: RANGES_QUERY })
    wiredRanges({ data, errors }) {
        if (data) {
            this.ranges = toRanges(data);
            if (!this.ranges.some((r) => r.id === this.selectedId)) {
                this.selectedId = this.ranges[0] && this.ranges[0].id;
            }
            this.error = undefined;
        } else if (errors) {
            this.error = 'Range information is temporarily unavailable. Please try again shortly.';
        }
    }

    get heading() {
        return this.expanded ? 'Compare the ranges' : 'Where you can test';
    }

    get showTabs() {
        return !this.expanded;
    }

    get tabs() {
        return this.ranges.map((r) => {
            const selected = r.id === this.selectedId;
            return { id: r.id, name: r.name, state: r.state, selected: selected ? 'true' : 'false', cls: selected ? 'tab tab--selected' : 'tab' };
        });
    }

    get visibleRanges() {
        const list = this.expanded ? this.ranges : this.ranges.filter((r) => r.id === this.selectedId);
        return list.map((r) => ({ ...r, anchor: `range-${r.id}`, requestHref: href(`/request?range=${r.id}`) }));
    }

    get compareHref() {
        return href('/ranges');
    }

    selectRange(event) {
        this.selectedId = event.currentTarget.dataset.id;
    }
}
