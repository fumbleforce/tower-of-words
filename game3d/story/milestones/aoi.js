import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'aoi', step: 2, from: 4, place: 'sports', period: 'evening', weekdays: ['Sun'], club: 'tennis', node: 'ms_aoi_rally', if: 'step_aoi >= 2 && d3_aoi_intro && d4_tennis_done && !ms2_aoi', cost: 'none' },
  { who: 'aoi', step: 3, from: 4, place: 'sports', period: 'evening', weekdays: ['Sun'], club: 'tennis', node: 'ms_aoi_booking', if: 'bondready_aoi == 3 && d3_aoi_intro && d4_rei_intro && !ms3_aoi', cost: 'none' },
];
export const nodes = {
  ...offer('ms_aoi_rally', 'step_aoi >= 2 && d3_aoi_intro && d4_tennis_done && !ms2_aoi', [
    { do: 'gesture', who: 'aoi', kind: 'beckon', to: 'eric' },
    { say: 'aoi', overheard: true, name: 'Aoi', emo: 'warm', text: '{mc.called.aoi}、また少し打ちませんか。' },
  ], 'Hit a few balls with Aoi.', [
    { do: 'milestone', who: 'aoi', state: 'rally' },
    { say: 'aoi', overheard: true, name: 'Aoi', emo: 'casual', text: 'まだ返さなくて、いいですよね。' },
    { say: 'eric', emo: 'warm', text: 'I’d like another go if you would.' },
    { do: 'milestone', who: 'aoi', state: 'keepRacket' },
    ...finish('aoi', 2, 'Became someone she asks to practise with.'),
  ]),
  ...offer('ms_aoi_booking', 'bondready_aoi == 3 && d3_aoi_intro && d4_rei_intro && !ms3_aoi', [
    { say: 'aoi', overheard: true, name: 'Aoi', emo: 'hesitant', text: '来週も、初心者の時間がほしいんですけど。' },
    { do: 'milestone', who: 'aoi', state: 'bookingChoices' },
    { say: 'rei', name: 'Rei', emo: 'casual', text: 'Aoi wants to book time for beginners next week. These two slots are still free.' },
  ], 'Look at the booking with Aoi.', [
    { choice: [{ text: 'Read the posted slot lengths together.', go: 'ms_aoi_read' }, { text: 'Suggest asking Rei.', go: 'ms_aoi_ask_rei' }] },
  ]),
  ms_aoi_read: [{ do: 'milestone', who: 'aoi', state: 'readSlots' }, { say: 'eric', emo: 'curious', text: 'This one leaves half an hour before the doubles booking.' }, { go: 'ms_aoi_asks' }],
  ms_aoi_ask_rei: [{ say: 'eric', emo: 'warm', text: 'Rei, how long do you need for doubles?'  }, { go: 'ms_aoi_asks' }],
  ms_aoi_asks: [
    { do: 'milestone', who: 'aoi', state: 'askClub' },
    { say: 'aoi', overheard: true, name: 'Aoi', emo: 'polite', text: '最初の三十分は、初心者が使ってもいいですか。' },
    { say: 'rei', name: 'Rei', emo: 'curt', text: 'Thirty minutes for beginners, then doubles. Write it on the booking so nobody argues with me about it later.' },
    { do: 'milestone', who: 'aoi', state: 'makeBooking' },
    ...finish('aoi', 3, 'Stayed while she booked a beginner portion of the court time.'),
  ],
};
