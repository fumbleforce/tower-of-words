// Day 3: Rei's question. Grammar: 〜が好き / きらい (likes), casual questions with の (〜なの？).
// Spell: 待って used on the elevator door, with a witness (Yuzuki). Katakana block: the café menu. New cast: Yuzuki.
// Hook: Yuzuki wants an interview on Friday.
export const DAY = 3;
export const SCENES = {
  day3_morning: [
    { bg: 'dorm' }, { clock: '07:45' }, { music: 'calm' },
    { msg: { from: 'rei', jp: '{十二時|じゅうにじ}、{一階|いっかい}のカフェ。{一人|ひとり}で{来|き|来る}て。', en: 'Twelve o\'clock, the café on the first floor. Come alone.' } },
    { msg: { from: 'emi', jp: '{今日|きょう}は{午後|ごご}から{外|そと}。{何|なに}かあったら、{連絡|れんらく}して。', en: 'I\'m out from this afternoon. If anything happens, contact me.' } },
    { pin: {
      prompt: 'Rei\'s message. When and where?',
      fields: [
        { id: 'time', label: '{何時|なんじ}？', labelEn: 'When?', en: ["ten o'clock", "noon", "two o'clock"], options: ['{十時|じゅうじ}', '{十二時|じゅうにじ}', '{二時|にじ}'], answer: 1 },
        { id: 'place', label: 'どこ？', labelEn: 'Where?', en: ["the café, ground floor", "the rooftop", "Sales, 3rd floor"], options: ['{一階|いっかい}のカフェ', '{屋上|おくじょう}', '{三階|さんがい}の{営業部|えいぎょうぶ}'], answer: 0 },
      ],
    } },
    { goto: 'day3_office' },
  ],

  day3_office: [
    { bg: 'office' }, { clock: '09:05' }, { music: 'office' },
    { show: 'mio', expr: 'bored', at: 'right' },
    { say: 'mio', expr: 'bored', jp: 'ねえ。{新人|しんじん}くんって、{何|なに}が{好|す|好き}きなの？', en: '"Hey. What do you like, new guy?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'ゲームが{好|す|好き}き。', en: '"I like games."', fx: { mio: 1 }, then: [{ say: 'mio', expr: 'smirk', jp: '{知|し|知る}ってる。{昨日|きのう}、{目|め}がひかってた。', en: '"I know. Your eyes lit up yesterday."' }] },
      { jp: '{日本|にほん}のアニメが{好|す|好き}き。', en: '"I like Japanese anime."', then: [{ say: 'mio', expr: 'bored', jp: 'ふーん。{何|なに}のアニメ？', en: '"Hmm. Which anime?"' }, { freeReply: { prompt: 'Name one (romaji is fine).', accept: 'any', then: [{ say: 'mio', expr: 'smirk', jp: '……センス、{悪|わる|悪い}くないね。', en: '"...Not bad taste."' }] } }] },
      { jp: 'ミオさんは？', en: '"What about you, Mio?"', fx: { mio: 1 }, then: [{ say: 'mio', expr: 'smirk', jp: '{静|しず|静か}かな{場所|ばしょ}。……と、ゲーム。{人|ひと}は、ちょっときらい。', en: '"Quiet places. ...And games. People, not so much."' }] },
    ] } },
    { say: 'mio', expr: 'suspicious', jp: 'あと、{黒田|くろだ}さんに{気|き}をつけて。あの{人|ひと}、{昨日|きのう}から{君|きみ}のこと、{聞|き|聞く}いてまわってる。', en: '"Also, watch out for Kuroda. Since yesterday she\'s been asking around about you."' },
    { hideAll: true },
    { clock: '11:52' },
    { goto: 'day3_elevator' },
  ],

  day3_elevator: [
    { bg: 'elevator' },
    { narrate: 'Eight minutes to twelve. The elevator doors are already closing, and someone is inside.' },
    { choose: { prompt: 'The doors are closing.', kind: 'action', options: [
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: '(Use kotodama. Someone is inside: 1 witness)', magic: true, then: [
        { spell: {
          goal: 'Stop the elevator doors.',
          witnesses: 1,
          hint: 'You already know this one. Asking someone, or something, to wait: 待つ becomes 待って.',
          verbs: [
            { key: '待つ', en: 'wait', forms: [['待つ', 'まつ'], ['待って', 'まって'], ['待った', 'まった']] },
            { key: '渡す', en: 'hand over', forms: [['渡す', 'わたす'], ['渡して', 'わたして'], ['渡した', 'わたした']] },
          ],
          answer: '待って',
          outcomes: {
            '渡して': [{ narrate: 'The doors close. A second later a business card slides out through the gap and lands at your feet. You take the stairs.' }, { time: 6 }, { set: { tookStairs: true } }],
            default: [{ narrate: 'The doors close in your face. You take the stairs.' }, { time: 6 }, { set: { tookStairs: true } }],
          },
          success: [
            { narrate: 'The doors stop halfway. They don\'t bounce back. They just stop, as if the building is holding its breath.' },
            { set: { yuzukiSawDoor: true } },
          ],
        } },
      ] },
      { jp: '{階段|かいだん}で{行|い|行く}く', en: 'Take the stairs', then: [{ time: 6 }, { set: { tookStairs: true } }] },
    ] } },
    { if: 'yuzukiSawDoor', then: [
      { show: 'yuzuki', expr: 'smile', at: 'center' },
      { say: 'yuzuki', expr: 'serious', jp: '……{今|いま}、ドア、{止|と|止まる}まったよね？', en: '"...The door just stopped, didn\'t it?"' },
      { choose: { prompt: 'Your reply', kind: 'reply', options: [
        { jp: 'そう？　{気|き}のせいだよ。', en: '"Did it? You must be imagining it."', then: [{ say: 'yuzuki', expr: 'smile', jp: 'ふふ。そういうことにしておく。', en: '"Heh. I\'ll pretend that\'s true."' }] },
        { jp: 'このエレベーター、{古|ふる|古い}いから。', en: '"This elevator\'s old."', then: [{ say: 'yuzuki', expr: 'smile', jp: '{先月|せんげつ}、{新|あたら|新しい}しくなったんだけどね。', en: '"It was replaced last month, actually."' }, { suspicion: 1 }] },
      ] } },
      { say: 'yuzuki', expr: 'smile', jp: '{君|きみ}、{企画室|きかくしつ}7の{新人|しんじん}くんでしょ。{私|わたし}、{広報|こうほう}のユヅキ。{社内報|しゃないほう}も{作|つく|作る}ってるの。', en: '"You\'re the new hire in Planning 7, right? I\'m Yuzuki from PR. I also make the in-house paper."' },
      { say: 'yuzuki', expr: 'smile', jp: 'また、{話|はな|話す}そうね。', en: '"Let\'s talk again sometime."' },
      { hideAll: true },
    ] },
    { goto: 'day3_cafe' },
  ],

  day3_cafe: [
    { bg: 'cafe' }, { music: 'lively' },
    { ifTime: { after: '12:00', then: [{ set: { lateRei: true } }] } },
    { show: 'rei', expr: 'cold', at: 'center' },
    { if: 'lateRei', then: [{ say: 'rei', expr: 'cold', jp: '{二分|にふん}{遅刻|ちこく}。……まあ、すわって。', en: '"Two minutes late. ...Well, sit down."' }], else: [{ say: 'rei', expr: 'cold', jp: '{時間|じかん}どおりね。すわって。', en: '"Right on time. Sit."' }] },
    { say: 'rei', expr: 'cold', jp: '{何|なに}か{飲|の|飲む}む？　{私|わたし}が{払|はら|払う}う。', en: '"Want something to drink? My treat."' },
    { menu: { title: 'MENU', items: [
      { jp: 'コーヒー', en: 'Coffee', price: 300 },
      { jp: 'カフェラテ', en: 'Café latte', price: 400 },
      { jp: 'チーズケーキ', en: 'Cheesecake', price: 450 },
      { jp: 'オレンジジュース', en: 'Orange juice', price: 350 },
    ], noPay: true } },
    // gotDocs comes from day 1 (the first spell). Without it, Rei is curious for a different reason.
    { if: 'gotDocs', then: [
      { say: 'rei', expr: 'cold', jp: 'で。{月曜日|げつようび}の、{何|なに}だったの？　{私|わたし}、なんで{書類|しょるい}を{渡|わた|渡す}したの？', en: '"So. What was that on Monday? Why did I hand you those papers?"' },
      { choose: { prompt: 'She is watching your face very carefully.', kind: 'reply', options: [
        { jp: '{何|なに}もしてないよ。', en: '"I didn\'t do anything."', fx: { rei: -1 }, then: [{ say: 'rei', expr: 'cold', jp: 'うそが{下手|へた}ね。', en: '"You\'re a bad liar."' }] },
        { jp: '{黒田|くろだ}さんが、やさしいから。', en: '"Because you\'re kind, Kuroda."', fx: { rei: 1 }, then: [{ say: 'rei', expr: 'smirk', jp: '……{私|わたし}、やさしくないよ。{営業部|えいぎょうぶ}で{一番|いちばん}こわいって{言|い|言う}われてる。', en: '"...I\'m not kind. People in Sales call me the scariest one there."' }] },
        { jp: '……{言|い|言う}えない。', en: '"...I can\'t tell you."', fx: { rei: 2 }, then: [{ suspicion: 1 }, { say: 'rei', expr: 'confused', jp: '……{言|い|言う}えないって{何|なに}。ちょっと、おもしろいじゃない。', en: '"...What do you mean, you can\'t tell me? Now that\'s interesting."' }] },
      ] } },
    ], else: [
      { say: 'rei', expr: 'cold', jp: 'で。{昨日|きのう}の{会議|かいぎ}から、{君|きみ}のことがちょっと{気|き}になって。{企画室|きかくしつ}7に、なんで{来|き|来る}たの？', en: '"So. Since yesterday\'s meeting I\'ve been curious about you. Why did you join Planning 7?"' },
      { choose: { prompt: 'Your reply', kind: 'reply', options: [
        { jp: '{日本|にほん}で{働|はたら|働く}きたかったから。', en: '"Because I wanted to work in Japan."', then: [{ say: 'rei', expr: 'cold', jp: 'ふうん。{普通|ふつう}の{答|こた|答え}えね。', en: '"Hmm. An ordinary answer."' }] },
        { jp: 'エミさんが{呼|よ|呼ぶ}んでくれたから。', en: '"Because Emi brought me in."', fx: { rei: 1 }, then: [{ say: 'rei', expr: 'smirk', jp: '{真壁|まかべ}さんが？　……へえ。', en: '"Makabe did? ...Interesting."' }] },
      ] } },
    ] },
    { say: 'rei', expr: 'smirk', jp: '{君|きみ}は、{何|なに}が{好|す|好き}き？　{仕事|しごと}で。', en: '"What do you like? At work, I mean."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{新|あたら|新しい}しいことを{考|かんが|考える}えるのが{好|す|好き}き。', en: '"I like thinking up new things."', then: [{ say: 'rei', expr: 'smirk', jp: '{企画室|きかくしつ}7らしい{答|こた|答え}えね。', en: '"Very Planning 7 of you."' }] },
      { jp: '{黒田|くろだ}さんは？', en: '"What about you?"', fx: { rei: 1 }, then: [{ say: 'rei', expr: 'smirk', jp: '{勝|か|勝つ}つのが{好|す|好き}き。{負|ま|負ける}けるのは、{大|だい|大きらい}きらい。', en: '"I like winning. I hate losing."' }] },
    ] } },
    { say: 'rei', expr: 'cold', jp: '{来週|らいしゅう}、{夏祭|なつまつ|夏祭り}りのコンペがある。{企画室|きかくしつ}7には、{負|ま|負ける}けないから。', en: '"Next week there\'s a pitch competition for the summer festival. I won\'t lose to Planning 7."' },
    { say: 'rei', expr: 'smirk', jp: '……でも、{君|きみ}の{秘密|ひみつ}は、ちょっと{知|し|知る}りたい。', en: '"...But I do want to know your secret, a little."' },
    { hideAll: true },
    { goto: 'day3_afternoon' },
  ],

  day3_afternoon: [
    { bg: 'office' }, { clock: '15:00' }, { music: 'office' },
    { if: 'helpedAoi', then: [
      { show: 'aoi', expr: 'grin', at: 'center' },
      { say: 'aoi', expr: 'grin', jp: 'これ、{昨日|きのう}のお{礼|れい}！　{缶|かん}コーヒー。{好|す|好き}き？', en: '"This is for yesterday! A can of coffee. Do you like it?"' },
      { choose: { prompt: 'Your reply', kind: 'reply', options: [
        { jp: '{大好|だいす|大好き}き。ありがとう。', en: '"Love it. Thanks."', fx: { aoi: 1 }, then: [] },
        { jp: 'コーヒーはちょっと{苦手|にがて}。', en: '"I\'m not great with coffee."', then: [{ say: 'aoi', expr: 'panic', jp: 'えー！　じゃあ{明日|あした}、ジュースにする！', en: '"Noo! Then tomorrow I\'ll bring juice!"' }] },
      ] } },
      { hide: 'aoi' },
    ], else: [
      { narrate: 'The afternoon passes in spreadsheets. From the copy room down the hall you hear Aoi arguing with the machine again.' },
    ] },
    { goto: 'day3_evening' },
  ],

  day3_evening: [
    { clock: '18:40' },
    { choose: { prompt: 'Evening. Where do you go?', kind: 'sign', options: [
      { jp: '{屋上|おくじょう}', en: 'Rooftop', then: [
        { bg: 'rooftop' }, { music: 'calm' }, { show: 'goro', expr: 'smile', at: 'center' },
        { say: 'goro', expr: 'smile', jp: 'トマト、{元気|げんき}になったよ。{君|きみ}が{来|く|来る}るの、{待|ま|待つ}ってた。', en: '"The tomatoes perked up. I was waiting for you to come."' },
        { fx: { goro: 1 } },
      ] },
      { jp: '{寮|りょう}', en: 'The dorm (rest)', then: [
        { bg: 'dorm' }, { narrate: 'An early night. You reread today\'s messages before you fall asleep.' }, { reviewMessages: { count: 3 } },
      ] },
    ] } },
    { hideAll: true }, { clock: '22:15' },
    { msg: { from: 'yuzuki', jp: '{金曜日|きんようび}、{社内報|しゃないほう}のインタビュー、させて。{新人|しんじん}くんの{特集|とくしゅう}。{逃|に|逃げる}げないでね。', en: 'Let me interview you for the in-house paper on Friday. A feature on the new hire. Don\'t run away.' } },
    { summary: true },
  ],
};
