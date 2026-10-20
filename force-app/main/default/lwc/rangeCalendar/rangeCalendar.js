import { LightningElement, api, wire } from 'lwc';
import { graphql, href, RANGES_QUERY, RANGE_BLOCKS_QUERY, toRanges, toBlocks, parseDate, isoDate, formatDate } from 'c/portalApi';

// Availability calendar: the days each range is blocked (Range_Block__c), as
// a month grid with bars spanning the blocked days, or as a list of upcoming
// blocks. Blocks are inclusive calendar days and day values never go through
// Date for display, so the grid does not shift with the browser timezone.
// Blocks come from RANGE_BLOCKS_QUERY (from a few months back); the ranges
// from RANGES_QUERY, whose order also fixes the colours and the filter.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Bar colours, one per range in sort order, all readable with dark text.
const COLORS = ['#ffcc01', '#7dd3fc', '#86efac', '#fda4af', '#c4b5fd', '#fdba74', '#67e8f9', '#f9a8d4'];
// Up to this many ranges filter as chips; beyond it a select, which scales.
const CHIP_LIMIT = 8;
const MONTHS_BACK = 3;
const ERROR = 'Range availability is temporarily unavailable. Please try again shortly.';

const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const iso = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * 86400000);

export default class RangeCalendar extends LightningElement {
    @api eyebrow = 'Range availability';
    @api title = 'Blocked dates';
    @api lead = 'Days a range is reserved, closed or in maintenance and cannot host a test. Dates are inclusive. Open days are not a reservation: the range office confirms every window when it reviews a request.';

    year;
    month;
    view = 'month';
    rangeFilter = '';
    ranges = [];
    blocks = [];
    error;
    today = isoDate();
    blockVars;

    constructor() {
        super();
        const t = parseDate(this.today);
        this.year = t.y;
        this.month = t.m;
        this.blockVars = { from: iso(utc(t.y, t.m - MONTHS_BACK, 1)) };
    }

    @wire(graphql, { query: RANGES_QUERY })
    wiredRanges({ data, errors }) {
        if (data) {
            this.ranges = toRanges(data);
        } else if (errors) {
            this.error = ERROR;
        }
    }

    @wire(graphql, { query: RANGE_BLOCKS_QUERY, variables: '$blockVars' })
    wiredBlocks({ data, errors }) {
        if (data) {
            this.blocks = toBlocks(data);
            this.error = undefined;
        } else if (errors) {
            this.error = ERROR;
        }
    }

    // ----- ranges, colours, filter -----

    get colorByRange() {
        const map = {};
        this.ranges.forEach((r, i) => {
            map[r.id] = COLORS[i % COLORS.length];
        });
        // A block whose range the ranges query did not return still gets a colour.
        this.blocks.forEach((b) => {
            if (!map[b.rangeId]) map[b.rangeId] = COLORS[Object.keys(map).length % COLORS.length];
        });
        return map;
    }

    get rangeOptions() {
        const colors = this.colorByRange;
        return this.ranges.map((r) => {
            const selected = r.id === this.rangeFilter;
            return {
                id: r.id,
                name: r.name,
                selected,
                pressed: selected ? 'true' : 'false',
                cls: selected ? 'chip chip--on' : 'chip',
                style: `--seg: ${colors[r.id]}`
            };
        });
    }

    get useSelect() {
        return this.ranges.length > CHIP_LIMIT;
    }

    get allChipClass() {
        return this.rangeFilter ? 'chip' : 'chip chip--on';
    }

    get allPressed() {
        return this.rangeFilter ? 'false' : 'true';
    }

    get visibleBlocks() {
        return this.rangeFilter ? this.blocks.filter((b) => b.rangeId === this.rangeFilter) : this.blocks;
    }

    selectRange(event) {
        this.rangeFilter = event.currentTarget.dataset.id || '';
    }

    selectFromDropdown(event) {
        this.rangeFilter = event.target.value || '';
    }

    // ----- month view -----

    get monthLabel() {
        return `${MONTHS[this.month - 1]} ${this.year}`;
    }

    get dayLabels() {
        return DAYS;
    }

    // One entry per week row: its seven days, and the bar segments of the
    // blocks that touch the week (a block spanning weeks gets one segment per
    // week, flagged where it continues).
    get weeks() {
        const first = utc(this.year, this.month, 1);
        const startDow = first.getUTCDay();
        const daysInMonth = utc(this.year, this.month + 1, 0).getUTCDate();
        const gridStart = addDays(first, -startDow);
        const count = Math.ceil((startDow + daysInMonth) / 7);
        const colors = this.colorByRange;
        const blocks = this.visibleBlocks;
        const weeks = [];
        for (let w = 0; w < count; w++) {
            const weekStart = addDays(gridStart, w * 7);
            const ws = iso(weekStart);
            const we = iso(addDays(weekStart, 6));
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = addDays(weekStart, i);
                const di = iso(d);
                days.push({ key: di, iso: di, n: d.getUTCDate(), inMonth: d.getUTCMonth() === this.month - 1, isToday: di === this.today, covering: [] });
            }
            const segments = [];
            blocks.forEach((b) => {
                if (b.end < ws || b.start > we) return;
                const fromLeft = b.start < ws;
                const toRight = b.end > we;
                const s = fromLeft ? 0 : days.findIndex((d) => d.iso === b.start);
                const e = toRight ? 6 : days.findIndex((d) => d.iso === b.end);
                for (let i = s; i <= e; i++) days[i].covering.push(`${b.rangeName} ${b.label.toLowerCase()}`);
                segments.push({
                    key: `${b.id}-${ws}`,
                    text: `${b.rangeName} · ${b.label}`,
                    title: `${b.rangeName}: ${b.label}, ${b.dates}`,
                    style: `grid-column: ${s + 1} / ${e + 2}; --seg: ${colors[b.rangeId] || COLORS[0]};`,
                    cls: `seg${fromLeft ? ' seg--from-left' : ''}${toRight ? ' seg--to-right' : ''}`
                });
            });
            days.forEach((d) => {
                d.cls = `day${d.inMonth ? '' : ' day--outside'}${d.isToday ? ' day--today' : ''}`;
                d.label = `${formatDate(d.iso)}${d.covering.length ? `: ${d.covering.join('; ')}` : ''}`;
            });
            weeks.push({ key: ws, days, segments });
        }
        return weeks;
    }

    prev() {
        if (this.month === 1) {
            this.month = 12;
            this.year -= 1;
        } else {
            this.month -= 1;
        }
    }

    next() {
        if (this.month === 12) {
            this.month = 1;
            this.year += 1;
        } else {
            this.month += 1;
        }
    }

    goToday() {
        const t = parseDate(this.today);
        this.year = t.y;
        this.month = t.m;
    }

    // ----- list view -----

    get listGroups() {
        const colors = this.colorByRange;
        const groups = [];
        this.visibleBlocks
            .filter((b) => b.end >= this.today)
            .forEach((b) => {
                const p = parseDate(b.start);
                const key = `${p.y}-${p.m}`;
                let g = groups[groups.length - 1];
                if (!g || g.key !== key) {
                    g = { key, label: `${MONTHS[p.m - 1]} ${p.y}`, items: [] };
                    groups.push(g);
                }
                g.items.push({ key: b.id, dates: b.dates, rangeName: b.rangeName, label: b.label, style: `--seg: ${colors[b.rangeId] || COLORS[0]}` });
            });
        return groups;
    }

    get hasUpcoming() {
        return this.listGroups.length > 0;
    }

    get emptyText() {
        return this.rangeFilter ? 'No blocked dates ahead for this range.' : 'No blocked dates ahead.';
    }

    // ----- view toggle -----

    get isMonth() {
        return this.view === 'month';
    }

    get monthPressed() {
        return this.isMonth ? 'true' : 'false';
    }

    get listPressed() {
        return this.isMonth ? 'false' : 'true';
    }

    get monthBtnClass() {
        return this.isMonth ? 'view-btn view-btn--on' : 'view-btn';
    }

    get listBtnClass() {
        return this.isMonth ? 'view-btn' : 'view-btn view-btn--on';
    }

    // The list is the only view on narrow screens (see the CSS), whatever the
    // toggle says.
    get listClass() {
        return this.isMonth ? 'list list--toggled-off' : 'list';
    }

    showMonth() {
        this.view = 'month';
    }

    showList() {
        this.view = 'list';
    }

    get requestHref() {
        return href('/request');
    }
}
