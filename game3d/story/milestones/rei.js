import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'rei', step: 2, from: 4, place: 'sports', period: 'evening', weekdays: ['Sun'], club: 'tennis', node: 'ms_rei_remembers', if: 'step_rei >= 2 && d4_rei_intro && !ms2_rei', cost: 'none' },
  { who: 'rei', step: 3, from: 4, place: 'sports', period: 'evening', weekdays: ['Sun'], club: 'tennis', node: 'ms_rei_half', if: 'bondready_rei == 3 && d4_rei_intro && !ms3_rei', cost: 'none' },
];
export const nodes = {
  ...offer('ms_rei_remembers', 'step_rei >= 2 && d4_rei_intro && !ms2_rei', [
    { if: 'd4_watched_rei', then: [{ say: 'rei', name: 'Rei', emo: 'warm', text: 'Want to try the serve yourself? I’ll keep the explanation shorter.' }], else: [
      { if: 'd4_played_aoi', then: [{ say: 'rei', name: 'Rei', emo: 'warm', text: 'You were hitting with Aoi. Would you like me to send you a few this time?' }], else: [{ say: 'rei', name: 'Rei', emo: 'casual', text: 'What would you like to try? We’ve got some space now.' }] },
    ] },
  ], 'Take a turn with Rei.', [
    { do: 'milestone', who: 'rei', state: 'chosenPractice' },
    { if: 'd4_watched_rei', then: [{ say: 'rei', name: 'Rei', emo: 'warm', text: 'Try another serve. I’ll watch where you throw the ball.' }, { do: 'milestone', who: 'rei', state: 'anotherServe' }], else: [{ say: 'rei', name: 'Rei', emo: 'warm', text: 'Try that again. I’ll put the next ball in the same place.' }, { do: 'milestone', who: 'rei', state: 'sameBall' }] },
    ...finish('rei', 2, 'Practised with her after she remembered what they had tried.'),
  ]),
  ...offer('ms_rei_half', 'bondready_rei == 3 && d4_rei_intro && !ms3_rei', [
    { say: 'rei', name: 'Rei', emo: 'casual', text: 'Come on my side for doubles. I’ll take the left.' },
  ], 'Try the doubles drill with Rei.', [
    { do: 'milestone', who: 'rei', state: 'takesOver' },
    { say: 'eric', emo: 'hesitant', text: 'I was going for that one.' },
    { choice: [{ text: 'Can I have another try?', go: 'ms_rei_try_again' }, { text: 'Could you cover just your half?', go: 'ms_rei_your_half' }] },
  ]),
  ms_rei_try_again: [{ say: 'rei', name: 'Rei', emo: 'sheepish', text: 'Yes. I got there before I thought about it.' }, { go: 'ms_rei_waits' }],
  ms_rei_your_half: [{ say: 'rei', name: 'Rei', emo: 'hesitant', text: 'All right. I’ll stay over here.' }, { go: 'ms_rei_waits' }],
  ms_rei_waits: [
    { do: 'milestone', who: 'rei', state: 'missedReturn' },
    { say: 'rei', name: 'Rei', emo: 'curious', text: 'Where did you want the next one? Closer to the middle?' },
    { say: 'eric', emo: 'warm', text: 'A bit further back. I was too close.' },
    { say: 'rei', overheard: true, name: 'Rei', emo: 'polite', text: '次は、もう少し深くお願いします。' },
    { do: 'milestone', who: 'rei', state: 'opponentFeedsBack' },
    ...finish('rei', 3, 'Asked for room on court, and she let the next return be theirs.'),
  ],
};
