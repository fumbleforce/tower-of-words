# Kenji sample: the box for upstairs

A voice sample, not wired into the game. B2 office, day 2, afternoon, after Emi's briefing (`d2_brief_done`), while Kenji is "helping Mori". Mori is at his desk. Kenji stands by the lift door holding a box of printer paper. Talking to Kenji starts it, and Kenji turns to Eric for help because Eric is his senpai.

Kenji speaks simple polite Japanese with a few English words and his hands. The player follows from the known words すみません, 大丈夫 and もう一度 (all taught by the end of the day-2 station test), the digits, the loanword プリンター, Mori's name and the gestures. If Eric doesn't know もう一度 yet, he asks Mori in English instead. There is one choice, and both branches end with Kenji asking Mori himself.

```js
kenji_box: [
  { do: 'cam', on: 'kenji', zoom: 1.3 },
  { say: 'kenji', overheard: true, emo: 'puzzled', text: 'えっと…何階だっけ…' },
  { do: 'face', who: 'kenji', to: 'eric' },
  { say: 'kenji', overheard: true, emo: 'hesitant', text: 'あ、{mc.name_jp}さん。すみません…' },
  { do: 'bow', who: 'kenji' },
  { say: 'kenji', overheard: true, emo: 'hesitant', text: '上のプリンターの紙です。', clear: [{ ja: 'プリンター', ro: 'purintā', en: 'printer' }] },
  { do: 'gesture', who: 'kenji', kind: 'point', to: 'lift' },
  { say: 'kenji', emo: 'sheepish', text: 'Paper... up. Three? Four?' },
  { say: 'eric', emo: 'curious', text: 'You don’t know which floor?' },
  { say: 'kenji', overheard: true, emo: 'sheepish', text: '森さんが言いました。でも僕、はいはいって…', clear: ['森'] },
  { say: 'kenji', emo: 'sheepish', text: 'Mori-san say. I say yes, yes. But... no listen.' },
  { say: 'kenji', overheard: true, emo: 'hesitant', text: '4階で、大丈夫ですか？', clear: ['4'] },
  { choice: [
    { text: '“Let’s ask Mori together.”', go: 'kenji_box_ask' },
    { text: '“Four sounds right. Try it.”', go: 'kenji_box_four' },
  ] },
],

kenji_box_ask: [
  { do: 'walk', who: 'eric', to: 'mori_desk', wait: true },
  { do: 'walk', who: 'kenji', to: 'mori_desk', wait: true },
  { if: 'know_mouichido', then: [
    'eric: {sumimasen}. {mouichido}?',
  ], else: [
    'eric: Sorry, Mori-san. Which floor was the paper for?',
  ] },
  { say: 'mori', overheard: true, emo: 'polite', text: '3階です。3階の会議室です。', clear: ['3'] },
  { do: 'gesture', who: 'mori', kind: 'point' },
  { say: 'kenji', overheard: true, emo: 'warm', text: '3階！ありがとうございます。', clear: ['3'] },
  { do: 'bow', who: 'kenji' },
  { say: 'kenji', emo: 'sheepish', text: 'Four... I go four. Thank you, {mc.name}-san.' },
  { say: 'kenji', overheard: true, emo: 'sheepish', text: '次は、自分で聞きます。…たぶん。' },
  { set: 'kenji_box_done' },
  { do: 'cam', back: true },
],

kenji_box_four: [
  { say: 'kenji', overheard: true, emo: 'warm', text: 'はい！行ってきます。' },
  { do: 'bow', who: 'kenji' },
  { do: 'walk', who: 'kenji', to: 'lift', wait: true },
  '> A few minutes later the lift comes back down. Kenji still has the box.',
  { do: 'walk', who: 'kenji', to: 'eric', wait: true },
  { say: 'kenji', overheard: true, emo: 'sheepish', text: 'すみません、4階は倉庫でした。', clear: ['4'] },
  { say: 'kenji', emo: 'sheepish', text: 'Four... no. Box room. Sorry.' },
  { do: 'bow', who: 'kenji' },
  { do: 'walk', who: 'kenji', to: 'mori_desk', wait: true },
  { say: 'kenji', overheard: true, emo: 'polite', text: 'すみません、もう一度お願いします。' },
  { say: 'mori', overheard: true, emo: 'polite', text: '3階です。', clear: ['3'] },
  { do: 'gesture', who: 'mori', kind: 'point' },
  { do: 'walk', who: 'kenji', to: 'eric', wait: true },
  { say: 'kenji', emo: 'warm', text: 'Three. Mori-san... no angry.' },
  { say: 'kenji', overheard: true, emo: 'warm', text: '怒ってなかったです。' },
  { set: 'kenji_box_done' },
  { do: 'cam', back: true },
],
```

Notes for a builder:

- If the scene is used, it needs `mori_desk` and `lift` spots and a paper-box prop in Kenji's hands. All the taught words are in [words.md](../../../docs/game/words.md). The only `clear` entries are digits, Mori's name and the loanword プリンター. 大丈夫, すみません and もう一度 come through sharp once Eric has learned them and blur like the rest if he hasn't.
- In the second branch Eric approved the guess, so Kenji apologises to Eric as well as going back to Mori. That is the senpai relationship. Kenji feels he let Eric down, although Eric only agreed with him. The scene gives Eric nothing to fix, which is fine. In both branches Kenji asks Mori himself, and the player sees that Mori was never going to mind.
- 4階 being a storage floor is only mentioned and never staged.
