// How a person takes the way Eric spoke to them (issue #369): one short reaction after their answer to a Say word,
// when the word was too casual, too stiff or just right for them (the register each expects: js/bonds/cast.js).
// When a reaction plays and in which order: js/bonds/register-react.js. Nodes are register_<who>_<kind>_<n>, played
// in order, each once; kinds are casual (too casual with them), stiff (too stiff) and right. Lines by the voice agents.
export default {
  on: {},
  nodes: {
    // Mio expects casual Japanese (and doesn't much care)
    register_mio_stiff_1: [
      { say: 'mio', emo: 'dry', face: 'deadpan', text: 'You sound like someone from upstairs when you talk like that. I get enough of that in the lift, so... with me just talk normal, okay?' },
    ],
    register_mio_stiff_2: [
      { say: 'mio', emo: 'teasing', face: 'smile', text: "You still do the polite thing with me, huh. Okay, whatever, it's kind of your thing now. Just don't bow at me also, okay?" },
    ],
    register_mio_right_1: [
      { do: 'bow', who: 'mio', depth: 'small' },
      { say: 'mio', emo: 'dry', text: "Mm, okay, that's how people actually say it. Not bad." },
    ],
    register_mio_right_2: [{ say: 'mio', emo: 'low', text: 'Mm. ...Oh, you said it normal that time. Okay.' }],

    // Kenji expects casual Japanese: Eric is his senpai
    register_kenji_stiff_1: [
      { say: 'kenji', face: 'sheepish', emo: 'flustered', overheard: true, text: 'えっ、僕に、ですか？…あ、{sumimasen}！' },
      { do: 'bow', who: 'kenji', depth: 'deep' },
      { say: 'kenji', face: 'sheepish', emo: 'sheepish', text: 'For me? So polite... thank you.' },
    ],
    register_kenji_stiff_2: [
      { say: 'kenji', face: 'grin', emo: 'teasing', overheard: true, text: 'また…。じゃあ僕、やっぱり先輩ですか？' },
      { say: 'kenji', face: 'sheepish', emo: 'laugh', text: 'Me, boss? ...Joke, joke.' },
      { do: 'bow', who: 'kenji' },
    ],
    register_kenji_stiff_3: [
      { say: 'kenji', face: 'grin', emo: 'amused', overheard: true, text: 'はい、はい。{mc.name_jp}さんは、いつもこれですね。' },
      { say: 'kenji', face: 'grin', emo: 'curious', text: 'Polite... Norway style?' },
      { do: 'bow', who: 'kenji', depth: 'small' },
    ],
    register_kenji_right_1: [
      { say: 'kenji', face: 'grin', emo: 'bright', overheard: true, text: 'はい、はい！…なんか今の、チームっぽいです。', clear: [{ ja: 'チーム', ro: 'chīmu', en: 'team' }] },
      { do: 'emote', who: 'kenji', kind: '♪' },
    ],
    register_kenji_right_2: [
      { say: 'kenji', face: 'grin', emo: 'bright', overheard: true, text: 'はい、すぐ！' },
      { say: 'kenji', face: 'grin', emo: 'laugh', text: 'Mio-san also... like this.' },
      { do: 'bow', who: 'kenji', depth: 'small' },
    ],

    // Kuro expects polite Japanese, and warms when she gets it
    register_kuro_right_1: [
      { say: 'kuro', emo: 'warm', overheard: true, text: 'ちゃんと言ってくれるんですね。' },
      { do: 'emote', who: 'kuro', kind: '♪' },
    ],
    register_kuro_right_2: [
      { say: 'kuro', emo: 'teasing', overheard: true, text: 'ノルウェーでも、そんなに丁寧なんですか。それとも、{koko}でだけ？', clear: [{ ja: 'ノルウェー', ro: 'noruwē', en: 'Norway' }] },
      { do: 'gesture', who: 'kuro', kind: 'point', to: 'eric' },
    ],
    register_kuro_right_3: [
      { say: 'kuro', emo: 'teasing', overheard: true, text: '発音、きれいになりましたね。誰に習ったんですか。……{watashi}以外に。' },
      '> Her fingers rest on your sleeve for a moment.',
    ],
    register_kuro_casual_1: [
      '> She finishes writing before she looks up.',
      { say: 'kuro', emo: 'polite', overheard: true, text: '頼むときは、{sumimasen}から、ですよ。' },
    ],
    register_kuro_casual_2: [
      { say: 'kuro', emo: 'polite', overheard: true, text: '{matte}ください。' },
      '> She holds up one finger and finishes writing.',
      { say: 'kuro', emo: 'amused', overheard: true, text: 'ね？「ください」があると、待てるでしょう。' },
    ],

    // Rei expects polite Japanese, and scolds sloppiness
    register_rei_casual_1: [
      { say: 'rei', emo: 'stern', face: 'neutral', overheard: true, text: '{sumimasen}けど、その言い方は失礼ですよ。' },
      { say: 'rei', emo: 'curt', face: 'neutral', text: 'You can talk like that to your own juniors if you want. I’m not one of them, so be polite with me.' },
    ],
    register_rei_casual_2: [
      { say: 'rei', emo: 'curt', face: 'neutral', text: 'You’re doing it again. I give you the orders, not the other way round.' },
      { do: 'gesture', who: 'rei', kind: 'point', to: 'eric' },
    ],
    register_rei_casual_3: [
      { say: 'rei', emo: 'stern', face: 'neutral', overheard: true, text: '{mouichido}。ちゃんと言いなさい。' },
      { do: 'gesture', who: 'rei', kind: 'point', to: 'eric' },
    ],
    register_rei_right_1: [
      { do: 'bow', who: 'rei', depth: 'small' },
      { say: 'rei', emo: 'dry', face: 'neutral', text: 'You say that one properly, at least.' },
    ],
    register_rei_right_2: [
      { say: 'rei', emo: 'amused', face: 'neutral', text: 'There, we’ve both been polite. Now, what do you want?' },
    ],
  },
};

// authored answers to a Say word that already react to the register: they use up that day's reaction
export const HANDLED = ['ohayo_mio'];

// what the People panel remembers the first time each kind of reaction plays (sim.js remember)
export const NOTES = {
  mio: {
    stiff: 'You were polite with her. She would rather you just talked normally.',
    right: 'You spoke to her in plain Japanese, the way she talks herself.',
  },
  kenji: {
    stiff: 'You spoke to him very politely. From his senpai, that threw him.',
    right: 'You spoke to him in plain Japanese, the way a senpai would. He liked that.',
  },
  kuro: {
    right: 'You keep speaking polite Japanese to her, and she has noticed.',
    casual: 'You gave her a plain command at the counter. She made you wait.',
  },
  rei: {
    casual: 'You spoke to her too casually, and she told you off.',
    right: 'You were polite with her. She noticed, though she said little.',
  },
};
