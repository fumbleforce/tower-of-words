import { place, goal, emiHello, emiClubFact } from './shared.js';
// The gym's reception counter, in the entrance lobby: the booking terminal on the counter, the printer behind it.
// Eric comes for T-0004, which Mio's morning text and his request list told him about (dorms.js d3_room).
export default place(
  { sports: ['talk:gym_door'] },
  {
    labels: { kuro: ['Kuro', 'd3_kuro_intro'] },
    on: {
      'talk:booking_terminal': 'd3_booking', 'talk:attendant': 'd3_booking',
      'talk:gym_printer': 'd3_printer',
      'say:ugoite:booking_terminal': { if: "period != 'evening' && !d3_booking_restarted", node: 'd3_booking_magic' },
      'talk:mori': 'd3_mori', 'talk:emi': 'd3_emi',
      'talk:gym_board': 'd3_gym_board', 'talk:desk_fan': 'd3_fan',
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
        { say: 'attendant', overheard: true, emo: 'tired', text: '朝から、ずっとこのままで……。今日の{yoyaku}を、プリントしたいんです。', clear: ['プリント'] },
        { if: '!know_yoyaku', then: [
          { say: 'eric', emo: 'curious', text: 'Today’s bookings? {yoyaku}?' },
          { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、{yoyaku}です。' },
          { say: 'attendant', emo: 'slow', slow: true, text: '{yoyaku}。' },
          { do: 'type', word: 'yoyaku', from: 'attendant', prompt: 'Ask for the bookings the desk needs: yoyaku.' },
        ] },
        { say: 'eric', emo: 'curious', text: 'I can restart the terminal. Then we’ll check the whole {yoyaku} list, not just the first page.' },
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
        { say: 'eric', emo: 'warm', text: 'The screen’s back. We should print the bookings before I call it fixed.' },
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
        { say: 'eric', emo: 'curious', text: 'What did you say just before the paper came out?' },
        { do: 'emote', who: 'attendant', kind: 'sweat' },
        { say: 'attendant', overheard: true, emo: 'sheepish', text: 'あ、いつも言っちゃうんです。' },
        { do: 'gesture', who: 'attendant', kind: 'point', to: 'gym_printer' },
        { say: 'attendant', emo: 'slow', slow: true, text: '{dashite}。' },
        { say: 'eric', emo: 'amused', text: 'Give it out? I could have used that at our copier on my first day.' },
        { do: 'type', word: 'dashite', from: 'attendant', prompt: 'Say it the way he says it to the printer: dashite.' },
      ],
      d3_print: [
        { say: 'attendant', overheard: true, emo: 'polite', text: '{dashite}。' },
        { do: 'bookingRepair', state: 'print' },
        { do: 'cam', on: 'attendant', zoom: 1.2 },
        { if: '!know_dashite', then: [{ call: 'd3_dashite_word' }] },
        { do: 'bookingRepair', state: 'check' },
        { say: 'attendant', overheard: true, emo: 'warm', text: '最後の行まで、ちゃんと出てます。' },
        { say: 'eric', emo: 'warm', text: 'Swimming club at six is the last line. That’s all of it.' },
        { if: 'club_swimming', then: [
          { say: 'eric', emo: 'warm', text: 'That’s my booking as well, then. I took one of the club slips.' },
          { say: 'attendant', overheard: true, emo: 'warm', text: 'そうですか。では、六時にプールで。', clear: ['プール'] },
        ], else: [
          { say: 'attendant', overheard: true, emo: 'warm', text: '水泳部ですよ。よかったら、今夜どうぞ。' },
          { do: 'gesture', who: 'attendant', kind: 'point', to: 'gym_board' },
          { say: 'eric', emo: 'curious', text: 'I can join them? I’ll have a look at the poster before I go.' },
        ] },
        { say: 'attendant', overheard: true, emo: 'polite', text: 'ありがとうございました。', clear: [{ ja: 'ありがとう', ro: 'arigatō', en: 'thank you' }] },
        { do: 'bow', who: 'attendant' },
        { set: 'd3_booking_done' }, { do: 'ticket', close: 'T-0004' },
        { do: 'cam', back: true }, { do: 'save' }, ...goal('gym_door'),
      ],
      d3_booking_later: [{ do: 'cam', back: true }],
      d3_mori: [
        { say: 'mori', overheard: true, emo: 'warm', text: 'あ、{mc.name_jp}さん。こんにちは。' },
        { do: 'bow', who: 'mori' },
        { if: '!d3_booking_restarted', then: [
          { do: 'gesture', who: 'mori', kind: 'point', to: 'booking_terminal' },
          { do: 'gesture', who: 'mori', kind: 'shrug' },
          { say: 'eric', emo: 'warm', text: 'It’s frozen for you too? I’m looking at it.' },
        ] },
        { if: 'club_art', then: [
          { say: 'mori', overheard: true, emo: 'warm', text: '火曜日、楽しみにしています。' },
          { say: 'eric', emo: 'warm', text: 'Tuesday’s the art club. I think he’s glad I signed up.' },
        ], else: [
          { say: 'mori', overheard: true, emo: 'warm', text: 'よかったら、美術部にもどうぞ。', clear: [{ ja: '美術部', ro: 'bijutsubu', en: 'art club' }] },
        ] },
      ],
      d3_emi: [...emiHello,
        { say: 'emi', emo: 'bright', text: 'I’m here for the pool keys. We’ve got one last swim outdoors tonight.' },
        emiClubFact,
        { if: 'club_swimming', then: [
          { say: 'emi', emo: 'bright', text: 'See you at the pool, then. You don’t have to swim, you can sit by the water.' },
        ], else: [{ say: 'emi', emo: 'casual', text: 'Take a slip at the plaza if you fancy it. You don’t have to swim, you can sit by the water.' }] },
      ],
      d3_gym_board: ['> “Swimming club: Saturday evenings here from 10 October. The 3 October swim is outdoors.”'],
      d3_fan: [{ say: 'eric', emo: 'warm', text: 'That feels better. I walked up here too fast.' }],
      d3_winter_setup: [{ do: 'day3Setup', state: 'winterClub' }],
    },
  },
);
