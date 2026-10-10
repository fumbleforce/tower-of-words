import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'guard', step: 1, from: 3, place: 'gate', period: 'lunch', node: 'ms_guard_name', if: '!ms_guard_named', cost: 'none', label: 'Ask his name.' },
  { who: 'guard', step: 2, from: 3, place: 'gate', period: 'lunch', node: 'ms_guard_bench', if: 'step_guard >= 2 && !ms2_guard', cost: 'next' },
  { who: 'guard', step: 3, from: 3, place: 'gate', period: 'lunch', node: 'ms_guard_break', if: 'bondready_guard == 3 && !ms3_guard', cost: 'next' },
];
export const nodes = {
  ms_guard_name: [
    { if: 'ms_guard_named', then: [{ end: true }] },
    { say: 'eric', emo: 'polite', text: 'I don’t think I caught your name.' },
    { say: 'guard', overheard: true, emo: 'polite', text: '石橋です。よろしくお願いします。', clear: [{ ja: '石橋', ro: 'Ishibashi', en: 'Ishibashi' }] },
    { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. Thank you for all the help.' },
    { set: 'ms_guard_named' }, { do: 'meet', who: 'guard' }, { do: 'save' },
  ],
  ...offer('ms_guard_bench', 'step_guard >= 2 && !ms2_guard', [
    { do: 'milestone', who: 'guard', state: 'benchSpace' },
    { say: 'guard', overheard: true, emo: 'polite', text: 'よろしければ、こちらに。今は休憩です。' },
  ], 'Spend the rest of lunch on the bench.', [
    { do: 'milestone', who: 'guard', state: 'sitTogether' },
    { say: 'eric', emo: 'warm', text: 'You get a bit more air out here.' },
    { say: 'guard', overheard: true, emo: 'polite', text: 'ええ。今日は、ここで。' },
    ...finish('guard', 2, 'Shared his lunch break on the bench.', true),
  ]),
  ...offer('ms_guard_break', 'bondready_guard == 3 && !ms3_guard', [
    { do: 'milestone', who: 'guard', state: 'benchSpace' },
    { say: 'guard', overheard: true, emo: 'polite', text: '今日は、こちらに座りませんか。' },
  ], 'Spend the rest of lunch with the guard.', [
    { do: 'milestone', who: 'guard', state: 'sitTogether' },
    { do: 'milestone', who: 'guard', state: 'arrival' },
    { say: 'guard', overheard: true, emo: 'hesitant', text: '少し見てきます。' },
    { choice: [{ text: 'I can wait here while you look.', go: 'ms_guard_wait' }, { text: 'The attendant’s helping them.', go: 'ms_guard_covered' }] },
  ]),
  ms_guard_wait: [{ say: 'eric', emo: 'warm', text: 'Your lunch can stay here.' }, { go: 'ms_guard_sits' }],
  ms_guard_covered: [{ do: 'milestone', who: 'guard', state: 'pointAttendant' }, { go: 'ms_guard_sits' }],
  ms_guard_sits: [
    { do: 'milestone', who: 'guard', state: 'covered' },
    { say: 'guard', overheard: true, emo: 'polite', text: 'ああ、大丈夫ですね。では、いただきます。' },
    { do: 'milestone', who: 'guard', state: 'sitBack' },
    ...finish('guard', 3, 'Waited while he let the attendant handle an arrival.', true),
  ],
};
