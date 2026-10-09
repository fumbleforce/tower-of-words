# Kenji sample: the box for upstairs

A voice sample, not wired into the game. B2 office, day 2, afternoon, after Emi's briefing (`d2_brief_done`), while Kenji is "helping Mori". Mori is at his desk. Kenji stands by the lift door holding a box of printer paper. Talking to Kenji starts it.

Eric meets 大丈夫 and もう一度, both taught at the station earlier on day 2, and hears Kenji use もう一度 himself. If the player missed them, Eric asks Mori in English instead. There is one choice, and both branches end with Kenji asking Mori himself.

```js
kenji_box: [
  { do: 'cam', on: 'kenji', zoom: 1.3 },
  { say: 'kenji', overheard: true, emo: 'puzzled', text: 'えっと…何階だっけ…' },
  { say: 'eric', emo: 'curious', text: 'Is that going somewhere?' },
  { say: 'kenji', emo: 'sheepish', text: 'Mm. Paper, for the printer upstairs, in the meeting room.' },
  { say: 'eric', emo: 'curious', text: 'Which floor?' },
  { say: 'kenji', overheard: true, emo: 'hesitant', text: '大丈夫、大丈夫。' },
  { say: 'kenji', emo: 'sheepish', text: 'Mori-san told me the floor. I said yes. Then he said more, and I said yes again, and now... the number is gone.' },
  { do: 'look', who: 'kenji', at: 'mori' },
  { say: 'kenji', emo: 'hesitant', text: 'Three or four. I think four. Four is the one I usually go to, so.' },
  { choice: [
    { text: 'Ask Mori with him.', go: 'kenji_box_ask' },
    { text: 'Let him try four.', go: 'kenji_box_four' },
  ] },
],

kenji_box_ask: [
  { do: 'walk', who: 'eric', to: 'mori_desk', wait: true },
  { do: 'walk', who: 'kenji', to: 'mori_desk', wait: true },
  { if: 'know_mouichido', then: [
    "eric: {sumimasen}. {mouichido}?",
  ], else: [
    "eric: Sorry, which floor was the paper for?",
  ] },
  { say: 'mori', overheard: true, emo: 'polite', text: '3階です。3階の会議室です。', clear: ['3'] },
  { do: 'gesture', who: 'mori', kind: 'point' },
  { say: 'kenji', emo: 'warm', text: 'Three. Okay. I was going to take it to four.' },
  { say: 'kenji', overheard: true, emo: 'polite', text: 'すみません、ありがとうございます。' },
  { say: 'kenji', emo: 'sheepish', text: 'Next time I ask him myself. Maybe the time after next.' },
  { set: 'kenji_box_done' },
  { do: 'cam', back: true },
],

kenji_box_four: [
  { say: 'kenji', emo: 'hesitant', text: 'Okay. Four. If it is wrong, it is only one floor.' },
  { do: 'walk', who: 'kenji', to: 'lift', wait: true },
  '> A few minutes later the lift comes back down, and Kenji still has the box.',
  { do: 'walk', who: 'kenji', to: 'eric', wait: true },
  { say: 'kenji', emo: 'sheepish', text: 'Four was a storage room. A lady there was very kind about it. Very kind... and a little tired.' },
  { do: 'walk', who: 'kenji', to: 'mori_desk', wait: true },
  { say: 'kenji', overheard: true, emo: 'polite', text: 'すみません、もう一度お願いします。' },
  { say: 'mori', overheard: true, emo: 'polite', text: '3階です。', clear: ['3'] },
  { do: 'gesture', who: 'mori', kind: 'point' },
  { say: 'kenji', emo: 'warm', text: 'Three. He was not angry. I thought he was going to be angry.' },
  { set: 'kenji_box_done' },
  { do: 'cam', back: true },
],
```

Notes for a builder:

- If the scene is used, it needs a `mori_desk` and `lift` spot and a paper-box prop in Kenji's hands. Words used are all in [words.md](../../../docs/game/words.md). The only `clear` entry is the digit 3. 大丈夫 and もう一度 come through sharp on their own once Eric has learned them, and blur like the rest if he hasn't.
- The second branch costs Kenji a trip and gives Eric nothing to fix, which is fine. The point is that Kenji asks Mori himself in both branches, and the player hears that Mori was never going to mind.
- The lady on floor 4 is only mentioned and never staged.
