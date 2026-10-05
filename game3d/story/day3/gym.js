import { place, goal, emiHello } from './shared.js';
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
          { say: 'eric', emo: 'tired', text: 'The desk is closed. I can come back during the day.' }, { end: true },
        ] },
        { if: "ticket_T0004 == 'done'", then: [
          { say: 'attendant', emo: 'polite', text: '予約表、使えています。ありがとうございます。', en: 'We’re using the booking sheet now. Thank you.' }, { end: true },
        ] },
        { if: 'd3_booking_restarted', then: [{ go: 'd3_printer' }] },
        { do: 'cam', on: 'attendant', zoom: 1.2 },
        { say: 'attendant', emo: 'polite', text: '押しても変わりません。今日の予約表を出したいんですが。', en: 'The buttons do nothing. I need to print today’s bookings.' },
        { say: 'eric', emo: 'curious', text: 'There’s a reset switch underneath.' },
        { choice: [
          { text: 'Restart the terminal with its reset control.', go: 'd3_booking_reset' },
          { text: 'Try 動いて (ugoite, move) on the terminal.', if: 'know_ugoite', go: 'd3_booking_magic' },
          { text: 'Leave the terminal for later.', go: 'd3_booking_later' },
        ] },
      ],
      d3_booking_reset: [
        { do: 'ticket', start: 'T-0004' }, { do: 'bookingRepair', state: 'reset' },
        { go: 'd3_booking_ready' },
      ],
      d3_booking_magic: [
        { do: 'ticket', start: 'T-0004' },
        { say: 'eric', emo: 'hesitant', text: '{ugoite}.' },
        { do: 'kotodama', target: 'booking_terminal' }, { do: 'bookingRepair', state: 'restart' },
        { set: 'd3_booking_magic' },
        { say: 'attendant', emo: 'puzzled', text: 'あ、戻りました。どこを押したんですか。', en: 'Oh, it’s back. Which button did you press?' },
        { say: 'eric', emo: 'hesitant', text: 'Let’s check the printout first.' },
        { go: 'd3_booking_ready' },
      ],
      d3_booking_ready: [
        { set: 'd3_booking_restarted' },
        { say: 'attendant', emo: 'polite', text: '今日の分を、一枚お願いします。', en: 'One sheet for today, please.' },
        { do: 'cam', back: true },
        { do: 'goal', text: 'Print today’s bookings at the gym printer.', at: 'gym_printer' },
        { do: 'save' },
      ],
      d3_printer: [
        { if: "period == 'evening'", then: [
          { say: 'eric', emo: 'tired', text: 'I need the attendant here to check the sheet.' }, { end: true },
        ] },
        { if: '!d3_booking_restarted', then: [
          { say: 'attendant', emo: 'polite', text: '先に、こちらの画面をお願いします。', en: 'Please look at this screen first.' },
          { do: 'gesture', who: 'attendant', kind: 'point', to: 'booking_terminal' }, { end: true },
        ] },
        { if: "ticket_T0004 == 'done'", then: [
          { say: 'eric', emo: 'warm', text: 'They have the sheet they need.' }, { end: true },
        ] },
        { do: 'cam', on: 'gym_printer', zoom: 1.2 },
        { choice: [
          { text: 'Press Print for today’s bookings.', go: 'd3_print' },
          { text: 'Leave the printout for later.', go: 'd3_booking_later' },
        ] },
      ],
      // Reuse only after a complete sheet is in the tray, with no queued print job.
      d3_dashite_word: [
        { say: 'eric', emo: 'curious', text: 'What did you say to it?' },
        { say: 'attendant', emo: 'polite', text: '{dashite}。', en: 'Give it out. The paper, I mean.' },
        { say: 'attendant', emo: 'sheepish', text: 'いつも言っちゃうんです。', en: 'I always say that to it.' },
        { say: 'attendant', emo: 'slow', slow: true, text: '{dashite}。', en: 'Give it out.' },
        { do: 'type', word: 'dashite', from: 'attendant', prompt: 'The sheet is already out. Try her word for “give it out”: dashite.' },
      ],
      d3_print: [
        { say: 'attendant', emo: 'polite', text: '{dashite}。', en: 'Give it out.' },
        { do: 'bookingRepair', state: 'print' },
        { do: 'cam', on: 'attendant', zoom: 1.2 },
        { if: '!know_dashite', then: [{ call: 'd3_dashite_word' }] },
        { do: 'bookingRepair', state: 'check' },
        { say: 'attendant', emo: 'polite', text: '最後の行もあります。これで大丈夫です。', en: 'The last row is here too. That’s the whole sheet.' },
        { set: 'd3_booking_done' }, { do: 'ticket', close: 'T-0004' },
        { do: 'cam', back: true }, { do: 'save' }, ...goal('gym_door'),
      ],
      d3_booking_later: [{ do: 'cam', back: true }],
      d3_mori: [
        { say: 'mori', emo: 'polite', text: '火曜日の部屋を確認しに来ました。絵を描くんです。', en: 'I came to check our room booking for Tuesday. We draw together.' },
        { if: '!d3_booking_restarted', then: [
          { say: 'mori', emo: 'polite', text: 'でも、まだ動かないそうです。', en: 'But they say it’s still not working.' },
        ] },
        { if: 'club_art', then: [{ say: 'mori', emo: 'warm', text: '談話室で、お待ちしています。', en: 'I’ll see you in the dorm common room.' }],
          else: [{ say: 'mori', emo: 'warm', text: 'よかったら、広場の掲示板を見てください。', en: 'Have a look at the plaza board if you’d like to come.' }] },
      ],
      d3_emi: [...emiHello,
        { say: 'emi', emo: 'bright', text: 'I’m finding the pool keys. We’ve got one last swim tonight.' },
        { if: 'club_swimming', then: [
          { say: 'emi', emo: 'bright', text: 'See you at the pool tonight, then. You can sit by the water too.' },
        ], else: [{ say: 'emi', emo: 'casual', text: 'Take a slip at the plaza if you fancy it. You can sit by the water too.' }] },
      ],
      d3_gym_board: ['> “Swimming club: Saturday evenings here from 10 October. The 3 October swim is outdoors.”'],
      d3_fan: [{ say: 'eric', emo: 'warm', text: 'That feels better. I walked up here too fast.' }],
      d3_winter_setup: [{ do: 'day3Setup', state: 'winterClub' }],
    },
  },
);
