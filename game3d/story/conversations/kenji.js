// A recurring everyday topic also supplies a missed introduction to ikitai.
export default {
  on: { 'ask:kenji': 'conversation_kenji' },
  nodes: {
    conversation_kenji: [
      { if: "place == 'office' && period_morning", then: [
        { say: 'kenji', emo: 'apologetic', overheard: true, text: '{sumimasen}、今、仕事中で…あとでいいですか？' },
        { do: 'bow', who: 'kenji', depth: 'small' },
        { end: true },
      ] },
      { do: 'cam', on: 'kenji', zoom: 1.35 },
      { choice: [
        { text: 'Where do you go after work?', go: 'conversation_kenji_arcade', if: '!kenji_arcade_talked' },
        { text: 'Ask about the crane game.', go: 'conversation_kenji_crane', needs: ['kenji.arcade'] },
        { text: 'How do you say “I want to go”?', go: 'conversation_kenji_go_word', if: 'kenji_arcade_talked && !know_ikitai' },
        { text: 'Let him get back to what he was doing.', go: 'conversation_kenji_leave' },
      ] },
    ],
    conversation_kenji_arcade: [
      { say: 'eric', emo: 'curious', text: 'Where do you go after work?' },
      { say: 'kenji', emo: 'bright', overheard: true, text: 'ゲームセンターです。', clear: [{ ja: 'ゲームセンター', ro: 'gēmu sentā', en: 'game centre' }] },
      { say: 'kenji', emo: 'sheepish', text: 'Crane game... money, gone.' },
      { say: 'eric', emo: 'curious', text: 'Is that near the shops?' },
      { say: 'kenji', emo: 'bright', text: 'Yes! Shopping street. {ikitai}? Is “want go”.' },
      { set: 'kenji_arcade_talked' },
      { go: 'conversation_kenji' },
    ],
    conversation_kenji_crane: [
      { say: 'eric', emo: 'curious', text: 'Do you ever win anything on that crane game?' },
      { say: 'kenji', emo: 'sheepish', text: 'Small one, sometimes. Big one? Never!' },
      { do: 'cam', back: true },
    ],
    conversation_kenji_go_word: [
      { say: 'kenji', emo: 'slow', slow: true, text: '{ikitai}.' },
      { do: 'type', word: 'ikitai', from: 'kenji', prompt: 'Try “I want to go”.' },
      { say: 'kenji', emo: 'bright', text: 'Yes! Game centre is on shopping street.' },
      { do: 'cam', back: true },
    ],
    conversation_kenji_leave: [{ do: 'cam', back: true }],
  },
};
