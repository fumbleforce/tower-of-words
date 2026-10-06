import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'kuro', step: 2, from: 10, place: 'gym', period: 'evening', weekdays: ['Sat'], club: 'swimming', node: 'ms_kuro_seat', if: 'step_kuro >= 2 && d3_kuro_intro && !ms2_kuro', cost: 'none' },
  { who: 'kuro', step: 3, from: 10, place: 'gym', period: 'evening', weekdays: ['Sat'], club: 'swimming', node: 'ms_kuro_equipment', if: 'bondready_kuro == 3 && d3_kuro_intro && !ms3_kuro', cost: 'none' },
];
export const nodes = {
  ...offer('ms_kuro_seat', 'step_kuro >= 2 && d3_kuro_intro && !ms2_kuro', [
    { say: 'kuro', name: 'Kuro', emo: 'warm', text: '{mc.name}, which seat would you like? I’m keeping this one by the window.' },
  ], 'Take the seat beside Kuro.', [
    { do: 'milestone', who: 'kuro', state: 'windowSeat' },
    { say: 'eric', emo: 'warm', text: 'You’ve tried the others?' },
    { say: 'kuro', name: 'Kuro', emo: 'casual', text: 'The one near the door gets cold every time someone comes in. I’ve done my turn there.' },
    ...finish('kuro', 2, 'Sat with her while she kept the window seat she likes.'),
  ]),
  ...offer('ms_kuro_equipment', 'bondready_kuro == 3 && d3_kuro_intro && !ms3_kuro', [
    { do: 'milestone', who: 'kuro', state: 'choosing' },
    { say: 'member', overheard: true, emo: 'polite', text: 'すみません、予備の道具を出してもらえますか。' },
    { say: 'kuro', name: 'Kuro', emo: 'casual', text: 'She wants me to fetch a mat. I was just about to join that group.' },
  ], 'Stay beside Kuro.', [
    { choice: [{ text: 'Ask where the spare mats are.', go: 'ms_kuro_point' }, { text: 'Wait for Kuro to answer.', go: 'ms_kuro_answer' }] },
  ]),
  ms_kuro_point: [{ say: 'eric', emo: 'curious', text: 'Where do you keep the spare mats?' }, { do: 'milestone', who: 'kuro', state: 'pointStore' }, { go: 'ms_kuro_answer' }],
  ms_kuro_answer: [
    { say: 'kuro', overheard: true, name: 'Kuro', emo: 'polite', text: '棚の下です。私は今からこちらに入るので、お願いします。' },
    { do: 'milestone', who: 'kuro', state: 'joinChoice' },
    ...finish('kuro', 3, 'Stayed while she chose her activity and left the equipment to its borrower.'),
  ],
};
