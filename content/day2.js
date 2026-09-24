// Day 2: The copier war. Grammar: 〜たい (want to), question words (何・どこ・いつ). Spell: 動いて (te-request on a machine).
// Katakana block: the copy room (コピー, インターン, ボタン). New cast: Aoi. Hook: Rei wants to talk.
export const DAY = 2;
export const SCENES = {
  day2_morning: [
    { bg: 'dorm' }, { clock: '07:50' }, { music: 'calm' },
    { narrate: 'Day two. Your phone buzzes before your alarm does.' },
    { msg: { from: 'emi', jp: 'おはよう。{十時|じゅうじ}から{二階|にかい}の{会議室|かいぎしつ}で{会議|かいぎ}。{資料|しりょう}を{十枚|じゅうまい}、コピーしてきて。', en: 'Morning. Meeting at ten in the second-floor meeting room. Make ten copies of the handout.' } },
    { msg: { from: 'mio', jp: '{地下一階|ちかいっかい}のコピー{機|き}、また{壊|こわ|壊れる}れてるって。がんばれ。', en: 'They say the copier on basement level 1 is broken again. Good luck.' } },
    { pin: {
      prompt: 'What did Emi ask for?',
      fields: [
        { id: 'time', label: '{何時|なんじ}？', labelEn: 'When?', en: ["nine o'clock", "ten o'clock", "eleven o'clock"], options: ['{九時|くじ}', '{十時|じゅうじ}', '{十一時|じゅういちじ}'], answer: 1 },
        { id: 'place', label: 'どこ？', labelEn: 'Where?', en: ["the meeting room, 2nd floor", "Sales, 3rd floor", "basement level 2"], options: ['{二階|にかい}の{会議室|かいぎしつ}', '{三階|さんがい}の{営業部|えいぎょうぶ}', '{地下二階|ちかにかい}'], answer: 0 },
        { id: 'thing', label: '{何|なに}を？', labelEn: 'What?', en: ["ten copies of the handout", "ten cups of coffee", "ten business cards"], options: ['{資料|しりょう}を{十枚|じゅうまい}', 'コーヒーを{十杯|じゅっぱい}', '{名刺|めいし}を{十枚|じゅうまい}'], answer: 0 },
      ],
      // Wrong pins set flags (pin_time_wrong etc.) that later scenes react to.
    } },
    { goto: 'day2_elevator' },
  ],

  day2_elevator: [
    { bg: 'elevator' }, { clock: '09:20' },
    { narrate: 'The copier is on basement level 1, if Mio is right.' },
    { elevator: { target: 'B1', wrong: 'default' } },
    { goto: 'day2_copyroom' },
  ],

  day2_copyroom: [
    { bg: 'copyroom' }, { music: 'office' },
    { show: 'aoi', expr: 'panic', at: 'center' },
    { say: 'aoi', expr: 'panic', jp: 'あ、{人|ひと}だ！　たすけて！　コピー{機|き}が{動|うご|動く}かないの！', en: '"Oh, a person! Help me! The copier won\'t work!"' },
    { say: 'aoi', expr: 'panic', jp: 'あたし、アオイ。インターン。……もう{帰|かえ|帰る}りたい。', en: '"I\'m Aoi. Intern. ...I already want to go home."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{何|なに}をコピーしたいの？', en: '"What do you want to copy?"', fx: { aoi: 1 }, then: [
        { say: 'aoi', expr: 'panic', jp: '{部長|ぶちょう}の{資料|しりょう}！　{百枚|ひゃくまい}！　{十時|じゅうじ}まで！', en: '"The department head\'s handouts! A hundred pages! By ten!"' },
      ] },
      { jp: '{大丈夫|だいじょうぶ}？', en: '"Are you OK?"', fx: { aoi: 1 }, then: [
        { say: 'aoi', expr: 'panic', jp: 'ぜんぜん{大丈夫|だいじょうぶ}じゃない！', en: '"Not OK at all!"' },
      ] },
      { jp: '{先|さき}にいい？　{急|いそ|急ぐ}いでるんだ。', en: '"Can I go first? I\'m in a hurry."', fx: { aoi: -1 }, then: [
        { say: 'aoi', expr: 'panic', jp: 'えー、ひどい！　でも、{動|うご|動く}かないんだって！', en: '"Hey, that\'s mean! And I told you, it doesn\'t work!"' },
      ] },
    ] } },
    { narrate: 'The copier blinks a red light and makes a sad noise. Aoi is watching you.' },
    { choose: { prompt: 'How do you deal with the copier?', kind: 'action', options: [
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: '(Use kotodama. Aoi is watching: 1 witness)', magic: true, then: [
        { spell: {
          goal: 'Get the copier working.',
          witnesses: 1,
          hint: 'Spells work on machines too. Asking something to do something: the te-form. 動く (to move, to run) becomes 動いて.',
          verbs: [
            { key: '動く', en: 'move, run', forms: [['動く', 'うごく'], ['動いて', 'うごいて'], ['動いた', 'うごいた']] },
            { key: '待つ', en: 'wait', forms: [['待つ', 'まつ'], ['待って', 'まって'], ['待った', 'まった']] },
          ],
          answer: '動いて',
          outcomes: {
            '待って': [{ narrate: 'The copier goes completely silent. So does Aoi. The red light stops blinking mid-blink.' }, { say: 'aoi', expr: 'panic', jp: '……え、{今|いま}、{止|と|止まる}まった？', en: '"...Huh, did it just freeze?"' }, { suspicion: 1 }],
            default: [{ narrate: 'Nothing happens. The words fall flat: that form doesn\'t ask anything.' }],
          },
          success: [
            { narrate: 'The copier coughs, hums, and starts printing. Fast. Faster than it should.' },
            { say: 'aoi', expr: 'grin', jp: '……え、{動|うご|動く}いた！　すごい！　なんで？', en: '"...Whoa, it works! Amazing! How?"' },
            { choose: { prompt: 'Your reply', kind: 'reply', options: [
              { jp: 'ボタンを{押|お|押す}しただけ。', en: '"I just pressed the button."', then: [{ say: 'aoi', expr: 'grin', jp: 'うそー。あたしも{押|お|押す}したよ！', en: '"No way. I pressed it too!"' }] },
              { jp: 'コピー{機|き}に{好|す|好き}かれてるから。', en: '"The copier likes me."', fx: { aoi: 1 }, then: [{ say: 'aoi', expr: 'grin', jp: 'なにそれ！　ずるい！', en: '"What\'s that supposed to mean! No fair!"' }] },
            ] } },
            { set: { copierMagic: true } },
          ],
        } },
      ] },
      { jp: 'コピー{機|き}をけとばす', en: 'Kick the copier', then: [
        { narrate: 'You kick it. Nothing. You kick it again, harder. It wakes up with a groan, ten minutes and one sore foot later.' },
        { time: 10 },
        { say: 'aoi', expr: 'grin', jp: 'あはは！　でも{動|うご|動く}いた！', en: '"Ha ha! But it works!"' },
      ] },
    ] } },
    { choose: { prompt: 'Aoi still needs a hundred pages before ten. You need ten.', kind: 'reply', options: [
      { jp: '{手伝|てつだ|手伝う}うよ。', en: '"I\'ll help you."', fx: { aoi: 2 }, then: [
        { time: 15 }, { set: { helpedAoi: true } },
        { say: 'aoi', expr: 'grin', jp: 'ほんと？　ありがとう！　この{恩|おん}は{忘|わす|忘れる}れない！', en: '"Really? Thank you! I won\'t forget this!"' },
      ] },
      { jp: 'ごめん、{先|さき}に{行|い|行く}くね。', en: '"Sorry, I\'ll go ahead."', then: [
        { say: 'aoi', expr: 'panic', jp: 'うー、がんばる……。', en: '"Ugh, I\'ll manage..."' },
      ] },
    ] } },
    { hideAll: true },
    { goto: 'day2_meeting' },
  ],

  day2_meeting: [
    { bg: 'meeting' }, { time: 12 },
    { ifTime: { after: '10:00', then: [{ narrate: 'The meeting has already started. Every head turns when the door opens.' }, { set: { lateMeeting: true } }] } },
    { show: 'emi', expr: 'smile', at: 'left' }, { show: 'rei', expr: 'cold', at: 'right' },
    { if: 'lateMeeting', then: [{ say: 'emi', expr: 'smirk', jp: 'おそい。……コピー、ありがとう。', en: '"You\'re late. ...Thanks for the copies."' }] },
    { if: 'pin_thing_wrong', then: [{ narrate: 'You put your stack on the table. It\'s the wrong thing. Emi quietly slides her own copy across to share.' }, { fx: { emi: -1 } }] },
    { say: 'emi', expr: 'smile', jp: 'では、{企画室|きかくしつ}7から。「{天川|あまかわ}シティの{夏祭|なつまつ|夏祭り}り」の{企画|きかく}です。', en: '"Right, Planning 7 first. Our plan for the Amakawa City summer festival."' },
    { say: 'rei', expr: 'cold', jp: '{企画室|きかくしつ}7の{企画|きかく}は、いつもおもしろい。でも、お{金|かね}にならない。', en: '"Planning 7\'s ideas are always fun. They just never make money."' },
    { say: 'emi', expr: 'smirk', jp: '{今回|こんかい}はなるよ。', en: '"This time they will."' },
    { say: 'rei', expr: 'smirk', jp: 'ふうん。……{新人|しんじん}くんは、どう{思|おも|思う}う？', en: '"Hmm. ...What does the new guy think?"' },
    { choose: { prompt: 'Everyone looks at you.', kind: 'reply', options: [
      { jp: '{僕|ぼく}、この{企画|きかく}、やりたい。', en: '"I want to do this project."', fx: { emi: 1 }, then: [
        { say: 'emi', expr: 'smile', jp: '……うん。', en: '"...Yeah."' },
        { say: 'rei', expr: 'smirk', jp: 'かわいい{新人|しんじん}ね。', en: '"What a sweet new hire."' },
      ] },
      { jp: 'まだ、よくわからない。', en: '"I don\'t really understand it yet."', then: [
        { say: 'rei', expr: 'cold', jp: '{正直|しょうじき}ね。', en: '"Honest, at least."' },
      ] },
      { jp: '{黒田|くろだ}さんは{何|なに}がしたいの？', en: '"What do you want to do, Kuroda?"', fx: { rei: 1 }, then: [
        { say: 'rei', expr: 'smirk', jp: '{私|わたし}？　{勝|か|勝つ}ちたい。それだけ。', en: '"Me? I want to win. That\'s all."' },
      ] },
    ] } },
    { narrate: 'The meeting ends with no decision. On the way out, Emi\'s smile drops for a second when she thinks nobody is looking.' },
    { hideAll: true },
    { goto: 'day2_lunch' },
  ],

  day2_lunch: [
    { clock: '12:10' },
    { choose: { prompt: 'Lunch. Where do you go?', kind: 'sign', options: [
      { jp: '{食堂|しょくどう}', en: 'Canteen', then: [{ goto: 'day2_canteen' }] },
      { jp: '{屋上|おくじょう}', en: 'Rooftop', then: [{ goto: 'day2_rooftop' }] },
    ] } },
  ],

  day2_canteen: [
    { bg: 'canteen' }, { music: 'lively' },
    { show: 'kaori', expr: 'smile', at: 'center' },
    { say: 'kaori', expr: 'smile', jp: 'また{来|き|来る}たね。{今日|きょう}の{日替|ひが|日替わり}わりは、ハンバーグだよ。', en: '"You came back. Today\'s daily special is hamburg steak."' },
    { menu: { items: [
      { jp: '{日替|ひが|日替わり}わり（ハンバーグ）', en: 'Daily special (hamburg steak)', price: 650 },
      { jp: 'カレー', en: 'Curry', price: 500 },
      { jp: 'うどん', en: 'Udon', price: 450 },
    ] } },
    { pay: { wallet: [1000, 500, 100, 100, 100] } },
    { hide: 'kaori' },
    { show: 'mio', expr: 'bored', at: 'right' },
    { if: 'helpedAoi', then: [{ show: 'aoi', expr: 'grin', at: 'left' }, { say: 'aoi', expr: 'grin', jp: 'あ、{恩人|おんじん}だ！　ここ、すわっていい？', en: '"Oh, my saviour! Can I sit here?"' }] },
    { say: 'mio', expr: 'bored', jp: '{新人|しんじん}くん、{土曜日|どようび}、ひま？', en: '"New guy, are you free on Saturday?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'ひまだよ。どうして？', en: '"I\'m free. Why?"', fx: { mio: 1 }, then: [
        { say: 'mio', expr: 'smirk', jp: '{新|あたら|新しい}しいゲーム、{二人|ふたり}でやりたいんだけど。……べつに、いやならいいけど。', en: '"There\'s a new game I want to play with two people. ...It\'s fine if you don\'t want to."' },
        { choose: { prompt: 'Your reply', kind: 'reply', options: [
          { jp: 'やりたい！', en: '"I want to!"', fx: { mio: 2 }, then: [{ set: { mioSaturday: true } }, { say: 'mio', expr: 'smirk', jp: '……じゃあ、{金曜|きんよう}の{夜|よる}から。{寝|ね|寝る}かせないから。', en: '"...Then from Friday night. I won\'t let you sleep."' }] },
          { jp: 'ごめん、{土曜日|どようび}はちょっと。', en: '"Sorry, Saturday\'s a bit difficult."', then: [{ say: 'mio', expr: 'bored', jp: 'そ。', en: '"Kay."' }] },
        ] } },
      ] },
      { jp: '{土曜日|どようび}は{寝|ね|寝る}たい。', en: '"On Saturday I want to sleep."', then: [{ say: 'mio', expr: 'bored', jp: 'わかる。', en: '"Relatable."' }] },
    ] } },
    { hideAll: true },
    { goto: 'day2_evening' },
  ],

  day2_rooftop: [
    { bg: 'rooftop' }, { music: 'calm' },
    { show: 'goro', expr: 'smile', at: 'center' },
    { say: 'goro', expr: 'smile', jp: 'おや、また{来|き|来る}たね。{今日|きょう}はトマトが{元気|げんき}がない。', en: '"Oh, you came again. The tomatoes are feeling low today."' },
    { narrate: 'Goro kneels by a drooping plant and speaks to it quietly.' },
    { say: 'goro', expr: 'smile', jp: '{大丈夫|だいじょうぶ}だよ。{大丈夫|だいじょうぶ}。', en: '"It\'s all right. It\'s all right."' },
    { narrate: 'You feel the words settle in your chest like a new key. 大丈夫だよ: a plain statement, said with intent, calms whoever hears it.' },
    { learnSpell: { key: '大丈夫', form: '大丈夫だよ', en: 'calm someone down' } },
    { say: 'goro', expr: 'smile', jp: '{植物|しょくぶつ}も{人|ひと}も、{言葉|ことば}を{聞|き|聞く}いているんだよ。', en: '"Plants and people both listen to words, you know."' },
    { fx: { goro: 1 } },
    { hideAll: true },
    { goto: 'day2_evening' },
  ],

  day2_evening: [
    { clock: '18:30' },
    { choose: { prompt: 'Evening. Where do you go?', kind: 'sign', options: [
      { jp: 'バー', en: 'The bar', then: [
        { bg: 'bar' }, { music: 'night' }, { show: 'jun', expr: 'neutral', at: 'center' },
        { say: 'jun', expr: 'neutral', jp: '{二日目|ふつかめ}か。どこに{行|い|行く}きたい？　{仕事|しごと}じゃなくて、{人生|じんせい}で。', en: '"Day two, huh. Where do you want to go? Not at work. In life."' },
        { freeTalk: { with: 'jun', turns: 2, goal: 'Tell Jun something you want to do in Japan (use 〜たい).', target: ['たい'],
          fallback: [{ choose: { prompt: 'Your reply', kind: 'reply', options: [
            { jp: '{日本|にほん}で{友達|ともだち}を{作|つく|作る}りたい。', en: '"I want to make friends in Japan."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'もう、ひとりできたよ。', en: '"You\'ve already made one."' }] },
            { jp: 'アニメを{字幕|じまく}なしで{見|み|見る}たい。', en: '"I want to watch anime without subtitles."', fx: { jun: 1 }, then: [{ say: 'jun', expr: 'neutral', jp: 'いい{目標|もくひょう}だ。', en: '"Good goal."' }] },
          ] } }] } },
      ] },
      { jp: '{寮|りょう}', en: 'The dorm (rest)', then: [
        { bg: 'dorm' }, { music: 'calm' },
        { narrate: 'You eat convenience-store onigiri on your bed and read the messages from today again. Some of the words already look friendlier.' },
        { reviewMessages: { count: 3 } },
      ] },
    ] } },
    { hideAll: true },
    { clock: '22:40' },
    { msg: { from: 'rei', jp: '{明日|あした}、ちょっと{話|はなし}がある。', en: 'We need to talk tomorrow.' } },
    { narrate: 'Rei Kuroda. You never gave her your contact.' },
    { summary: true },
  ],
};
