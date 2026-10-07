import { place } from './shared.js';
export default place('izakaya', {
  on: { 'talk:party_seat': 'ongoing_izakaya_seat' },
  nodes: {
    ongoing_izakaya_seat: [
      { do: 'sit', who: 'eric', at: 'party_seat' },
      { choice: [{ text: 'Get up.', go: 'ongoing_izakaya_up' }] },
    ],
    ongoing_izakaya_up: [{ do: 'stand', who: 'eric' }, { do: 'ongoingGoal' }],
  },
});
