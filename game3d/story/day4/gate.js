import { place, goal } from './shared.js';
export default place(
  { train: ['talk:platform_way', 'zone:platform_way'], forecourt: ['talk:forecourt_way', 'zone:forecourt_way'] },
  {
    on: {
      'talk:guard': 'd3_guard',
      'talk:guard_monitor': 'd3_monitor',
      'talk:reader_l': 'd3_reader', 'talk:reader_r': 'd3_reader',
      'talk:tama': 'd3_cat', 'talk:bowl': 'd3_bowl',
    },
    nodes: {
      d4_arrive: [{ do: 'day4Setup' }, { do: 'cardOk' }, { do: 'gate', state: 'open' }, ...goal('forecourt_way')],
      d3_guard: [
        { if: "ticket_T0002 == 'done' && ticket_T0003 == 'done'", then: [
          { if: "period == 'morning'", then: [{ go: 'd3_guard_hello' }] },
          { if: "period == 'evening'", then: [
            { say: 'guard', overheard: true, emo: 'polite', text: 'こんばんは。' }, { do: 'bow', who: 'guard' }, { end: true },
          ] },
          { say: 'guard', overheard: true, emo: 'polite', text: 'こんにちは。' }, { do: 'bow', who: 'guard' }, { end: true },
        ] },
        { if: "period == 'lunch'", then: [
          { say: 'guard', overheard: true, emo: 'polite', text: '今は休憩中です。点検は、また朝に。' },
          { do: 'bow', who: 'guard' },
          { say: 'eric', emo: 'tired', text: 'He’s eating his lunch. I’ll come back one morning.' },
          { end: true },
        ] },
        { if: "period != 'morning'", then: [
          { say: 'guard', overheard: true, emo: 'polite', text: '点検は、午前中にお願いします。' },
          { do: 'gesture', who: 'guard', kind: 'nine' },
          { say: 'eric', emo: 'tired', text: 'Nine fingers again. He only does the checks in the morning.' }, { end: true },
        ] },
        { if: "ticket_T0003 != 'done' && !d3_monitor_seen", then: [
          { do: 'cam', on: 'guard', zoom: 1.2 },
          { say: 'guard', overheard: true, emo: 'polite', text: 'この画面も、見ていただけますか。' },
          { do: 'monitorRepair', state: 'turn' },
          '> The monitor’s picture goes black as he turns it towards you.',
          { say: 'eric', emo: 'curious', text: 'That’s the monitor from my request list.' },
          { set: 'd3_monitor_seen' },
          { do: 'monitorRepair', state: 'away' }, { do: 'cam', back: true },
        ] },
        { choice: [
          { text: 'Do the final door check.', if: "d2_ticket_done && ticket_T0002 != 'done'", go: 'd3_offer_signoff' },
          { text: 'Look at the monitor.', if: "ticket_T0003 != 'done'", go: 'd3_monitor' },
          { text: 'Just saying good morning.', go: 'd3_guard_hello' },
        ] },
      ],
      d3_guard_hello: [{ say: 'eric', emo: 'warm', text: '{ohayo}.' }, { say: 'guard', overheard: true, emo: 'polite', text: '{ohayo}。今日はお休みですか。' }, { do: 'bow', who: 'guard' }],
      d3_offer_signoff: [
        { say: 'guard', overheard: true, emo: 'polite', text: '報告は届いています。こちらへどうぞ。' },
        { do: 'gesture', who: 'guard', kind: 'beckon' },
        { set: 'd3_signoff_walk' }, { do: 'trip', to: 'train' },
      ],
      d3_monitor: [
        { if: "ticket_T0003 == 'done'", then: [
          { say: 'eric', emo: 'warm', text: 'The picture’s still steady.' }, { end: true },
        ] },
        { if: "period != 'morning'", then: [
          { say: 'eric', emo: 'tired', text: 'I’ll come back in the morning when he can check it with me.' }, { end: true },
        ] },
        { do: 'cam', on: 'guard', zoom: 1.2 },
        { say: 'guard', overheard: true, emo: 'polite', text: 'こちらに向けると、消えるんです。' },
        { do: 'monitorRepair', state: 'turn' },
        { set: 'd3_monitor_seen' },
        { say: 'eric', emo: 'curious', text: 'Hold it there a second. The plug at the back is half out.' },
        { choice: [
          { text: 'Seat the loose connector.', go: 'd3_monitor_fix' },
          { text: 'Leave the monitor for another morning.', go: 'd3_monitor_later' },
        ] },
      ],
      d3_monitor_fix: [
        { do: 'ticket', start: 'T-0003' },
        { do: 'monitorRepair', state: 'seat' },
        { say: 'eric', emo: 'warm', text: 'Try turning it towards me again.' },
        { do: 'monitorRepair', state: 'verify' },
        { say: 'guard', overheard: true, emo: 'warm', text: '今度は大丈夫です。ありがとうございます。', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
        { do: 'bow', who: 'guard' },
        { set: 'd3_monitor_done' }, { do: 'ticket', close: 'T-0003' },
        { if: '!d3_monitor_thanked', then: [
          { do: 'bond', who: 'guard', source: 'ticket', why: 'repaired the station monitor' },
          { do: 'remember', who: 'guard', id: 'monitor', text: 'Fixed the monitor so he could turn it to show you.' },
          { set: 'd3_monitor_thanked' },
        ] },
        { do: 'cam', back: true }, { do: 'save' }, ...goal('forecourt_way'),
      ],
      d3_monitor_later: [{ do: 'monitorRepair', state: 'away' }, { do: 'cam', back: true }],
      d3_reader: [{ do: 'reader', side: 'r', state: 'green' }, { do: 'gate', state: 'open' }],
      d3_cat: [
        { if: "period == 'morning'", then: [
          { say: 'eric', emo: 'warm', text: 'Morning. You don’t have to get up.' },
          { say: 'guard', overheard: true, emo: 'stern', text: '猫は、いません。' },
          { do: 'gesture', who: 'guard', kind: 'finger' },
          { say: 'eric', emo: 'dry', text: 'All right. I didn’t see anything.' },
          { do: 'meet', who: 'tama' },
        ], else: [{ say: 'eric', emo: 'warm', text: 'I’ll go round. You keep the shelter.' }] },
      ],
      d3_bowl: [{ say: 'eric', emo: 'dry', text: 'That’s cleaner than my mug.' }],
    },
  },
);
