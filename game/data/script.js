// Day 1 script. Markup in jp lines: {kanji|kana|dictionary key} or {kana word}. English is hidden until asked for.
export const CAST = {
  announcer: { name: 'アナウンス', en: 'Announcement', color: '#9fd3ff' },
  ishibashi: { name: '石橋', en: 'Ishibashi', color: '#a9c4ff' },
  mio: { name: 'ミオ', en: 'Mio', color: '#7fe0b8' },
  emi: { name: 'エミ', en: 'Emi', color: '#ff9a8a' },
  rei: { name: 'レイ', en: 'Rei', color: '#e6e6f0' },
  kaori: { name: 'カオリ', en: 'Kaori', color: '#ffd28a' },
  goro: { name: 'ゴロー', en: 'Goro', color: '#c7e89a' },
  jun: { name: 'ジュン', en: 'Jun', color: '#d8b7ff' },
};

// Floors of the Amakawa tower, top to bottom. Labels are Japanese; the panel is how you navigate.
export const FLOORS = [
  { id: 'R', jp: '{屋上|おくじょう}　{庭園|ていえん}' },
  { id: '5F', jp: '{五階|ごかい}　{役員室|やくいんしつ}' },
  { id: '3F', jp: '{三階|さんがい}　{営業部|えいぎょうぶ}' },
  { id: '2F', jp: '{二階|にかい}　{社内報|しゃないほう}' },
  { id: '1F', jp: '{一階|いっかい}　ロビー' },
  { id: 'B1', jp: '{地下一階|ちかいっかい}　{倉庫|そうこ}' },
  { id: 'B2', jp: '{地下二階|ちかにかい}　{企画室|きかくしつ}7' },
];

const WRONG_FLOOR = {
  R: [{ narrate: 'Wind, tomato plants and an old man waving a trowel at you. Wrong floor.' }, { time: 3 }],
  '5F': [{ narrate: 'Thick carpet, silent corridors, a secretary staring at your lanyard. Definitely the wrong floor.' }, { time: 3 }],
  '3F': [
    { show: 'rei', expr: 'smirk', at: 'center' },
    { say: 'rei', expr: 'smirk', jp: '{迷子|まいご}？　{新人|しんじん}さん。', en: '"Lost, new guy?"' },
    { hide: 'rei' }, { time: 3 },
  ],
  '2F': [{ narrate: 'A newsroom full of people typing very fast. Wrong floor.' }, { time: 3 }],
  '1F': [{ narrate: 'The lobby again. You press another button.' }, { time: 2 }],
  B1: [{ narrate: 'Boxes, shelves, a flickering light. This is storage.' }, { time: 3 }],
  B2: [{ narrate: 'Basement level 2 again. Not where you need to be.' }, { time: 2 }],
};

export const SCENES = {
  monorail: [
    { bg: 'monorail' }, { clock: '08:40' }, { music: 'calm' },
    { narrate: 'Your first day at Amakawa. The monorail glides across Tokyo Bay toward the company\'s island city.' },
    { say: 'announcer', jp: 'まもなく、{天川|あまかわ}シティ{中央|ちゅうおう}{駅|えき}です。お{出口|でぐち}は{右側|みぎがわ}です。', en: '"Arriving shortly at Amakawa City Central Station. The exit is on the right."' },
    { msg: { from: 'emi', jp: 'おはよう！{九時|くじ}に{地下|ちか}{二階|にかい}の{企画室|きかくしつ}7に{来|き|来る}てね。', en: 'Morning! Come to Planning Office 7, basement level 2, at nine.' } },
    { task: '{九時|くじ}・{地下|ちか}{二階|にかい}・{企画室|きかくしつ}7' },
    { choose: { prompt: 'The train slows down. Which doors do you wait at?', kind: 'action', options: [
      { jp: '{右|みぎ}のドア', en: 'The right-hand doors', correct: true, then: [{ narrate: 'The right-hand doors slide open onto the platform.' }] },
      { jp: '{左|ひだり}のドア', en: 'The left-hand doors', then: [{ narrate: 'The left doors stay shut. You squeeze across the crowded carriage as the right-hand doors open.' }, { time: 2 }] },
    ] } },
    { goto: 'gate' },
  ],

  gate: [
    { bg: 'gate' }, { time: 6 },
    { show: 'ishibashi', expr: 'neutral', at: 'center' },
    { say: 'ishibashi', expr: 'neutral', jp: '{止|と|止まる}まれ。', en: '"Stop."' },
    { say: 'ishibashi', expr: 'suspicious', jp: '{見|み|見る}ない{顔|かお}だな。IDカードは？', en: '"Don\'t know your face. ID card?"' },
    { choose: { prompt: 'What do you do?', kind: 'action', options: [
      { jp: 'IDカードを{見|み|見せる}せる', en: 'Show your ID card', correct: true, then: [] },
      { jp: '{名刺|めいし}を{出|だ|出す}す', en: 'Hand him a business card', retry: true, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '{名刺|めいし}じゃない。ID。', en: '"Not a business card. ID."' }] },
      { jp: 'にっこり{笑|わら|笑う}う', en: 'Smile brightly', retry: true, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '……{笑|わら|笑う}ってもダメだ。ID。', en: '"...Smiling won\'t help. ID."' }] },
    ] } },
    { say: 'ishibashi', expr: 'neutral', jp: '……{新人|しんじん}か。{企画室|きかくしつ}7？　ああ、{地下|ちか}のね。', en: '"...A new hire. Planning Office 7? Ah, the basement one."' },
    { say: 'ishibashi', expr: 'suspicious', jp: '{変|へん}なことしたら、すぐわかるからな。', en: '"Do anything strange and I\'ll know right away."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'はい、よろしくお{願|ねが|願う}いします。', en: '"Yes, nice to meet you." (polite)', fx: { ishibashi: 1 }, then: [{ say: 'ishibashi', expr: 'neutral', jp: '……ん。', en: '"...Mm."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', fx: { ishibashi: -1 }, then: [{ say: 'ishibashi', expr: 'suspicious', jp: '……{若|わか|若い}いな。', en: '"...Young, aren\'t you." Casual speech with an older stranger on duty comes across as cheeky.' }] },
      { jp: '{変|へん}なこと？', en: '"Something strange?"', then: [{ say: 'ishibashi', expr: 'neutral', jp: '{気|き}にするな。{行|い|行く}け。', en: '"Never mind. Go."' }] },
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
      { jp: '{新人|しんじん}だよ。よろしく。', en: '"The new guy. Nice to meet you." (casual)', fx: { mio: 1 }, then: [{ say: 'mio', expr: 'bored', jp: 'ふーん。', en: '"Hmm."' }] },
      { jp: '{今日|きょう}からここで{働|はたら|働く}きます。よろしくお{願|ねが|願う}いします。', en: '"I start working here today. Nice to meet you." (polite)', then: [{ say: 'mio', expr: 'smirk', jp: '{かたい}ね。', en: '"So stiff." Between coworkers your age, casual speech is normal.' }] },
      { jp: 'そっちこそ{誰|だれ}？', en: '"Who are you, then?"', fx: { mio: 1 }, then: [{ say: 'mio', expr: 'smirk', jp: '……ふふ。', en: '"...Heh."' }] },
    ] } },
    { say: 'mio', expr: 'bored', jp: 'ミオ。ゲーム{中|ちゅう}だから、{話|はな|話す}しかけないで。', en: '"Mio. I\'m in the middle of a game, so don\'t talk to me."' },
    { ifLate: '09:00', then: [{ show: 'emi', expr: 'smirk', at: 'left' }, { say: 'emi', expr: 'smirk', jp: '{遅刻|ちこく}だよ。まあ、いいけど。', en: '"You\'re late. Whatever."' }] },
    { show: 'emi', expr: 'smile', at: 'left' },
    { say: 'emi', expr: 'smile', jp: '{来|き|来る}た{来|き|来る}た。{君|きみ}が{新人|しんじん}くん？　{私|わたし}はエミ。ここのリーダー……{いちおう}ね。', en: '"There you are. You\'re the new guy? I\'m Emi. The leader here... technically."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'よろしくお{願|ねが|願う}いします。', en: '"Nice to meet you." (polite)', then: [{ say: 'emi', expr: 'smile', jp: 'まじめだね。', en: '"So serious."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smile', jp: 'いいね、それで。', en: '"Good, like that." Emi prefers casual.' }] },
      { jp: '……{いちおう}？', en: '"...Technically?"', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smirk', jp: 'そう、{いちおう}。', en: '"Yep. Technically."' }] },
    ] } },
    { say: 'emi', expr: 'smile', jp: '{さっそく}だけど、お{願|ねが|願う}いがあるの。', en: '"Straight to it: I need a favour."' },
    { say: 'emi', expr: 'smile', jp: '{三階|さんがい}の{営業部|えいぎょうぶ}に{行|い|行く}って、{黒田|くろだ}さんから{書類|しょるい}をもらってきて。', en: '"Go to Sales on the third floor and get the documents from Kuroda."' },
    { say: 'emi', expr: 'smirk', jp: '{十一時|じゅういちじ}までにね。', en: '"Before eleven."' },
    { task: '{三階|さんがい}・{営業部|えいぎょうぶ}・{黒田|くろだ}さん・{書類|しょるい}・{十一時|じゅういちじ}' },
    { say: 'mio', expr: 'smirk', jp: '{黒田|くろだ}レイ？　……がんばって。あの{人|ひと}、{こわい}よ。', en: '"Rei Kuroda? ...Good luck. She\'s scary."' },
    { narrate: 'You feel the words humming in your chest. Nobody here knows what you can do.' },
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
    { say: 'rei', expr: 'cold', jp: '{企画室|きかくしつ}7の{新人|しんじん}？　……ああ、{書類|しょるい}ね。', en: '"The new guy from Planning 7? ...Ah, the documents."' },
    { say: 'rei', expr: 'cold', jp: '{悪|わる|悪い}いけど、{今|いま}{忙|いそが|忙しい}しいの。{午後|ごご}に{来|き|来る}て。', en: '"Sorry, but I\'m busy right now. Come back this afternoon."' },
    { choose: { prompt: 'Emi needs them before eleven.', kind: 'reply', options: [
      { jp: 'お{願|ねが|願う}い、{今|いま}ほしい。', en: '"Please, I need them now."', retry: true, then: [{ say: 'rei', expr: 'cold', jp: '{聞|き|聞く}こえなかった？　{午後|ごご}。', en: '"Didn\'t you hear me? Afternoon."' }] },
      { jp: 'わかった。{午後|ごご}に{来|く|来る}る。', en: '"Fine. I\'ll come back this afternoon."', then: [{ set: { gotDocs: false } }] },
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: '(Use kotodama)', magic: true, then: [
        { spell: {
          goal: 'Make Rei hand over the documents.',
          hint: 'Spells are ordinary words said with intent. To ask someone to do something, use the te-form: 手伝う becomes 手伝って.',
          verbs: [
            { key: '手伝う', en: 'help', forms: [['手伝う', 'てつだう'], ['手伝って', 'てつだって'], ['手伝った', 'てつだった']] },
            { key: '待つ', en: 'wait', forms: [['待つ', 'まつ'], ['待って', 'まって'], ['待った', 'まった']] },
          ],
          answer: '手伝って',
          outcomes: {
            '待って': [{ say: 'rei', expr: 'confused', jp: '……？　{何|なに}？　{今|いま}、{体|からだ}が{止|と|止まる}まった……。', en: '"...? What? My body just... stopped." The wrong spell. She froze, but she didn\'t help.' }, { suspicion: 1 }],
            default: [{ say: 'rei', expr: 'cold', jp: '……{何|なに}か{言|い|言う}った？', en: '"...Did you say something?" The words fizzled: that form doesn\'t ask anything of anyone.' }],
          },
          success: [
            { say: 'rei', expr: 'confused', jp: '……え？　あ、うん。はい、これ。', en: '"...Huh? Oh, sure. Here."' },
            { narrate: 'She hands you a thick folder, then stares at her own empty hand.' },
            { say: 'rei', expr: 'confused', jp: '……なんで{渡|わた|渡す}したんだろう。', en: '"...Why did I just hand that over?"' },
            { say: 'rei', expr: 'smirk', jp: '{君|きみ}、おもしろいね。', en: '"You\'re interesting."' },
            { set: { gotDocs: true } }, { fx: { rei: 1 } }, { suspicion: 1 },
          ],
        } },
      ] },
    ] } },
    { hideAll: true },
    { goto: 'office2' },
  ],

  office2: [
    { bg: 'office' }, { time: 8 },
    { show: 'mio', expr: 'bored', at: 'right' }, { show: 'emi', expr: 'smile', at: 'left' },
    { if: 'gotDocs', then: [
      { say: 'emi', expr: 'surprised', jp: 'え、もう？　{はやっ}！', en: '"What, already? That was fast!"' },
      { say: 'mio', expr: 'suspicious', jp: '……どうやったの？　あの{黒田|くろだ}さんから。', en: '"...How did you pull that off? From Kuroda, of all people."' },
      { choose: { prompt: 'Your secret is at stake.', kind: 'reply', options: [
        { jp: '{運|うん}がよかっただけ。', en: '"I just got lucky."', then: [{ say: 'mio', expr: 'suspicious', jp: 'ふーん……。', en: '"Hmm..."' }] },
        { jp: '{ひみつ}。', en: '"It\'s a secret."', fx: { mio: 1 }, then: [{ suspicion: 1 }, { say: 'mio', expr: 'smirk', jp: '……へえ。', en: '"...Oh, really." She\'ll remember that.' }] },
        { jp: '{黒田|くろだ}さん、やさしかったよ。', en: '"Kuroda was nice to me."', then: [{ say: 'mio', expr: 'smirk', jp: 'うそだ。', en: '"Liar."' }] },
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
      { jp: 'カレー', en: 'Curry', price: '五百円', priceKana: 'ごひゃくえん' },
      { jp: 'ラーメン', en: 'Ramen', price: '六百円', priceKana: 'ろっぴゃくえん' },
      { jp: '{日替わり定食|ひがわりていしょく}', en: 'Daily set meal', price: '七百円', priceKana: 'ななひゃくえん' },
    ] } },
    { pay: { coins: ['五百円', '六百円', '七百円'],
      tooLittle: [{ say: 'kaori', expr: 'smile', jp: '{足|た|足りる}りないよ。', en: '"That\'s not enough."' }],
      tooMuch: [{ say: 'kaori', expr: 'smile', jp: '{多|おお|多い}いよ。はい、おつり。', en: '"That\'s too much. Here\'s your change."' }],
      right: [{ say: 'kaori', expr: 'smile', jp: 'ちょうどね。ありがとう。', en: '"Exact change. Thanks."' }, { fx: { kaori: 1 } }],
    } },
    { hide: 'kaori' },
    { show: 'mio', expr: 'smirk', at: 'right' },
    { say: 'mio', expr: 'smirk', jp: 'こっち、こっち。', en: '"Over here, over here."' },
    { say: 'mio', expr: 'bored', jp: '{新人|しんじん}くん、ゲームする？', en: '"New guy, do you play games?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'する！', en: '"I do!"', fx: { mio: 2 }, then: [{ say: 'mio', expr: 'smirk', jp: '……じゃあ、{今夜|こんや}、{一緒|いっしょ}にやる？', en: '"...Then want to play together tonight?"' }, { set: { mioDate: true } }] },
      { jp: 'あまりしない。', en: '"Not much."', then: [{ say: 'mio', expr: 'bored', jp: 'ふーん。', en: '"Hmm."' }] },
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
      { jp: 'だいじょうぶ。', en: '"I\'m fine, thanks."', then: [{ say: 'goro', expr: 'smile', jp: 'そうかい。', en: '"Is that so."' }] },
    ] } },
    { hideAll: true },
    { goto: 'bar' },
  ],

  bar: [
    { bg: 'bar' }, { clock: '19:30' }, { music: 'night' },
    { narrate: 'Evening. A small bar tucked behind the dorm blocks.' },
    { show: 'jun', expr: 'neutral', at: 'center' },
    { say: 'jun', expr: 'neutral', jp: 'いらっしゃい。{初日|しょにち}？　{顔|かお}に{書|か|書く}いてあるよ。', en: '"Welcome. First day? It\'s written all over your face."' },
    { freeTalk: {
      with: 'jun', turns: 3,
      goal: 'Tell Jun how your first day went.',
      persona: 'Jun, 40, the quiet bartender of a small bar inside the Amakawa company city. Calm, dry, kind, a little mysterious. Speaks short casual Japanese.',
      fallback: [
        { choose: { prompt: 'Your reply', kind: 'reply', options: [
          { jp: '{つかれた}。', en: '"I\'m tired."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'ほら、これ。{サービス}。', en: '"Here. On the house."' }] },
          { jp: 'たのしかった。', en: '"It was fun."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'いいね。{明日|あした}もがんばって。', en: '"Good. Hang in there tomorrow too."' }] },
        ] } },
      ],
    } },
    { hideAll: true },
    { summary: true },
  ],
};
