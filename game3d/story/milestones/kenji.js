import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'kenji', step: 2, from: 5, place: 'karaoke_booth', period: 'lunch', weekdays: ['Mon'], node: 'ms_kenji_opening', if: "step_kenji >= 2 && !ms2_kenji", cost: 'next' },
  { who: 'kenji', step: 2, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_kenji_opening_evening', if: 'step_kenji >= 2 && !ms2_kenji', cost: 'none' },
  { who: 'kenji', step: 3, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_kenji_queue', if: 'bondready_kenji == 3 && !ms3_kenji', cost: 'none' },
];
export const nodes = {
  ...offer('ms_kenji_opening', "step_kenji >= 2 && !ms2_kenji", [
    { say: 'kenji', emo: 'hesitant', text: 'Can you listen to the start? I check it for Wednesday.' },
  ], 'Listen for the rest of lunch.', [{ set: 'ms_kenji_daytime' }, { go: 'ms_kenji_try' }]),
  ...offer('ms_kenji_opening_evening', 'step_kenji >= 2 && !ms2_kenji', [
    { say: 'kenji', emo: 'hesitant', text: 'I start too high here. Can you listen?'  },
  ], 'Listen to Kenji try the opening.', [{ unset: 'ms_kenji_daytime' }, { go: 'ms_kenji_try' }]),
  ms_kenji_try: [
    { do: 'milestone', who: 'kenji', state: 'wrongKey' },
    { say: 'kenji', emo: 'sheepish', text: 'I start too high again. Wait, I try lower.' },
    { do: 'milestone', who: 'kenji', state: 'rightKey' },
    { say: 'eric', emo: 'warm', text: 'That sounded easier.' },
    { say: 'kenji', emo: 'warm', text: 'Yes. I can breathe now.' },
    ...finish('kenji', 2, 'Listened while he found the opening key.', 'ms_kenji_daytime'),
  ],
  ...offer('ms_kenji_queue', 'bondready_kenji == 3 && !ms3_kenji', [
    { do: 'milestone', who: 'kenji', state: 'queue' },
    { say: 'member', overheard: true, emo: 'polite', text: '私の曲、まだ入っていますか。' },
    { say: 'kenji', emo: 'puzzled', text: 'Where is her song? Can you see it?' },
  ], 'Look at the queue with Kenji.', [
    { choice: [{ text: 'I can’t see their song in there.', go: 'ms_kenji_missing' }, { text: 'Want a hand putting the queue back?', go: 'ms_kenji_restore' }] },
  ]),
  ms_kenji_missing: [{ say: 'kenji', emo: 'sheepish', text: 'Ah. These are all mine. I kept adding.' }, { go: 'ms_kenji_delete' }],
  ms_kenji_restore: [{ say: 'kenji', emo: 'sheepish', text: 'Yes. Wait, I remove mine first.' }, { go: 'ms_kenji_delete' }],
  ms_kenji_delete: [
    { do: 'milestone', who: 'kenji', state: 'deleteExtras' },
    { say: 'kenji', overheard: true, emo: 'polite', text: 'すみません。もう一度、選んでもらえますか。' },
    { do: 'milestone', who: 'kenji', state: 'memberChooses' },
    ...finish('kenji', 3, 'Helped him make room for another member’s song.'),
  ],
};
