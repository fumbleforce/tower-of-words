// Day 4: Aoi's disaster. Grammar: 〜てもいい？ (asking permission), 〜の？ (casual questions).
// Spell: 開けて (a locked door), with Ishibashi on patrol as the risk. Alternative: fetch the key from the executive floor
// (first contact with polite speech, at a real time cost). Katakana block: computers (パソコン, ファイル, バックアップ, パスワード).
// Hook: Emi alone at night with a closure memo.
export const DAY = 4;
export const SCENES = {
  day4_morning: [
    { bg: 'office' }, { clock: '09:10' }, { music: 'office' },
    { show: 'aoi', expr: 'panic', at: 'center' }, { show: 'mio', expr: 'bored', at: 'right' },
    { say: 'aoi', expr: 'panic', jp: 'ごめんなさい！　コンペの{企画書|きかくしょ}、{消|け|消す}しちゃった……！', en: '"I\'m so sorry! I deleted the proposal for the pitch...!"' },
    { say: 'mio', expr: 'suspicious', jp: '……ファイル、ぜんぶ？', en: '"...The whole file?"' },
    { say: 'aoi', expr: 'panic', jp: 'ぜんぶ。{真壁|まかべ}さんのパソコンで、ボタンを{押|お|押す}したら……。', en: '"All of it. I pressed a button on Makabe\'s computer and..."' },
    { narrate: 'Emi is out all afternoon. The pitch draft is due to Sales at five, sharp.' },
    { task: '{五時|ごじ}まで・{企画書|きかくしょ}' },
    { say: 'mio', expr: 'bored', jp: 'バックアップは、{地下一階|ちかいっかい}の{倉庫|そうこ}にある。でも、かぎがない。', en: '"There\'s a backup in the storage room on basement level 1. But we don\'t have the key."' },
    { say: 'mio', expr: 'bored', jp: 'かぎは、{五階|ごかい}の{役員室|やくいんしつ}。……{私|わたし}は{行|い|行く}かない。こわいから。', en: '"The key\'s on the fifth floor, in the executive offices. ...I\'m not going. It\'s scary."' },
    { choose: { prompt: 'Before you go, you need Mio\'s help with the computer. Ask her.', kind: 'reply', options: [
      { jp: 'このパソコン、{使|つか|使う}ってもいい？', en: '"Can I use this computer?"', fx: { mio: 1 }, correct: true, then: [
        { say: 'mio', expr: 'bored', jp: 'いいよ。パスワードは「{天川|あまかわ}123」。……だれにも{言|い|言う}わないで。', en: '"Sure. The password is \'amakawa123\'. ...Don\'t tell anyone."' },
      ] },
      { jp: 'このパソコン、{使|つか|使う}って。', en: '"Use this computer."', then: [
        { say: 'mio', expr: 'suspicious', jp: '……{私|わたし}に{言|い|言う}ってるの？　{何|なに}それ、{命令|めいれい}？', en: '"...Are you telling me to? What is that, an order?" The te-form alone is a request for someone else to act. To ask permission, add もいい: 使ってもいい？' },
        { say: 'mio', expr: 'bored', jp: '……まあ、いいけど。パスワードは「{天川|あまかわ}123」。', en: '"...Fine, whatever. The password is \'amakawa123\'."' },
      ] },
    ] } },
    { say: 'aoi', expr: 'panic', jp: 'あたしも{行|い|行く}ってもいい？　{何|なに}か、{手伝|てつだ|手伝う}いたい！', en: '"Can I come too? I want to help somehow!"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'いいよ。{一緒|いっしょ}に{行|い|行く}こう。', en: '"Sure. Let\'s go together."', fx: { aoi: 1 }, then: [{ set: { aoiWithYou: true } }] },
      { jp: 'ここで{待|ま|待つ}ってて。', en: '"Wait here."', then: [{ say: 'aoi', expr: 'panic', jp: 'は、はい……。', en: '"O-okay..."' }] },
    ] } },
    { hideAll: true },
    { goto: 'day4_route' },
  ],

  day4_route: [
    { bg: 'elevator' },
    { choose: { prompt: 'The key, or the door?', kind: 'sign', options: [
      { jp: '{五階|ごかい}　{役員室|やくいんしつ}（かぎ）', en: 'Fifth floor, executive offices (the key)', then: [{ goto: 'day4_exec' }] },
      { jp: '{地下一階|ちかいっかい}　{倉庫|そうこ}（ドア）', en: 'Basement level 1, storage (the door)', then: [{ goto: 'day4_storage' }] },
    ] } },
  ],

  day4_exec: [
    { bg: 'execfloor' }, { music: 'calm' },
    { narrate: 'Thick carpet. A secretary looks up, and her smile arrives a second after her eyes.' },
    { show: 'secretary', expr: 'neutral', at: 'center' },
    { say: 'secretary', expr: 'neutral', jp: 'はい。どのようなご{用件|ようけん}でしょうか。', en: '"Welcome. How may I help you?" (Polite speech. You don\'t need to understand every word yet.)' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{倉庫|そうこ}のかぎを、かしてください。', en: '"Please lend me the storage key."', fx: { secretary: 1 }, then: [
        { say: 'secretary', expr: 'neutral', jp: 'かしこまりました。{少々|しょうしょう}お{待|ま|待つ}ちください。', en: '"Certainly. Please wait a moment."' },
        { narrate: 'The moment is not short. Forms, a signature, a phone call to someone called 部長, another form.' },
        { time: 45 },
      ] },
      { jp: 'かぎ、ちょうだい。', en: '"Gimme the key."', then: [
        { say: 'secretary', expr: 'neutral', jp: '……{失礼|しつれい}ですが、どちらの{部署|ぶしょ}の{方|かた}でしょうか。', en: '"...Excuse me, but which department are you from?" Casual speech on the executive floor lands badly.' },
        { narrate: 'It takes twice as long to get the key now, and she writes something down.' },
        { time: 70 }, { suspicion: 1 },
      ] },
    ] } },
    { hideAll: true },
    { set: { hasKey: true } },
    { goto: 'day4_storage' },
  ],

  day4_storage: [
    { bg: 'storage' }, { music: 'office' },
    { if: 'aoiWithYou', then: [{ show: 'aoi', expr: 'panic', at: 'left' }] },
    { if: 'hasKey', then: [
      { narrate: 'The key turns. The door opens like any normal door.' },
    ], else: [
      { narrate: 'The storage door is locked. At the end of the corridor, footsteps: Ishibashi on his rounds, coming this way.' },
      { show: 'ishibashi', expr: 'suspicious', at: 'right' },
      { ifRel: { who: 'ishibashi', below: 0, then: [{ narrate: 'He has been watching you since Monday. Anything strange now counts double.' }, { set: { ishibashiWary: true } }] } },
      { choose: { prompt: 'Ishibashi is ten metres away.', kind: 'action', options: [
        { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: '(Use kotodama. Ishibashi is watching, and he already keeps notes: 2 witnesses if Aoi is with you)', magic: true, then: [
          { spell: {
            goal: 'Open the locked door.',
            witnesses: 'auto',
            hint: 'Asking the door to open: 開ける (to open) becomes 開けて.',
            verbs: [
              { key: '開ける', en: 'open', forms: [['開ける', 'あける'], ['開けて', 'あけて'], ['開けた', 'あけた']] },
              { key: '動く', en: 'move', forms: [['動く', 'うごく'], ['動いて', 'うごいて'], ['動いた', 'うごいた']] },
            ],
            answer: '開けて',
            outcomes: {
              '動いて': [{ narrate: 'The whole door rattles in its frame, loudly. Ishibashi speeds up.' }, { suspicion: 1 }],
              default: [{ narrate: 'Nothing. The lock stays shut.' }],
            },
            success: [
              { narrate: 'Click. The lock opens by itself.' },
              { if: 'ishibashiWary', then: [{ suspicion: 1 }] },
              { say: 'ishibashi', expr: 'suspicious', jp: '……{今|いま}、かぎ、{開|あ|開く}いたか？　{倉庫|そうこ}のかぎは{上|うえ}にあるはずだ。', en: '"...Did that lock just open? The storage key should be upstairs."' },
              { choose: { prompt: 'Your reply', kind: 'reply', options: [
                { jp: '{開|あ|開く}いてたよ。', en: '"It was already open."', then: [{ say: 'ishibashi', expr: 'suspicious', jp: '……ふん。{書|か|書く}いておく。', en: '"...Hmph. I\'ll write that down."' }, { suspicion: 1 }] },
                { jp: '{入|はい|入る}ってもいいですか。', en: '"May I go in?" (polite)', fx: { ishibashi: 1 }, then: [{ say: 'ishibashi', expr: 'neutral', jp: '……{早|はや|早い}くしろ。', en: '"...Make it quick."' }] },
              ] } },
            ],
          } },
        ] },
        { jp: '{上|うえ}に{行|い|行く}って、かぎをもらう', en: 'Go up and get the key', then: [{ hideAll: true }, { goto: 'day4_exec' }] },
      ] } },
    ] },
    { hideAll: true },
    { narrate: 'Shelves of old hard drives, each labelled in marker. You need the one for Planning 7.' },
    { findLabel: {
      prompt: 'Which box? Read the labels.',
      options: ['{営業部|えいぎょうぶ}　バックアップ', '{企画室|きかくしつ}7　バックアップ', '{広報|こうほう}　{写真|しゃしん}', '{社内報|しゃないほう}　2025'],
      answer: 1,
      wrong: [{ narrate: 'Wrong box. Five minutes of dust and old cables.' }, { time: 5 }],
    } },
    { goto: 'day4_finish' },
  ],

  day4_finish: [
    { bg: 'office' },
    { ifTime: { after: '17:00', then: [{ set: { missedDeadline: true } }] } },
    { if: 'missedDeadline', then: [
      { narrate: 'The file is restored at 5:20. Sales has already closed the submissions.' },
      { show: 'emi', expr: 'surprised', at: 'center' },
      { say: 'emi', expr: 'surprised', jp: '……{間|ま|間に合う}に{合|あ|間に合う}わなかった？　そっか。', en: '"...We didn\'t make it? I see."' },
      { say: 'emi', expr: 'smile', jp: '{大丈夫|だいじょうぶ}。{私|わたし}が{黒田|くろだ}さんと{話|はな|話す}す。', en: '"It\'s fine. I\'ll talk to Kuroda."' },
      { fx: { emi: -1 } },
    ], else: [
      { narrate: 'The file is back, and it goes out at 4:48. Aoi sits on the floor and cries a little from relief. Emi walks in at five, and Mio tells her everything.' },
      { show: 'emi', expr: 'smile', at: 'center' },
      { say: 'emi', expr: 'smile', jp: 'ミオから{聞|き|聞く}いた。……{助|たす|助かる}かった。ありがとう。', en: '"Mio told me. ...You saved us. Thank you."' },
      { fx: { emi: 2, aoi: 1 } },
    ] },
    { hideAll: true },
    { goto: 'day4_night' },
  ],

  day4_night: [
    { clock: '21:30' }, { bg: 'office' }, { music: 'night' },
    { narrate: 'You come back for the umbrella you forgot. The light in Planning 7 is still on.' },
    { show: 'emi', expr: 'surprised', at: 'center' },
    { narrate: 'Emi is alone at her desk with a single sheet of paper. She turns it over when she hears you.' },
    { say: 'emi', expr: 'surprised', jp: '……あ、まだいたの？　{何|なん}でもない。{早|はや|早い}く{帰|かえ|帰る}って。', en: '"...Oh, you\'re still here? It\'s nothing. Go home."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'それ、{何|なに}？', en: '"What\'s that?"', then: [{ say: 'emi', expr: 'smile', jp: 'ただの{紙|かみ}。……おやすみ。', en: '"Just paper. ...Good night."' }, { set: { askedMemo: true } }] },
      { jp: 'エミさんも、{早|はや|早い}く{帰|かえ|帰る}ってね。', en: '"You go home soon too, Emi."', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smile', jp: '……うん。ありがと。', en: '"...Yeah. Thanks."' }] },
    ] } },
    { narrate: 'On your way out you see the paper\'s shadow through the thin sheet. Two words are larger than the rest: 企画室7　閉鎖.' },
    { glossNote: { key: '閉鎖', show: true } },
    { hideAll: true },
    { summary: true },
  ],
};
