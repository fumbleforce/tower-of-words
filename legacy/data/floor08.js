(window.FLOORS = window.FLOORS || []).push({
  id: 8,
  name: "Floor 8 — The Town of Masks",
  jp: "仮面の町",
  weeks: "Week 8",
  goal: "Describe people and things with whole sentences (\"the man who betrayed us\"), and turn actions into nouns with の and こと.",
  intro: "Floor 8's town is full of players in hoods, and nobody uses their real name. Rumor says one man knows where the exit to the next floor is. Rumor also says he sold his last alliance's battle plans to a rival faction. To find him, you'll need to describe him: the man who wears black, the man who betrayed his friends.",
  outro: "You found the exit, but you also learned how cheaply trust is sold on this floor.",
  side: "Pick 3 characters from any anime, game or history you know. For each, write one Japanese sentence using a relative clause, like 地図を持っている男 (the man who has the map) or 戦うのが好きな王 (the king who likes fighting). Romaji is okay. Say them out loud.",
  talk: "Let's do 10 minutes of Japanese practice as a guessing game. I'm about JLPT N5 heading to N4, and I'm learning relative clauses (a verb or adjective sentence placed before a noun: 黒い服を着ている人), plus の and こと as nominalizers (戦うのが好き, 出口を探すこと). You think of a famous anime, game or historical figure (e.g. 織田信長, a Total War or Civilization leader), then describe them to me one short Japanese sentence at a time, always using relative clauses, until I guess who it is. Then I describe one for you. Use casual Japanese with hiragana readings after kanji, and correct my sentences briefly in English.",
  vocab: [
    { id: "v08_01", ja: "仲間", kana: "なかま", rm: "nakama", en: "comrade / party member" },
    { id: "v08_02", ja: "友達", kana: "ともだち", rm: "tomodachi", en: "friend" },
    { id: "v08_03", ja: "敵", kana: "てき", rm: "teki", en: "enemy" },
    { id: "v08_04", ja: "戦い", kana: "たたかい", rm: "tatakai", en: "battle" },
    { id: "v08_05", ja: "出口", kana: "でぐち", rm: "deguchi", en: "exit" },
    { id: "v08_06", ja: "入口", kana: "いりぐち", rm: "iriguchi", en: "entrance" },
    { id: "v08_07", ja: "出る", kana: "でる", rm: "deru", en: "to go out / leave" },
    { id: "v08_08", ja: "裏切る", kana: "うらぎる", rm: "uragiru", en: "to betray" },
    { id: "v08_09", ja: "場所", kana: "ばしょ", rm: "basho", en: "place" },
    { id: "v08_10", ja: "約束", kana: "やくそく", rm: "yakusoku", en: "promise" },
    { id: "v08_11", ja: "名前", kana: "なまえ", rm: "namae", en: "name" },
    { id: "v08_12", ja: "同盟", kana: "どうめい", rm: "doumei", en: "alliance" },
    { id: "v08_13", ja: "忘れる", kana: "わすれる", rm: "wasureru", en: "to forget" },
    { id: "v08_15", ja: "見つける", kana: "みつける", rm: "mitsukeru", en: "to find" },
    { id: "v08_16", ja: "着る", kana: "きる", rm: "kiru", en: "to wear (clothes)" },
    { id: "v08_17", ja: "服", kana: "ふく", rm: "fuku", en: "clothes" },
    { id: "v08_18", ja: "黒い", kana: "くろい", rm: "kuroi", en: "black" },
    { id: "v08_19", ja: "秘密", kana: "ひみつ", rm: "himitsu", en: "secret" },
    { id: "v08_20", ja: "大切", kana: "たいせつ", rm: "taisetsu", en: "important / precious" },
    { id: "v08_21", ja: "だけ", kana: "だけ", rm: "dake", en: "only / just" },
    { id: "v08_22", ja: "上手", kana: "じょうず", rm: "jouzu", en: "good at / skilled" },
    { id: "v08_24", ja: "歩く", kana: "あるく", rm: "aruku", en: "to walk" },
    { id: "v08_26", ja: "信じる", kana: "しんじる", rm: "shinjiru", en: "to believe / trust" }
  ],
  kanji: [
    { id: "k08_01", c: "仲", on: "チュウ", kun: "なか", en: "relationship", ex: "仲間 (なかま) comrade" },
    { id: "k08_02", c: "友", on: "ユウ", kun: "とも", en: "friend", ex: "友達 (ともだち) friend" },
    { id: "k08_03", c: "敵", on: "テキ", kun: "かたき", en: "enemy", ex: "敵 (てき) enemy" },
    { id: "k08_04", c: "戦", on: "セン", kun: "たたか(う)", en: "war / fight", ex: "戦う (たたかう) to fight" },
    { id: "k08_05", c: "助", on: "ジョ", kun: "たす(ける)", en: "help", ex: "助ける (たすける) to help" },
    { id: "k08_06", c: "出", on: "シュツ", kun: "で(る) / だ(す)", en: "exit / go out", ex: "出口 (でぐち) exit" },
    { id: "k08_07", c: "入", on: "ニュウ", kun: "はい(る) / い(れる)", en: "enter", ex: "入口 (いりぐち) entrance" },
    { id: "k08_08", c: "口", on: "コウ", kun: "くち", en: "mouth / opening", ex: "出口 (でぐち) exit" }
  ],
  grammar: [
    {
      id: "g08_1",
      title: "Relative clauses: sentence + noun",
      pattern: "[plain-form sentence] + noun",
      explain: "Japanese has no 'who/that/which'. You put a whole plain-form sentence directly in front of the noun it describes: 剣を持っている + 人 = 'the person who is holding a sword'. Read backwards from the noun: 友達にあげたゲーム = the game ← that I gave to a friend. The subject inside the clause usually takes が, not は.",
      examples: [
        { ja: "黒い剣を持っている人は誰？", kana: "くろい けんを もって いる ひとは だれ？", en: "Who is the person holding the black sword?", chunks: ["黒い剣を", "持っている", "人は", "誰？"] },
        { ja: "これは友達にあげたゲームだ。", kana: "これは ともだちに あげた ゲームだ。", en: "This is the game I gave to my friend.", chunks: ["これは", "友達に", "あげた", "ゲームだ。"] },
        { ja: "昨日会った人の名前を忘れた。", kana: "きのう あった ひとの なまえを わすれた。", en: "I forgot the name of the person I met yesterday.", chunks: ["昨日", "会った", "人の", "名前を", "忘れた。"] },
        { ja: "リンが見つけた出口は、あそこだ。", kana: "リンが みつけた でぐちは、あそこだ。", en: "The exit Rin found is over there.", chunks: ["リンが", "見つけた", "出口は、", "あそこだ。"] },
        { ja: "同盟を裏切ったプレイヤーは、まだこの町にいる。", kana: "どうめいを うらぎった プレイヤーは、まだ この まちに いる。", en: "The player who betrayed the alliance is still in this town.", chunks: ["同盟を", "裏切った", "プレイヤーは、", "まだ", "この町にいる。"] },
        { ja: "敵が来ない場所で休みましょう。", kana: "てきが こない ばしょで やすみましょう。", en: "Let's rest somewhere enemies don't come.", chunks: ["敵が", "来ない", "場所で", "休みましょう。"] }
      ]
    },
    {
      id: "g08_2",
      title: "Adjectives and nouns in relative clauses",
      pattern: "い-adj + noun / な-adj + な + noun / noun + の + noun",
      explain: "You already do this with adjectives: 強い剣 (a strong sword). Past and negative forms work too: 強かった剣 (a sword that was strong), 怖くない敵 (an enemy that isn't scary). With な-adjectives, keep the な: 大切な約束 (an important promise). This is the same grammar as a relative clause, just shorter.",
      examples: [
        { ja: "リンは大切な仲間だ。", kana: "リンは たいせつな なかまだ。", en: "Rin is a precious comrade.", chunks: ["リンは", "大切な", "仲間だ。"] },
        { ja: "黒い服を着ている男を探している。", kana: "くろい ふくを きて いる おとこを さがして いる。", en: "I'm looking for a man wearing black clothes.", chunks: ["黒い服を", "着ている", "男を", "探している。"] },
        { ja: "怖くない敵はいない。", kana: "こわくない てきは いない。", en: "There's no enemy that isn't scary.", chunks: ["怖くない", "敵は", "いない。"] },
        { ja: "強かった剣は、もう古い。", kana: "つよかった けんは、もう ふるい。", en: "The sword that used to be strong is old now.", chunks: ["強かった", "剣は、", "もう", "古い。"] }
      ]
    },
    {
      id: "g08_3",
      title: "の / こと: turning actions into things",
      pattern: "Plain verb + の / こと",
      explain: "Add の or こと to a plain verb to make it a noun: 戦う (fight) → 戦うの / 戦うこと (fighting). の is more casual and emotional, used with seeing, hearing and feeling. こと is more abstract, and required in set phrases like 〜ことだ (my job is to…).",
      examples: [
        { ja: "一人で戦うのは怖い。", kana: "ひとりで たたかうのは こわい。", en: "Fighting alone is scary.", chunks: ["一人で", "戦うのは", "怖い。"] },
        { ja: "私の仕事は、出口を探すことだ。", kana: "わたしの しごとは、でぐちを さがす ことだ。", en: "My job is to search for the exit.", chunks: ["私の仕事は、", "出口を", "探すことだ。"] },
        { ja: "約束を守ることは大切だ。", kana: "やくそくを まもる ことは たいせつだ。", en: "Keeping promises is important.", chunks: ["約束を", "守ることは", "大切だ。"] },
        { ja: "ジンが森に入るのを見た。", kana: "ジンが もりに はいるのを みた。", en: "I saw Jin go into the forest.", chunks: ["ジンが", "森に", "入るのを", "見た。"] },
        { ja: "秘密を知っているのは、私だけだ。", kana: "ひみつを しって いるのは、わたしだけだ。", en: "I'm the only one who knows the secret.", chunks: ["秘密を", "知っているのは、", "私だけだ。"] }
      ]
    },
    {
      id: "g08_4",
      title: "〜のが好き / 上手 / 嫌い",
      pattern: "Plain verb + のが + 好き / 上手 / 嫌い",
      explain: "To say you like, are good at, or hate doing something, add のが to the verb: 歩くのが好き (I like walking). The ability or feeling word takes が, not を.",
      examples: [
        { ja: "私は夜の町を歩くのが好きだ。", kana: "わたしは よるの まちを あるくのが すきだ。", en: "I like walking through the town at night.", chunks: ["私は", "夜の町を", "歩くのが", "好きだ。"] },
        { ja: "リンは剣で戦うのが上手だ。", kana: "リンは けんで たたかうのが じょうずだ。", en: "Rin is good at fighting with a sword.", chunks: ["リンは", "剣で", "戦うのが", "上手だ。"] },
        { ja: "ジンは待つのが嫌いだ。", kana: "ジンは まつのが きらいだ。", en: "Jin hates waiting.", chunks: ["ジンは", "待つのが", "嫌いだ。"] },
        { ja: "友達と話すのが好き？", kana: "ともだちと はなすのが すき？", en: "Do you like talking with friends?", chunks: ["友達と", "話すのが", "好き？"] }
      ]
    }
  ],
  boss: {
    name: "The Man in Black",
    jp: "黒い服の男",
    scene: "A back alley in the Town of Masks. A hooded man leans against the wall, waiting for you.",
    lines: [
      { sp: "リン", ja: "出口を知っている人がいる。", kana: "でぐちを しって いる ひとが いる。", en: "There's someone who knows the exit." },
      { sp: "きみ", ja: "それは誰？", kana: "それは だれ？", en: "Who is it?" },
      { sp: "リン", ja: "黒い服を着ている男。昨日、町で会ったの。", kana: "くろい ふくを きて いる おとこ。きのう、まちで あったの。", en: "A man wearing black clothes. I met him in town yesterday." },
      { sp: "黒い服の男", ja: "出口を探しているのは、お前たちか。", kana: "でぐちを さがして いるのは、おまえたちか。", en: "So you're the ones looking for the exit." },
      { sp: "黒い服の男", ja: "出口の場所を知っているのは、俺だけだ。", kana: "でぐちの ばしょを しって いるのは、おれだけだ。", en: "I'm the only one who knows where the exit is." },
      { sp: "ジン", ja: "気をつけて。そいつは、同盟を裏切ったプレイヤーだ。", kana: "きを つけて。そいつは、どうめいを うらぎった プレイヤーだ。", en: "Careful. He's the player who betrayed his alliance." },
      { sp: "リン", ja: "…私が信じた人は、敵だったの？", kana: "…わたしが しんじた ひとは、てきだったの？", en: "…The man I trusted was an enemy?" },
      { sp: "黒い服の男", ja: "人を信じるのは、弱い人だけだ。", kana: "ひとを しんじるのは、よわい ひとだけだ。", en: "Only the weak trust other people." }
    ],
    questions: [
      { q: "Who knows where the exit is?", choices: ["Jin", "A man wearing black clothes", "The school teacher", "Rin"], a: 1 },
      { q: "Where did Rin meet him?", choices: ["In the forest last night", "At the inn this morning", "In town yesterday", "At the exit"], a: 2 },
      { q: "What does Jin warn you about?", choices: ["The man is a monster", "The man betrayed his alliance", "The exit is fake", "The man is the Game Master"], a: 1 },
      { q: "What does the man say about trusting people?", choices: ["Trust is important", "Only weak people trust others", "He trusts Rin", "Nobody trusts him"], a: 1 }
    ]
  }
});
