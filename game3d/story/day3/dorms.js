// Day 3 test skeleton (shared.js): room 203. The desk chair is where a free day's time passes
// (notes/days3-5-outline.md, Routine and clock): the rest of this period, or rest until evening.
import { goal } from './shared.js';
export default {
  start: 'd3_room',
  on: {
    'talk:computer': 'd3_chair',
    'talk:door_out': 'd3_leave_room',
    'zone:room_exit': 'd3_leave_room',
    'talk:bed': 'd3_bed',
  },
  nodes: {
    d3_room: goal(),
    d3_chair: [
      { do: 'sit', who: 'eric', at: 'desk_chair' },
      { choice: [
        { text: 'Open repair requests.', go: 'd3_inbox' },
        { text: 'Spend the rest of the morning here.', if: "period == 'morning'", go: 'd3_wait' },
        { text: 'Spend the rest of lunch here.', if: "period == 'lunch'", go: 'd3_wait' },
        { text: 'Spend the rest of the afternoon here.', if: "period == 'afternoon'", go: 'd3_wait' },
        { text: 'Rest until evening.', if: "period != 'evening'", go: 'd3_rest' },
        { text: 'Get up.', go: 'd3_up' },
      ] },
    ],
    d3_inbox: [{ do: 'tickets' }, { go: 'd3_up' }],
    d3_wait: [{ do: 'period', to: 'next' }, { do: 'save' }, { go: 'd3_up' }],
    d3_rest: [{ do: 'period', to: 'evening' }, { do: 'save' }, { go: 'd3_up' }],
    d3_up: [{ do: 'stand', who: 'eric' }],
    d3_leave_room: [{ do: 'trip', to: 'dorm_court' }],
    d3_bed: ['> Placeholder: Sleep comes with the day-3 story (#229).'],
  },
};
