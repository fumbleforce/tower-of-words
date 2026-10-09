import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'kenji', step: 2, from: 5, place: 'karaoke_booth', period: 'lunch', weekdays: ['Mon'], node: 'ms_kenji_opening', if: "step_kenji >= 2 && !ms2_kenji", cost: 'next' },
  { who: 'kenji', step: 2, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_kenji_opening_evening', if: 'step_kenji >= 2 && !ms2_kenji', cost: 'none' },
  { who: 'kenji', step: 3, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_kenji_queue', if: 'bondready_kenji == 3 && !ms3_kenji', cost: 'none' },
];
export const nodes = {
  ...offer('ms_kenji_opening', "step_kenji >= 2 && !ms2_kenji", [
    { say: 'kenji', emo: 'hesitant', overheard: true, text: '{mc.name_jp}さん、ちょっと聞いてもらえますか。' },
    { say: 'kenji', emo: 'hesitant', text: 'Wednesday... song. Listen, please?' },
  ], 'Listen for the rest of lunch.', [{ set: 'ms_kenji_daytime' }, { go: 'ms_kenji_try' }]),
  ...offer('ms_kenji_opening_evening', 'step_kenji >= 2 && !ms2_kenji', [
    { say: 'kenji', emo: 'hesitant', text: 'Too high... me.' },
    { say: 'kenji', emo: 'hesitant', overheard: true, text: '聞いてもらえますか。' },
  ], 'Listen to Kenji try the opening.', [{ unset: 'ms_kenji_daytime' }, { go: 'ms_kenji_try' }]),
  ms_kenji_try: [
    { do: 'milestone', who: 'kenji', state: 'wrongKey' },
    { say: 'kenji', emo: 'sheepish', overheard: true, text: 'あ、また高い…' },
    { say: 'kenji', emo: 'sheepish', text: 'Again. Lower.' },
    { do: 'milestone', who: 'kenji', state: 'rightKey' },
    { say: 'eric', emo: 'warm', text: 'That sounded easier.' },
    { say: 'kenji', emo: 'warm', overheard: true, text: 'はい。楽になりました。' },
    { say: 'kenji', emo: 'warm', text: 'OK now.' },
    ...finish('kenji', 2, 'Listened while he found the opening key.', 'ms_kenji_daytime'),
  ],
  ...offer('ms_kenji_queue', 'bondready_kenji == 3 && !ms3_kenji', [
    { do: 'milestone', who: 'kenji', state: 'queue' },
    { say: 'member', overheard: true, emo: 'polite', text: '私の曲、まだ入っていますか。' },
    { say: 'kenji', emo: 'puzzled', overheard: true, text: 'あれ？あの人の曲…' },
    { say: 'kenji', emo: 'puzzled', text: 'Her song... where?' },
  ], 'Look at the queue with Kenji.', [
    { choice: [{ text: 'I can’t see their song in there.', go: 'ms_kenji_missing' }, { text: 'Want a hand putting the queue back?', go: 'ms_kenji_restore' }] },
  ]),
  ms_kenji_missing: [{ say: 'kenji', emo: 'sheepish', text: 'Ah... all, mine.' }, { say: 'kenji', emo: 'sheepish', overheard: true, text: '入れすぎました。{sumimasen}。' }, { go: 'ms_kenji_delete' }],
  ms_kenji_restore: [{ say: 'kenji', emo: 'sheepish', overheard: true, text: 'はい！僕のを先に消します。' }, { say: 'kenji', emo: 'sheepish', text: 'Mine... delete.' }, { go: 'ms_kenji_delete' }],
  ms_kenji_delete: [
    { do: 'milestone', who: 'kenji', state: 'deleteExtras' },
    { say: 'kenji', overheard: true, emo: 'polite', text: 'すみません。もう一度、選んでもらえますか。' },
    { do: 'milestone', who: 'kenji', state: 'memberChooses' },
    ...finish('kenji', 3, 'Helped him make room for another member’s song.'),
  ],
};
