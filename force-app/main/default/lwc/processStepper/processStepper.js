import { LightningElement, api } from 'lwc';
import { STATUS_STEPS } from 'c/portalModel';

const DESCRIPTIONS = {
    Submitted: 'Tell us the test, the range and your preferred dates.',
    'Under review': 'Range safety and technical review of your request.',
    Coordination: 'Airspace, spectrum, impact areas and instrumentation are reserved.',
    Scheduled: 'Your test window is confirmed and the check-in packet is issued.',
    Complete: 'Test executed and reports delivered.'
};

export default class ProcessStepper extends LightningElement {
    @api eyebrow;
    @api title;
    // 'static' lists the steps with descriptions; 'progress' highlights activeIndex.
    @api mode = 'progress';
    @api activeIndex = 0;
    // Set `bare` to drop the section padding and container when embedding in a card.
    @api bare = false;
    _steps;

    @api
    get steps() {
        return this._steps || STATUS_STEPS;
    }
    set steps(value) {
        this._steps = value;
    }

    get wrapClass() {
        return this.bare ? 'wrap wrap--bare' : 'wrap section';
    }

    get containerClass() {
        return this.bare ? '' : 'container';
    }

    get renderSteps() {
        const isStatic = this.mode === 'static';
        const active = Number(this.activeIndex);
        return this.steps.map((label, i) => {
            const done = !isStatic && i < active;
            const current = !isStatic && i === active;
            return {
                label,
                number: i + 1,
                done,
                current: current ? 'step' : null,
                description: isStatic ? DESCRIPTIONS[label] : null,
                cls: ['step', done ? 'step--done' : '', current ? 'step--current' : '', isStatic ? 'step--static' : ''].join(' ').trim()
            };
        });
    }
}
