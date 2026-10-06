import { goal, speakers, repairQueue } from './shared.js';
export default {
  speakers,
  start: 'd4_room',
  on: {
    'talk:computer': 'd4_chair',
    'talk:door_out': 'd4_leave_room', 'zone:room_exit': 'd4_leave_room',
    'talk:bed': 'd4_bed', 'talk:window': 'd4_window', 'talk:boxes': 'd4_boxes',
  },
  nodes: {
    d4_room: [
      ...repairQueue,
      { if: '!d4_started', then: [
        { unset: 'going_home' },
        { do: 'phone', who: 'eric', state: 'buzz' },
        { say: 'miotext', text: 'two new requests on your list\nthe court score display and the gym desk fan\nno hurry, it’s sunday' },
        { say: 'miotext', text: 'tennis is on tonight at the courts\nif you took a slip' },
        { say: 'miotext', text: 'i’m taking lunch outside\nno laptop this time' },
        { do: 'phone', who: 'eric', state: 'away' },
        { set: 'd4_started' }, { do: 'save' },
      ] },
      ...goal('door_out'),
    ],
    d4_chair: [
      { do: 'sit', who: 'eric', at: 'desk_chair' },
      { choice: [
        { text: 'Open repair requests.', go: 'd4_inbox' },
        { text: 'Spend the rest of the morning here.', if: "period == 'morning'", go: 'd4_wait' },
        { text: 'Spend the rest of lunch here.', if: "period == 'lunch'", go: 'd4_wait' },
        { text: 'Spend the rest of the afternoon here.', if: "period == 'afternoon'", go: 'd4_wait' },
        { text: 'Rest until evening.', if: "period != 'evening'", go: 'd4_rest' },
        { text: 'Get up.', go: 'd4_up' },
      ] },
    ],
    d4_inbox: [...repairQueue, { do: 'tickets' }, { do: 'save' }, { go: 'd4_up' }],
    d4_wait: [{ do: 'period', to: 'next' }, { do: 'save' }, { go: 'd4_up' }],
    d4_rest: [
      { if: '!d3_time_seen', then: [
        { do: 'hint', text: 'Rest skips to 18:00. Walking and small jobs leave the clock alone. Unfinished requests stay open.' },
        { set: 'd3_time_seen' },
        { choice: [
          { text: 'Rest until evening.', go: 'd4_rest_now' },
          { text: 'Not yet.', go: 'd4_up' },
        ] },
      ], else: [{ go: 'd4_rest_now' }] },
    ],
    d4_rest_now: [{ do: 'period', to: 'evening' }, { do: 'save' }, { go: 'd4_up' }],
    d4_up: [{ do: 'stand', who: 'eric' }, ...goal('door_out')],
    d4_leave_room: [{ do: 'trip', to: 'dorm_court' }],
    d4_bed: [{ if: "period == 'evening'", then: [{ choice: [
      { text: 'Sleep.', go: 'd4_sleep' },
      { text: 'Stay up a little longer.', go: 'd4_awake' },
    ] }], else: [{ say: 'eric', emo: 'tired', text: 'I’m not ready for bed yet. I could sit at the desk for a while.' }] }],
    d4_sleep: [{ set: 'd4_complete' }, { do: 'goal', text: '' }, { do: 'save' }, { do: 'end' }],
    d4_awake: goal('door_out'),
    d4_window: [{ say: 'eric', emo: 'dry', text: 'Somebody below me has burnt their toast. I should open this later.' }],
    d4_boxes: [
      { if: '!d3_unpacked', then: [
        { say: 'eric', emo: 'tired', text: 'The towels are in the kitchen box, round the mugs. I knew I’d packed them somewhere.' },
        { set: 'd3_unpacked' },
      ], else: [{ say: 'eric', emo: 'warm', text: 'I can leave the books until tomorrow.' }] },
    ],
  },
};
