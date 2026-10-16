import { LightningElement, api } from 'lwc';

export default class CapabilityList extends LightningElement {
    @api title = '';
    @api groups = [];

    get renderGroups() {
        return (this.groups || []).map((g) => ({
            label: g.label,
            items: (g.items || []).map((text, i) => ({ key: `${g.label}-${i}`, text }))
        }));
    }
}
