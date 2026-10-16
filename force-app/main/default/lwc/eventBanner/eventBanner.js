import { LightningElement, wire } from 'lwc';
import { graphql, href, EVENTS_QUERY, toEvents } from 'c/portalApi';

export default class EventBanner extends LightningElement {
    event;

    // The banner shows the first active event; the section stays hidden
    // when there is none (or the query fails).
    @wire(graphql, { query: EVENTS_QUERY })
    wiredEvents({ data }) {
        if (data) {
            const events = toEvents(data);
            this.event = events.length ? events[0] : undefined;
        }
    }

    // A recurring event without announced dates has no sessions; the lead
    // text carries the cadence and the band drops its dates column.
    get hasSessions() {
        return Boolean(this.event && this.event.sessions.length);
    }

    get bandClass() {
        return this.hasSessions ? 'band' : 'band band--no-dates';
    }

    get signupHref() {
        return href(this.event ? `/request?event=${this.event.id}` : '/request');
    }
}
