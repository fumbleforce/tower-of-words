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
      d3_arrive: [{ do: 'day3Setup' }, { do: 'cardOk' }, { do: 'gate', state: 'open' }, ...goal('forecourt_way')],
      d3_guard: [
        { if: "ticket_T0002 == 'done' && ticket_T0003 == 'done'", then: [
          { if: "period == 'morning'", then: [{ go: 'd3_guard_hello' }] },
          { if: "period == 'evening'", then: [
            { say: 'guard', emo: 'polite', text: 'こんばんは。', en: 'Good evening.' }, { end: true },
          ] },
          { say: 'guard', emo: 'polite', text: 'こんにちは。', en: 'Hello.' }, { end: true },
        ] },
        { if: "period == 'lunch'", then: [
          { say: 'guard', emo: 'polite', text: '今は休憩です。点検は、また朝に。', en: 'I’m on my break. We can do the check another morning.' },
          { end: true },
        ] },
        { if: "period != 'morning'", then: [
          { say: 'guard', emo: 'polite', text: '点検は午前中にお願いします。', en: 'Please come in the morning for the checks.' }, { end: true },
        ] },
        { if: "ticket_T0003 != 'done' && !d3_monitor_seen", then: [
          { do: 'cam', on: 'guard', zoom: 1.2 },
          { say: 'guard', emo: 'polite', text: 'この画面も、見ていただけますか。', en: 'Could you look at this screen too?' },
          { do: 'monitorRepair', state: 'turn' },
          '> The monitor’s picture goes black as he turns it towards you.',
          { set: 'd3_monitor_seen' },
          { do: 'monitorRepair', state: 'away' }, { do: 'cam', back: true },
        ] },
        { choice: [
          { text: 'Do the final door check.', if: "d2_ticket_done && ticket_T0002 != 'done'", go: 'd3_offer_signoff' },
          { text: 'Look at the monitor.', if: "ticket_T0003 != 'done'", go: 'd3_monitor' },
          { text: 'Just saying good morning.', go: 'd3_guard_hello' },
        ] },
      ],
      d3_guard_hello: [{ say: 'guard', emo: 'polite', text: 'おはようございます。今日はお休みですか。', en: 'Good morning. Taking the day off?' }],
      d3_offer_signoff: [
        { say: 'guard', emo: 'polite', text: '報告は届いています。こちらへどうぞ。', en: 'We have your report. Come this way, please.' },
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
        { say: 'guard', emo: 'polite', text: 'こちらに向けると、消えます。', en: 'When I turn it towards you, the picture goes.' },
        { do: 'monitorRepair', state: 'turn' },
        { set: 'd3_monitor_seen' },
        { say: 'eric', emo: 'curious', text: 'Leave it there a moment. The plug’s almost out.' },
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
        { say: 'guard', emo: 'polite', text: '今度は大丈夫です。ありがとうございます。', en: 'It’s all right this time. Thank you.' },
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
          { say: 'guard', emo: 'polite', text: '猫はいません。……もう食べましたから。', en: 'There’s no cat. ...She’s already eaten.' },
          { do: 'meet', who: 'tama' },
        ], else: [{ say: 'eric', emo: 'warm', text: 'I’ll go round. Keep your shelter.' }] },
      ],
      d3_bowl: [{ say: 'eric', emo: 'dry', text: 'That’s cleaner than my mug.' }],
    },
  },
);
