import { LightningElement, api } from 'lwc';

const TONES = {
    Submitted: 'neutral',
    'Under review': 'info',
    Coordination: 'info',
    Scheduled: 'ok',
    Complete: 'done',
    'Needs info': 'warn',
    Declined: 'danger'
};

export default class StatusChip extends LightningElement {
    @api status = '';

    get chipClass() {
        return `chip chip--${TONES[this.status] || 'neutral'}`;
    }
}
