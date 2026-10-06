import { goal } from './shared.js';
export const fanNodes = {
  d4_fan: [
    { if: "ticket_T0006 == 'done'", then: [{ say: 'eric', emo: 'warm', text: 'It’s still running. I’ll leave it alone.' }, { end: true }] },
    { if: "period == 'evening'", then: [{ say: 'eric', emo: 'casual', text: 'I’ll come back when the attendant can check it.' }, { end: true }] },
    { call: 'd4_fan_request' },
    { choice: [
      { text: 'Free the fan’s starter lever.', go: 'd4_fan_lever' },
      { text: 'Say 動いて (ugoite, move) to the fan.', if: 'know_ugoite', go: 'd4_fan_magic' },
      { text: 'Leave the fan for later.', go: 'd4_fan_leave' },
    ] },
  ],
  d4_fan_request: [
    { do: 'cam', on: 'attendant', zoom: 1.2 },
    { say: 'attendant', overheard: true, emo: 'polite', text: 'あの、これも見てもらえますか。' },
    { do: 'gesture', who: 'attendant', kind: 'point', to: 'desk_fan' },
    { do: 'fanRepair', state: 'show' },
    { say: 'eric', emo: 'curious', text: 'The fan from the list? Yes. The lever’s stuck halfway down.' },
    { do: 'ticket', add: 'T-0006' }, { set: 'd4_fan_requested' },
  ],
  d4_fan_lever: [{ do: 'ticket', start: 'T-0006' }, { do: 'fanRepair', state: 'lever' }, { go: 'd4_fan_check' }],
  d4_fan_magic: [
    { if: "period == 'evening' || ticket_T0006 == 'done' || !know_ugoite", then: [{ end: true }] },
    { if: '!d4_fan_requested', then: [{ call: 'd4_fan_request' }] },
    { do: 'ticket', start: 'T-0006' }, { say: 'eric', emo: 'hesitant', text: '{ugoite}.' },
    { do: 'kotodama', target: 'desk_fan' }, { do: 'fanRepair', state: 'start' },
    { do: 'emote', who: 'attendant', kind: '?' },
    { say: 'attendant', overheard: true, emo: 'puzzled', text: 'え、今、触りました？' },
    { say: 'eric', emo: 'hesitant', text: 'Let’s see if it keeps going.' }, { set: 'd4_fan_magic' }, { go: 'd4_fan_check' },
  ],
  d4_fan_check: [
    { do: 'fanRepair', state: 'oscillate' },
    { do: 'gesture', who: 'attendant', kind: 'nod' },
    { say: 'attendant', overheard: true, emo: 'warm', text: 'よかった。ありがとうございます。' },
    { set: 'd4_fan_done' }, { do: 'ticket', close: 'T-0006' }, { do: 'save' }, { go: 'd4_fan_leave' },
  ],
  d4_fan_leave: [{ do: 'cam', back: true }, ...goal('gym_door')],
  d4_printer: [
    { if: "period == 'evening'", then: [{ say: 'eric', emo: 'casual', text: 'The desk is closed until morning.' }, { end: true }] },
    { if: "ticket_T0004 != 'done'", then: [{ go: 'd3_booking' }] },
    { if: 'know_dashite', then: [{ say: 'eric', emo: 'warm', text: 'The bookings are printing properly now.' }, { end: true }] },
    { say: 'attendant', overheard: true, emo: 'polite', text: 'もう一枚、{dashite}。' },
    { do: 'bookingRepair', state: 'print' }, { call: 'd3_dashite_word' }, { do: 'cam', back: true }, { do: 'save' },
  ],
};
