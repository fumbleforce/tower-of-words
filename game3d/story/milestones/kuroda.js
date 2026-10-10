import { offer, finish } from './shared.js';
export const scenes = [
  { who: 'kuroda', step: 1, from: 3, place: 'shotengai', period: 'lunch', weekdays: ['Sat', 'Sun'], node: 'ms_hamada_name', if: '!ms_hamada_named', cost: 'none', label: 'Say hello at the bakery.' },
  { who: 'kuroda', step: 2, from: 4, place: 'karaoke', period: 'evening', weekdays: ['Sun'], node: 'ms_hamada_receipt', if: 'step_kuroda >= 2 && !ms2_kuroda', cost: 'none' },
  { who: 'kuroda', step: 2, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_hamada_receipt', if: 'step_kuroda >= 2 && !ms2_kuroda', cost: 'none' },
  { who: 'kuroda', step: 3, from: 7, place: 'karaoke_booth', period: 'evening', weekdays: ['Wed'], club: 'karaoke', node: 'ms_hamada_turn', if: 'bondready_kuroda == 3 && !ms3_kuroda', cost: 'none' },
];
export const nodes = {
  ms_hamada_name: [{ if: '!ms_hamada_named', then: [
    { say: 'kuroda', overheard: true, emo: 'polite', text: 'すみません。浜田です。経理にいます。', clear: [{ ja: '浜田', ro: 'Hamada', en: 'Hamada' }] },
    { say: 'eric', emo: 'warm', text: 'I’m {mc.name}, from IT support.' },
    { set: 'ms_hamada_named' }, { do: 'meet', who: 'kuroda' }, { do: 'save' },
  ] }],
  ...offer('ms_hamada_receipt', 'step_kuroda >= 2 && !ms2_kuroda', [
    { call: 'ms_hamada_name' },
    { do: 'milestone', who: 'kuroda', state: 'receiptFront' },
    { say: 'kuroda', overheard: true, emo: 'sheepish', text: '番号を忘れるので、ここに書いておきました。' },
  ], 'Look at Hamada’s receipt.', [
    { say: 'eric', emo: 'curious', text: 'Is that how much the bread cost?' },
    { say: 'kuroda', overheard: true, emo: 'polite', text: 'はい。あ、値段ではなくて、裏です。' },
    { do: 'milestone', who: 'kuroda', state: 'receiptBack' },
    { say: 'eric', emo: 'warm', text: 'Oh, a song number. I’ll let you keep that.' },
    ...finish('kuroda', 2, 'Looked at the song number on his bakery receipt.'),
  ]),
  ...offer('ms_hamada_turn', 'bondready_kuroda == 3 && !ms3_kuroda', [
    { call: 'ms_hamada_name' },
    { do: 'milestone', who: 'kuroda', state: 'hisTurn' },
    { say: 'kuroda', overheard: true, emo: 'sheepish', text: '私は後でも。先にどうぞ。' },
  ], 'Stay for Hamada’s song.', [
    { choice: [{ text: 'I’d like to hear yours.', go: 'ms_hamada_hear' }, { text: 'Point to his number on the screen.', go: 'ms_hamada_number' }] },
  ]),
  ms_hamada_hear: [{ say: 'kuroda', overheard: true, emo: 'hesitant', text: 'そうですか。では、一曲だけ。' }, { go: 'ms_hamada_sing' }],
  ms_hamada_number: [{ do: 'milestone', who: 'kuroda', state: 'pointNumber' }, { say: 'kuroda', overheard: true, emo: 'polite', text: 'あ、もう出ていますね。では。' }, { go: 'ms_hamada_sing' }],
  ms_hamada_sing: [{ do: 'milestone', who: 'kuroda', state: 'keepMicrophone' }, ...finish('kuroda', 3, 'Stayed to hear him take his own turn.')],
};
