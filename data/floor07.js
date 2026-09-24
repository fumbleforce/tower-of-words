(window.FLOORS = window.FLOORS || []).push({
  id: 7,
  name: "Floor 7 — The Night Forest",
  jp: "夜の森",
  weeks: "Week 7",
  goal: "Give reasons and link ideas: because, so, but, when, before and after. This is how you turn single sentences into real speech.",
  intro: "Floor 7 is a forest where the sun never fully rises. A howl echoes between the trees. You meet a quiet man who says he taught history before this world swallowed him. He has been mapping the old ruins here. He knows why the wolves only hunt at night, and he wants to tell you.",
  outro: "The wolf falls. Behind you, the teacher lowers his lantern, nods, and adds a line to his notes on the ruins.",
  side: "In your phone's notes app, write 3 sentences about your real day: one with 〜から (because), one with 〜けど (but), and one with 〜前に (before). Romaji is fine. Then read them out loud once. Example: 電車に乗る前に、コーヒーを飲んだ。",
  talk: "Let's do 10 minutes of Japanese conversation practice. I'm around JLPT N5, moving toward N4. I know polite and casual forms, the て-form and 〜ている, and I'm now practicing linking sentences: 〜から, 〜ので, 〜けど / 〜が, 〜とき, 〜前に and 〜後で. Ask me simple casual questions about my daily life (commute, work, weekend), and push me to answer with a reason or a contrast, e.g. 'why?' questions. Write hiragana readings in brackets after kanji. Correct my mistakes briefly in English, and show me a more natural version when my sentence is stiff.",
  vocab: [
    { id: "v07_01", ja: "思う", kana: "おもう", rm: "omou", en: "to think" },
    { id: "v07_03", ja: "会社", kana: "かいしゃ", rm: "kaisha", en: "company / office" },
    { id: "v07_04", ja: "先生", kana: "せんせい", rm: "sensei", en: "teacher" },
    { id: "v07_05", ja: "学生", kana: "がくせい", rm: "gakusei", en: "student" },
    { id: "v07_06", ja: "時間", kana: "じかん", rm: "jikan", en: "time" },
    { id: "v07_07", ja: "先に", kana: "さきに", rm: "saki ni", en: "ahead / first" },
    { id: "v07_08", ja: "雨", kana: "あめ", rm: "ame", en: "rain" },
    { id: "v07_09", ja: "降る", kana: "ふる", rm: "furu", en: "to fall (rain)" },
    { id: "v07_10", ja: "危ない", kana: "あぶない", rm: "abunai", en: "dangerous", note: "Also shouted as 'Look out!'" },
    { id: "v07_11", ja: "疲れる", kana: "つかれる", rm: "tsukareru", en: "to get tired", note: "疲れた = I'm tired." },
    { id: "v07_12", ja: "歴史", kana: "れきし", rm: "rekishi", en: "history" },
    { id: "v07_13", ja: "怖い", kana: "こわい", rm: "kowai", en: "scary / afraid" },
    { id: "v07_15", ja: "暗い", kana: "くらい", rm: "kurai", en: "dark" },
    { id: "v07_18", ja: "後で", kana: "あとで", rm: "ato de", en: "later / after" },
    { id: "v07_19", ja: "宿屋", kana: "やどや", rm: "yadoya", en: "inn" },
    { id: "v07_20", ja: "装備", kana: "そうび", rm: "soubi", en: "equipment / gear" },
    { id: "v07_21", ja: "準備", kana: "じゅんび", rm: "junbi", en: "preparation" },
    { id: "v07_22", ja: "呼ぶ", kana: "よぶ", rm: "yobu", en: "to call" },
    { id: "v07_23", ja: "家", kana: "いえ", rm: "ie", en: "house / home" },
    { id: "v07_24", ja: "学校", kana: "がっこう", rm: "gakkou", en: "school" },
    { id: "v07_25", ja: "森", kana: "もり", rm: "mori", en: "forest" },
    { id: "v07_26", ja: "でも", kana: "でも", rm: "demo", en: "but (sentence start)" }
  ],
  kanji: [
    { id: "k07_01", c: "思", on: "シ", kun: "おも(う)", en: "think", ex: "思う (おもう) to think" },
    { id: "k07_02", c: "分", on: "ブン / フン", kun: "わ(かる)", en: "part / minute / understand", ex: "分かる (わかる) to understand" },
    { id: "k07_03", c: "会", on: "カイ", kun: "あ(う)", en: "meet", ex: "会社 (かいしゃ) company" },
    { id: "k07_04", c: "社", on: "シャ", kun: "やしろ", en: "company / shrine", ex: "会社 (かいしゃ) company" },
    { id: "k07_05", c: "生", on: "セイ / ショウ", kun: "い(きる)", en: "life / birth", ex: "学生 (がくせい) student" },
    { id: "k07_06", c: "先", on: "セン", kun: "さき", en: "ahead / previous", ex: "先生 (せんせい) teacher" },
    { id: "k07_07", c: "学", on: "ガク", kun: "まな(ぶ)", en: "study", ex: "学校 (がっこう) school" },
    { id: "k07_08", c: "間", on: "カン", kun: "あいだ / ま", en: "interval / between", ex: "時間 (じかん) time" }
  ],
  grammar: [
    {
      id: "g07_1",
      title: "〜から (because / so)",
      pattern: "Reason + から、result",
      explain: "から goes after the reason, and the result comes second, which is the reverse of English 'because'. It attaches to plain or polite forms. A very common pattern is 〜ているから: 'because X is happening right now'. With nouns and な-adjectives, add だ: 雨だから.",
      examples: [
        { ja: "雨が降っているから、家にいたい。", kana: "あめが ふって いるから、いえに いたい。", en: "It's raining, so I want to stay home.", chunks: ["雨が", "降っているから、", "家に", "いたい。"] },
        { ja: "暗いから、気をつけて。", kana: "くらいから、きを つけて。", en: "It's dark, so be careful.", chunks: ["暗いから、", "気を", "つけて。"] },
        { ja: "モンスターが寝ているから、静かにして。", kana: "モンスターが ねて いるから、しずかに して。", en: "The monster is sleeping, so be quiet.", chunks: ["モンスターが", "寝ているから、", "静かに", "して。"] },
        { ja: "疲れたから、宿屋で休む。", kana: "つかれたから、やどやで やすむ。", en: "I'm tired, so I'll rest at the inn.", chunks: ["疲れたから、", "宿屋で", "休む。"] },
        { ja: "リンが待っているから、先に行くね。", kana: "リンが まって いるから、さきに いくね。", en: "Rin is waiting, so I'll go ahead.", chunks: ["リンが", "待っているから、", "先に", "行くね。"] },
        { ja: "夜だから、森に入らない。", kana: "よるだから、もりに はいらない。", en: "It's night, so I won't enter the forest.", chunks: ["夜だから、", "森に", "入らない。"] }
      ]
    },
    {
      id: "g07_2",
      title: "〜ので (since / so, softer)",
      pattern: "Reason + ので、result",
      explain: "ので means the same as から but sounds softer and more objective, so it's common in polite speech and excuses. With nouns and な-adjectives, use な before ので: 雨なので.",
      examples: [
        { ja: "時間がないので、先に行きます。", kana: "じかんが ないので、さきに いきます。", en: "There's no time, so I'll go ahead.", chunks: ["時間が", "ないので、", "先に", "行きます。"] },
        { ja: "雨なので、今日は行きません。", kana: "あめなので、きょうは いきません。", en: "Since it's raining, I won't go today.", chunks: ["雨なので、", "今日は", "行きません。"] },
        { ja: "危ないので、ここで待っていてください。", kana: "あぶないので、ここで まって いて ください。", en: "It's dangerous, so please wait here.", chunks: ["危ないので、", "ここで", "待っていて", "ください。"] },
        { ja: "歴史が好きなので、古い町に行きます。", kana: "れきしが すきなので、ふるい まちに いきます。", en: "I like history, so I'm going to the old town.", chunks: ["歴史が", "好きなので、", "古い町に", "行きます。"] }
      ]
    },
    {
      id: "g07_3",
      title: "〜けど / 〜が (but)",
      pattern: "A + けど、B",
      explain: "けど joins two clauses with 'but'. が does the same in polite speech. Anime characters often end a sentence on けど and leave the rest unsaid, as in 行きたいけど… (I want to go, but…).",
      examples: [
        { ja: "ちょっと怖いけど、行く。", kana: "ちょっと こわいけど、いく。", en: "I'm a little scared, but I'll go.", chunks: ["ちょっと", "怖いけど、", "行く。"] },
        { ja: "剣は古いけど、まだ強い。", kana: "けんは ふるいけど、まだ つよい。", en: "The sword is old, but still strong.", chunks: ["剣は", "古いけど、", "まだ", "強い。"] },
        { ja: "装備はありますが、時間がありません。", kana: "そうびは ありますが、じかんが ありません。", en: "We have the gear, but no time.", chunks: ["装備は", "ありますが、", "時間が", "ありません。"] },
        { ja: "リンに会いたいけど、時間がない。", kana: "リンに あいたいけど、じかんが ない。", en: "I want to see Rin, but I don't have time.", chunks: ["リンに", "会いたいけど、", "時間が", "ない。"] },
        { ja: "でも、あいつは仲間だと思う。", kana: "でも、あいつは なかまだと おもう。", en: "But I think he's one of us.", chunks: ["でも、", "あいつは", "仲間だと", "思う。"] }
      ]
    },
    {
      id: "g07_4",
      title: "〜とき / 〜前に / 〜後で",
      pattern: "Plain verb + 前に / Verb た + 後で / 〜とき",
      explain: "〜前に means 'before doing' and always takes the dictionary form: 寝る前に. 〜後で means 'after doing' and always takes the た-form: 倒した後で. 〜とき means 'when': 学生のとき (when I was a student), 怖いとき (when you're scared).",
      examples: [
        { ja: "寝る前に、装備を準備する。", kana: "ねる まえに、そうびを じゅんび する。", en: "Before sleeping, I prepare my gear.", chunks: ["寝る前に、", "装備を", "準備する。"] },
        { ja: "ボスを倒した後で、宿屋に帰った。", kana: "ボスを たおした あとで、やどやに かえった。", en: "After defeating the boss, I went back to the inn.", chunks: ["ボスを", "倒した後で、", "宿屋に", "帰った。"] },
        { ja: "学生のとき、このゲームを始めた。", kana: "がくせいの とき、この ゲームを はじめた。", en: "I started this game when I was a student.", chunks: ["学生のとき、", "この", "ゲームを", "始めた。"] },
        { ja: "怖いときは、私を呼んで。", kana: "こわい ときは、わたしを よんで。", en: "When you're scared, call me.", chunks: ["怖いときは、", "私を", "呼んで。"] },
        { ja: "朝ご飯の後で、会いましょう。", kana: "あさごはんの あとで、あいましょう。", en: "Let's meet after breakfast.", chunks: ["朝ご飯の", "後で、", "会いましょう。"] }
      ]
    }
  ],
  boss: {
    name: "The Night Wolf",
    jp: "夜の狼",
    scene: "Deep in the forest, you meet a man holding a lantern. Something howls nearby.",
    lines: [
      { sp: "リン", ja: "暗いから、気をつけて。", kana: "くらいから、きを つけて。", en: "It's dark, so be careful." },
      { sp: "リン", ja: "夜の森は危ないけど、時間がない。", kana: "よるの もりは あぶないけど、じかんが ない。", en: "The forest at night is dangerous, but we're out of time." },
      { sp: "男", ja: "この世界に来る前は、歴史の先生だった。", kana: "この せかいに くる まえは、れきしの せんせいだった。", en: "Before I came to this world, I was a history teacher." },
      { sp: "男", ja: "狼が来るから、早く逃げて。", kana: "おおかみが くるから、はやく にげて。", en: "The wolf is coming, so run, quickly." },
      { sp: "きみ", ja: "どうして？", kana: "どうして？", en: "Why?" },
      { sp: "男", ja: "あの狼はとても強いので、今は戦わないで。", kana: "あの おおかみは とても つよいので、いまは たたかわないで。", en: "That wolf is very strong, so don't fight it now." },
      { sp: "リン", ja: "でも、私たちは先に行きたい。", kana: "でも、わたしたちは さきに いきたい。", en: "But we want to go on ahead." },
      { sp: "男", ja: "…分かった。狼を倒した後で、また会いましょう。", kana: "…わかった。おおかみを たおした あとで、また あいましょう。", en: "…Understood. Let's meet again after you defeat the wolf." }
    ],
    questions: [
      { q: "Why does Rin tell you to be careful?", choices: ["Because it's dark", "Because Jin is near", "Because it's raining", "Because she's tired"], a: 0 },
      { q: "What was the man before he came to this world?", choices: ["A student", "A company worker", "A history teacher", "A game master"], a: 2 },
      { q: "Why does the man say not to fight now?", choices: ["It's morning", "The wolf is very strong", "You have no sword", "He wants to fight alone"], a: 1 },
      { q: "When will they meet again?", choices: ["Tomorrow morning", "Before the fight", "After you defeat the wolf", "At the inn tonight"], a: 2 }
    ]
  }
});
