// Short street conversations and reactions. The runtime supplies the visible person's label.
const line = (say, text) => ({ say, text, emo: 'casual', overheard: true });
export const CROWD_TALK = {
  office: {
    speaker: 'sales1', word: 'daijoubu', prompt: "Tell him you're okay.",
    hello: line('sales1', '{daijoubu}ですか？道、分かります？'),
    answer: line('sales1', 'よかった。では、また。'),
    jump: [line('sales1', 'あっ、びっくりした。'), line('sales1', '元気ですね。')],
    block: [line('sales1', '{sumimasen}、通ります。'), line('sales1', 'ちょっと、通してもらえますか。')],
    annoyed: line('sales1', 'まったく。危ないですよ。'),
  },
  officeWoman: {
    speaker: 'sales2', word: 'sumimasen', prompt: 'Apologize for startling her.',
    hello: line('sales2', 'あ、びっくりした。急に声をかけるから。'),
    answer: line('sales2', 'いえいえ、大丈夫ですよ。'),
    jump: [line('sales2', 'わっ、危ない！'), line('sales2', 'ふふ、元気ですね。')],
    block: [line('sales2', '{sumimasen}、ちょっといいですか。'), line('sales2', 'あの、通りたいんですけど。')],
    annoyed: line('sales2', 'もう、やめてください。'),
  },
  elder: {
    speaker: 'reader', word: 'yasumi', prompt: 'Ask about his break.',
    hello: line('reader', 'ちょっと{yasumi}です。足が疲れちゃって。'),
    answer: line('reader', 'ええ。もう少し休んでから行きます。'),
    jump: [line('reader', 'おっと、危ない。'), line('reader', 'はは、よく跳ぶね。')],
    block: [line('reader', 'ごめんね、通してね。'), line('reader', '{sumimasen}、そっちへ行きたいんです。')],
    annoyed: line('reader', 'まったく、落ち着きなさい。'),
  },
  casual: {
    speaker: 'music', word: 'nomitai', prompt: 'Say you want a drink too.',
    hello: line('music', 'ああ、何か{nomitai}な。'),
    answer: line('music', 'そっちも？のど、渇くよね。'),
    jump: [line('music', 'なに、運動？'), line('music', 'おお、すごいね。')],
    block: [line('music', '{sumimasen}、通るね。'), line('music', 'ねえ、ちょっと通して。')],
    annoyed: line('music', 'ばか、ぶつかるでしょ。'),
  },
};
for (const [id, profile] of Object.entries(CROWD_TALK)) {
  for (const key of ['hello', 'answer', 'jump', 'block', 'annoyed']) {
    [profile[key]].flat().forEach((line, i) => {
      line.voice = `crowd-${id}-${key}-${i}`;
      if (key === 'annoyed') line.emo = 'stern';
      if (key === 'jump') line.emo = i ? 'amused' : 'surprised';
    });
  }
}
export default { nodes: Object.fromEntries(Object.entries(CROWD_TALK).map(([id, p]) => [id,
  [p.hello, p.answer, ...p.jump, ...p.block, p.annoyed],
])) };
