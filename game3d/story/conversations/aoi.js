// d4_tennis_done follows both Aoi's rally and her turn after Rei's demonstration.
// d4_played_aoi alone is only an earlier choice flag and cannot establish completed play.
const menu = (understood = false) => [
  { if: '!d3_aoi_intro', then: [{ end: true }] },
  { do: 'face', who: 'eric', to: 'aoi' }, { do: 'face', who: 'aoi', to: 'eric' }, { do: 'cam', on: 'aoi', zoom: 1.3, conversation: 'aoi' },
  { choice: [
    { text: 'How are you finding the job?', go: 'chat_aoi_questions', if: '!chat_aoi_questions_asked' },
    { text: 'Ask how she gets on with questions at work.', go: 'chat_aoi_questions_again', if: 'chat_aoi_questions_asked' },
    { text: 'Ask about tennis.', go: 'chat_aoi_tennis' },
    ...(understood ? [{ text: '{ikitai}… You want to go?', go: 'chat_aoi_tennis_question', if: 'know_ikitai && !chat_aoi_tennis_understood' }] : []),
    { text: 'I’ll let you get on.', go: 'chat_aoi_leave' },
  ] },
];
export default {
  on: { 'ask:aoi': 'chat_aoi', 'ask:aoi-tennis': 'chat_aoi_understood' },
  nodes: {
    chat_aoi: menu(), chat_aoi_understood: menu(true),
    chat_aoi_questions: [
      { say: 'eric', emo: 'curious', text: 'How are you finding the job?' },
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'sheepish', text: '同じことを二回聞いちゃいました。さっき聞いたのに、分からなくなって。' },
      { set: 'chat_aoi_questions_asked' },
      { choice: [
        { text: '{daijoubu}… Was it okay?', go: 'chat_aoi_ok', if: 'know_daijoubu' },
        { text: 'Let her get back to her break.', go: 'chat_aoi_leave' },
      ] },
    ],
    chat_aoi_ok: [
      { say: 'eric', emo: 'curious', text: '{daijoubu}？' },
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: '{daijoubu}でした。すぐに教えてくれました。' },
      { go: 'chat_aoi_leave' },
    ],
    chat_aoi_questions_again: [
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'casual', text: '今度は、分からなくなったところだけ聞いてみます。' },
      { go: 'chat_aoi_leave' },
    ],
    chat_aoi_tennis: [
      { if: 'chat_aoi_tennis_understood', then: [
        { go: 'chat_aoi_tennis_repeat' },
      ], else: [
        { say: 'eric', emo: 'curious', text: 'What about tennis?' },
        { if: 'd4_tennis_done', then: [
          { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'またテニスに{ikitai}です。今度は、もう少し長く打ちたくて。', clear: ['テニス'] },
        ], else: [
          { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'テニス、私も{ikitai}です。今度は、私も打ってみたくて。', clear: ['テニス'] },
        ] },
        { if: 'know_ikitai', then: [{ choice: [
          { text: '{ikitai}… You want to go?', go: 'chat_aoi_tennis_question' },
          { text: 'I’ll see you around.', go: 'chat_aoi_leave' },
        ] }], else: [{ go: 'chat_aoi_leave' }] },
      ] },
    ],
    chat_aoi_tennis_question: [
      { say: 'eric', emo: 'curious', text: '{ikitai}？' },
      { if: 'd4_tennis_done', then: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'はい。自分で打つと、全然違うんですね。' },
      ], else: [
        { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'はい。見てると、簡単そうなんですけどね。' },
      ] },
      { set: 'chat_aoi_tennis_understood' }, { go: 'chat_aoi_company' },
    ],
    chat_aoi_tennis_repeat: [
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: 'クラブで会ったら、{isshoni}やりませんか。' },
      { go: 'chat_aoi_company' },
    ],
    chat_aoi_company: [{ choice: [
      { text: '{isshoni}… Together?', go: 'chat_aoi_together', if: 'know_isshoni && !chat_aoi_company_asked' },
      { text: 'Ask about seeing her at tennis.', go: 'chat_aoi_together', if: 'know_isshoni && chat_aoi_company_asked' },
      { text: 'Leave her to her break.', go: 'chat_aoi_leave' },
    ] }],
    chat_aoi_together: [
      { say: 'eric', emo: 'hesitant', text: '{isshoni}？' },
      { say: 'aoi', name: 'Aoi', overheard: true, emo: 'warm', text: '{isshoni}。クラブで会ったら、声かけてください。' },
      { set: 'chat_aoi_company_asked' }, { go: 'chat_aoi_leave' },
    ],
    chat_aoi_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
