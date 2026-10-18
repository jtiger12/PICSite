// Platform data access for the portal - the single seam between the
// components and Salesforce. No Apex:
//   - reads are UI API GraphQL queries; components wire them directly with
//     `@wire(graphql, { query: RANGES_QUERY })` and reshape the result with the
//     helpers in c/portalModel,
//   - submitRequest writes through Lightning Data Service's createRecord,
//   - record-triggered Flows (force-app/main/default/flows) handle the
//     activity log, emails and reminders after the insert.
// The local LWR harness cannot load lightning/* modules, so
// scripts/sync-lwr-modules.mjs aliases c/portalApi to src/mock/portalApi,
// which exports the same names backed by mock data.
import { gql, graphql, refreshGraphQL } from 'lightning/uiGraphQLApi';
import { createRecord } from 'lightning/uiRecordApi';
import USER_ID from '@salesforce/user/Id';
import IS_GUEST from '@salesforce/user/isGuest';
import basePath from '@salesforce/community/basePath';
import { toRequestFields, toSubmitted, prefixHref } from 'c/portalModel';

export { gql, graphql, refreshGraphQL };
export {
    STATUS_STEPS,
    SIDE_STATUSES,
    TEST_TYPES,
    UAS_GROUPS,
    EFFECTS,
    MUNITIONS,
    HAZARDS,
    DEFAULT_NEXT_ACTION,
    ACCEPTED_FILE_TYPES,
    ATTACHMENT_HINT,
    toRanges,
    toEvents,
    toRequests,
    toUser,
    formatWindow,
    formatDate
} from 'c/portalModel';

export const CURRENT_USER_ID = USER_ID;

// Experience Cloud sites normally live under a URL path prefix (/picsite);
// every portal link goes through href() so it works with or without one.
export const BASE_PATH = basePath || '';
export const href = (path) => prefixHref(BASE_PATH, path);

// Session, in the same shape as the harness's mock backend. The site's own
// login page and session handle authentication here, so signIn() only
// explains that and signOut() leaves through the standard logout URL.
export function getSession() {
    return Promise.resolve({ available: true, signedIn: !IS_GUEST, account: null });
}

export function signIn() {
    return Promise.reject(new Error('Sign-in is handled by the Experience Cloud login page.'));
}

export function signOut() {
    window.location.assign(href('/secur/logout.jsp'));
    return Promise.resolve();
}

// Active ranges with their capability groups, for rangeExplorer, rangeFinder
// and the request form. Child ordering is finished in toRanges().
export const RANGES_QUERY = gql`
    query PicRanges {
        uiapi {
            query {
                Test_Range__c(first: 20, where: { Active__c: { eq: true } }, orderBy: { Sort_Order__c: { order: ASC } }) {
                    edges {
                        node {
                            Id
                            Name { value }
                            Code__c { value }
                            State__c { value }
                            Summary__c { value }
                            Stats__c { value }
                            Test_Types__c { value }
                            Status__c { value }
                            Latitude__c { value }
                            Longitude__c { value }
                            Sort_Order__c { value }
                            Capability_Groups__r(first: 50) {
                                edges {
                                    node {
                                        Id
                                        Name { value }
                                        Test_Type__c { value }
                                        Items__c { value }
                                        Sort_Order__c { value }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

// Active events with their sessions, for eventBanner and the form's event select.
export const EVENTS_QUERY = gql`
    query PicEvents {
        uiapi {
            query {
                Test_Event__c(first: 5, where: { Active__c: { eq: true } }, orderBy: { Sort_Order__c: { order: ASC } }) {
                    edges {
                        node {
                            Id
                            Name { value }
                            Code__c { value }
                            Lead__c { value }
                            Sort_Order__c { value }
                            Event_Sessions__r(first: 20) {
                                edges {
                                    node {
                                        Id
                                        Start_Date__c { value }
                                        End_Date__c { value }
                                        Location__c { value }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

// The requests the running user can see. Sharing does the filtering: the
// object is private and the PICSite sharing set grants community users their
// own account's records, so no where-clause is needed. A customer rarely has
// more than 100, so the tracker loads them all in one response and searches
// them in the browser; 200 leaves headroom (UI API allows up to 2000).
export const MY_REQUESTS_QUERY = gql`
    query PicMyRequests {
        uiapi {
            query {
                Test_Request__c(first: 200, orderBy: { LastModifiedDate: { order: DESC } }) {
                    edges {
                        node {
                            Id
                            Name { value }
                            Title__c { value }
                            Test_Type__c { value }
                            Status__c { value }
                            Start_Date__c { value }
                            End_Date__c { value }
                            Range_POC__c { value }
                            Next_Action__c { value }
                            CreatedDate { value }
                            LastModifiedDate { value }
                            Range__r {
                                Name { value }
                            }
                            Request_Activities__r(first: 50) {
                                edges {
                                    node {
                                        Id
                                        Status__c { value }
                                        Activity_Date__c { value }
                                        Note__c { value }
                                        CreatedDate { value }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`;

// The running user's own record and portal account, used to pre-fill the
// request form and to stamp Account__c / Contact__c on the new request.
export const CURRENT_USER_QUERY = gql`
    query PicCurrentUser($userId: ID) {
        uiapi {
            query {
                User(where: { Id: { eq: $userId } }, first: 1) {
                    edges {
                        node {
                            Id
                            Name { value }
                            Email { value }
                            Phone { value }
                            CompanyName { value }
                            AccountId { value }
                            ContactId { value }
                            Account {
                                Name { value }
                                License_ID__c { value }
                                CAGE_Code__c { value }
                            }
                        }
                    }
                }
            }
        }
    }
`;

// Creates the Test_Request__c as the running user. Status__c takes its
// picklist default (Submitted); the PIC_Request_Created flow writes the first
// activity and emails the contact.
export function submitRequest(payload) {
    return createRecord({ apiName: 'Test_Request__c', fields: toRequestFields(payload) }).then((record) => toSubmitted(record, payload));
}
