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
        { if: '!know_gamen', then: [
          { do: 'gesture', who: 'guard', kind: 'point', to: 'guard_monitor' },
          { say: 'guard', overheard: true, emo: 'polite', text: '{gamen}が、消えます。' },
          { say: 'eric', emo: 'curious', text: '{gamen} is the screen? It goes off when you turn it.' },
          { say: 'guard', emo: 'slow', slow: true, text: '{gamen}。' },
          { do: 'type', word: 'gamen', from: 'guard', prompt: 'Point out the screen you’re checking: gamen.' },
        ] },
        { say: 'eric', emo: 'curious', text: 'Could you hold it there? The lead pulls tight when you turn it.' },
        { do: 'cam', on: 'guard_monitor', zoom: 1.4 },
        { say: 'eric', emo: 'warm', text: 'The signal plug is half out. I can seat it, then we should try turning it again.' },
        { choice: [
          { text: 'Seat the loose connector.', go: 'd3_monitor_fix' },
          { text: 'Leave the monitor for another morning.', go: 'd3_monitor_later' },
        ] },
      ],
      d3_monitor_fix: [
        { do: 'ticket', start: 'T-0003' },
        { do: 'monitorRepair', state: 'seat' },
        { say: 'eric', emo: 'warm', text: 'All right, turn the {gamen} towards me again.' },
        { go: 'd3_monitor_check' },
      ],
      d3_monitor_check: [
        { do: 'monitorRepair', state: 'verify' },
        { say: 'guard', overheard: true, emo: 'curious', text: '{gamen}は、どうですか？' },
        { choice: [
          { text: 'The picture stayed on. Finish the request.', go: 'd3_monitor_complete' },
          { text: 'Ask him to turn it once more.', go: 'd3_monitor_again' },
        ] },
      ],
      d3_monitor_again: [
        { if: 'know_mouichido', then: [{ say: 'eric', emo: 'polite', text: '{mouichido}. Just to be sure.' }],
          else: [{ say: 'eric', emo: 'polite', text: 'One more time, please. Just to be sure.' }] },
        { do: 'gesture', who: 'eric', kind: 'point', to: 'guard_monitor' },
        { go: 'd3_monitor_check' },
      ],
      d3_monitor_complete: [
        { say: 'eric', emo: 'warm', text: 'The picture’s steady now, even when it turns.' },
        { say: 'guard', overheard: true, emo: 'warm', text: '助かりました。人に見せるたびに、消えていたんです。' },
        { say: 'eric', emo: 'amused', text: 'It was fine as long as nobody else needed to see it, then.' },
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
