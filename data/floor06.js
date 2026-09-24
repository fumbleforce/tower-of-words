(window.FLOORS = window.FLOORS || []).push({
  id: 6,
  name: "Floor 6 — The Square of Lies",
  jp: "嘘の広場",
  weeks: "Week 6",
  goal: "Understand casual (plain-form) Japanese, the way anime characters actually talk to each other.",
  intro: "On Floor 6 the polite masks come off: players drop です and ます and talk the way people do under pressure. In the square, faction leaders argue over a rumor. A player lost his last fight yesterday, and he never came back and never logged out. ジン says he saw it happen.",
  outro: "The square goes quiet as the factions start counting who they can trust. From here on, everyone talks to you straight.",
  side: "Find any 2–3 minute anime clip on YouTube (a calm dialogue scene between two characters works best) and just listen, no subtitles needed. Count how many sentences end in です/ます, and how many end in a bare verb or だ. You'll find that plain form wins by far.",
  talk: "Let's do 10 minutes of casual Japanese conversation practice. I'm an early-intermediate learner (around N5) and I've just learned plain/casual forms: dictionary form, ない, た, なかった, and だ / じゃない, plus casual questions without か. Talk to me like a fellow player in a VR strategy-RPG (use タメ口, no です/ます) about yesterday's battle and what our faction should do next. Keep it calm and natural, with no exaggerated anime reactions. Use simple sentences and write hiragana readings in brackets after kanji. If I use polite form, remind me to switch to casual. Correct mistakes briefly in English, then continue in Japanese.",
  vocab: [
    { id: "v06_01", ja: "本当", kana: "ほんとう", rm: "hontou", en: "truth / really", note: "本当？ = Really?" },
    { id: "v06_02", ja: "世界", kana: "せかい", rm: "sekai", en: "world" },
    { id: "v06_03", ja: "何", kana: "なに", rm: "nani", en: "what", note: "Read なん before です/の/で: 何ですか (なんですか)." },
    { id: "v06_04", ja: "前", kana: "まえ", rm: "mae", en: "front / before" },
    { id: "v06_05", ja: "今", kana: "いま", rm: "ima", en: "now" },
    { id: "v06_06", ja: "中", kana: "なか", rm: "naka", en: "inside / middle" },
    { id: "v06_08", ja: "嘘", kana: "うそ", rm: "uso", en: "lie", note: "嘘！ = No way!" },
    { id: "v06_09", ja: "分かる", kana: "わかる", rm: "wakaru", en: "to understand" },
    { id: "v06_10", ja: "ある", kana: "ある", rm: "aru", en: "to exist (things)" },
    { id: "v06_11", ja: "いる", kana: "いる", rm: "iru", en: "to exist (living)" },
    { id: "v06_15", ja: "消える", kana: "きえる", rm: "kieru", en: "to vanish" },
    { id: "v06_17", ja: "誰", kana: "だれ", rm: "dare", en: "who" },
    { id: "v06_18", ja: "どこ", kana: "どこ", rm: "doko", en: "where" },
    { id: "v06_19", ja: "一緒に", kana: "いっしょに", rm: "issho ni", en: "together" },
    { id: "v06_20", ja: "うん", kana: "うん", rm: "un", en: "yeah (casual yes)" },
    { id: "v06_21", ja: "ううん", kana: "ううん", rm: "uun", en: "nah (casual no)" },
    { id: "v06_22", ja: "あいつ", kana: "あいつ", rm: "aitsu", en: "that guy" },
    { id: "v06_23", ja: "さっき", kana: "さっき", rm: "sakki", en: "a moment ago" },
    { id: "v06_24", ja: "国", kana: "くに", rm: "kuni", en: "country / nation" },
    { id: "v06_25", ja: "違う", kana: "ちがう", rm: "chigau", en: "to be wrong / differ" },
    { id: "v06_26", ja: "じゃあ", kana: "じゃあ", rm: "jaa", en: "well then" },
    { id: "v06_27", ja: "昨日", kana: "きのう", rm: "kinou", en: "yesterday" }
  ],
  kanji: [
    { id: "k06_01", c: "本", on: "ホン", kun: "もと", en: "book / origin", ex: "本当 (ほんとう) truth" },
    { id: "k06_02", c: "当", on: "トウ", kun: "あ(たる)", en: "hit / correct", ex: "本当 (ほんとう) truth" },
    { id: "k06_03", c: "世", on: "セ", kun: "よ", en: "world / era", ex: "世界 (せかい) world" },
    { id: "k06_04", c: "界", on: "カイ", kun: "—", en: "boundary / world", ex: "世界 (せかい) world" },
    { id: "k06_05", c: "中", on: "チュウ", kun: "なか", en: "middle / inside", ex: "中 (なか) inside" },
    { id: "k06_06", c: "何", on: "カ", kun: "なに / なん", en: "what", ex: "何 (なに) what" },
    { id: "k06_07", c: "前", on: "ゼン", kun: "まえ", en: "front / before", ex: "前 (まえ) front" },
    { id: "k06_08", c: "今", on: "コン", kun: "いま", en: "now", ex: "今 (いま) now" }
  ],
  grammar: [
    {
      id: "g06_1",
      title: "Plain present: dictionary form and 〜ない",
      pattern: "行きます → 行く / 行きません → 行かない",
      explain: "Friends, rivals and anime characters drop です/ます. The plain present is just the dictionary form. For the negative: -eru/-iru verbs swap る for ない (寝る → 寝ない), and other verbs change the last u-sound to an a-sound plus ない (行く → 行かない, 言う → 言わない). Irregular: する → しない, 来る → 来ない (こない), ある → ない.",
      examples: [
        { ja: "俺は一人で行く。", kana: "おれは ひとりで いく。", en: "I'm going alone.", chunks: ["俺は", "一人で", "行く。"] },
        { ja: "今日はログアウトしない。", kana: "きょうは ログアウト しない。", en: "I'm not logging out today.", chunks: ["今日は", "ログアウト", "しない。"] },
        { ja: "リンは何も言わない。", kana: "リンは なにも いわない。", en: "Rin doesn't say anything.", chunks: ["リンは", "何も", "言わない。"] },
        { ja: "明日もここに来る？", kana: "あしたも ここに くる？", en: "Are you coming here tomorrow too?", chunks: ["明日も", "ここに", "来る？"] },
        { ja: "その言葉は分からない。", kana: "その ことばは わからない。", en: "I don't understand that word.", chunks: ["その", "言葉は", "分からない。"] }
      ]
    },
    {
      id: "g06_2",
      title: "Plain past: 〜た and 〜なかった",
      pattern: "行きました → 行った / 行きませんでした → 行かなかった",
      explain: "The plain past is the て-form with て changed to た (and で to だ): 待って → 待った, 死んで → 死んだ. For the negative past, change ない to なかった: 来ない → 来なかった. If you know the て-form, you already know this.",
      examples: [
        { ja: "昨日、ボスを倒した。", kana: "きのう、ボスを たおした。", en: "I defeated the boss yesterday.", chunks: ["昨日、", "ボスを", "倒した。"] },
        { ja: "ジンは今日来なかった。", kana: "ジンは きょう こなかった。", en: "Jin didn't come today.", chunks: ["ジンは", "今日", "来なかった。"] },
        { ja: "さっき何を食べた？", kana: "さっき なにを たべた？", en: "What did you eat just now?", chunks: ["さっき", "何を", "食べた？"] },
        { ja: "あのプレイヤーは本当に消えた。", kana: "あの プレイヤーは ほんとうに きえた。", en: "That player really vanished.", chunks: ["あの", "プレイヤーは", "本当に", "消えた。"] },
        { ja: "あの時、誰も助けなかった。", kana: "あの とき、だれも たすけなかった。", en: "At that moment, nobody helped.", chunks: ["あの時、", "誰も", "助けなかった。"] }
      ]
    },
    {
      id: "g06_3",
      title: "だ / じゃない and casual questions",
      pattern: "N + だ / N + じゃない / sentence + ？",
      explain: "です becomes だ, and じゃないです becomes じゃない. In casual questions you drop か and just raise your voice: 大丈夫？ Questions often drop だ too, as in 本当？ rather than 本当だ？. だ sounds strong or masculine, so many speakers (like リン) leave it off.",
      examples: [
        { ja: "これは本当の世界じゃない。", kana: "これは ほんとうの せかいじゃ ない。", en: "This isn't the real world.", chunks: ["これは", "本当の", "世界", "じゃない。"] },
        { ja: "ねえ、リン、大丈夫？", kana: "ねえ、リン、だいじょうぶ？", en: "Hey, Rin, are you okay?", chunks: ["ねえ、", "リン、", "大丈夫？"] },
        { ja: "あいつは誰だ。", kana: "あいつは だれだ。", en: "Who is that guy?", chunks: ["あいつは", "誰", "だ。"] },
        { ja: "今、どこにいる？", kana: "いま、どこに いる？", en: "Where are you right now?", chunks: ["今、", "どこに", "いる？"] },
        { ja: "それは嘘だ。", kana: "それは うそだ。", en: "That's a lie.", chunks: ["それは", "嘘", "だ。"] }
      ]
    },
    {
      id: "g06_4",
      title: "Polite ↔ casual in real talk",
      pattern: "Same meaning, different distance",
      explain: "Polite form keeps people at a distance, like strangers, shopkeepers or bosses. Casual form is for friends, rivals and enemies you don't respect. In anime, the moment someone switches to casual form tells you something about the relationship. Casual requests are just the て-form: 来て！ (Come!).",
      examples: [
        { ja: "明日、一緒に行く？", kana: "あした、いっしょに いく？", en: "Want to go together tomorrow?", chunks: ["明日、", "一緒に", "行く？"] },
        { ja: "ううん、俺は行かない。", kana: "ううん、おれは いかない。", en: "Nah, I'm not going.", chunks: ["ううん、", "俺は", "行かない。"] },
        { ja: "ハンター、早く来て！", kana: "ハンター、はやく きて！", en: "Hunter, come quickly!", chunks: ["ハンター、", "早く", "来て！"] },
        { ja: "その話、本当？", kana: "その はなし、ほんとう？", en: "Is that story true?", chunks: ["その", "話、", "本当？"] },
        { ja: "違う、俺じゃない！", kana: "ちがう、おれじゃ ない！", en: "No, it wasn't me!", chunks: ["違う、", "俺", "じゃない！"] }
      ]
    }
  ],
  boss: {
    name: "Jin, the Rival",
    jp: "ライバル・ジン",
    scene: "The central square at dusk. ジン blocks your way, his hand on his sword.",
    lines: [
      { sp: "ジン", ja: "おい、ハンター。この世界は、ただのゲームじゃない。", kana: "おい、ハンター。この せかいは、ただの ゲームじゃ ない。", en: "Hey, Hunter. This world isn't just a game." },
      { sp: "リン", ja: "え？それ、どういう意味？", kana: "え？それ、どういう いみ？", en: "Huh? What does that mean?" },
      { sp: "ジン", ja: "昨日、あのプレイヤーが負けた。そして、消えた。", kana: "きのう、あの プレイヤーが まけた。そして、きえた。", en: "Yesterday, that player lost. And then he vanished." },
      { sp: "ジン", ja: "ログアウトもしなかった。どこにもいない。", kana: "ログアウトも しなかった。どこにも いない。", en: "He didn't log out either. He's nowhere." },
      { sp: "リン", ja: "…本当？それ、嘘じゃない？", kana: "…ほんとう？それ、うそじゃ ない？", en: "…Really? That's not a lie?" },
      { sp: "ジン", ja: "嘘じゃない。俺は見た。", kana: "うそじゃ ない。おれは みた。", en: "It's not a lie. I saw it." },
      { sp: "きみ", ja: "じゃあ、どうする？", kana: "じゃあ、どう する？", en: "Then what do we do?" },
      { sp: "ジン", ja: "俺は一人で上に行く。じゃあな。", kana: "おれは ひとりで うえに いく。じゃあな。", en: "I'm going up alone. Later." }
    ],
    questions: [
      { q: "According to Jin, what happened yesterday?", choices: ["A player lost, vanished and didn't log out", "The boss was defeated", "Rin logged out", "Jin lost his sword"], a: 0 },
      { q: "What does 「この世界は、ただのゲームじゃない」 mean?", choices: ["This world is just a game", "This world isn't just a game", "This game is over", "This world isn't real"], a: 1 },
      { q: "How does Rin react?", choices: ["She agrees quietly", "She laughs", "She asks if it's really true", "She logs out"], a: 2 },
      { q: "What does Jin decide to do?", choices: ["Join your party", "Wait for tomorrow", "Go alone", "Go home"], a: 2 }
    ]
  }
});
