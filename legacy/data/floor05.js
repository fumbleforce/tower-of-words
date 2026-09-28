(window.FLOORS = window.FLOORS || []).push({
  id: 5,
  name: "Floor 5 — The Castle Gate",
  jp: "城の門",
  weeks: "Week 5",
  goal: "Ask people to do things, describe what's happening right now, and ask for permission with the て-form.",
  intro: "An old castle stands over the stairs to the next floor, its gate shut for centuries. The floor's records say a stone guardian still keeps it. リン unrolls a faded map and starts planning. Up here, a plan only works if everyone understands the instructions, so you'll need to give them and follow them.",
  outro: "The stone guardian goes still, and the gate grinds open. ジン walks through first, as if the plan had been his.",
  side: "Put on SAO episode 1 (with Japanese subtitles if your service has them, otherwise none) and watch the first 5 minutes. Pause every time you hear or see a word ending in 〜て, 〜てください or 〜ています, and write it down. Goal: catch 2.",
  talk: "Let's do 10 minutes of Japanese conversation practice. I'm an early-intermediate learner (about JLPT N5). I know polite です/ます verbs, い/な adjectives, 〜たい and 〜ましょう, and I'm now learning the て-form: 〜てください, 〜ています, 〜てもいいですか, 〜てはいけません, and linking actions with 〜て. Play the quartermaster of a fantasy castle who is briefing me before a mission; keep the tone calm and practical. Speak mostly in simple polite Japanese and write hiragana readings in brackets after any kanji. Ask me short questions that make me use the て-form. After each of my replies, gently correct any mistakes in one line of English, then continue in Japanese.",
  vocab: [
    { id: "v05_01", ja: "待つ", kana: "まつ", rm: "matsu", en: "to wait" },
    { id: "v05_02", ja: "使う", kana: "つかう", rm: "tsukau", en: "to use" },
    { id: "v05_03", ja: "知る", kana: "しる", rm: "shiru", en: "to know", note: "Usually 知っています = I know." },
    { id: "v05_04", ja: "持つ", kana: "もつ", rm: "motsu", en: "to hold / carry" },
    { id: "v05_05", ja: "言う", kana: "いう", rm: "iu", en: "to say" },
    { id: "v05_06", ja: "話す", kana: "はなす", rm: "hanasu", en: "to talk" },
    { id: "v05_07", ja: "剣", kana: "けん", rm: "ken", en: "sword" },
    { id: "v05_08", ja: "手", kana: "て", rm: "te", en: "hand" },
    { id: "v05_09", ja: "開ける", kana: "あける", rm: "akeru", en: "to open" },
    { id: "v05_10", ja: "兵士", kana: "へいし", rm: "heishi", en: "soldier" },
    { id: "v05_11", ja: "入る", kana: "はいる", rm: "hairu", en: "to enter" },
    { id: "v05_12", ja: "逃げる", kana: "にげる", rm: "nigeru", en: "to run away" },
    { id: "v05_13", ja: "戦う", kana: "たたかう", rm: "tatakau", en: "to fight" },
    { id: "v05_14", ja: "助ける", kana: "たすける", rm: "tasukeru", en: "to help / save" },
    { id: "v05_15", ja: "倒す", kana: "たおす", rm: "taosu", en: "to defeat" },
    { id: "v05_16", ja: "攻撃する", kana: "こうげきする", rm: "kougeki suru", en: "to attack" },
    { id: "v05_20", ja: "扉", kana: "とびら", rm: "tobira", en: "door / gate" },
    { id: "v05_21", ja: "地図", kana: "ちず", rm: "chizu", en: "map" },
    { id: "v05_22", ja: "鍵", kana: "かぎ", rm: "kagi", en: "key" },
    { id: "v05_23", ja: "一人で", kana: "ひとりで", rm: "hitori de", en: "alone" },
    { id: "v05_24", ja: "気をつける", kana: "きをつける", rm: "ki o tsukeru", en: "to be careful" },
    { id: "v05_25", ja: "ちょっと", kana: "ちょっと", rm: "chotto", en: "a little / a moment" },
    { id: "v05_26", ja: "まだ", kana: "まだ", rm: "mada", en: "still / not yet" }
  ],
  kanji: [
    { id: "k05_01", c: "待", on: "タイ", kun: "ま(つ)", en: "wait", ex: "待つ (まつ) to wait" },
    { id: "k05_02", c: "使", on: "シ", kun: "つか(う)", en: "use", ex: "使う (つかう) to use" },
    { id: "k05_03", c: "知", on: "チ", kun: "し(る)", en: "know", ex: "知る (しる) to know" },
    { id: "k05_04", c: "持", on: "ジ", kun: "も(つ)", en: "hold", ex: "持つ (もつ) to hold" },
    { id: "k05_05", c: "手", on: "シュ", kun: "て", en: "hand", ex: "手 (て) hand" },
    { id: "k05_06", c: "言", on: "ゲン", kun: "い(う)", en: "say", ex: "言う (いう) to say" },
    { id: "k05_07", c: "話", on: "ワ", kun: "はな(す)", en: "talk", ex: "話す (はなす) to talk" },
    { id: "k05_08", c: "剣", on: "ケン", kun: "つるぎ", en: "sword", ex: "剣 (けん) sword" }
  ],
  grammar: [
    {
      id: "g05_1",
      title: "〜てください",
      pattern: "Verb て-form + ください",
      explain: "Please do X. To make the て-form: う/つ/る verbs become って (待つ → 待って), む/ぶ/ぬ become んで (休む → 休んで), く becomes いて, ぐ becomes いで, す becomes して. Verbs ending in -eru/-iru just swap る for て (寝る → 寝て). Exceptions: 行く → 行って, する → して, 来る → 来て.",
      examples: [
        { ja: "ちょっと待ってください。", kana: "ちょっと まって ください。", en: "Please wait a moment.", chunks: ["ちょっと", "待って", "ください。"] },
        { ja: "この剣を持ってください。", kana: "この けんを もって ください。", en: "Please hold this sword.", chunks: ["この", "剣を", "持って", "ください。"] },
        { ja: "城の前で待ってください。", kana: "しろの まえで まって ください。", en: "Please wait in front of the castle.", chunks: ["城の前で", "待って", "ください。"] },
        { ja: "地図を見てください。", kana: "ちずを みて ください。", en: "Please look at the map.", chunks: ["地図を", "見て", "ください。"] },
        { ja: "森では気をつけてください。", kana: "もりでは きを つけて ください。", en: "Please be careful in the forest.", chunks: ["森では", "気を", "つけて", "ください。"] }
      ]
    },
    {
      id: "g05_2",
      title: "〜ています",
      pattern: "Verb て-form + います",
      explain: "Something is happening right now (I am eating), or is an ongoing state (I know, I live in, it is open). Anime uses this form constantly. 知っています means 'I know' (a state), and 雨が降っています means 'it is raining'.",
      examples: [
        { ja: "リンは剣を使っています。", kana: "リンは けんを つかって います。", en: "Rin is using a sword.", chunks: ["リンは", "剣を", "使って", "います。"] },
        { ja: "外で雨が降っています。", kana: "そとで あめが ふって います。", en: "It's raining outside.", chunks: ["外で", "雨が", "降って", "います。"] },
        { ja: "私はその名前を知っています。", kana: "わたしは その なまえを しって います。", en: "I know that name.", chunks: ["私は", "その", "名前を", "知って", "います。"] },
        { ja: "兵士が城の前で待っています。", kana: "へいしが しろの まえで まって います。", en: "Soldiers are waiting in front of the castle.", chunks: ["兵士が", "城の前で", "待って", "います。"] },
        { ja: "ジンはまだ寝ています。", kana: "ジンは まだ ねて います。", en: "Jin is still sleeping.", chunks: ["ジンは", "まだ", "寝て", "います。"] }
      ]
    },
    {
      id: "g05_3",
      title: "〜てもいいです / 〜てはいけません",
      pattern: "Verb て-form + もいいですか / はいけません",
      explain: "〜てもいいですか asks 'May I…?' (literally 'even if I do X, is it good?'). 〜てはいけません means 'you must not'. In fast speech 〜ては is often shortened to 〜ちゃ, as in 入っちゃだめ.",
      examples: [
        { ja: "ここで休んでもいいですか。", kana: "ここで やすんでも いいですか。", en: "May I rest here?", chunks: ["ここで", "休んでも", "いいですか。"] },
        { ja: "この剣を使ってもいいですよ。", kana: "この けんを つかっても いいですよ。", en: "You can use this sword.", chunks: ["この", "剣を", "使っても", "いいですよ。"] },
        { ja: "その扉を開けてはいけません。", kana: "その とびらを あけては いけません。", en: "You must not open that door.", chunks: ["その", "扉を", "開けては", "いけません。"] },
        { ja: "一人で戦ってはいけません。", kana: "ひとりで たたかっては いけません。", en: "You must not fight alone.", chunks: ["一人で", "戦っては", "いけません。"] },
        { ja: "地図を持って行ってもいいですか。", kana: "ちずを もって いっても いいですか。", en: "Can I take the map with me?", chunks: ["地図を", "持って", "行っても", "いいですか。"] }
      ]
    },
    {
      id: "g05_4",
      title: "〜て、〜 (and then)",
      pattern: "Verb て-form, next verb",
      explain: "The て-form links actions in order: 'I did A, and then B'. Only the last verb shows the tense or politeness, so 開けて、入りました means 'opened and entered'.",
      examples: [
        { ja: "扉を開けて、中に入りました。", kana: "とびらを あけて、なかに はいりました。", en: "I opened the door and went inside.", chunks: ["扉を", "開けて、", "中に", "入りました。"] },
        { ja: "剣を持って、モンスターと戦いました。", kana: "けんを もって、モンスターと たたかいました。", en: "I took my sword and fought the monster.", chunks: ["剣を", "持って、", "モンスターと", "戦いました。"] },
        { ja: "少し休んで、また戦いました。", kana: "すこし やすんで、また たたかいました。", en: "I rested a little, then fought again.", chunks: ["少し", "休んで、", "また", "戦いました。"] },
        { ja: "手を上げて、「待って」と言いました。", kana: "てを あげて、「まって」と いいました。", en: "I raised my hand and said \"Wait.\"", chunks: ["手を", "上げて、", "「待って」と", "言いました。"] }
      ]
    }
  ],
  boss: {
    name: "The Stone Gatekeeper",
    jp: "石の門番",
    scene: "The gate of an old castle on Floor 5. A huge stone figure stands in front of it, not moving.",
    lines: [
      { sp: "リン", ja: "ハンター、ちょっと待ってください。", kana: "ハンター、ちょっと まって ください。", en: "Hunter, wait a moment." },
      { sp: "リン", ja: "門の前に、大きい石の兵士がいます。", kana: "もんの まえに、おおきい いしの へいしが います。", en: "There's a big stone soldier in front of the gate." },
      { sp: "リン", ja: "あの兵士は鍵を持っています。", kana: "あの へいしは かぎを もって います。", en: "That soldier is holding the key." },
      { sp: "ジン", ja: "俺が攻撃します。見ていてください。", kana: "おれが こうげき します。みて いて ください。", en: "I'll attack. Just watch." },
      { sp: "門番", ja: "待ってください。この城に入ってはいけません。", kana: "まって ください。この しろに はいっては いけません。", en: "Stop. You may not enter this castle." },
      { sp: "リン", ja: "ジン、一人で戦ってはいけません。", kana: "ジン、ひとりで たたかっては いけません。", en: "Jin, you mustn't fight alone." },
      { sp: "ジン", ja: "…はい。三人で戦いましょう。", kana: "…はい。さんにんで たたかいましょう。", en: "…Fine. Let's fight, the three of us." },
      { sp: "リン", ja: "ハンター、鍵を使って、門を開けてください。", kana: "ハンター、かぎを つかって、もんを あけて ください。", en: "Hunter, use the key and open the gate." }
    ],
    questions: [
      { q: "What is in front of the gate?", choices: ["A big stone soldier", "A sleeping monster", "Jin", "A locked chest"], a: 0 },
      { q: "What does the stone soldier have?", choices: ["A map", "A key", "A sword", "A shield"], a: 1 },
      { q: "What does Rin tell Jin?", choices: ["Please run away", "You mustn't fight alone", "Please use the key", "Wait at the inn"], a: 1 },
      { q: "What does Rin ask you to do at the end?", choices: ["Fight the gatekeeper alone", "Use the key and open the gate", "Close the gate", "Rest a little"], a: 1 }
    ]
  }
});
