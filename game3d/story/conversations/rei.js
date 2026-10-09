const menu = (understood = false) => [
  { if: '!d4_rei_intro', then: [{ end: true }] },
  { do: 'face', who: 'eric', to: 'rei' }, { do: 'face', who: 'rei', to: 'eric' }, { do: 'cam', on: 'rei', zoom: 1.3, conversation: 'rei' },
  { choice: [
    { text: 'Do you always want another game?', go: 'chat_rei_game', if: '!chat_rei_game_asked' },
    { text: 'Ask about asking for another game.', go: 'chat_rei_game_again', if: 'chat_rei_game_asked' },
    { text: 'Do your customers ever let you go home?', go: 'chat_rei_calls', if: '!chat_rei_calls_asked' },
    { text: 'Are you still getting calls before your train?', go: 'chat_rei_calls_again', if: 'chat_rei_calls_asked' },
    ...(understood ? [{ text: '{mouichido}… You ask for another game?', go: 'chat_rei_game_question', if: 'know_mouichido && !chat_rei_game_understood' }] : []),
    { text: 'What does that request mean?', go: 'chat_rei_repeat_word', if: 'chat_rei_game_asked && !know_mouichido' },
    { text: 'I’ll leave you to it.', go: 'chat_rei_leave' },
  ] },
];
export default {
  on: { 'ask:rei': 'chat_rei', 'ask:rei-again': 'chat_rei_understood' },
  nodes: {
    chat_rei: menu(), chat_rei_understood: menu(true),
    chat_rei_game: [
      { say: 'eric', emo: 'curious', text: 'Do you always want another game?' },
      { say: 'rei', name: 'Rei', overheard: true, emo: 'stern', text: '負けたら、{mouichido}。勝つまでやります。' },
      { set: 'chat_rei_game_asked' }, { go: 'chat_rei_game_reply' },
    ],
    chat_rei_game_again: [
      { if: 'chat_rei_game_understood', then: [{ go: 'chat_rei_preference_repeat' }], else: [
        { say: 'rei', name: 'Rei', overheard: true, emo: 'stern', text: '負けたら、{mouichido}。勝つまでやります。' },
        { go: 'chat_rei_game_reply' },
      ] },
    ],
    chat_rei_game_reply: [{ choice: [
      { text: '{mouichido}… You ask for another game?', go: 'chat_rei_game_question', if: 'know_mouichido' },
      { text: 'What does that request mean?', go: 'chat_rei_repeat_word', if: '!know_mouichido' },
      { text: 'I’ll let you get on.', go: 'chat_rei_leave' },
    ] }],
    chat_rei_repeat_word: [
      { say: 'eric', emo: 'curious', text: 'What does that request mean?' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'Once more. Another game, and another one after that until I win.' },
      { choice: [
        { text: 'Try saying “once more”.', go: 'chat_rei_repeat_try' },
        { text: 'Thanks. I’ll remember that.', go: 'chat_rei_leave' },
      ] },
    ],
    chat_rei_repeat_try: [
      { say: 'rei', name: 'Rei', voice: 'rei-chat-repeat-slow', emo: 'slow', slow: true, text: '{mouichido}。' },
      { do: 'type', word: 'mouichido', from: 'rei', prompt: 'Ask Rei to say it once more: mouichido.' },
      { say: 'rei', name: 'Rei', voice: 'rei-chat-repeat-slow', emo: 'slow', slow: true, text: '{mouichido}。' },
      { go: 'chat_rei_game_question' },
    ],
    chat_rei_game_question: [
      { say: 'eric', emo: 'curious', text: '{mouichido}… You ask for another game?' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'Yes. If I lose that one as well, I tell my partner why it was their fault, and then I go home.' },
      { set: 'chat_rei_game_understood' },
      { choice: [
        { text: 'I’d ask again.', go: 'chat_rei_more' },
        { text: 'One game is enough.', go: 'chat_rei_one' },
      ] },
    ],
    chat_rei_more: [
      { say: 'eric', emo: 'warm', text: 'I’d ask again.' },
      { say: 'rei', name: 'Rei', emo: 'amused', text: 'Then you’ll be asking someone else. Once I’ve lost twice, I’m going home to read.' },
      { set: 'chat_rei_more_games' }, { set: { chat_rei_one_game: false } }, { go: 'chat_rei_leave' },
    ],
    chat_rei_one: [
      { say: 'eric', emo: 'casual', text: 'One game is enough.' },
      { say: 'rei', name: 'Rei', emo: 'curt', text: 'Then don’t partner me. I’ll remember you said that.' },
      { set: 'chat_rei_one_game' }, { set: { chat_rei_more_games: false } }, { go: 'chat_rei_leave' },
    ],
    chat_rei_preference_repeat: [
      { if: 'chat_rei_one_game', then: [
        { say: 'rei', name: 'Rei', emo: 'warm', text: 'You said one game was enough. Has that changed?' },
      ], else: [
        { if: 'chat_rei_more_games', then: [
          { say: 'rei', name: 'Rei', emo: 'amused', text: 'You said you’d ask for another game. Still feel that way?' },
        ], else: [{ say: 'rei', name: 'Rei', emo: 'curious', text: 'Would you ask for another game, or stop there?' }] },
      ] },
      { choice: [
        { text: 'I’d ask again.', go: 'chat_rei_more' },
        { text: 'One game is enough.', go: 'chat_rei_one' },
        { text: 'I’ll decide when we’re actually playing.', go: 'chat_rei_leave' },
      ] },
    ],
    chat_rei_calls: [
      { say: 'eric', emo: 'curious', text: 'Do your customers ever let you go home?' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'They call just as I’m leaving the office. My team can’t handle them yet.' },
      { set: 'chat_rei_calls_asked' },
      { choice: [
        { text: 'Do you answer?', go: 'chat_rei_answer' },
        { text: 'I’d let it ring.', go: 'chat_rei_ring' },
      ] },
    ],
    chat_rei_answer: [
      { say: 'eric', emo: 'curious', text: 'Do you answer?' },
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'Always. If I don’t, they ring someone on my team, and then I have to fix it in the morning.' },
      { go: 'chat_rei_leave' },
    ],
    chat_rei_ring: [
      { say: 'eric', emo: 'casual', text: 'I’d let it ring.' },
      { say: 'rei', name: 'Rei', emo: 'dry', text: 'I tried that once. The next morning I had to undo whatever my team had promised him.' },
      { go: 'chat_rei_leave' },
    ],
    chat_rei_calls_again: [
      { say: 'rei', name: 'Rei', emo: 'casual', text: 'I call them all before I leave now, so they’ve got no reason to call me.' },
      { go: 'chat_rei_leave' },
    ],
    chat_rei_leave: [{ do: 'cam', back: true }, { do: 'save' }],
  },
};
