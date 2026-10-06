import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'emi', step: 2, from: 3, place: 'pool', period: 'evening', weekdays: ['Sat'], until: 3, club: 'swimming', node: 'ms_emi_seat', if: 'step_emi >= 2 && !ms2_emi && d3_swim_done', cost: 'none' },
  { who: 'emi', step: 2, from: 10, place: 'gym', period: 'evening', weekdays: ['Sat'], club: 'swimming', node: 'ms_emi_seat', if: 'step_emi >= 2 && !ms2_emi', cost: 'none' },
  { who: 'emi', step: 3, from: 10, place: 'gym', period: 'evening', weekdays: ['Sat'], club: 'swimming', node: 'ms_emi_sheet', if: 'bondready_emi == 3 && !ms3_emi', cost: 'none' },
];
export const nodes = {
  ...offer('ms_emi_seat', 'step_emi >= 2 && !ms2_emi', [
    { say: 'emi', emo: 'warm', text: 'Sit here if you like. Someone else is explaining next week, and I’d quite like to hear it for once.' },
  ], 'Sit beside Emi.', [
    { do: 'milestone', who: 'emi', state: 'bagUnderBench' },
    { say: 'eric', emo: 'curious', text: 'Do you need anything out of there?' },
    { say: 'emi', emo: 'casual', text: 'No. If I do, it can stay there anyway.' },
    { do: 'milestone', who: 'emi', state: 'listenTogether' },
    ...finish('emi', 2, 'Sat with her while another member explained the next meeting.'),
  ]),
  ...offer('ms_emi_sheet', 'bondready_emi == 3 && !ms3_emi', [
    { do: 'milestone', who: 'emi', state: 'offeredSheet' },
    { say: 'emi', emo: 'hesitant', text: 'Oh, is this for next week? I was going to join the stretching.' },
  ], 'Stay with Emi at the session.', [
    { choice: [{ text: 'Could someone else take the booking sheet?', go: 'ms_emi_volunteer' }, { text: 'Which exercise did you want to join?', go: 'ms_emi_stretch' }] },
  ]),
  ms_emi_volunteer: [{ say: 'emi', emo: 'casual', text: 'I’ll ask the woman by the mats. She hasn’t joined a group yet.' }, { go: 'ms_emi_handover' }],
  ms_emi_stretch: [{ say: 'emi', emo: 'warm', text: 'The stretches by the mats. I’ll ask someone to take this before I miss them.' }, { go: 'ms_emi_handover' }],
  ms_emi_handover: [
    { do: 'milestone', who: 'emi', state: 'askVolunteer' },
    { say: 'emi', overheard: true, emo: 'polite', text: '来週の予約、お願いできますか。' },
    { say: 'member', overheard: true, emo: 'polite', text: 'はい、私がやります。' },
    { do: 'milestone', who: 'emi', state: 'joinExercise' },
    ...finish('emi', 3, 'Stayed while she handed the booking to another member and joined in.'),
  ],
};
