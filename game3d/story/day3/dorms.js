import { goal, speakers, repairQueue } from './shared.js';
export default {
  speakers,
  start: 'd3_room',
  on: {
    'talk:computer': 'd3_chair',
    'talk:door_out': 'd3_leave_room', 'zone:room_exit': 'd3_leave_room',
    'talk:bed': 'd3_bed', 'talk:window': 'd3_window', 'talk:boxes': 'd3_boxes',
  },
  nodes: {
    d3_room: [
      ...repairQueue,
      { if: '!d3_started', then: [
        { unset: 'going_home' },
        { do: 'phone', who: 'eric', state: 'buzz' },
        { if: "d2_ticket_done && ticket_T0002 != 'done'", then: [
          { say: 'miotext', text: 'the station can do the final check this morning\nor any morning, if you want your saturday' },
          { say: 'miotext', text: 'the guard will sign it off\ni’m going back to sleep' },
        ] },
        { say: 'miotext', text: 'club posters are up by the fountain\nif you’re looking for something to do' },
        { do: 'phone', who: 'eric', state: 'away' },
        { set: 'd3_started' }, { do: 'save' },
      ] },
      ...goal('door_out'),
    ],
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
    d3_inbox: [...repairQueue, { do: 'tickets' }, { do: 'save' }, { go: 'd3_up' }],
    d3_wait: [{ do: 'period', to: 'next' }, { do: 'save' }, { go: 'd3_up' }],
    d3_rest: [
      { if: '!d3_time_seen', then: [
        { do: 'hint', text: 'Rest skips to 18:00. Walking and small jobs leave the clock alone. Unfinished requests stay open.' },
        { set: 'd3_time_seen' },
        { choice: [
          { text: 'Rest until evening.', go: 'd3_rest_now' },
          { text: 'Not yet.', go: 'd3_up' },
        ] },
      ], else: [{ go: 'd3_rest_now' }] },
    ],
    d3_rest_now: [{ do: 'period', to: 'evening' }, { do: 'save' }, { go: 'd3_up' }],
    d3_up: [{ do: 'stand', who: 'eric' }, ...goal('door_out')],
    d3_leave_room: [{ do: 'trip', to: 'dorm_court' }],
    d3_bed: [{ if: "period == 'evening'", then: [{ choice: [
      { text: 'Sleep.', go: 'd3_sleep' },
      { text: 'Stay up a little longer.', go: 'd3_awake' },
    ] }], else: [{ say: 'eric', emo: 'tired', text: 'Too early to sleep. I could sit at the desk for a while.' }] }],
    d3_sleep: [{ set: 'd3_complete' }, { do: 'goal', text: '' }, { do: 'save' }, { do: 'end' }],
    d3_awake: goal('door_out'),
    d3_window: [{ say: 'eric', emo: 'dry', text: 'It sounds sunny on the other side of the building.' }],
    d3_boxes: [
      { if: '!d3_unpacked', then: [
        { say: 'eric', emo: 'tired', text: 'The towels are in the kitchen box, round the mugs. I knew I’d packed them somewhere.' },
        { set: 'd3_unpacked' },
      ], else: [{ say: 'eric', emo: 'warm', text: 'I can leave the books until tomorrow.' }] },
    ],
  },
};
