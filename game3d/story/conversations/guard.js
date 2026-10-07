const menu = (understood = false) => [
  { do: 'face', who: 'eric', to: 'guard' }, { do: 'face', who: 'guard', to: 'eric' }, { do: 'cam', on: 'guard', zoom: 1.25 },
  { choice: [
    { text: 'Stop for a moment and say hello.', go: 'chat_guard_hello' },
    { text: 'Ask about Tama.', go: 'chat_guard_cat', if: 'met_tama' },
    ...(understood ? [{ text: '{yasumi}… Was he offering you a short rest?', go: 'chat_guard_break' }] : []),
    { text: 'Let him get back to the entrance.', go: 'chat_guard_leave' },
  ] },
];
export default {
  on: { 'ask:guard': 'chat_guard', 'ask:guard-break': 'chat_guard_understood' },
  nodes: {
    chat_guard: menu(), chat_guard_understood: menu(true),
    chat_guard_hello: [
      { do: 'bow', who: 'eric' }, { do: 'bow', who: 'guard' },
      { say: 'guard', overheard: true, emo: 'polite', text: '少し、お休みになりますか。' },
      { choice: [
        { text: '{yasumi}. I’m taking a break.', go: 'chat_guard_rest', if: 'know_yasumi' },
        { text: 'I won’t keep you. I was just passing.', go: 'chat_guard_passing' },
      ] },
    ],
    chat_guard_break: [
      { say: 'eric', emo: 'curious', text: '{yasumi}？' },
      { say: 'guard', overheard: true, emo: 'polite', text: 'はい。少し、休んでいってください。' },
      { choice: [
        { text: '{yasumi}. I’m taking a break.', go: 'chat_guard_rest' },
        { text: 'Point back towards work.', go: 'chat_guard_work' },
      ] },
    ],
    chat_guard_rest: [
      { say: 'eric', emo: 'warm', text: '{yasumi}。' },
      { do: 'gesture', who: 'guard', kind: 'nod', to: 'eric' },
      { say: 'guard', overheard: true, emo: 'warm', text: 'そうですか。ゆっくりどうぞ。' },
      { go: 'chat_guard_leave' },
    ],
    chat_guard_work: [
      { if: "place == 'gate'", then: [{ do: 'gesture', who: 'eric', kind: 'point', to: 'forecourt_way' }] },
      { say: 'guard', overheard: true, emo: 'polite', text: 'お仕事でしたか。お疲れさまです。' },
      { do: 'bow', who: 'guard' }, { go: 'chat_guard_leave' },
    ],
    chat_guard_passing: [
      { say: 'eric', emo: 'polite', text: 'I won’t keep you. I was just passing.' },
      { do: 'bow', who: 'eric' },
      { say: 'guard', voice: 'guard-dozo', overheard: true, emo: 'polite', text: 'はい、どうぞ。' },
      { go: 'chat_guard_leave' },
    ],
    chat_guard_cat: [
      { say: 'eric', emo: 'curious', text: 'タマ？' },
      { do: 'gesture', who: 'guard', kind: 'finger' },
      { say: 'guard', overheard: true, emo: 'polite', text: 'ここには、猫はいません。' },
      { say: 'eric', emo: 'quiet', text: 'All right. I’ll leave you to it.' },
      { go: 'chat_guard_leave' },
    ],
    chat_guard_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
