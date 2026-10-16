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

    get signupHref() {
        return href(this.event ? `/request?event=${this.event.id}` : '/request');
    }
}
