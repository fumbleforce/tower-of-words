import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'mori', step: 2, from: 4, place: 'dorm_commons', period: 'afternoon', weekdays: ['Sun'], node: 'ms_mori_photo', if: 'step_mori >= 2 && !ms2_mori', cost: 'next' },
  { who: 'mori', step: 2, from: 6, place: 'dorm_commons', period: 'evening', weekdays: ['Tue'], club: 'art', node: 'ms_mori_photo_evening', if: 'step_mori >= 2 && !ms2_mori', cost: 'none' },
  { who: 'mori', step: 3, from: 6, place: 'dorm_commons', period: 'evening', weekdays: ['Tue'], club: 'art', node: 'ms_mori_draw', if: 'bondready_mori == 3 && !ms3_mori', cost: 'none' },
];
export const nodes = {
  ...offer('ms_mori_photo', 'step_mori >= 2 && !ms2_mori', [
    { do: 'milestone', who: 'mori', state: 'photo' },
    { say: 'mori', overheard: true, emo: 'polite', text: 'この坂を描きたいんですが、紙に入りませんね。' },
  ], 'Spend the rest of the afternoon with Mori.', [{ set: 'ms_mori_daytime' }, { go: 'ms_mori_photo_show' }]),
  ...offer('ms_mori_photo_evening', 'step_mori >= 2 && !ms2_mori', [
    { do: 'milestone', who: 'mori', state: 'photo' },
    { say: 'mori', overheard: true, emo: 'polite', text: '写真を一枚、持ってきました。ご覧になりますか。' },
  ], 'Sit with Mori and look at the photograph.', [{ unset: 'ms_mori_daytime' }, { go: 'ms_mori_photo_show' }]),
  ms_mori_photo_show: [
    { do: 'milestone', who: 'mori', state: 'photo' },
    { say: 'mori', overheard: true, emo: 'warm', text: '九十四年の写真です。ここから跳ぶんです。' },
    { choice: [
      { text: 'That’s the jump you showed me.', if: 'lunch_mori || ski_seen', go: 'ms_mori_recognise' },
      { text: 'Show me how the jump works.', go: 'ms_mori_demonstrate' },
      { text: 'Point out the landing on the photograph.', go: 'ms_mori_landing' },
    ] },
  ],
  ms_mori_recognise: [{ do: 'milestone', who: 'mori', state: 'landing' }, { say: 'mori', overheard: true, emo: 'warm', text: '覚えていてくださったんですね。この辺りに着地します。' }, { go: 'ms_mori_photo_end' }],
  ms_mori_demonstrate: [{ do: 'gesture', who: 'mori', kind: 'skijump' }, { say: 'mori', overheard: true, emo: 'warm', text: 'こんなふうに。今は、このくらいで。' }, { set: 'ski_seen' }, { go: 'ms_mori_photo_end' }],
  ms_mori_landing: [{ do: 'milestone', who: 'mori', state: 'landing' }, { say: 'mori', overheard: true, emo: 'polite', text: 'この下です。木の手前まで入れたいんですが。' }, { go: 'ms_mori_photo_end' }],
  ms_mori_photo_end: [
    ...finish('mori', 2, 'Looked at his old ski-jump photograph.', 'ms_mori_daytime'),
  ],
  ...offer('ms_mori_draw', 'bondready_mori == 3 && !ms3_mori', [
    { do: 'milestone', who: 'mori', state: 'blankPage' },
    { say: 'mori', overheard: true, emo: 'polite', text: '鉛筆は削りました。次はお茶を……' },
  ], 'Sit down to draw with Mori.', [
    { do: 'milestone', who: 'mori', state: 'blankPage' },
    { if: '!ms2_mori', then: [{ do: 'milestone', who: 'mori', state: 'photo' }, { say: 'mori', overheard: true, emo: 'warm', text: 'この古い写真の坂を描こうと思っています。' }] },
    { choice: [{ text: 'I can pour the next tea.', go: 'ms_mori_tea' }, { text: 'Can I draw beside you?', go: 'ms_mori_beside' }] },
  ]),
  ms_mori_tea: [{ do: 'milestone', who: 'mori', state: 'playerTea' }, { go: 'ms_mori_start' }],
  ms_mori_beside: [{ say: 'mori', overheard: true, emo: 'warm', text: 'どうぞ。では、私も始めましょう。' }, { go: 'ms_mori_start' }],
  ms_mori_start: [{ do: 'milestone', who: 'mori', state: 'firstLine' }, { say: 'mori', overheard: true, emo: 'polite', text: 'お茶は、少し後にしましょう。' }, ...finish('mori', 3, 'Sat with him while he began his own drawing.')],
};
