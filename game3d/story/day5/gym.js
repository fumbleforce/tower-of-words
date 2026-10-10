import { fanNodes } from './fan.js';
import { place, goal } from './shared.js';
// The gym's reception counter, in the entrance lobby: the booking terminal on the counter, the printer behind it.
// Deferred T-0004 retains its saved progress and remains on the request list.
export default place(
  { sports: ['talk:gym_door'] },
  {
    labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
    on: {
      'talk:booking_terminal': 'd3_booking', 'talk:attendant': 'd3_booking',
      'talk:gym_printer': 'd4_printer',
      'say:ugoite:booking_terminal': { if: "period != 'evening' && !d3_booking_restarted", node: 'd3_booking_magic' },
      'talk:gym_board': 'd3_gym_board', 'talk:desk_fan': 'd4_fan',
      'say:ugoite:desk_fan': { if: "period != 'evening' && know_ugoite && d4_fan_requested && !d4_fan_done", node: 'd4_fan_magic' },
    },
    nodes: {
      d3_booking: [
        { if: "period == 'evening'", then: [
          { say: 'eric', emo: 'tired', text: 'Nobody’s on the desk this late. I’ll come back in the daytime.' }, { end: true },
        ] },
        { if: "ticket_T0004 == 'done'", then: [
          { do: 'gesture', who: 'attendant', kind: 'nod', to: 'eric' },
          { say: 'attendant', overheard: true, emo: 'polite', text: '端末、ちゃんと動いてますよ。' }, { end: true },
        ] },
        { if: 'd3_booking_restarted', then: [{ go: 'd3_printer' }] },
        { do: 'cam', on: 'attendant', zoom: 1.2 },
        { if: '!d3_booking_met', then: [
          { say: 'eric', emo: 'warm', text: 'Hi. I’m from IT support, about the booking terminal?' },
          { say: 'attendant', overheard: true, emo: 'bright', text: 'あ、ITの方！助かります。', clear: ['IT'] },
          { do: 'bow', who: 'attendant' },
          { set: 'd3_booking_met' },
        ] },
        { do: 'gesture', who: 'attendant', kind: 'point', to: 'booking_terminal' },
        { do: 'cam', on: 'booking_terminal', zoom: 1.4 },
        '> The booking terminal on the counter has frozen.',
        { say: 'attendant', overheard: true, emo: 'tired', text: '朝から、ずっとこのままなんです。今日の分をプリントしたいんですけど……', clear: ['プリント'] },
        { say: 'eric', emo: 'curious', text: 'And you need today’s list printed. There’s a reset button underneath. I’ll try that first.' },
        { choice: [
          { text: 'Restart the terminal with the red button.', go: 'd3_booking_reset' },
          { text: 'Say 動いて (ugoite, move) to the terminal.', if: 'know_ugoite', go: 'd3_booking_magic' },
          { text: 'Come back to it later.', go: 'd3_booking_later' },
        ] },
      ],
      d3_booking_reset: [
        { do: 'ticket', start: 'T-0004' }, { do: 'bookingRepair', state: 'reset' },
        { say: 'attendant', overheard: true, emo: 'bright', text: 'あ、戻った！' },
        { go: 'd3_booking_ready' },
      ],
      d3_booking_magic: [
        { do: 'ticket', start: 'T-0004' },
        { say: 'eric', emo: 'hesitant', text: '{ugoite}.' },
        { do: 'kotodama', target: 'booking_terminal' }, { do: 'bookingRepair', state: 'restart' },
        { set: 'd3_booking_magic' },
        { do: 'emote', who: 'attendant', kind: '?' },
        { say: 'attendant', overheard: true, emo: 'puzzled', text: 'え？今、どこも押してないですよね？' },
        { say: 'eric', emo: 'hesitant', text: 'It probably just needed a minute.' },
        { go: 'd3_booking_ready' },
      ],
      d3_booking_ready: [
        { set: 'd3_booking_restarted' },
        { say: 'eric', emo: 'warm', text: 'Let me print today’s list from here, so we know the whole thing comes out.' },
        { do: 'gesture', who: 'attendant', kind: 'point', to: 'gym_printer' },
        { do: 'cam', back: true },
        { do: 'goal', text: 'Print today’s bookings on the printer behind the counter.', at: 'gym_printer' },
        { do: 'save' },
      ],
      d3_printer: [
        { if: "period == 'evening'", then: [
          { say: 'eric', emo: 'tired', text: 'I’d rather print it when he’s here to check it.' }, { end: true },
        ] },
        { if: '!d3_booking_restarted', then: [
          { do: 'gesture', who: 'attendant', kind: 'point', to: 'booking_terminal' },
          { say: 'attendant', overheard: true, emo: 'polite', text: 'あ、先にこっちを……' }, { end: true },
        ] },
        { if: "ticket_T0004 == 'done'", then: [
          { say: 'eric', emo: 'warm', text: 'He’s got his sheet. I’ll leave the printer alone.' }, { end: true },
        ] },
        { do: 'cam', on: 'gym_printer', zoom: 1.2 },
        { choice: [
          { text: 'Press Print for today’s bookings.', go: 'd3_print' },
          { text: 'Leave the printout for later.', go: 'd3_booking_later' },
        ] },
      ],
      // Reuse only after a complete sheet is in the tray, with no queued print job.
      d3_dashite_word: [
        { do: 'gesture', who: 'eric', kind: 'point', to: 'gym_printer' },
        { say: 'eric', emo: 'curious', text: 'What was that you said to it?' },
        { do: 'emote', who: 'attendant', kind: 'sweat' },
        { say: 'attendant', overheard: true, emo: 'sheepish', text: 'あ、いつも言っちゃうんです。' },
        { do: 'gesture', who: 'attendant', kind: 'point', to: 'gym_printer' },
        { say: 'attendant', emo: 'slow', slow: true, text: '{dashite}。' },
        { do: 'type', word: 'dashite', from: 'attendant', prompt: 'Say it the way he says it to the printer: dashite.' },
      ],
      d3_print: [
        { say: 'attendant', overheard: true, emo: 'polite', text: '{dashite}。' },
        { do: 'bookingRepair', state: 'print' },
        { do: 'cam', on: 'attendant', zoom: 1.2 },
        { if: '!know_dashite', then: [{ call: 'd3_dashite_word' }] },
        { do: 'bookingRepair', state: 'check' },
        { say: 'attendant', overheard: true, emo: 'warm', text: '最後の行まで、ちゃんと出てます。' },
        { say: 'eric', emo: 'warm', text: 'The last booking is on here now. Could you check the date too?' },
        { say: 'attendant', overheard: true, emo: 'polite', text: 'ありがとうございました。', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
        { do: 'bow', who: 'attendant' },
        { set: 'd3_booking_done' }, { do: 'ticket', close: 'T-0004' },
        { do: 'cam', back: true }, { do: 'save' }, ...goal('gym_door'),
      ],
      d3_booking_later: [{ do: 'cam', back: true }],
      ...fanNodes,
      d3_gym_board: ['> “Swimming club: Saturday evenings in the gym from 10 October.”'],
    },
  },
);
