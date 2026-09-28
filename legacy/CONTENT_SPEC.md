# Content spec: Tower of 12 Floors

Each floor lives in `data/floorNN.js` (two digits), and each file registers itself:

```js
(window.FLOORS = window.FLOORS || []).push({
  id: 3,
  name: "Floor 3 — The Iron Market",
  jp: "鉄の市場",               // floor title in Japanese
  weeks: "Week 3",
  goal: "One sentence: what you can do after this floor.",
  intro: "2–4 sentences of story (English), second person, dark SAO/Death Note mood.",
  outro: "1–2 sentences shown after the boss is beaten.",
  side: "A real-world side quest, max 10 min, concrete and checkable (e.g. watch SAO ep1 00:00–03:00 with JP subs and spot 3 katakana words).",
  talk: "A ready-to-paste prompt the learner sends to Claude for a 10-min conversation practice at this floor's level. Must tell Claude the learner's level, which grammar/vocab to use, to speak mostly in simple Japanese with kana, and to correct gently.",

  // Only on kana floors (1–2). Individual characters to drill.
  kana: [ { id: "ka_a", k: "ア", r: "a" } ],
  // Groups of look-alike characters; used as distractors.
  confuse: [ ["ソ","ン","シ","ツ"], ["ぬ","め","ね"] ],

  vocab: [
    { id: "v03_01", ja: "行く", kana: "いく", rm: "iku", en: "to go" }
    // ja = how it's normally written. Use kanji only if common; otherwise kana.
    // kana = full reading in hiragana (katakana words: repeat the katakana).
    // rm = Hepburn romaji, long vowels as double letters (ログアウト -> roguauto, コンピューター -> konpyuutaa).
    // en = short English gloss (max ~4 words); must be unique within the floor.
    // optional note: short usage note.
  ],

  kanji: [
    { id: "k03_01", c: "行", on: "コウ", kun: "い(く)", en: "go", ex: "行く (いく) to go" }
  ],

  grammar: [
    {
      id: "g03_1",
      title: "〜ます / 〜ません",
      pattern: "Verb stem + ます",
      explain: "2–4 short sentences of plain-English explanation. No jargon without explaining it.",
      examples: [
        { ja: "私は毎日ゲームをします。", kana: "わたしは まいにち げーむを します。", en: "I play games every day.",
          chunks: ["私は", "毎日", "ゲームを", "します。"] }
      ]
    }
  ],

  boss: {
    name: "English name of the boss",
    jp: "ボスの名前",
    scene: "One sentence setting the scene (English).",
    lines: [
      { sp: "リン", ja: "…", kana: "…", en: "…" }
    ],
    questions: [
      { q: "English comprehension question", choices: ["a","b","c","d"], a: 0 }
    ]
  }
});
```

## Rules
- **Correctness first.** Every Japanese sentence must be natural and grammatically correct, and every reading must be accurate. If you're unsure, use a simpler sentence.
- Build on earlier floors only: sentences may use grammar from this floor and earlier floors, plus vocabulary from this floor, earlier floors, or very basic words.
- `chunks` joined with "" must equal `ja` exactly. Use 3–6 chunks per sentence, and attach particles to the word before them (e.g. "ゲームを"). The final punctuation goes on the last chunk.
- `kana`: the hiragana reading of the whole sentence, with spaces between words and particles attached (わたしは まいにち …), and 。 at the end. Loanwords stay in katakana in `kana`.
- The mood can be dark or action-driven (trapped in a VR death game, monsters, swords, betrayal) but not gory. Tone: SAO meets Death Note. Characters (original; don't use real SAO names): the player is 「きみ」, referred to by others as ハンター. Companion リン (female swordswoman, uses わたし, speaks politely at first and casually later). Rival ジン (male, uses 俺, rude). Antagonist ゲームマスター (GM), cold and formal. Characters' speech must match the floor's level: polite です/ます until floor 6, casual after that.
- Target sizes per floor: 20–28 vocab, 0 kanji on floors 1–2 and 6–8 kanji from floor 3 onward, 2–4 grammar points with 4–6 examples each, a boss with 6–10 lines and 3–4 questions.
- Vocabulary should be useful for anime and games (SAO ep1 especially) and daily conversation. No "apple", "pen" or "desk" filler.
- IDs must be unique globally (the prefix carries the floor number).
- Write only valid JS, no trailing commentary. Use straight double quotes for JS strings, and use 「」 inside Japanese.

## Floor plan
1. **はじまりの街** Katakana ア〜ノ (the a/ka/sa/ta/na rows, plus their dakuten forms ガ ザ ダ, etc.) and hiragana look-alike repair (ぬめね, るろ, われね, はほ, さち). Grammar: N は N です / じゃないです; これ・それ・あれ・どれ; question か. Vocab: game loanwords spelled mostly with the first-half katakana (ゲーム, スキル, ナイフ, アイテム, キー, …), plus a few with later characters, which is fine.
2. **Katakana ハ〜ン**, small ャュョッ, ー, and the ソンシツ / クワ / ヌス / ラヲ drill, plus extended combinations (ティ, ファ, ウィ, ヴ). Grammar: でした / じゃなかったです; N の N. Vocab: ログイン, ログアウト, モンスター, パーティー, レベル, メニュー, ボス, プレイヤー, ソード, …
3. **Verbs, polite:** ます / ません / ました / ませんでした; particles を に で へ と. Kanji: 行 来 見 食 飲 日 人 時.
4. **Adjectives:** い and な adjectives, present, negative and past; 〜たい; 〜ましょう / 〜ませんか. Kanji: 大 小 高 強 新 古 好 死.
5. **Te-form:** てください, ている, てもいい, てはいけない, and sequencing with 〜て. Kanji: 待 使 知 持 手 言 話 剣.
6. **Plain form & casual speech:** dictionary / ない / た forms, だ, casual questions, and why anime sounds different. Kanji: 本 当 世 界 中 何 前 今.
7. **Reasons & linking:** から, ので, けど / が, 〜とき, 〜前に / 〜後で. Kanji: 思 分 会 社 生 先 学 間.
8. **Describing nouns:** relative clauses (ゲームをする人), の / こと as nominalizers, 〜のが好き. Kanji: 仲 友 敵 戦 助 出 入 口.
9. **Experience & ease:** 〜たことがある, 〜やすい / にくい, 〜すぎる, 〜方 (かた), 〜つもり. Kanji: 私 自 気 体 力 心 神 声.
10. **Conditionals:** 〜たら, 〜ても, 〜なければならない / なきゃ, 〜ば (light), 〜ないで. Kanji: 命 失 負 勝 始 終 信 守.
11. **Anime speech:** enders ぞ ぜ よ ね な さ じゃん だろう; pronouns 俺 僕 お前 あんた 貴様; volitional 行こう / 〜よう; 〜ちゃう / 〜じゃう; 〜てる; ねえ for ない; 〜んだ / のだ. Kanji: 俺 僕 様 殺 逃 絶 対 悪.
12. **The Logout Gate** (SAO ep1 arc): potential form (〜れる / 〜える, できる), 〜ようにする, 〜かもしれない, 〜はず. Vocab and themes from SAO ep1: 世界, 現実, 本当, 閉じ込める, 脱出, 攻略, 仮想, 死ぬ, ログアウトボタン, 第一層, 茅場 (skip), ベータテスター, 信じる, 生き残る. Kanji: 現 実 仮 想 層 攻 略 残.

- Kanji must not repeat across floors; earlier floors' kanji may appear in later sentences.
