// Day 5: Friday. Grammar: 〜たい review, now asked of other people (〜たいの？). Spell: 大丈夫だよ (calm someone), learned on day 2.
// Katakana block: インタビュー, カメラ, ゲーム, ビール, コントローラー.
// Reward: Mio's game night (flagged, suggestive at most). Hook: Emi's Monday announcement.
export const DAY = 5;
export const SCENES = {
  day5_morning: [
    { bg: 'dorm' }, { clock: '08:00' }, { music: 'calm' },
    { narrate: 'Friday. Your phone has been buzzing since seven.' },
    { msg: { from: 'yuzuki', jp: '{十時|じゅうじ}、{三階|さんがい}の{広報室|こうほうしつ}ね。カメラもあるから、{髪|かみ}、ちゃんとして。', en: 'Ten o\'clock, PR office on the third floor. There\'s a camera too, so do your hair properly.' } },
    { msg: { from: 'aoi', jp: 'あたしも{写真|しゃしん}、{呼|よ|呼ぶ}ばれた……{一緒|いっしょ}に{行|い|行く}ってもいい？', en: 'I got called in for the photo too... Can I go with you?' } },
    { choose: { prompt: 'Reply to Aoi', kind: 'reply', options: [
      { jp: 'いいよ。{九時半|くじはん}に{一階|いっかい}で。', en: 'Sure. Ground floor at 9:30.', fx: { aoi: 1 } },
      { jp: 'うん。', en: 'Yeah.' },
    ] } },
    { goto: 'day5_interview' },
  ],

  day5_interview: [
    { bg: 'pr' }, { clock: '10:00' }, { music: 'office' },
    { show: 'yuzuki', expr: 'smile', at: 'right' }, { show: 'aoi', expr: 'panic', at: 'left' },
    { say: 'yuzuki', expr: 'smile', jp: '{来|き|来る}てくれた！　じゃあ、はじめよう。{社内報|しゃないほう}の「{新人|しんじん}インタビュー」。', en: '"You came! Let\'s start, then. The in-house paper\'s \'new staff interview\'."' },
    { say: 'yuzuki', expr: 'smile', jp: '{天川|あまかわ}で、{何|なに}がしたいの？', en: '"What do you want to do at Amakawa?"' },
    { choose: { prompt: 'Your answer', kind: 'reply', options: [
      { jp: 'みんなと、いい{仕事|しごと}がしたい。', en: '"I want to do good work with everyone."', fx: { yuzuki: 1 } },
      { jp: '{企画室|きかくしつ}7を{守|まも|守る}りたい。', en: '"I want to protect Planning 7."', then: [
        { say: 'yuzuki', expr: 'serious', jp: '{守|まも|守る}りたい？　……{何|なに}から？', en: '"Protect it? ...From what?"' },
        { set: { saidProtect: true } },
      ] },
      { jp: '{早|はや|早い}く{帰|かえ|帰る}りたい。', en: '"I want to go home early."', then: [
        { say: 'aoi', expr: 'grin', jp: 'わかる！', en: '"Same!"' },
        { say: 'yuzuki', expr: 'tired', jp: '……それは{書|か|書く}かないね。', en: '"...I won\'t print that one."' },
      ] },
    ] } },
    { choose: { prompt: 'Turn it around. Ask Yuzuki the same thing.', kind: 'reply', options: [
      { jp: '{柚月|ゆづき}さんは？　{何|なに}がしたいの？', en: '"What about you, Yuzuki? What do you want to do?"', correct: true, fx: { yuzuki: 1 }, then: [
        { say: 'yuzuki', expr: 'serious', jp: '{私|わたし}？　……ほんとうのことが{書|か|書く}きたい。{社内報|しゃないほう}じゃなくて。', en: '"Me? ...I want to write things that are true. Not the company paper."' },
        { set: { knowsYuzukiDream: true } },
      ] },
      { jp: '{柚月|ゆづき}さんは、{何|なに}がしたいですか。', en: '"And what would you like to do, Ms Yuzuki?" (polite)', then: [
        { say: 'yuzuki', expr: 'smile', jp: 'なんで{急|きゅう}にていねい？　{私|わたし}はいいの、{今日|きょう}はあなたの{番|ばん}。', en: '"Why so polite all of a sudden? Never mind me, today\'s your turn." Among coworkers your age, plain ～たいの？ is the natural way to ask.' },
      ] },
    ] } },
    { if: 'yuzukiSawDoor', then: [
      { say: 'yuzuki', expr: 'serious', jp: 'ねえ。{水曜日|すいようび}のエレベーター。ドアが、ひとりでに{止|と|止まる}まったよね。', en: '"Hey. Wednesday, the elevator. The door stopped on its own, didn\'t it?"' },
      { choose: { prompt: 'Your reply', kind: 'reply', options: [
        { jp: 'そう？　{古|ふる|古い}いエレベーターだから。', en: '"Did it? It\'s an old elevator."', then: [{ say: 'yuzuki', expr: 'smile', jp: 'ふうん。……そういうことに、しておく。', en: '"Hmm. ...I\'ll leave it at that. For now."' }] },
        { jp: '{見|み|見る}てたの？', en: '"You were watching?"', then: [{ say: 'yuzuki', expr: 'serious', jp: '{見|み|見る}るのが{仕事|しごと}だから。', en: '"Watching is my job."' }, { suspicion: 1 }] },
      ] } },
    ] },
    { goto: 'day5_photo' },
  ],

  day5_photo: [
    { say: 'yuzuki', expr: 'smile', jp: 'じゃあ、{写真|しゃしん}。アオイさんも、ここに{立|た|立つ}って。', en: '"Photo time. Aoi, stand here too."' },
    { say: 'yuzuki', expr: 'serious', jp: 'あ、そうだ。{昨日|きのう}、{企画書|きかくしょ}が{消|き|消える}えたって{聞|き|聞く}いたけど……ほんと？', en: '"Oh, right. I heard the proposal got deleted yesterday... Is that true?"' },
    { say: 'aoi', expr: 'panic', jp: 'え、あ、あの、あたし……', en: '"Uh, um, I..."' },
    { narrate: 'Aoi goes white. Her hands shake. If she says it on the record, it goes in the paper, and then it goes to Sales.' },
    { choose: { prompt: 'Aoi is about to fall apart in front of the camera.', kind: 'action', options: [
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: '(Use kotodama. Yuzuki is right there, holding a camera: 1 witness)', magic: true, then: [
        { spell: {
          goal: 'Calm Aoi down, for real.',
          witnesses: 1,
          hint: 'Goro\'s words on the rooftop. Short, warm, spoken to her.',
          verbs: [
            { key: '大丈夫', en: 'all right, safe', forms: [['大丈夫だよ', 'だいじょうぶだよ'], ['大丈夫？', 'だいじょうぶ？'], ['大丈夫です', 'だいじょうぶです']] },
            { key: '待つ', en: 'wait', forms: [['待って', 'まって'], ['待った', 'まった']] },
          ],
          answer: '大丈夫だよ',
          outcomes: {
            '大丈夫？': [{ narrate: 'A question, not a promise. Aoi hears worry in it and starts to cry.' }, { set: { articleTone: 'sharp' } }],
            '待って': [{ narrate: 'Everything in the room stops for half a second, including Yuzuki\'s camera. The shutter clicks late.' }, { suspicion: 1 }, { set: { articleTone: 'sharp' } }],
            default: [{ narrate: 'The words come out stiff. Nothing changes.' }],
          },
          success: [
            { narrate: 'Your voice is quiet, but Aoi\'s shoulders drop. Her breathing slows. For some reason, the room feels warmer.' },
            { say: 'aoi', expr: 'grin', jp: '……はい。{消|け|消す}しちゃったけど、みんなで{直|なお|直す}しました！', en: '"...Yes. I deleted it, but we all fixed it together!"' },
            { say: 'yuzuki', expr: 'smile', jp: 'いい{話|はなし}。それ、{書|か|書く}きたい。', en: '"That\'s a good story. I want to write that."' },
            { set: { articleTone: 'warm' } },
          ],
        } },
      ] },
      { jp: '{大丈夫|だいじょうぶ}だよ、と{普通|ふつう}に{言|い|言う}う', en: 'Just say "it\'s okay" the normal way', then: [
        { narrate: 'It helps a little. Aoi manages a nod.' },
        { say: 'aoi', expr: 'panic', jp: '……ちょっと、{消|け|消す}しちゃいました。でも、もう{大丈夫|だいじょうぶ}です。', en: '"...I kind of deleted it. But it\'s fine now."' },
        { say: 'yuzuki', expr: 'serious', jp: '「ちょっと」ね。{書|か|書く}いておく。', en: '"\'Kind of.\' Noted."' },
        { set: { articleTone: 'sharp' } },
      ] },
    ] } },
    { hideAll: true },
    { goto: 'day5_review' },
  ],

  day5_review: [
    { bg: 'office' }, { clock: '16:00' }, { music: 'office' },
    { show: 'emi', expr: 'smile', at: 'center' },
    { say: 'emi', expr: 'smile', jp: '{一週間|いっしゅうかん}、おつかれさま。ちょっと{話|はな|話す}そう。', en: '"Good work this week. Let\'s talk for a minute."' },
    { narrate: 'Probation review, week one. Emi has a notebook. You can\'t read what\'s in it.' },
    { if: 'helpedAoi', then: [{ say: 'emi', expr: 'smile', jp: 'アオイさんのこと、ありがとう。{見|み|見る}てたよ。', en: '"Thanks for looking after Aoi. I noticed."' }] },
    { if: 'lateMeeting', then: [{ say: 'emi', expr: 'smirk', jp: '{火曜日|かようび}の{会議|かいぎ}、{遅|おく|遅れる}れたね。{来週|らいしゅう}は{気|き}をつけて。', en: '"You were late to Tuesday\'s meeting. Watch that next week."' }] },
    { if: 'missedDeadline', then: [
      { say: 'emi', expr: 'surprised', jp: '{昨日|きのう}は、{間|ま|間に合う}に{合|あ|間に合う}わなかった。でも、あなたのせいじゃない。', en: '"We missed yesterday\'s deadline. But it wasn\'t your fault."' },
    ], else: [
      { say: 'emi', expr: 'smile', jp: '{昨日|きのう}は、ほんとうに{助|たす|助かる}かった。', en: '"Yesterday, you really saved us."' },
    ] },
    { if: 'saidProtect', then: [{ say: 'emi', expr: 'surprised', jp: '……{柚月|ゆづき}さんに「{守|まも|守る}りたい」って{言|い|言う}ったの？　……そう。', en: '"...You told Yuzuki you want to \'protect\' us? ...I see."' }] },
    { say: 'emi', expr: 'smile', jp: '{試用期間|しようきかん}は、まだ{長|なが|長い}い。でも、{悪|わる|悪い}くないよ。', en: '"Probation has a long way to go. But you\'re not doing badly."' },
    { hideAll: true },
    { goto: 'day5_evening' },
  ],

  day5_evening: [
    { bg: 'gate' }, { clock: '18:30' }, { music: 'night' },
    { msg: { from: 'mio', jp: '{今夜|こんや}、ゲーム。コントローラー、{二|ふた|二つ}つある。', en: 'Games tonight. I\'ve got two controllers.' } },
    { choose: { prompt: 'Friday night', kind: 'sign', options: [
      { jp: 'バー　（みんなで{飲|の|飲む}み）', en: 'The bar (team drinks)', then: [{ goto: 'day5_bar' }] },
      { jp: 'ミオの{部屋|へや}　（ゲーム）', en: 'Mio\'s room (games)', if: 'mioSaturday', then: [
        { ifRel: { who: 'mio', atLeast: 2, then: [{ goto: 'day5_mio' }], else: [
          { msg: { from: 'mio', jp: 'ごめん、やっぱり{今日|きょう}はねる。また{今度|こんど}。', en: 'Sorry, I\'m going to sleep after all. Another time.' } },
          { goto: 'day5_bar' },
        ] } },
      ] },
    ] } },
  ],

  day5_bar: [
    { bg: 'bar' }, { show: 'jun', expr: 'neutral', at: 'right' },
    { say: 'jun', expr: 'neutral', jp: '{金曜日|きんようび}だね。ビール？', en: '"It\'s Friday. Beer?"' },
    { freeTalk: { with: 'jun', turns: 2, goal: 'Tell Jun what you want to do this weekend (use 〜たい).', target: ['たい'], fallback: [{ choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'ゆっくり{休|やす|休む}みたい。', en: '"I want to rest properly."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'そういう{顔|かお}してる。', en: '"You look like it."' }] },
      { jp: '{町|まち}を{見|み|見る}たい。', en: '"I want to see the town."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: '{日曜日|にちようび}の{朝|あさ}の{市場|いちば}、いいよ。', en: '"The Sunday morning market is nice."' }] },
    ] } }] } },
    { narrate: 'Aoi arrives late and orders the sweetest thing on the menu. Nobody talks about work. It\'s a good hour.' },
    { hideAll: true },
    { goto: 'day5_hook' },
  ],

  day5_mio: [
    { bg: 'mio_room' }, { music: 'calm' },
    { show: 'mio', expr: 'smirk', at: 'center' },
    { say: 'mio', expr: 'smirk', jp: '{来|き|来る}たね。{土曜日|どようび}まで{寝|ね|寝る}かせないって、{言|い|言う}ったでしょ。', en: '"You came. I told you I wouldn\'t let you sleep till Saturday."' },
    { say: 'mio', expr: 'bored', jp: '{十二時|じゅうにじ}{過|す|過ぎる}ぎたら、{土曜日|どようび}。{計算|けいさん}、あってる。', en: '"After midnight it\'s Saturday. The maths checks out."' },
    { choose: { prompt: 'She hands you a controller.', kind: 'reply', options: [
      { jp: 'どのゲームがしたいの？', en: '"Which game do you want to play?"', correct: true, fx: { mio: 1 }, then: [{ say: 'mio', expr: 'smirk', jp: '{負|ま|負ける}けたほうが、{明日|あした}の{朝|あさ}ごはん。', en: '"Loser buys tomorrow\'s breakfast."' }] },
      { jp: '{勝|か|勝つ}ちたい。', en: '"I want to win."', then: [{ say: 'mio', expr: 'smirk', jp: '{無理|むり}。', en: '"Not happening."' }] },
    ] } },
    { clock: '01:40' },
    { narrate: 'You lose four rounds in a row. Somewhere in the fifth, her commentary stops.' },
    { reward: { id: 'mio_gamenight', rating: 'sensitive', caption: 'Mio, asleep on your shoulder, still holding the controller.' } },
    { narrate: 'Her head is on your shoulder. The hoodie has slid off one side. She\'s breathing slowly and she\'s warm, and you are not going to move for a while.' },
    { say: 'mio', expr: 'bored', jp: '……{動|うご|動く}かないで。……あと{五分|ごふん}。', en: '"...Don\'t move. ...Five more minutes."' },
    { fx: { mio: 1 } },
    { set: { mioGameNight: true } },
    { hideAll: true },
    { goto: 'day5_hook' },
  ],

  day5_hook: [
    { msg: { from: 'emi', jp: '{月曜日|げつようび}、{朝|あさ}{一番|いちばん}に、みんなに{話|はな|話す}したいことがある。', en: 'Monday, first thing in the morning, there\'s something I want to tell everyone.' } },
    { narrate: 'You think of the sheet of paper on her desk, face down.' },
    { summary: true },
  ],
};
