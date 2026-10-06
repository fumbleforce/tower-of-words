import { goal, speakers, repairQueue } from './shared.js';
export default {
  speakers,
  start: 'd5_room',
  on: {
    'talk:computer': 'd5_chair',
    'talk:door_out': 'd5_leave_room', 'zone:room_exit': 'd5_leave_room',
    'talk:bed': 'd5_bed', 'talk:window': 'd5_window', 'talk:boxes': 'd5_boxes',
  },
  nodes: {
    d5_room: [
      ...repairQueue,
      { if: '!d5_started', then: [
        { unset: 'going_home' },
        { do: 'phone', who: 'eric', state: 'buzz' },
        { say: 'miotext', text: 'morning\nwe’re downstairs in B2' },
        { say: 'miotext', text: 'reception needs help with the label printer\nkenji’s got a karaoke request too, he’ll be there at lunch' },
        { say: 'miotext', text: 'kenji wants to get everyone together after six\nhe says he’s buying' },
        { set: 'd5_invited' },
        { do: 'phone', who: 'eric', state: 'away' },
        { set: 'd5_started' }, { do: 'save' },
      ] },
      ...goal('door_out'),
    ],
    d5_chair: [
      { do: 'sit', who: 'eric', at: 'desk_chair' },
      { choice: [
        { text: 'Open repair requests.', go: 'd5_inbox' },
        { text: 'Spend the rest of the morning here.', if: "period == 'morning'", go: 'd5_wait' },
        { text: 'Spend the rest of lunch here.', if: "period == 'lunch'", go: 'd5_wait' },
        { text: 'Spend the rest of the afternoon here.', if: "period == 'afternoon'", go: 'd5_wait' },
        { text: 'Rest until evening.', if: "period != 'evening'", go: 'd5_rest' },
        { text: 'Get up.', go: 'd5_up' },
      ] },
    ],
    d5_inbox: [...repairQueue, { do: 'tickets' }, { do: 'save' }, { go: 'd5_up' }],
    d5_wait: [{ do: 'period', to: 'next' }, { do: 'save' }, { go: 'd5_up' }],
    d5_rest: [
      { if: '!d3_time_seen', then: [
        { do: 'hint', text: 'Rest skips to 18:00. Walking and small jobs leave the clock alone. Unfinished requests stay open.' },
        { set: 'd3_time_seen' },
        { choice: [
          { text: 'Rest until evening.', go: 'd5_rest_now' },
          { text: 'Not yet.', go: 'd5_up' },
        ] },
      ], else: [{ go: 'd5_rest_now' }] },
    ],
    d5_rest_now: [{ do: 'period', to: 'evening' }, { do: 'save' }, { go: 'd5_up' }],
    d5_up: [{ do: 'stand', who: 'eric' }, ...goal('door_out')],
    d5_leave_room: [{ do: 'trip', to: 'dorm_court' }],
    d5_bed: [{ if: "period == 'evening'", then: [{ choice: [
      { text: 'Sleep.', go: 'd5_sleep' },
      { text: 'Stay up a little longer.', go: 'd5_awake' },
    ] }], else: [{ say: 'eric', emo: 'tired', text: 'I’m not ready for bed yet. I could sit at the desk for a while.' }] }],
    d5_sleep: [{ set: 'd5_complete' }, { do: 'goal', text: '' }, { do: 'save' }, { do: 'end' }],
    d5_awake: goal('door_out'),
    d5_window: [{ say: 'eric', emo: 'dry', text: 'Somebody has the same radio station on as my neighbour back home.' }],
    d5_boxes: [
      { if: '!d3_unpacked', then: [
        { say: 'eric', emo: 'tired', text: 'The towels are in the kitchen box, round the mugs. I knew I’d packed them somewhere.' },
        { set: 'd3_unpacked' },
      ], else: [{ say: 'eric', emo: 'warm', text: 'I can leave the books until tomorrow.' }] },
    ],
  },
};
