(window.FLOORS = window.FLOORS || []).push({
  id: 1,
  name: "Floor 1 — The Town of Beginnings",
  jp: "はじまりの街",
  weeks: "Week 1",
  goal: "Read the first half of katakana without guessing, stop mixing up ぬ/め/ね, and say what something is (or isn't).",
  intro: "You wake up on cold stone in the Town of Beginnings, a town built on ruins far older than the game itself. You open the menu, and the Logout button is gone. A calm voice tells you the tower has twelve floors, and only players who reach the top can leave. Every sign here is written in katakana. Learn to read them, or stay lost.",
  outro: "The Gatekeeper lowers its spear and steps aside. For the first time, the katakana signs around you start to make sense.",
  side: "Write your own name in katakana (ヨルゲン) on paper. Then search YouTube for 「ゲーム トレーラー」, pause on any Japanese screen, and read 3 katakana words aloud. Check them with a translator.",
  talk: "Let's practice Japanese for 10 minutes. I'm a returning beginner (about mid-N5). I'm working on katakana and the patterns 「NはNです」, 「NはNじゃないです」, 「これ・それ・あれ・どれ」 and questions with 「か」. Please write only in hiragana and katakana (no kanji), use very short sentences, and quiz me: show me game-related katakana words (ゲーム, スキル, アイテム, ダンジョン, ターン, ギルド…) and ask me what they are, e.g. 「これはなんですか。」. Correct my mistakes gently in English after each answer, then continue in Japanese.",

  kana: [
    { id: "ka_a", k: "ア", r: "a" },
    { id: "ka_i", k: "イ", r: "i" },
    { id: "ka_u", k: "ウ", r: "u" },
    { id: "ka_e", k: "エ", r: "e" },
    { id: "ka_o", k: "オ", r: "o" },
    { id: "ka_ka", k: "カ", r: "ka" },
    { id: "ka_ki", k: "キ", r: "ki" },
    { id: "ka_ku", k: "ク", r: "ku" },
    { id: "ka_ke", k: "ケ", r: "ke" },
    { id: "ka_ko", k: "コ", r: "ko" },
    { id: "ka_sa", k: "サ", r: "sa" },
    { id: "ka_shi", k: "シ", r: "shi" },
    { id: "ka_su", k: "ス", r: "su" },
    { id: "ka_se", k: "セ", r: "se" },
    { id: "ka_so", k: "ソ", r: "so" },
    { id: "ka_ta", k: "タ", r: "ta" },
    { id: "ka_chi", k: "チ", r: "chi" },
    { id: "ka_tsu", k: "ツ", r: "tsu" },
    { id: "ka_te", k: "テ", r: "te" },
    { id: "ka_to", k: "ト", r: "to" },
    { id: "ka_na", k: "ナ", r: "na" },
    { id: "ka_ni", k: "ニ", r: "ni" },
    { id: "ka_nu", k: "ヌ", r: "nu" },
    { id: "ka_ne", k: "ネ", r: "ne" },
    { id: "ka_no", k: "ノ", r: "no" },
    { id: "ka_ga", k: "ガ", r: "ga" },
    { id: "ka_gi", k: "ギ", r: "gi" },
    { id: "ka_gu", k: "グ", r: "gu" },
    { id: "ka_ge", k: "ゲ", r: "ge" },
    { id: "ka_go", k: "ゴ", r: "go" },
    { id: "ka_za", k: "ザ", r: "za" },
    { id: "ka_ji", k: "ジ", r: "ji" },
    { id: "ka_zu", k: "ズ", r: "zu" },
    { id: "ka_ze", k: "ゼ", r: "ze" },
    { id: "ka_zo", k: "ゾ", r: "zo" },
    { id: "ka_da", k: "ダ", r: "da" },
    { id: "ka_de", k: "デ", r: "de" },
    { id: "ka_do", k: "ド", r: "do" },
    { id: "kh_nu", k: "ぬ", r: "nu" },
    { id: "kh_me", k: "め", r: "me" },
    { id: "kh_ne", k: "ね", r: "ne" },
    { id: "kh_ru", k: "る", r: "ru" },
    { id: "kh_ro", k: "ろ", r: "ro" },
    { id: "kh_wa", k: "わ", r: "wa" },
    { id: "kh_re", k: "れ", r: "re" },
    { id: "kh_ha", k: "は", r: "ha" },
    { id: "kh_ho", k: "ほ", r: "ho" },
    { id: "kh_sa", k: "さ", r: "sa" },
    { id: "kh_chi", k: "ち", r: "chi" }
  ],
  confuse: [
    ["シ", "ツ", "ソ"],
    ["ぬ", "め", "ね"],
    ["る", "ろ"],
    ["わ", "れ", "ね"],
    ["は", "ほ"],
    ["さ", "ち"],
    ["ク", "ケ", "タ"],
    ["チ", "テ"],
    ["ス", "ヌ"],
    ["サ", "セ"],
    ["ウ", "ワ"],
    ["ナ", "メ"]
  ],

  vocab: [
    { id: "v01_01", ja: "ゲーム", kana: "ゲーム", rm: "geemu", en: "game" },
    { id: "v01_02", ja: "ターン", kana: "ターン", rm: "taan", en: "turn (in a game)" },
    { id: "v01_03", ja: "スキル", kana: "スキル", rm: "sukiru", en: "skill" },
    { id: "v01_04", ja: "ナイフ", kana: "ナイフ", rm: "naifu", en: "knife" },
    { id: "v01_05", ja: "アイテム", kana: "アイテム", rm: "aitemu", en: "item" },
    { id: "v01_06", ja: "キー", kana: "キー", rm: "kii", en: "key" },
    { id: "v01_07", ja: "クエスト", kana: "クエスト", rm: "kuesuto", en: "quest" },
    { id: "v01_08", ja: "コイン", kana: "コイン", rm: "koin", en: "coin" },
    { id: "v01_09", ja: "ギルド", kana: "ギルド", rm: "girudo", en: "guild" },
    { id: "v01_10", ja: "ダンジョン", kana: "ダンジョン", rm: "danjon", en: "dungeon" },
    { id: "v01_11", ja: "スタート", kana: "スタート", rm: "sutaato", en: "start" },
    { id: "v01_12", ja: "ステータス", kana: "ステータス", rm: "suteetasu", en: "status (screen)" },
    { id: "v01_13", ja: "セーブ", kana: "セーブ", rm: "seebu", en: "save (game)" },
    { id: "v01_14", ja: "ソロ", kana: "ソロ", rm: "soro", en: "solo", note: "ソ has a short stroke on the left. Don't mix it up with ン or ツ." },
    { id: "v01_15", ja: "データ", kana: "データ", rm: "deeta", en: "data" },
    { id: "v01_16", ja: "コスト", kana: "コスト", rm: "kosuto", en: "cost" },
    { id: "v01_17", ja: "ナイト", kana: "ナイト", rm: "naito", en: "knight" },
    { id: "v01_18", ja: "シールド", kana: "シールド", rm: "shiirudo", en: "shield" },
    { id: "v01_19", ja: "カード", kana: "カード", rm: "kaado", en: "card" },
    { id: "v01_20", ja: "ガード", kana: "ガード", rm: "gaado", en: "guard / block" },
    { id: "v01_21", ja: "テント", kana: "テント", rm: "tento", en: "tent" },
    { id: "v01_22", ja: "コード", kana: "コード", rm: "koodo", en: "code", note: "コ is open on the left; ロ is a closed box." },
    { id: "v01_23", ja: "これ", kana: "これ", rm: "kore", en: "this (one)" },
    { id: "v01_24", ja: "それ", kana: "それ", rm: "sore", en: "that (near you)" },
    { id: "v01_25", ja: "あれ", kana: "あれ", rm: "are", en: "that (over there)" },
    { id: "v01_26", ja: "どれ", kana: "どれ", rm: "dore", en: "which one" }
  ],

  kanji: [],

  grammar: [
    {
      id: "g01_1",
      title: "〜は〜です / 〜じゃないです",
      pattern: "A は B です (A is B) / A は B じゃないです (A is not B)",
      explain: "は (read 'wa') marks the topic: what you're talking about. です at the end makes it a polite 'is'. Swap です for じゃないです to say 'is not'.",
      examples: [
        { ja: "わたしはハンターです。", kana: "わたしは ハンターです。", en: "I am a hunter.", chunks: ["わたしは", "ハンター", "です。"] },
        { ja: "リンはナイトです。", kana: "リンは ナイトです。", en: "Rin is a knight.", chunks: ["リンは", "ナイト", "です。"] },
        { ja: "これはデータです。", kana: "これは データです。", en: "This is data.", chunks: ["これは", "データ", "です。"] },
        { ja: "これはゲームじゃないです。", kana: "これは ゲームじゃないです。", en: "This is not a game.", chunks: ["これは", "ゲーム", "じゃないです。"] },
        { ja: "ジンはともだちじゃないです。", kana: "ジンは ともだちじゃないです。", en: "Jin is not a friend.", chunks: ["ジンは", "ともだち", "じゃないです。"] },
        { ja: "わたしはソロじゃないです。", kana: "わたしは ソロじゃないです。", en: "I am not solo.", chunks: ["わたしは", "ソロ", "じゃないです。"] }
      ]
    },
    {
      id: "g01_2",
      title: "これ・それ・あれ・どれ",
      pattern: "これ (this, near me) / それ (that, near you) / あれ (that, over there) / どれ (which one?)",
      explain: "Japanese splits 'this' and 'that' by distance: これ is near the speaker, それ is near the listener, and あれ is far from both. どれ asks 'which one?'. A question word like どれ takes が instead of は.",
      examples: [
        { ja: "それはナイフです。", kana: "それは ナイフです。", en: "That (by you) is a knife.", chunks: ["それは", "ナイフ", "です。"] },
        { ja: "あれはダンジョンです。", kana: "あれは ダンジョンです。", en: "That (over there) is the dungeon.", chunks: ["あれは", "ダンジョン", "です。"] },
        { ja: "どれがキーですか。", kana: "どれが キーですか。", en: "Which one is the key?", chunks: ["どれが", "キー", "ですか。"] },
        { ja: "これはコインです。", kana: "これは コインです。", en: "This is a coin.", chunks: ["これは", "コイン", "です。"] },
        { ja: "あれはナイトじゃないです。", kana: "あれは ナイトじゃないです。", en: "That (over there) is not a knight.", chunks: ["あれは", "ナイト", "じゃないです。"] }
      ]
    },
    {
      id: "g01_3",
      title: "Questions with 〜か",
      pattern: "Sentence + か。",
      explain: "To make a question, add か to the end of a polite sentence; no question mark is needed. なん means 'what' before です. Answer with はい (yes) or いいえ (no).",
      examples: [
        { ja: "リンはナイトですか。", kana: "リンは ナイトですか。", en: "Is Rin a knight?", chunks: ["リンは", "ナイト", "ですか。"] },
        { ja: "これはゲームですか。", kana: "これは ゲームですか。", en: "Is this a game?", chunks: ["これは", "ゲーム", "ですか。"] },
        { ja: "あれはなんですか。", kana: "あれは なんですか。", en: "What is that over there?", chunks: ["あれは", "なん", "ですか。"] },
        { ja: "それはスキルですか。", kana: "それは スキルですか。", en: "Is that a skill?", chunks: ["それは", "スキル", "ですか。"] },
        { ja: "はい、ギルドです。", kana: "はい、ギルドです。", en: "Yes, it's a guild.", chunks: ["はい、", "ギルド", "です。"] }
      ]
    }
  ],

  boss: {
    name: "The Gatekeeper",
    jp: "ゲートキーパー",
    scene: "At the gate of the Town of Beginnings stands an armored gatekeeper, an old program that is older than the town. It will not move until you understand it.",
    lines: [
      { sp: "ゲートキーパー", ja: "ハンターですか。", kana: "ハンターですか。", en: "Are you a hunter?" },
      { sp: "リン", ja: "はい、ハンターです。わたしはリンです。", kana: "はい、ハンターです。わたしは リンです。", en: "Yes, (they're) a hunter. I'm Rin." },
      { sp: "ゲートキーパー", ja: "これはゲームです。でも、ゲームじゃないです。", kana: "これは ゲームです。でも、ゲームじゃないです。", en: "This is a game. But it is not a game." },
      { sp: "リン", ja: "…ゲームじゃないですか。", kana: "…ゲームじゃないですか。", en: "...It isn't a game?" },
      { sp: "ゲートキーパー", ja: "あれはダンジョンです。それはキーです。", kana: "あれは ダンジョンです。それは キーです。", en: "That over there is the dungeon. That (by you) is the key." },
      { sp: "リン", ja: "どれがキーですか。これですか。", kana: "どれが キーですか。これですか。", en: "Which one is the key? This one?" },
      { sp: "ゲートキーパー", ja: "はい、それです。クエスト、スタートです。", kana: "はい、それです。クエスト、スタートです。", en: "Yes, that one. The quest begins." }
    ],
    questions: [
      { q: "What does the gatekeeper say about this world?", choices: ["It's a guild", "It's a game, but not a game", "It's only data", "It's a dungeon"], a: 1 },
      { q: "What is あれ (over there)?", choices: ["The key", "A knife", "The dungeon", "A tent"], a: 2 },
      { q: "What does Rin ask the gatekeeper?", choices: ["Which one is the key", "Where the guild is", "Whether she is a knight", "What the cost is"], a: 0 }
    ]
  }
});
