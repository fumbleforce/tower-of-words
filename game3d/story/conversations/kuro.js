// The swimming follow-up is dispatched only after its actual remark and oyogu are present.
const menu = (understood = false) => [
  { if: '!d3_kuro_intro', then: [{ end: true }] },
  { if: "place == 'forecourt' && period_morning && (day == 1 || day == 2 || day == 5 || (day > 5 && ongoing_workday))", then: [
    { say: 'kuro', name: 'Kuro', overheard: true, emo: 'apologetic', text: 'すみません。お話は、あとでもいいですか。' },
    { end: true },
  ] },
  { do: 'face', who: 'eric', to: 'kuro' }, { do: 'face', who: 'kuro', to: 'eric' }, { do: 'cam', on: 'kuro', zoom: 1.3, conversation: 'kuro' },
  { choice: [
    { text: 'Say hello to Kuro away from the counter.', go: 'chat_kuro_name', if: "place != 'forecourt' && !chat_kuro_name_used" },
    { text: 'Say hello to Kuro.', go: 'chat_kuro_name_again', if: "place != 'forecourt' && chat_kuro_name_used" },
    { text: 'Ask about her time off.', go: 'chat_kuro_swimming', if: '!chat_kuro_swimming_asked' },
    { text: 'Ask about swimming again.', go: 'chat_kuro_swimming_again', if: 'chat_kuro_swimming_asked && know_oyogu' },
    { text: 'Ask about her time off again.', go: 'chat_kuro_swimming_again', if: 'chat_kuro_swimming_asked && !know_oyogu' },
    ...(understood ? [{ text: '{oyogu}… Swimming?', go: 'chat_kuro_swimming_question', if: 'know_oyogu && !chat_kuro_swimming_understood' }] : []),
    { text: 'How do I say “a day off”?', go: 'chat_kuro_rest_word', if: '!know_yasumi' },
    { text: 'I’ll let you get on.', go: 'chat_kuro_leave' },
  ] },
];
export default {
  on: { 'ask:kuro': 'chat_kuro', 'ask:kuro-swimming': 'chat_kuro_understood' },
  nodes: {
    chat_kuro: menu(), chat_kuro_understood: menu(true),
    chat_kuro_name: [
      { say: 'eric', emo: 'warm', text: '玖路さん。' },
      { if: 'kuro_reception_seen || d2_kuro_work_seen || d2_kuro_weekend_seen', then: [
        { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'こんにちは。仕事の外で会うと、ちょっと変な感じがしますね。' },
      ], else: [
        { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'こんにちは。いまは、ゆっくり話せますよ。' },
      ] },
      { do: 'gesture', who: 'kuro', kind: 'nod', to: 'eric' },
      { set: 'chat_kuro_name_used' }, { go: 'chat_kuro_leave' },
    ],
    chat_kuro_name_again: [
      { say: 'eric', emo: 'warm', text: '玖路さん。' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'はい。ここでは、私も休んでますから。' },
      { do: 'gesture', who: 'kuro', kind: 'nod', to: 'eric' }, { go: 'chat_kuro_leave' },
    ],
    chat_kuro_swimming: [
      { say: 'eric', emo: 'curious', text: 'What do you do when you’re off work?' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '{oyogu}のは好きなんです。速い人には、先に行ってもらいます。' },
      { set: 'chat_kuro_swimming_asked' },
      { if: 'know_oyogu', then: [{ go: 'chat_kuro_swimming_reply' }], else: [{ go: 'chat_kuro_leave' }] },
    ],
    chat_kuro_swimming_again: [
      { if: 'chat_kuro_swimming_understood', then: [
        { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '泳いだあとは、よく眠れるんです。' },
        { go: 'chat_kuro_company' },
      ], else: [
        { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '{oyogu}のは好きなんです。速い人には、先に行ってもらいます。' },
        { if: 'know_oyogu', then: [{ go: 'chat_kuro_swimming_reply' }], else: [{ go: 'chat_kuro_leave' }] },
      ] },
    ],
    chat_kuro_swimming_reply: [{ choice: [
      { text: '{oyogu}… Swimming?', go: 'chat_kuro_swimming_question' },
      { text: 'I’ll see you around.', go: 'chat_kuro_leave' },
    ] }],
    chat_kuro_swimming_question: [
      { say: 'eric', emo: 'curious', text: '{oyogu}？' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'はい。ゆっくり泳ぐほうが好きですね。' },
      { set: 'chat_kuro_swimming_understood' }, { go: 'chat_kuro_company' },
    ],
    chat_kuro_company: [{ choice: [
      { text: '{isshoni}… Together?', go: 'chat_kuro_together', if: 'know_isshoni && !chat_kuro_company_asked' },
      { text: 'Ask about meeting her at club.', go: 'chat_kuro_together', if: 'know_isshoni && chat_kuro_company_asked' },
      { text: 'Leave her to her break.', go: 'chat_kuro_leave' },
    ] }],
    chat_kuro_together: [
      { say: 'eric', emo: 'hesitant', text: '{isshoni}？' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '{isshoni}。クラブで会ったら、声をかけてください。' },
      { set: 'chat_kuro_company_asked' }, { go: 'chat_kuro_leave' },
    ],
    chat_kuro_rest_word: [
      { say: 'eric', emo: 'curious', text: 'How do I say “a day off”?' },
      { say: 'kuro', name: 'Kuro', emo: 'slow', slow: true, text: '{yasumi}。' },
      { do: 'type', word: 'yasumi', from: 'kuro', prompt: 'Try “a day off”: yasumi.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'はい。{yasumi}です。' },
      { go: 'chat_kuro_leave' },
    ],
    chat_kuro_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
