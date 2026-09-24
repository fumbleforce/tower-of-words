// Day 1 script. Markup in jp lines: {kanji|kana|dictionary key} or {kana word}. Bare katakana runs are tracked as words automatically.
// English (the `en` fields) is hidden during play unless the player asks for it, which counts as a look-up.
export const CAST = {
  announcer: { name: 'アナウンス', en: 'Announcement', color: '#9fd3ff' },
  player: { name: 'あなた', en: 'You', color: '#cfe0ff' },
  ishibashi: { name: '石橋', en: 'Ishibashi', color: '#a9c4ff' },
  mio: { name: 'ミオ', en: 'Mio', color: '#7fe0b8' },
  emi: { name: 'エミ', en: 'Emi', color: '#ff9a8a' },
  rei: { name: 'レイ', en: 'Rei', color: '#e6e6f0' },
  kaori: { name: 'カオリ', en: 'Kaori', color: '#ffd28a' },
  goro: { name: 'ゴロー', en: 'Goro', color: '#c7e89a' },
  jun: { name: 'ジュン', en: 'Jun', color: '#d8b7ff' },
  aoi: { name: 'アオイ', en: 'Aoi', color: '#ff9fd0' },
  yuzuki: { name: 'ユヅキ', en: 'Yuzuki', color: '#f6d8a8' },
  secretary: { name: '秘書', en: 'Secretary', color: '#cfd6e6' },
};

// Floors of the Amakawa tower, top to bottom. The panel is how you navigate; labels are Japanese only.
export const FLOORS = [
  { id: 'R', jp: '{屋上|おくじょう}　{庭園|ていえん}', en: 'the rooftop garden' },
  { id: '5F', jp: '{五階|ごかい}　{役員室|やくいんしつ}', en: 'the executive floor' },
  { id: '3F', jp: '{三階|さんがい}　{営業部|えいぎょうぶ}', en: 'Sales' },
  { id: '2F', jp: '{二階|にかい}　{会議室|かいぎしつ}・{社内報|しゃないほう}', en: 'the meeting rooms and the newsroom' },
  { id: '1F', jp: '{一階|いっかい}　ロビー', en: 'the lobby' },
  { id: 'B1', jp: '{地下一階|ちかいっかい}　コピー{室|しつ}・{倉庫|そうこ}', en: 'the copy room and storage' },
  { id: 'B2', jp: '{地下二階|ちかにかい}　{企画室|きかくしつ}7', en: 'Planning Office 7' },
];

const WRONG_FLOOR = {
  R: [{ narrate: 'Wind, tomato plants and an old man waving a trowel at you. Wrong floor.' }, { time: 5 }],
  '5F': [{ narrate: 'Thick carpet, silent corridors, a secretary staring at your lanyard. Definitely the wrong floor.' }, { time: 5 }],
  '3F': [
    { show: 'rei', expr: 'smirk', at: 'center' },
    { say: 'rei', expr: 'smirk', jp: '{迷子|まいご}？　{新人|しんじん}さん。', en: '"Lost, new guy?"' },
    { hide: 'rei' }, { time: 5 },
  ],
  '2F': [{ narrate: 'A newsroom full of people typing very fast. Wrong floor.' }, { time: 5 }],
  '1F': [{ narrate: 'The lobby again. You press another button.' }, { time: 3 }],
  B1: [{ narrate: 'Boxes, shelves, a flickering light and a copier with an OUT OF ORDER sign. Wrong floor.' }, { time: 5 }],
  B2: [{ narrate: 'Basement level 2 again. Not where you need to be.' }, { time: 3 }],
};

export const SCENES = {
  monorail: [
    { bg: 'monorail' }, { clock: '08:40' }, { music: 'calm' },
    { narrate: 'Your first day at Amakawa. The monorail glides across Tokyo Bay toward the company\'s island city.' },
    { say: 'announcer', jp: 'まもなく、{天川|あまかわ}シティ{中央|ちゅうおう}{駅|えき}です。お{出口|でぐち}は{右側|みぎがわ}です。', en: '"Arriving shortly at Amakawa City Central Station. The exit is on the right."' },
    { choose: { prompt: 'The train slows down. Which doors?', kind: 'action', show: 'en', options: [
      { jp: '{右|みぎ}のドア', en: 'The right-hand doors', correct: true, then: [{ narrate: 'The right-hand doors slide open onto the platform.' }] },
      { jp: '{左|ひだり}のドア', en: 'The left-hand doors', then: [{ narrate: 'The left doors stay shut. You squeeze across the crowded carriage as the right-hand doors open.' }, { time: 2 }] },
    ] } },
    { msg: { from: 'emi', jp: 'おはよう！{九時|くじ}に{地下|ちか}{二階|にかい}の{企画室|きかくしつ}7に{来|き|来る}てね。', en: 'Morning! Come to Planning Office 7, basement level 2, at nine.' } },
    { goto: 'gate' },
  ],

  gate: [
    { bg: 'gate' }, { time: 6 },
    { show: 'ishibashi', expr: 'neutral', at: 'center' },
    { say: 'ishibashi', expr: 'neutral', jp: 'ちょっと、{止|と|止まる}まって。', en: '"Hold it. Stop."' },
    { say: 'ishibashi', expr: 'suspicious', jp: '{見|み|見る}ない{顔|かお}だな。IDカードは？', en: '"Don\'t know your face. ID card?"' },
    { choose: { prompt: 'What do you do?', kind: 'action', options: [
      { jp: 'IDカードを{見|み|見せる}せる', en: 'Show your ID card', correct: true, then: [] },
      { jp: '{名刺|めいし}を{出|だ|出す}す', en: 'Hand him a business card', retry: true, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '{名刺|めいし}じゃない。ID。', en: '"Not a business card. ID."' }] },
      { jp: 'にっこり{笑|わら|笑う}う', en: 'Smile brightly', retry: true, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '……{笑|わら|笑う}ってもダメだ。ID。', en: '"...Smiling won\'t help. ID."' }] },
    ] } },
    { say: 'ishibashi', expr: 'neutral', jp: '……{新人|しんじん}か。{企画室|きかくしつ}7？　ああ、{地下|ちか}の{連中|れんちゅう}か。', en: '"...A new hire. Planning Office 7? Ah, that basement lot."' },
    { say: 'ishibashi', expr: 'suspicious', jp: '{変|へん}なことしたら、すぐわかるからな。', en: '"Do anything strange and I\'ll know right away."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'はい、よろしくお{願|ねが|願う}いします。', en: '"Yes, nice to meet you." (polite)', correct: true, fx: { ishibashi: 1 }, then: [{ say: 'ishibashi', expr: 'neutral', jp: '……ん。', en: '"...Mm."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', fx: { ishibashi: -1 }, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '……{なれなれしい}な。', en: '"...Aren\'t you over-familiar." Casual speech with an older stranger on duty comes across as cheeky.' }, { set: { casualGuard: true } }] },
      { jp: '{変|へん}なこと？', en: '"Something strange?"', then: [{ say: 'ishibashi', expr: 'neutral', jp: '{気にするな|きにするな}。{行|い|行く}け。', en: '"Never mind. Go."' }] },
    ] } },
    { hide: 'ishibashi' },
    { goto: 'elevator1' },
  ],

  elevator1: [
    { bg: 'elevator' },
    { elevator: { target: 'B2', wrong: WRONG_FLOOR } },
    { goto: 'office' },
  ],

  office: [
    { bg: 'office' }, { music: 'office' },
    { show: 'mio', expr: 'bored', at: 'right' },
    { say: 'mio', expr: 'bored', jp: '……{誰|だれ}？', en: '"...Who are you?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{新人|しんじん}だよ。よろしく。', en: '"The new guy. Nice to meet you." (casual)', correct: true, fx: { mio: 1 }, then: [
        { say: 'mio', expr: 'bored', jp: 'ふーん。……ミオ。{今|いま}ゲーム{中|ちゅう}だから、{話|はな|話す}しかけないで。', en: '"Hmm. ...Mio. I\'m in the middle of a game, so don\'t talk to me."' },
      ] },
      { jp: '{今日|きょう}からここで{働|はたら|働く}きます。よろしくお{願|ねが|願う}いします。', en: '"I start working here today. Nice to meet you." (polite)', then: [
        { say: 'mio', expr: 'smirk', jp: '{かたい}ね。……ミオ。{今|いま}ゲーム{中|ちゅう}。', en: '"So stiff. ...I\'m Mio. In the middle of a game." Between coworkers your age, casual speech is normal.' },
      ] },
      { jp: 'そっちこそ{誰|だれ}？', en: '"Who are you, then?"', fx: { mio: 1 }, then: [
        { say: 'mio', expr: 'smirk', jp: '……ふふ。ミオ。{今|いま}ゲーム{中|ちゅう}。{話|はな|話す}しかけないで。', en: '"...Heh. Mio. I\'m in a game. Don\'t talk to me."' },
      ] },
    ] } },
    { show: 'emi', expr: 'smile', at: 'left' },
    { ifTime: { after: '09:00', then: [
      { say: 'emi', expr: 'smirk', jp: '{遅刻|ちこく}だよ、{新人|しんじん}くん。まあ、いいけど。{私|わたし}はエミ。ここのリーダー……{いちおう}ね。', en: '"You\'re late, new guy. Whatever. I\'m Emi. The leader here... technically."' },
    ], else: [
      { say: 'emi', expr: 'smile', jp: '{来|き|来る}た{来|き|来る}た。{君|きみ}が{新人|しんじん}くん？　{私|わたし}はエミ。ここのリーダー……{いちおう}ね。', en: '"There you are. You\'re the new guy? I\'m Emi. The leader here... technically."' },
    ] } },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'よろしくお{願|ねが|願う}いします。', en: '"Nice to meet you." (polite)', then: [{ say: 'emi', expr: 'smile', jp: 'まじめだね。', en: '"So serious."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', correct: true, fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smile', jp: 'うん、それでいいよ。', en: '"Yeah, that\'s fine." Emi prefers casual.' }] },
      { jp: '……{いちおう}？', en: '"...Technically?"', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smirk', jp: 'そう、{いちおう}。', en: '"Yep. Technically."' }] },
    ] } },
    { say: 'emi', expr: 'smile', jp: '{試用期間|しようきかん}は{三か月|さんかげつ}。……まあ、がんばって。', en: '"Your probation is three months. ...Well, do your best."' },
    { narrate: 'Emi shows you your desk, the coffee machine that only works if you hit it, and a login that doesn\'t work at all. An hour and a half disappears.' },
    { clock: '10:30' },
    { hideAll: true },
    { narrate: 'Emi takes a phone call in the corridor. Mio has her headphones on. You try the coffee machine. Dead.' },
    { choose: { prompt: 'The coffee machine is dead.', kind: 'action', options: [
      { jp: 'たたく', en: 'Hit it, like Emi said', retry: true, then: [{ narrate: 'You hit it. Nothing. Not even a hum.' }] },
      { jp: '（{小|ちい|小さい}さい{声|こえ}で）「{動|うご|動く}いて」', en: 'Quietly ask it: "Work."', then: [
        { narrate: 'The machine shudders, hums, and pours a perfect cup.' },
        { narrate: 'It has been like this since you were small. When you ask for something in Japanese and truly mean it, the world listens. The old word for it is 言霊, kotodama. Nobody at Amakawa knows. Better keep it that way.' },
      ] },
    ] } },
    { clock: '10:35' },
    { show: 'mio', expr: 'bored', at: 'right' }, { show: 'emi', expr: 'smile', at: 'left' },
    { say: 'emi', expr: 'smile', jp: '{さっそく}だけど、お{願|ねが|願う}いがあるの。', en: '"Straight to it: I need a favour."' },
    { say: 'emi', expr: 'smile', jp: '{三階|さんがい}の{営業部|えいぎょうぶ}に{行|い|行く}って、{黒田|くろだ}さんから{書類|しょるい}をもらってきて。', en: '"Go to Sales on the third floor and get the documents from Kuroda."' },
    { say: 'emi', expr: 'smirk', jp: '{十一時|じゅういちじ}までにね。', en: '"Before eleven."' },
    { say: 'mio', expr: 'smirk', jp: '{黒田|くろだ}レイ？　……がんばって。あの{人|ひと}、{こわい}よ。', en: '"Rei Kuroda? ...Good luck. She\'s scary."' },
    { hideAll: true },
    { goto: 'elevator2' },
  ],

  elevator2: [
    { bg: 'elevator' },
    { elevator: { target: '3F', wrong: WRONG_FLOOR } },
    { goto: 'sales' },
  ],

  sales: [
    { bg: 'sales' },
    { show: 'rei', expr: 'cold', at: 'center' },
    { ifTime: { after: '11:00', then: [
      { say: 'rei', expr: 'cold', jp: 'もう{遅|おそ|遅い}いよ。{会議|かいぎ}、{始|はじ|始まる}まった。', en: '"Too late. The meeting\'s already started."' },
      { narrate: 'She turns away. Your words can do a lot of things. Turning back the clock isn\'t one of them.' },
      { set: { lateDocs: true, gotDocs: false } },
      { hideAll: true }, { goto: 'office2' },
    ] } },
    { say: 'rei', expr: 'cold', jp: '{企画室|きかくしつ}7の{新人|しんじん}？　……ああ、{書類|しょるい}ね。', en: '"The new guy from Planning 7? ...Ah, the documents."' },
    { say: 'rei', expr: 'cold', jp: '{悪|わる|悪い}いけど、{今|いま}{忙|いそが|忙しい}しいの。{午後|ごご}に{来|き|来る}て。', en: '"Sorry, but I\'m busy right now. Come back this afternoon."' },
    { narrate: 'A salesman at the next desk is watching you over his monitor.' },
    { choose: { prompt: 'Emi needs them before eleven.', kind: 'reply', options: [
      { jp: 'お{願|ねが|願う}い、{今|いま}もらえない？', en: '"Please, can\'t I have them now?"', retry: true, then: [{ say: 'rei', expr: 'cold', jp: '{聞|き|聞く}こえなかった？　{午後|ごご}。', en: '"Didn\'t you hear me? Afternoon."' }] },
      { jp: 'わかった。じゃあ、{午後|ごご}にまた{来|く|来る}る。', en: '"Fine. I\'ll come back this afternoon."', then: [{ set: { gotDocs: false } }] },
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）　{見|み|見る}ている{人|ひと}：{一人|ひとり}', en: '(Use kotodama now. One person is watching.)', magic: true, then: [{ spell: 'reiSpell', witnesses: 1 }] },
      { jp: '（{人|ひと}がいなくなるまで{待|ま|待つ}つ）', en: '(Wait until the salesman leaves. About 15 minutes.)', then: [
        { time: 15 },
        { narrate: 'The salesman finally gets up for coffee. It\'s just you and Rei.' },
        { ifTime: { after: '11:00', then: [
          { say: 'rei', expr: 'cold', jp: 'まだいるの？　もう{遅|おそ|遅い}いよ。{会議|かいぎ}。', en: '"You\'re still here? It\'s too late now. I have a meeting."' },
          { set: { lateDocs: true, gotDocs: false } },
        ], else: [{ spell: 'reiSpell', witnesses: 0 }] } },
      ] },
    ] } },
    { hideAll: true },
    { goto: 'office2' },
  ],

  office2: [
    { bg: 'elevator' }, { narrate: 'You ride the elevator back down to basement level 2.' },
    { bg: 'office' }, { time: 8 },
    { show: 'mio', expr: 'bored', at: 'right' }, { show: 'emi', expr: 'smile', at: 'left' },
    { if: 'gotDocs', then: [
      { say: 'emi', expr: 'surprised', jp: 'え、もう？　{はやっ}！', en: '"What, already? That was fast!"' },
      { say: 'mio', expr: 'suspicious', jp: '……どうやったの？　あの{黒田|くろだ}さんから。', en: '"...How did you pull that off? From Kuroda, of all people."' },
      { choose: { prompt: 'Your secret is at stake.', kind: 'reply', options: [
        { jp: '{運|うん}がよかっただけ。', en: '"I just got lucky."', then: [{ say: 'mio', expr: 'suspicious', jp: 'ふーん……。', en: '"Hmm..."' }] },
        { jp: '{ひみつ}。', en: '"It\'s a secret."', fx: { mio: 1 }, then: [{ suspicion: 1 }, { say: 'mio', expr: 'smirk', jp: '……へえ。', en: '"...Oh, really." She\'ll remember that.' }] },
        { jp: '{黒田|くろだ}さん、やさしかったよ。', en: '"Kuroda was nice to me."', then: [{ say: 'mio', expr: 'smirk', jp: 'うそでしょ。', en: '"No way."' }] },
      ] } },
      { say: 'emi', expr: 'smile', jp: 'すごいじゃん。じゃあ、お{昼|ひる}にしよう。', en: '"Impressive. OK, lunchtime."' },
    ], else: [
      { say: 'emi', expr: 'smirk', jp: '{午後|ごご}か……。まあ、{初日|しょにち}だしね。お{昼|ひる}にしよう。', en: '"This afternoon, huh... Well, it\'s your first day. Let\'s get lunch."' },
    ] },
    { hideAll: true }, { clock: '12:05' },
    { choose: { prompt: 'Lunch. The signs point two ways.', kind: 'sign', options: [
      { jp: '{食堂|しょくどう}', en: 'Canteen', then: [{ goto: 'canteen' }] },
      { jp: '{屋上|おくじょう}', en: 'Rooftop', then: [{ goto: 'rooftop' }] },
    ] } },
  ],

  canteen: [
    { bg: 'canteen' }, { music: 'lively' },
    { show: 'kaori', expr: 'smile', at: 'center' },
    { say: 'kaori', expr: 'smile', jp: 'いらっしゃい。{何|なに}にする？', en: '"Welcome. What\'ll it be?"' },
    { menu: { items: [
      { jp: 'カレー', en: 'Curry', price: 500 },
      { jp: 'ラーメン', en: 'Ramen', price: 600 },
      { jp: '{日替わり|ひがわり}{定食|ていしょく}', en: 'Daily set meal', price: 700 },
    ] } },
    { pay: { wallet: [1000, 500, 100, 100] } },
    { hide: 'kaori' },
    { show: 'mio', expr: 'smirk', at: 'right' },
    { say: 'mio', expr: 'smirk', jp: 'こっち、こっち。', en: '"Over here, over here."' },
    { say: 'mio', expr: 'bored', jp: '{新人|しんじん}くん、ゲームする？', en: '"New guy, do you play games?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'する！', en: '"I do!"', fx: { mio: 2 }, then: [{ say: 'mio', expr: 'smirk', jp: '……へえ。じゃあ、{今度|こんど}、{対戦|たいせん}しよ。', en: '"...Huh. Then let\'s play against each other sometime."' }, { set: { mioDate: true } }] },
      { jp: 'あんまりしない。', en: '"Not much."', then: [{ say: 'mio', expr: 'bored', jp: 'ふーん。', en: '"Hmm."' }] },
    ] } },
    { hideAll: true },
    { goto: 'bar' },
  ],

  rooftop: [
    { bg: 'rooftop' }, { music: 'calm' },
    { show: 'goro', expr: 'smile', at: 'center' },
    { say: 'goro', expr: 'smile', jp: 'おや、{新人|しんじん}さんかい？　トマト、{食|た|食べる}べる？', en: '"Oh, a new face? Want a tomato?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{食|た|食べる}べる！', en: '"Yes please!"', fx: { goro: 2 }, then: [{ say: 'goro', expr: 'smile', jp: 'うまいだろう。{明日|あした}も{来|き|来る}なさい。', en: '"Good, eh? Come again tomorrow."' }] },
      { jp: '{だいじょうぶ}。', en: '"I\'m fine, thanks." (だいじょうぶ also works as a polite no)', then: [{ say: 'goro', expr: 'smile', jp: 'そうかい。', en: '"Is that so."' }] },
    ] } },
    { hideAll: true },
    { goto: 'bar' },
  ],

  bar: [
    { if: '!gotDocs', then: [{ narrate: 'In the afternoon you go back up to Sales. Rei hands over the folder without looking up from her screen.' }] },
    { clock: '19:10' },
    { if: 'casualGuard', then: [
      { bg: 'gate' }, { narrate: 'On your way out, the gate.' }, { show: 'ishibashi', expr: 'suspicious', at: 'center' },
      { say: 'ishibashi', expr: 'suspicious', jp: 'また{君|きみ}か。カード。', en: '"You again. Card." He remembers how you spoke to him this morning.' },
      { narrate: 'You show your card. He takes his time reading it.' }, { time: 5 },
      { hide: 'ishibashi' },
    ] },
    { bg: 'bar' }, { clock: '19:30' }, { music: 'night' },
    { narrate: 'Evening. A small bar tucked behind the dorm blocks.' },
    { show: 'jun', expr: 'neutral', at: 'center' },
    { say: 'jun', expr: 'neutral', jp: 'いらっしゃい。{初日|しょにち}？　{顔|かお}に{書|か|書く}いてあるよ。', en: '"Welcome. First day? It\'s written all over your face."' },
    { say: 'jun', expr: 'neutral', jp: '{今日|きょう}、{一番|いちばん}{大変|たいへん}だったのは{何|なに}？', en: '"What was the hardest part of today?"' },
    { freeTalk: {
      with: 'jun', turns: 2,
      goal: 'Tell Jun the hardest part of your day. He knows when you make things up.',
      checkFacts: true,
      fallback: [
        { choose: { prompt: 'The hardest part of today?', kind: 'reply', options: [
          { jp: '{黒田|くろだ}さん。', en: '"Kuroda."', correct: true, fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'ああ、{営業部|えいぎょうぶ}の。……{気|き}をつけて。', en: '"Ah, the one from Sales. ...Be careful."' }] },
          { jp: 'エレベーター。', en: '"The elevator."', if: 'wrongFloor', correct: true, fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'あのビル、{迷|まよ|迷う}うよね。', en: '"That building is a maze, isn\'t it."' }] },
          { jp: 'コピー{機|き}。', en: '"The copier."', then: [{ say: 'jun', expr: 'neutral', jp: '……{今日|きょう}、コピー、したっけ？', en: '"...Did you even make copies today?" He knows you\'re making it up.' }] },
          { jp: '{つかれた}。{全部|ぜんぶ}。', en: '"I\'m tired. All of it."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'ほら、これ。{サービス}。', en: '"Here. On the house."' }] },
        ] } },
      ],
    } },
    { hideAll: true },
    { if: 'gotDocs', then: [{ msg: { from: 'rei', jp: '{今日|きょう}の、あれ。{何|なに}？', en: 'That thing today. What was it?' } }], else: [{ msg: { from: 'emi', jp: '{今日|きょう}はおつかれ。{明日|あした}もよろしくね。', en: 'Good work today. See you tomorrow.' } }] },
    { summary: true },
  ],
};

// Spells used by scenes above, referenced by name from `spell: 'name'` steps.
export const SPELLS = {
  reiSpell: {
    goal: 'Make Rei hand over the documents.',
    hint: 'Spells are ordinary words said with intent. To ask someone to do something, use the te-form. 渡す (to hand over) is a す-verb.',
    verbs: [
      { key: '渡す', en: 'hand over', forms: [['渡す', 'わたす'], ['渡して', 'わたして'], ['渡した', 'わたした']] },
      { key: '待つ', en: 'wait', forms: [['待つ', 'まつ'], ['待って', 'まって'], ['待った', 'まった']] },
    ],
    answer: '渡して',
    outcomes: {
      '待って': [{ say: 'rei', expr: 'confused', jp: '……？　{何|なに}？　{今|いま}、{体|からだ}が{止|と|止まる}まった……。', en: '"...? What? My body just... stopped." The wrong spell. She froze, but she didn\'t hand anything over.' }, { suspicion: 1 }, { set: { waitBackfire: true } }],
      default: [{ say: 'rei', expr: 'cold', jp: '……{何|なに}か{言|い|言う}った？', en: '"...Did you say something?" The words fizzled: that form doesn\'t ask anything of anyone.' }],
    },
    success: [
      { say: 'rei', expr: 'confused', jp: '……え？　あ、うん。はい、これ。', en: '"...Huh? Oh, sure. Here."' },
      { narrate: 'She hands you a thick folder, then stares at her own empty hand.' },
      { say: 'rei', expr: 'confused', jp: '……なんで{渡|わた|渡す}したんだろう。', en: '"...Why did I just hand that over?"' },
      { say: 'rei', expr: 'smirk', jp: '{君|きみ}、おもしろいね。', en: '"You\'re interesting."' },
      { set: { gotDocs: true } }, { fx: { rei: 1 } }, { suspicion: 1 },
    ],
  },
};
