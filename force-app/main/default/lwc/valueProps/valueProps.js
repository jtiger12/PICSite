import { LightningElement } from 'lwc';

export default class ValueProps extends LightningElement {
    items = [
        {
            title: 'Scale and realism',
            text: 'Hundreds of thousands of acres of land, long-range fires corridors and representative threat environments for full-scale experiments.',
            isScale: true
        },
        {
            title: 'Restricted airspace',
            text: 'Dedicated airspace and spectrum for UAS, counter-UAS, electronic attack and directed-energy events, coordinated for you by the range office.',
            isAirspace: true
        },
        {
            title: 'One front door',
            text: 'Submit a single request, get a named point of contact and track every step from review to scheduled test window.',
            isSpeed: true
        }
    ];
}
