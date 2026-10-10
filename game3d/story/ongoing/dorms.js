import source from '../day5/dorms.js';
import { interactions, place } from './shared.js';
const familiar = interactions(source, ['talk:window', 'talk:boxes']);
export default place('dorms', {
  on: { ...familiar.on, 'talk:computer': 'ongoing_desk', 'talk:bed': 'ongoing_bed' },
  nodes: {
    ...familiar.nodes,
    ongoing_desk: [
      { do: 'sit', who: 'eric', at: 'desk_chair' },
      { choice: [
        { text: 'Open repair requests.', go: 'ongoing_requests' },
        { text: 'Spend the rest of the morning here.', if: 'period_morning', go: 'ongoing_wait' },
        { text: 'Spend the rest of lunch here.', if: 'period_lunch', go: 'ongoing_wait' },
        { text: 'Spend the rest of the afternoon here.', if: 'period_afternoon', go: 'ongoing_wait' },
        { text: 'Rest until evening.', if: '!period_evening', go: 'ongoing_rest' },
        { text: 'Get up.', go: 'ongoing_up' },
      ] },
    ],
    ongoing_requests: [{ do: 'tickets' }, { go: 'ongoing_up' }],
    ongoing_wait: [{ do: 'period', to: 'next' }, { go: 'ongoing_up' }],
    ongoing_rest: [{ do: 'period', to: 'evening' }, { go: 'ongoing_up' }],
    ongoing_up: [{ do: 'stand', who: 'eric' }, { do: 'ongoingGoal' }, { do: 'save' }],
    ongoing_bed: [{ if: 'period_evening', then: [{ choice: [
      { text: 'Sleep.', go: 'ongoing_sleep' },
      { text: 'Stay up a little longer.', go: 'ongoing_awake' },
    ] }], else: [{ say: 'eric', emo: 'tired', text: 'I’m not ready for bed yet. I could sit at the desk for a while.' }] }],
    ongoing_sleep: [{ do: 'goal', text: '' }, { do: 'save' }, { do: 'end' }],
    ongoing_awake: [{ do: 'ongoingGoal' }],
  },
});
