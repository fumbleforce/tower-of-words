// Day 1 script (revised 2026-09-25; the design is game/notes/day1-design.md, the readable draft game/notes/day1-draft.md).
// Markup in jp lines: {kanji|kana|dictionary key} or {kana word}. Bare katakana runs are tracked as words automatically.
// English (the `en` fields) is hidden during play unless the player asks for it, which counts as a look-up.
// Step fields beyond the basics: `off` (a voice with no sprite), `noise`, `sus` (suspicion per person), `stamp` and
// `ifWithin` (minutes since a stamp), `ifNoise`, `ifCasts`, `unset`, `sign`. The train opening adds `gl`, `cap`, `cue`, `alt`,
// `via`, `insert`, `hand`, `amb`, `tone`, `wait`, `ifSupport`, `findEntrance`, `autosave` and `act` options. See game/main.js step().
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

// Day 1's panel: one new word per label at most (pacing check, 2026-09-25).
const FLOORS_D1 = FLOORS.map(f => ({ ...f, jp: { R: '{屋上|おくじょう}', '2F': '{二階|にかい}　{会議室|かいぎしつ}', B1: '{地下一階|ちかいっかい}　コピー{室|しつ}' }[f.id] || f.jp }));

// Wrong floors cost a couple of minutes and nothing else.
const WRONG_FLOOR = {
  R: [{ narrate: 'Wind, and rows of tomato plants. Wrong floor.' }, { time: 2 }],
  '5F': [{ narrate: 'Thick carpet and silent corridors. Definitely the wrong floor.' }, { time: 2 }],
  '3F': [{ narrate: 'Rows of desks, phones ringing, people in sharp suits. Wrong floor.' }, { time: 2 }],
  '2F': [{ narrate: 'Meeting rooms, every door shut. Wrong floor.' }, { time: 2 }],
  '1F': [{ narrate: 'The lobby again.' }, { time: 1 }],
  B1: [{ narrate: 'Boxes, shelves, a flickering light, and a copier with a sign taped to it. Wrong floor.' }, { time: 2 }],
  B2: [{ narrate: 'The office again. Not where you need to be.' }, { time: 1 }],
};
const wrongFrom = (here, text) => ({ ...WRONG_FLOOR, [here]: [{ narrate: text }] });

// Reusable bits of the copy room.
const WAIT = [
  { narrate: 'You wait. The light flickers. Somewhere a pipe knocks.' },
  { if: 'copies100', then: [{ narrate: 'After ten sets you hit stop. Ten is plenty.' }, { set: { copies10: true } }, { unset: ['copies100'] }, { time: 7 }],
    else: [{ if: 'copies20', then: [{ time: 14 }], else: [{ time: 7 }] }] },
];
const SORT_BY_HAND = [
  { narrate: 'Page one, two, three, four. Again. Again.' },
  { if: 'copies100', then: [{ time: 50 }], else: [{ if: 'copies20', then: [{ time: 20 }], else: [{ time: 10 }] }] },
];
const SALES_WITNESS = { if: '!witnessGone', then: [{ set: { salesWitness: true } }] };

export const SCENES = {
  // The train opening (game/notes/train-opening-script.md, approved 2026-09-25). New Game starts here.
  // Rei is labelled "Woman" until she says her name (flag reiNamed). `gl` = contextual English for a tapped word,
  // `cap` = a one-line stage direction above the subtitle, `alt` = the supported version of a line (used when the
  // player has needed help on several lines), `cue` = the tap tutorial. Art here is placeholder (see TODO.md).
  train: [
    { bg: 'carriage' }, { clock: '08:40' }, { amb: 'train' }, { music: null }, { set: { reiNamed: false } },
    // 1. The cup
    { insert: 'seat' }, { tone: 'keys' }, { wait: 1400 }, { tone: 'clack' },
    { say: 'rei', off: true, jp: 'あ。', en: '"Ah."', gl: { あ: 'ah! (a small surprised sound)' }, cap: 'A monorail carriage. The woman beside the empty seat is typing. Her coffee cup tips toward her laptop.' },
    { choose: { prompt: 'The cup is tipping.', options: [
      { act: 'Catch the cup', then: [{ insert: 'seat-caught' }, { narrate: 'You steady the cup. She catches her folder with her free hand.' }] },
      { act: 'Warn her', en: '"Ah, coffee!"', then: [
        { say: 'player', jp: 'あ、コーヒー。', en: '"Ah, coffee!"', auto: true },
        { insert: 'seat-saved' }, { narrate: 'She catches the cup and shuts the laptop with her other hand.' },
      ] },
    ] } },
    { insert: null }, { show: 'rei', expr: 'cold', at: 'center' },
    { say: 'rei', expr: 'cold', jp: 'ありがとう。', en: '"Thanks."', gl: { ありがとう: 'thanks, thank you' }, cap: 'She checks the lid, then looks at you properly.', cue: 'tap' },
    // 2. A seat
    { say: 'rei', expr: 'cold', jp: 'どうぞ。', en: '"Go ahead."', gl: { どうぞ: 'go ahead; here, she\'s offering you the seat' }, cap: 'She puts the laptop away, stacks the folder on her lap and pats the seat she just cleared.' },
    { choose: { options: [
      { act: 'Sit', then: [{ narrate: 'You sit and put your backpack between your feet. Sea and sky slide past the window.' }] },
    ] } },
    // 3. New badge
    { insert: 'badge' }, { clock: '08:43' },
    { narrate: 'You take your new company badge out of its sleeve. The protective film is still on it.' },
    { say: 'rei', expr: 'cold', jp: '{初日|しょにち}？', en: '"First day?"', gl: { 初日: 'first day' }, cap: 'She glances at the badge, then at you.', cue: 'tap2' },
    { choose: { options: [
      { jp: 'うん。', en: '"Yeah."', gl: { うん: 'yeah (casual yes)' } },
      { act: 'Nod', then: [{ narrate: 'You nod.' }] },
    ] } },
    { narrate: 'She gives a small nod back.' }, { insert: null },
    { choose: { prompt: 'Ask her something, or let it be.', options: [
      { jp: 'そっちは？', en: '"And you?"', gl: { そっち: 'you, your side (casual)' }, then: [
        { say: 'rei', expr: 'cold', jp: '{三年目|さんねんめ}。', en: '"Third year."', gl: { 三年目: 'third year (her third year at the company)', 三: 'three', 年: 'year', 目: '-th (third, fourth...)' }, cap: 'She presses down a worn corner of her own badge sleeve with her thumb.' },
      ] },
      { act: 'Say nothing' },
    ] } },
    // 4. The company gets bigger
    { hideAll: true }, { bg: 'reveal' }, { amb: 'pitch' }, { wait: 1800 },
    { say: 'rei', off: true, jp: '{全部|ぜんぶ}、{会社|かいしゃ}。', en: '"All of it\'s the company."', gl: { 全部: 'all of it, everything', 会社: 'the company' }, cap: 'Outside, the line runs across the water to an island of towers.' },
    { bg: 'carriage' }, { show: 'rei', expr: 'cold', at: 'center' },
    { choose: { prompt: 'The island is getting close.', options: [
      { jp: '{全部|ぜんぶ}？', en: '"All of it?"', gl: { 全部: 'all of it, everything' }, then: [
        { say: 'rei', expr: 'cold', jp: 'うん。', en: '"Yeah."', gl: { うん: 'yeah' } },
      ] },
      { jp: 'すごいね。', en: '"That\'s impressive."', gl: { すごい: 'amazing, impressive' },
        alt: { needKnown: '大きい', jp: '{大|おお}きいね。', en: '"It\'s big."', gl: { 大きい: 'big' } }, then: [
        { ifSupport: { then: [{ say: 'rei', expr: 'cold', jp: 'うん。', en: '"Yeah."', gl: { うん: 'yeah' } }],
          else: [{ say: 'rei', expr: 'cold', jp: '{最初|さいしょ}はね。', en: '"At first."', gl: { 最初: 'at first, the beginning' } }] } },
      ] },
      { act: 'Keep looking', then: [
        { hideAll: true }, { bg: 'reveal' }, { narrate: 'She leaves you to it. The towers get closer.' },
        { bg: 'carriage' }, { show: 'rei', expr: 'cold', at: 'center' },
      ] },
    ] } },
    { insert: 'dorm' },
    { narrate: 'You put the badge back in your backpack. Another card is in there with it.' },
    { say: 'rei', expr: 'cold', jp: '{寮|りょう}？', en: '"The dorm?"', gl: { 寮: 'dorm, company housing' }, cap: 'She notices the card.' },
    { choose: { options: [
      { jp: 'うん。', en: '"Yeah."', gl: { うん: 'yeah (casual yes)' } },
      { act: 'Nod' },
    ] } },
    { insert: null }, { hand: { mode: 'housing' } },
    { narrate: 'You open the housing app on your phone to show her. It has a delivery photo of your boxes at door 203.' },
    { say: 'rei', expr: 'cold', jp: '{今日|きょう}から？', en: '"Starting today?"', gl: { 今日: 'today' } },
    { say: 'player', jp: 'うん。', en: '"Yeah."', auto: true },
    { hand: null },
    { narrate: 'She shifts along the bench to give you a little more room.' },
    // 5. Emi
    { clock: '08:46' }, { tone: 'buzz' }, { hand: { mode: 'voicemail', from: 'emi' } },
    { say: 'emi', off: true, via: 'voice message', jp: 'おはよう！', en: '"Morning!"', gl: { おはよう: 'good morning' } },
    { say: 'emi', off: true, via: 'voice message', jp: 'もうすぐ？', en: '"Nearly here?"', gl: { もうすぐ: 'soon; here, "nearly here?"' } },
    { choose: { where: 'phone', options: [
      { jp: 'もうすぐ。', en: '"Nearly there."', gl: { もうすぐ: 'soon; here, "nearly there"' }, then: [
        { hand: { mode: 'recording', from: 'emi' } },
        { say: 'emi', off: true, via: 'voice message', jp: 'わかった。', en: '"Got it."', gl: { わかる: 'to understand; わかった = got it' } },
      ] },
      { jp: 'ちょっと、{緊張|きんちょう}してる。', en: '"I\'m a little nervous."', gl: { ちょっと: 'a little', 緊張: 'nerves, tension', する: 'to do (緊張する = to be nervous)' }, then: [
        { hand: { mode: 'recording', from: 'emi' } },
        { say: 'emi', off: true, via: 'voice message', jp: '{大丈夫|だいじょうぶ}。', en: '"You\'ll be fine."', gl: { 大丈夫: 'fine, OK; here, "you\'ll be fine"' } },
      ] },
    ] } },
    { ifSupport: {
      then: [{ say: 'emi', off: true, via: 'voice message', jp: '{待|ま}ってるね。', en: '"I\'ll be waiting."', gl: { 待つ: 'to wait' } }],
      else: [{ say: 'emi', off: true, via: 'voice message', jp: '{会社|かいしゃ}で{待|ま}ってるね。', en: '"I\'ll be waiting at the office."', gl: { 会社: 'the company; here, the office', 待つ: 'to wait' } }] } },
    { hand: null },
    { say: 'rei', expr: 'cold', jp: '{上司|じょうし}、エミ？', en: '"Emi\'s your boss?"', gl: { 上司: 'boss, team lead', エミ: 'Emi (a name)' }, cap: 'She recognised the voice. She looks from your phone to your badge.' },
    { choose: { options: [
      { jp: 'うん。', en: '"Yeah."', gl: { うん: 'yeah (casual yes)' } },
      { act: 'Nod' },
    ] } },
    { narrate: 'She looks as if she might say something, then takes a sip of coffee instead.' },
    // 6. Ask, or leave it
    { insert: 'folder' },
    { narrate: 'She opens her folder again: a short table of figures.' },
    { choose: { prompt: 'Talk, or let her work?', options: [
      { jp: 'エミ、どんな{人|ひと}？', en: '"What\'s Emi like?"', gl: { どんな: 'what kind of', 人: 'person' }, then: [
        { set: { askedAboutEmi: true } },
        { say: 'rei', expr: 'cold', jp: '{優|やさ}しいよ。', en: '"She\'s nice."', gl: { 優しい: 'kind, nice' } },
        { ifSupport: {
          then: [{ say: 'rei', expr: 'cold', jp: '{仕事|しごと}、{多|おお}いよ。', en: '"There\'s a lot of work."', gl: { 仕事: 'work', 多い: 'a lot, many' }, cap: 'She puts one sheet back into the folder.' }],
          else: [{ say: 'rei', expr: 'cold', jp: '{頼|たの}みごと、{多|おお}いけど。', en: '"Asks a lot of favours, though."', gl: { 頼みごと: 'favours, requests', 多い: 'a lot, many', けど: 'but, though' }, cap: 'She puts one sheet back into the folder.' }] } },
      ] },
      { act: 'Let her work', then: [{ narrate: 'A few quiet seconds. She crosses out one line, checks another, and closes the folder.' }] },
    ] } },
    { insert: null }, { tone: 'buzz' }, { insert: 'caller' },
    { narrate: 'Her phone lights up. She sees the name and silences it.' },
    { set: { sawReiSilenceEmi: true } },
    { insert: null },
    { if: 'askedAboutEmi', then: [
      { say: 'rei', expr: 'cold', jp: 'あとで。', en: '"Later."', gl: { あとで: 'later' }, cap: 'She catches you looking.' },
    ], else: [{ narrate: 'She puts the phone away.' }] },
    // 7. Arrival
    { clock: '08:49' }, { tone: 'chime' }, { amb: 'slow' },
    { say: 'announcer', jp: '{天川|あまかわ}シティ、{天川|あまかわ}シティです。', en: '"Amakawa City. Amakawa City."', gl: { 天川: 'Amakawa (the company and its island)', シティ: 'city' }, cap: 'The train slows into a station and stops.' },
    { amb: null }, { tone: 'door' }, { hideAll: true }, { bg: 'doors' },
    { narrate: 'The doors open. People further along the carriage stand up. You pick up your backpack.' },
    { show: 'rei', expr: 'cold', at: 'center' }, { insert: 'reibadge' },
    { narrate: 'She tucks the folder under her arm. Her badge turns face out as she stands.' },
    { set: { reiNamed: true } },
    { say: 'rei', expr: 'cold', jp: 'レイ。{営業|えいぎょう}。', en: '"Rei. Sales."', gl: { レイ: 'Rei (her name)', 営業: 'Sales; her department' }, cap: 'She points at herself with the hand holding the cup.' },
    { choose: { options: [
      { jp: 'よろしく。', en: '"Nice to meet you."', gl: { よろしく: 'nice to meet you (asks for good relations)' } },
      { act: 'Smile and nod' },
    ] } },
    { insert: null },
    { say: 'rei', expr: 'cold', jp: 'エミによろしく。', en: '"Say hi to Emi."', gl: { よろしく: 'here: "say hi to (Emi) for me"; a way of sending good wishes through someone' }, cap: 'She nods back.' },
    // 8. The way out
    { say: 'rei', expr: 'cold', jp: 'どうぞ。', en: '"Go ahead."', gl: { どうぞ: 'go ahead; here, she\'s letting you go first' }, cap: 'At the open door she steps aside to let you out first.' },
    { choose: { options: [{ act: 'Step onto the platform' }] } },
    { hideAll: true }, { bg: 'platform' }, { music: 'calm' },
    { narrate: 'You step out first. Rei follows, heads for the stairs, and looks back once to check you\'re coming. Then she\'s gone into the crowd.' },
    { tone: 'buzz' },
    { hand: { mode: 'photo', from: 'emi', jp: '{入口|いりぐち}は、ここ。', en: '"Here\'s the entrance."', gl: { 入口: 'entrance', ここ: 'here' }, task: 'Find the entrance in Emi\'s photo.' } },
    { hand: null },
    { autosave: true },
    { goto: 'gate' },
  ],

  gate: [
    // Starts from Emi's photo (the train's last beat). gate = gate-lobby-2103, the same picture as the photo.
    { bg: 'gate' }, { clock: '08:52' }, { music: 'calm' },
    { narrate: 'Down the station steps and across a square, into a tall glass lobby.' },
    { findEntrance: { prompt: 'Find the entrance from Emi\'s photo. Tap it.' } },
    { narrate: 'The same gates as in Emi\'s photo. Nobody else around.' },
    { narrate: 'You hold your new badge to a reader. It beeps. The gate doesn\'t open.' },
    { say: 'ishibashi', off: true, jp: 'ちょっと、{止|と|止まる}まって。', en: '"Hold it. Stop."', cap: 'A man\'s voice, from a speaker above the gates. Somewhere, a camera is pointed at you.' },
    { say: 'ishibashi', off: true, jp: '{見|み|見る}ない{顔|かお}だな。', en: '"Don\'t know your face."' },
    { say: 'ishibashi', off: true, jp: 'IDカード、カメラに{見|み|見せる}せて。', en: '"Show your ID card to the camera."' },
    { choose: { prompt: 'What do you do?', kind: 'action', options: [
      { jp: 'IDをカメラに{見|み|見せる}せる', en: 'Show your ID to the camera', correct: true, then: [] },
      { jp: '{笑|わら|笑う}う', en: 'Smile at the camera', retry: true, then: [{ say: 'ishibashi', off: true, jp: '……いや、ID。', en: '"...No. ID."' }] },
      { jp: '（{何|なに}もしない）', en: 'Do nothing', retry: true, then: [{ say: 'ishibashi', off: true, jp: '……ID。', en: '"...ID."' }] },
    ] } },
    { narrate: 'You hold your badge up to the camera.' },
    { say: 'ishibashi', off: true, jp: '……{新人|しんじん}か。', en: '"...A new hire."' },
    { say: 'ishibashi', off: true, jp: '{企画室|きかくしつ}7？　{地下|ちか}の{連中|れんちゅう}か。', en: '"Planning Office 7? That basement lot."' },
    { say: 'ishibashi', off: true, jp: '……カメラで、{見|み|見る}てる。', en: '"...I\'m watching. On camera."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'はい、よろしくお{願|ねが|願う}いします。', en: '"Yes. Nice to meet you." (polite)', correct: true, fx: { ishibashi: 1 }, then: [{ say: 'ishibashi', off: true, jp: '……ん。', en: '"...Mm."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', fx: { ishibashi: -1 }, then: [
        { say: 'ishibashi', off: true, jp: '……{なれなれしい}な。', en: '"...Bit familiar, aren\'t you." Casual speech with an older stranger on duty comes across as cheeky.' },
        { set: { casualGuard: true } }, { sus: { ishibashi: 1 } },
      ] },
      { jp: '……いつも？', en: '"...Always?"', then: [{ say: 'ishibashi', off: true, jp: '……いつも。', en: '"...Always."' }] },
    ] } },
    { narrate: 'The light turns green and the gate lets you through.' },
    { task: '{企画室|きかくしつ}7' },
    { goto: 'elevator_b2' },
  ],

  elevator_b2: [
    { bg: 'lift' }, { narrate: 'Past the gates, a lift. Your team is somewhere in this building.' },
    { elevator: { target: 'B2', wrong: WRONG_FLOOR, floors: FLOORS_D1, hint: 'Your badge says {企画室|きかくしつ}7.' } },
    { goto: 'office' },
  ],

  office: [
    { bg: 'office' }, { music: 'office' }, { task: '' },
    { narrate: 'Basement level two. Pipes along the ceiling, cup noodles on the desks, no windows.' },
    { show: 'mio', expr: 'bored', at: 'right' },
    { say: 'mio', expr: 'bored', as: 'Woman with headphones', jp: '……{誰|だれ}？', en: '"...Who are you?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: '{新人|しんじん}だよ。よろしく。', en: '"The new guy. Nice to meet you." (casual)', correct: true, fx: { mio: 1 }, then: [
        { say: 'mio', expr: 'bored', jp: 'ふーん。……ミオ。', en: '"Hmm. ...Mio."' },
      ] },
      { jp: '{今日|きょう}からここで{働|はたら|働く}きます。よろしくお{願|ねが|願う}いします。', en: '"I start here today. Nice to meet you." (polite)', then: [
        { say: 'mio', expr: 'smirk', jp: '{かたい}ね。……ミオ。', en: '"So stiff. ...Mio." Between coworkers your age, casual speech is normal.' },
      ] },
      { jp: 'そっちこそ{誰|だれ}？', en: '"Who are you, then?"', fx: { mio: 1 }, then: [
        { say: 'mio', expr: 'smirk', jp: '……ふふ。ミオ。', en: '"...Heh. Mio."' },
      ] },
    ] } },
    { say: 'mio', expr: 'bored', jp: '{今|いま}、ゲーム{中|ちゅう}。', en: '"In the middle of a game."' },
    { narrate: 'She tilts her phone away from you.' },
    { narrate: 'Someone gets up from the desk by the whiteboard.' },
    { show: 'emi', expr: 'smile', at: 'left' },
    { ifTime: { after: '09:00', then: [
      { say: 'emi', expr: 'teasing', jp: '{遅刻|ちこく}だよ、{新人|しんじん}くん。', en: '"You\'re late, new guy."' },
    ], else: [
      { say: 'emi', expr: 'smile', jp: 'あ、{新人|しんじん}くん？', en: '"Oh, the new guy?"' },
    ] } },
    { say: 'emi', expr: 'smile', jp: '{私|わたし}はエミ。ここのリーダー。', en: '"I\'m Emi. The leader here."' },
    { say: 'emi', expr: 'teasing', jp: '……{いちおう}ね。', en: '"...Technically."' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'よろしくお{願|ねが|願う}いします。', en: '"Nice to meet you." (polite)', then: [{ say: 'emi', expr: 'smile', jp: 'まじめだね。', en: '"So serious."' }] },
      { jp: 'うん、よろしく。', en: '"Yeah, nice to meet you." (casual)', correct: true, fx: { emi: 1 }, then: [{ say: 'emi', expr: 'smile', jp: 'うん、それでいいよ。', en: '"Yeah, that\'s fine." Emi prefers casual.' }] },
      { jp: '……{いちおう}？', en: '"...Technically?"', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'teasing', jp: 'そう、{いちおう}。', en: '"Yep. Technically."' }] },
    ] } },
    { narrate: 'Emi shows you your desk. The computer wants a password nobody has given you.' },
    { say: 'emi', expr: 'smile', jp: '{さっそく}、お{願|ねが|願う}い。', en: '"Straight to it: a favour."' },
    { narrate: 'She hands you a proposal: four pages, stapled.' },
    { say: 'emi', expr: 'smile', jp: 'これ、コピーして。{十部|じゅうぶ}。', en: '"Copy this for me. Ten sets."' },
    { say: 'emi', expr: 'smile', jp: '{十一時|じゅういちじ}の{会議|かいぎ}で、{使|つか|使う}う。', en: '"It\'s for the eleven o\'clock meeting."' },
    { say: 'emi', expr: 'smile', jp: 'コピー{室|しつ}は、{地下一階|ちかいっかい}。', en: '"The copy room\'s on basement level one."' },
    { say: 'emi', expr: 'teasing', jp: 'コピー{機|き}、ちょっと{古|ふる|古い}いよ。', en: '"The copier\'s a little old."' },
    { say: 'mio', expr: 'bored', jp: 'ちょっとじゃない。', en: '"Not a little." She doesn\'t look up.' },
    { say: 'mio', expr: 'bored', jp: '{こわれてる|こわれてる|壊れる}。', en: '"It\'s broken."' },
    { say: 'emi', expr: 'teasing', jp: '……かなり、{古|ふる|古い}いね。', en: '"...Very old, then."' },
    { say: 'mio', expr: 'bored', jp: '……また、{つながらない}。', en: '"...Lost the connection again."' },
    { narrate: 'Mio gets up, holds her phone at the ceiling, and shuffles out into the corridor in her slippers.' },
    { hideAll: true },
    { task: 'コピー' },
    { goto: 'elevator_b1' },
  ],

  elevator_b1: [
    { bg: 'lift' },
    { elevator: { target: 'B1', wrong: wrongFrom('B2', 'The office again. The copy room is somewhere else.'), floors: FLOORS_D1, hint: 'Emi said: コピー{室|しつ}は、{地下一階|ちかいっかい}。' } },
    { goto: 'copyroom' },
  ],

  copyroom: [
    { bg: 'copyroom' }, { clock: '09:15' }, { stamp: 'copy' }, { music: null },
    { narrate: 'Basement level one. Shelves of toner, a desk with a stapler, and a copier older than you. You shut the door behind you.' },
    { sign: { jp: '{こわれています|こわれています|壊れる}', en: '"Out of order." A printout, taped to the lid.', kind: 'printed' } },
    { choose: { prompt: 'The copier.', kind: 'action', options: [
      { jp: 'ボタンを{押|お|押す}す', en: 'Press the start button', then: [{ narrate: 'The screen flickers on long enough to show one word, 紙づまり, and goes dark.' }] },
      { jp: 'パネルを{開|あ|開ける}ける', en: 'Open the side panel', then: [{ narrate: 'A page is caught deep in the rollers. You pull. It tears, and most of it stays in there.' }] },
      { jp: 'たたく', en: 'Hit it', then: [{ narrate: 'One orange light blinks, thinks about it, and goes out.' }] },
    ] } },
    { narrate: 'There\'s one more thing you could try. You check the door. Still shut.' },
    { narrate: 'Ever since you started learning Japanese, when you ask for something and truly mean it, it happens. You never found out why.' },
    { narrate: 'There\'s a word for it: 言霊, kotodama. Nobody at Amakawa knows you can do it, and you\'d like to keep it that way.' },
    { narrate: 'Five times a day, more or less. After that your voice just gives out.' },
    { set: { knowsMagic: true } },
    { spell: 'jam' },
    { goto: 'copy_count' },
  ],

  copy_count: [
    { sign: { jp: '{部数|ぶすう}？', en: 'The screen asks how many copies.', kind: 'lcd' } },
    { choose: { prompt: '{部数|ぶすう}', kind: 'lcd', options: [
      { jp: '10', en: '10', then: [{ set: { copies10: true } }] },
      { jp: '11', en: '11', then: [{ set: { copies11: true } }] },
      { jp: '20', en: '20', then: [{ set: { copies20: true } }] },
      { jp: '100', en: '100', then: [{ set: { copies100: true } }] },
    ] } },
    { narrate: 'You press start. One page every ten seconds.' },
    { if: 'copies100', then: [{ narrate: 'Four hundred pages. That\'s more than an hour.' }], else: [
      { if: 'copies20', then: [{ narrate: 'Eighty pages. About fourteen minutes.' }], else: [{ narrate: 'About forty pages. Seven minutes, give or take.' }] },
    ] },
    { choose: { prompt: 'It\'s slow.', kind: 'action', options: [
      { jp: '（{待|ま|待つ}つ）', en: 'Wait', then: WAIT },
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: 'Use kotodama', magic: true, then: [{ spell: 'speed' }] },
    ] } },
    { goto: 'copy_sort' },
  ],

  copy_sort: [
    { if: 'copies100', then: [{ narrate: 'The old copier doesn\'t sort. A hundred of page one, a hundred of page two, and so on, in one leaning tower.' }],
      else: [{ if: 'copies20', then: [{ narrate: 'The old copier doesn\'t sort. Twenty of page one, twenty of page two, and so on, in one loose pile.' }],
        else: [{ narrate: 'The old copier doesn\'t sort. Ten of page one, ten of page two, and so on, in one loose pile.' }] }] },
    { choose: { prompt: 'Sorting.', kind: 'action', options: [
      { jp: '（{手|て}で{分|わ|分ける}ける）', en: 'Sort them by hand. About ten minutes.', then: SORT_BY_HAND },
      { jp: '（{言霊|ことだま}を{使|つか|使う}う）', en: 'Use kotodama', magic: true, then: [{ spell: 'sort' }] },
    ] } },
    { goto: 'copy_steps' },
  ],

  copy_steps: [
    { narrate: 'Footsteps in the corridor. Slow ones, in slippers.' },
    { choose: { prompt: 'Someone\'s coming.', kind: 'action', options: [
      { jp: '（じっとする）', en: 'Keep still', then: [
        { ifNoise: 1, then: [
          { narrate: 'The door opens.' },
          { show: 'mio', expr: 'bored', at: 'center' },
          { say: 'mio', expr: 'bored', jp: '……うるさい。', en: '"...Noisy."' },
          { narrate: 'She looks at the copier, humming and green. Then at you.' },
          { say: 'mio', expr: 'suspicious', jp: 'それ、{こわれてなかった|こわれてなかった|壊れる}？', en: '"Wasn\'t that thing broken?"' },
          { choose: { prompt: 'Your reply', kind: 'reply', options: [
            { jp: 'たたいた。', en: '"I hit it."', then: [{ say: 'mio', expr: 'suspicious', jp: '……エミさんも、たたいてた。', en: '"...Emi used to hit it too." It never worked for her.' }] },
            { jp: 'なおした。', en: '"I fixed it."', then: [{ say: 'mio', expr: 'suspicious', jp: '……へえ。{三か月|さんかげつ}、{こわれてた|こわれてた|壊れる}よ。', en: '"...Huh. It was broken for three months."' }] },
            { jp: '（{何|なに}も{言|い|言う}わない）', en: 'Say nothing', then: [{ narrate: 'She waits. You wait. She shrugs.' }] },
          ] } },
          { say: 'mio', expr: 'bored', jp: '……ま、いいけど。', en: '"...Whatever."' },
          { narrate: 'She shuffles off down the corridor, phone held up at the ceiling.' },
          { hide: 'mio' },
          { set: { mioSaw: true } }, { sus: { mio: 1 } },
        ], else: [
          { narrate: 'The footsteps stop right outside the door. A sigh.' },
          { say: 'mio', off: true, jp: '……ここも、{つながらない}。', en: '"...No signal here either." Through the door.' },
          { narrate: 'The slippers shuffle away.' },
        ] },
      ] },
      { jp: '（ドアを{開|あ|開ける}ける）', en: 'Open the door first', then: [
        { narrate: 'Mio is in the corridor, holding her phone above her head like a torch.' },
        { show: 'mio', expr: 'bored', at: 'center' },
        { say: 'mio', expr: 'bored', jp: '……{何|なに}。', en: '"...What."' },
        { ifNoise: 1, then: [{ say: 'mio', expr: 'suspicious', jp: '{中|なか}、うるさいね。', en: '"Noisy in there."' }, { set: { mioHeard: true } }] },
        { say: 'mio', expr: 'bored', jp: 'ここも、{つながらない}。', en: '"No signal here either."' },
        { say: 'mio', expr: 'bored', jp: 'イベント、{十二時|じゅうにじ}まで。', en: '"The event ends at twelve."' },
        { narrate: 'She shuffles on down the corridor.' },
        { hide: 'mio' },
      ] },
    ] } },
    { if: 'staplerFell', then: [{ narrate: 'You pick the stapler up off the floor and staple the sets by hand. It works on the first try.' }],
      else: [{ narrate: 'You staple the sets by hand. The stapler, at least, has never been broken.' }] },
    { goto: 'elevator_back' },
  ],

  elevator_back: [
    { bg: 'lift' },
    { elevator: { target: 'B2', wrong: wrongFrom('B1', 'You\'re already here.'), floors: FLOORS_D1, hint: 'Back to your office: {企画室|きかくしつ}7.' } },
    { goto: 'office2' },
  ],

  office2: [
    { bg: 'office' }, { music: 'office' },
    { narrate: 'Mio is back at her desk, phone face down.' },
    { show: 'mio', expr: 'bored', at: 'right' }, { show: 'emi', expr: 'smile', at: 'left' },
    { ifWithin: { since: 'copy', min: 12, then: [
      { set: { fastBack: true } },
      { say: 'emi', expr: 'surprised', jp: '……もう？', en: '"...Already?"' },
    ], else: [
      { say: 'emi', expr: 'surprised', jp: 'おかえり。……え、できた？', en: '"Welcome back. ...Wait, you actually did it?"' },
    ] } },
    { narrate: 'She flips through the stack.' },
    { if: 'crooked', then: [
      { say: 'emi', expr: 'surprised', jp: '……ちょっと、まがってない？', en: '"...Aren\'t these a bit crooked?"' },
      { say: 'emi', expr: 'teasing', jp: '……セーフ。', en: '"...Close enough."' },
    ], else: [{ if: 'copies100', then: [
      { say: 'emi', expr: 'surprised', jp: '{百部|ひゃくぶ}？　だれが{読|よ|読む}むの。', en: '"A hundred? Who\'s going to read them all?"' },
    ], else: [{ if: 'copies20', then: [
      { say: 'emi', expr: 'smile', jp: '{二十部|にじゅうぶ}？　……{多|おお|多い}いほうが、いいか。', en: '"Twenty? ...Better too many than too few."' },
    ], else: [{ if: 'copies11', then: [
      { say: 'emi', expr: 'teasing', jp: '{十一部|じゅういちぶ}？　{一|ひと|一つ}つ、{多|おお|多い}いね。', en: '"Eleven? One too many."' },
    ], else: [{ if: 'fastBack', then: [
      { say: 'emi', expr: 'surprised', jp: 'うそ。あのコピー{機|き}で？', en: '"No way. With that copier?"' },
      { ifCasts: 3, then: [{ ifNoise: 1, then: [], else: [
        { say: 'emi', expr: 'teasing', jp: '……{新人|しんじん}くん、{何者|なにもの}？', en: '"...New guy, what are you?"' }, { set: { cleanRun: true } },
      ] }] },
    ], else: [
      { say: 'emi', expr: 'smile', jp: 'ありがとう。{助|たす|助かる}かる。', en: '"Thanks. That helps."' },
    ] }] }] }] }] },
    { if: 'mioSaw', then: [{ narrate: 'Mio looks at you over her screen, one second longer than she needs to.' }],
      else: [{ if: 'mioHeard', then: [{ say: 'mio', expr: 'suspicious', jp: '……コピー{室|しつ}、うるさかったね。', en: '"...Noisy in the copy room, wasn\'t it."' }] }] },
    { say: 'emi', expr: 'smile', jp: 'じゃあ、もう{一|ひと|一つ}つ、いい？', en: '"OK then. One more thing?"' },
    { say: 'emi', expr: 'smile', jp: '{三階|さんがい}の{営業部|えいぎょうぶ}に{行|い|行く}って。', en: '"Go up to Sales, third floor."' },
    { say: 'emi', expr: 'smile', jp: '{黒田|くろだ}さんの{数字|すうじ}が、ほしい。', en: '"I need Kuroda\'s numbers."' },
    { say: 'emi', expr: 'worried', jp: '{二回|にかい}、{聞|き|聞く}いた。', en: '"I\'ve asked her twice." No reply, clearly.' },
    { say: 'emi', expr: 'smile', jp: '{会議|かいぎ}の{前|まえ}に、ね。', en: '"Before the meeting, OK?"' },
    { say: 'mio', expr: 'smirk', jp: '{黒田|くろだ}レイ？　……がんばって。', en: '"Rei Kuroda? ...Good luck."' },
    { say: 'mio', expr: 'bored', jp: 'あの{人|ひと}、{こわい}よ。', en: '"She\'s scary."' },
    { say: 'emi', expr: 'teasing', jp: '{こわくない|こわくない|こわい}よ。……ちょっとしか。', en: '"She\'s not scary. ...Only a little."' },
    { narrate: 'Kuroda Rei. The woman from the train.' },
    { hideAll: true },
    { task: '{黒田|くろだ}さん・{数字|すうじ}' },
    { goto: 'elevator_3f' },
  ],

  elevator_3f: [
    { bg: 'lift' },
    { elevator: { target: '3F', wrong: WRONG_FLOOR, floors: FLOORS_D1, hint: 'Emi said: {三階|さんがい}の{営業部|えいぎょうぶ}。' } },
    { goto: 'sales' },
  ],

  sales: [
    { bg: 'sales' }, { music: 'lively' },
    { narrate: 'Third floor, Sales. Phones ringing, fast keyboards, and nobody looks up.' },
    { narrate: 'At the window desk, Rei from the train is typing. The nameplate says 黒田.' },
    { narrate: 'You tell her Emi sent you.' },
    { show: 'rei', expr: 'cold', at: 'center' },
    { say: 'rei', expr: 'cold', jp: 'あ、{電車|でんしゃ}の。', en: '"Oh. The one from the train."' },
    { say: 'rei', expr: 'cold', jp: '……エミの{数字|すうじ}ね。', en: '"...Emi\'s numbers, right."' },
    { say: 'rei', expr: 'cold', jp: '{今|いま}、{忙|いそが|忙しい}しい。{午後|ごご}に{来|き|来る}て。', en: '"I\'m busy. Come back this afternoon."' },
    { narrate: 'The man at the next desk is watching you over his monitor.' },
    { choose: { prompt: 'Rei won\'t look up.', kind: 'reply', options: [
      { jp: 'お{願|ねが|願う}い。{今|いま}、ほしい。', en: '"Please. I need them now."', retry: true, then: [{ say: 'rei', expr: 'cold', jp: '{聞|き|聞く}こえなかった？　{午後|ごご}。', en: '"Didn\'t you hear me? Afternoon."' }] },
      { jp: '{会議|かいぎ}の{前|まえ}に、ほしい。', en: '"I need them before the meeting."', retry: true, then: [{ say: 'rei', expr: 'smirk', jp: '{知|し|知る}ってる。', en: '"I know."' }, { narrate: 'She doesn\'t look up.' }] },
      { jp: 'わかった。じゃあ、{午後|ごご}にまた{来|く|来る}る。', en: '"Fine. I\'ll come back this afternoon."', then: [{ set: { noDocs: true } }] },
      { jp: '（{言霊|ことだま}）　{見|み|見る}ている{人|ひと}：{一人|ひとり}', en: 'Use kotodama now. One person is watching.', magic: true, retry: true, again: true, if: '!witnessGone', then: [{ spell: 'reiSpell', witnesses: 1 }] },
      { jp: '（{待|ま|待つ}つ）', en: 'Wait until the man at the next desk leaves.', retry: true, if: '!witnessGone', then: [
        { time: 20 },
        { narrate: 'Twenty minutes later he takes a call and walks off toward the elevators. Rei hasn\'t moved. Neither have you.' },
        { set: { witnessGone: true } },
        { say: 'rei', expr: 'cold', jp: '……まだいるの？', en: '"...You\'re still here?"' },
      ] },
      { jp: '（{言霊|ことだま}）　{見|み|見る}ている{人|ひと}：なし', en: 'Use kotodama. Nobody else is watching now.', magic: true, retry: true, again: true, if: 'witnessGone', then: [{ spell: 'reiSpell', witnesses: 0 }] },
    ], until: 'gotDocs' } },
    { if: 'gotDocs', then: [{ if: 'reiMagic', then: [{ narrate: 'At the elevator you look back. She\'s still watching you.' }] }] },
    { hideAll: true },
    { goto: 'office3' },
  ],

  office3: [
    { bg: 'lift' }, { narrate: 'You ride the elevator back down to basement level two.' },
    { bg: 'office' }, { music: 'office' }, { time: 3 },
    { show: 'mio', expr: 'bored', at: 'right' }, { show: 'emi', expr: 'smile', at: 'left' },
    { if: 'gotDocs', then: [
      { say: 'emi', expr: 'surprised', jp: '{黒田|くろだ}さんから？　……{本当|ほんとう}に？', en: '"From Kuroda? ...Really?"' },
      { say: 'mio', expr: 'suspicious', jp: '……どうやったの？', en: '"...How did you do that?"' },
      { choose: { prompt: 'Your secret is at stake.', kind: 'reply', options: [
        { jp: 'わからない。', en: '"No idea."', then: [{ say: 'mio', expr: 'suspicious', jp: 'ふーん……。', en: '"Hmm..."' }] },
        { jp: '{ひみつ}。', en: '"It\'s a secret."', fx: { mio: 1 }, then: [{ sus: { mio: 1 } }, { say: 'mio', expr: 'smirk', jp: '……へえ。', en: '"...Huh."' }] },
        { jp: '{黒田|くろだ}さん、やさしかったよ。', en: '"Kuroda was nice to me."', then: [{ say: 'mio', expr: 'smirk', jp: 'うそでしょ。', en: '"No way."' }] },
      ] } },
      { say: 'emi', expr: 'smile', jp: 'ありがとう。じゃあ、{行|い|行く}ってくる。', en: '"Thanks. OK, I\'m off."' },
    ], else: [
      { narrate: 'You tell Emi what Rei said.' },
      { say: 'emi', expr: 'worried', jp: '{午後|ごご}か……。', en: '"This afternoon, huh..."' },
      { say: 'emi', expr: 'smile', jp: '{数字|すうじ}なしで、なんとかする。{行|い|行く}ってくる。', en: '"I\'ll manage without the numbers. I\'m off."' },
    ] },
    { hide: 'emi' },
    { narrate: 'Emi takes the copies and goes. It\'s quiet: the fan, Mio\'s keyboard.' },
    { if: 'mioSaw', then: [
      { say: 'mio', expr: 'bored', jp: '……さっきの、コピー{室|しつ}。', en: '"...The copy room, earlier."' },
      { say: 'mio', expr: 'smirk', jp: '{私|わたし}のゲーム{機|き}も、{見|み|見る}て。', en: '"Take a look at my game console too."' },
    ], else: [
      { say: 'mio', expr: 'bored', jp: '……あのコピー{機|き}、{三か月|さんかげつ}{こわれてた|こわれてた|壊れる}。', en: '"...That copier was broken for three months."' },
      { say: 'mio', expr: 'bored', jp: '……ま、いいけど。', en: '"...Whatever."' },
    ] },
    { narrate: 'She puts her headphones back on.' },
    { hideAll: true }, { task: '' },
    { goto: 'afternoon' },
  ],

  afternoon: [
    { clock: '14:00' },
    { if: 'noDocs', then: [{ narrate: 'At two you go back up to Sales. Rei hands over the folder without looking up from her screen.' }] },
    { narrate: 'At four, IT sends you a password. It doesn\'t work either.' },
    { clock: '17:30' },
    { show: 'mio', expr: 'bored', at: 'right' },
    { say: 'mio', expr: 'bored', jp: '……おつ。', en: '"...Later." Short for おつかれ, "good work".' },
    { narrate: 'Mio leaves at half past five on the dot, her game already loading.' },
    { hide: 'mio' },
    { goto: 'evening' },
  ],

  evening: [
    { clock: '17:50' },
    { narrate: 'Emi comes back from her meetings and drops into her chair.' },
    { show: 'emi', expr: 'smile', at: 'center' },
    { if: 'gotDocs', then: [
      { say: 'emi', expr: 'smile', jp: '{会議|かいぎ}、けっこううまくいった。', en: '"The meeting went pretty well."' },
      { say: 'emi', expr: 'teasing', jp: '{黒田|くろだ}さん、ちょっとびっくりしてた。', en: '"Kuroda looked a bit surprised."' },
    ], else: [
      { say: 'emi', expr: 'worried', jp: '{数字|すうじ}がなくて、ちょっと{大変|たいへん}だった。', en: '"Without the numbers it was a bit rough."' },
      { say: 'emi', expr: 'smile', jp: '……{次|つぎ}は、{勝|か|勝つ}つ。', en: '"...Next time, I win."' },
    ] },
    { if: 'crooked', then: [{ say: 'emi', expr: 'teasing', jp: 'コピー、みんなにわらわれた。', en: '"Everyone laughed at the copies."' }] },
    { if: 'copies100', then: [{ say: 'emi', expr: 'teasing', jp: 'あと、のこりの{九十部|きゅうじゅうぶ}、どうする？', en: '"Also, what do we do with the other ninety?"' }] },
    { say: 'emi', expr: 'smile', jp: '{今日|きょう}は、もう{帰|かえ|帰る}っていいよ。', en: '"You can go home for today."' },
    { say: 'emi', expr: 'smile', jp: '{寮|りょう}、わかる？', en: '"Do you know where the dorm is?"' },
    { choose: { prompt: 'Your reply', kind: 'reply', options: [
      { jp: 'うん、203。', en: '"Yeah. Room 203."', fx: { emi: 1 }, then: [{ say: 'emi', expr: 'teasing', jp: 'えらい。じゃあ、おつかれ。', en: '"Look at you. OK, good work today."' }] },
      { jp: '……たぶん。', en: '"...Probably."', then: [{ say: 'emi', expr: 'smile', jp: '{駅|えき}のとなり。……{電話|でんわ}、してね。', en: '"Next to the station. ...Call me, OK?"' }] },
    ] } },
    { hideAll: true },
    { if: 'casualGuard', then: [
      { bg: 'gate' }, { narrate: 'On your way out, the gates.' },
      { say: 'ishibashi', off: true, jp: 'また{君|きみ}か。', en: '"You again." He remembers how you spoke to him this morning.' },
      { say: 'ishibashi', off: true, jp: '……ID。', en: '"...ID."' },
      { narrate: 'You hold your badge up to the camera. He takes his time.' }, { time: 5 },
    ] },
    { task: '{寮|りょう}' },
    { goto: 'dorm' },
  ],

  dorm: [
    { bg: 'dorm' }, { music: 'night' }, { clock: '18:30' }, { task: '' },
    { narrate: 'Dorm A, room 203. Second floor. Your card opens the door on the second try.' },
    { narrate: 'Your boxes are stacked inside, the one with the drawn mug on top. The window looks straight at a concrete wall, about two metres away.' },
    { narrate: 'Somewhere on this island there are sea views.' },
    { msg: { from: 'emi', jp: 'おつかれ！{部屋|へや}、どう？', en: 'Good work today! How\'s the room?' } },
    { freeTalk: {
      with: 'emi', turns: 2, chat: true, checkFacts: true,
      goal: 'Reply to Emi. The room, your day, anything.',
      guard: 'She never confirms or discusses magic. If he mentions 言霊, magic or 魔法, she treats it as a joke and answers only 「はいはい。」 plus a short tease. She never mentions things that did not happen today. React to what he says with a tease or one small detail from today; don\'t just repeat his words back as a question.',
      fallback: [
        { choose: { prompt: 'Reply to Emi.', kind: 'reply', chat: true, options: [
          { jp: 'かべ、{近|ちか|近い}い。', en: '"The wall\'s close."', then: [{ msg: { from: 'emi', jp: 'あはは。{新人|しんじん}の{部屋|へや}だね、それ。', en: 'Ha ha. That\'s the new-hire room, then.' } }] },
          { jp: 'いい{部屋|へや}だよ。', en: '"It\'s a nice room."', then: [{ msg: { from: 'emi', jp: 'ほんとに？　やさしいね。', en: 'Really? That\'s kind of you.' } }] },
          { jp: '{今日|きょう}、{大変|たいへん}だった。', en: '"Today was a lot."', then: [{ msg: { from: 'emi', jp: 'だよね。{初日|しょにち}だもん。', en: 'I bet. It\'s your first day.' } }] },
          { jp: '{黒田|くろだ}さん、{こわかった|こわかった|こわい}。', en: '"Kuroda was scary."', then: [{ if: 'gotDocs',
            then: [{ msg: { from: 'emi', jp: 'でしょ。でも、{今日|きょう}は{勝|か|勝つ}ったね。', en: 'Right? But you won today.' } }],
            else: [{ msg: { from: 'emi', jp: 'でしょ。{私|わたし}も、ちょっと{こわい}。', en: 'Right? She scares me a bit too.' } }] }] },
        ] } },
      ],
    } },
    { msg: { from: 'emi', jp: 'ゆっくり{寝|ね|寝る}てね。また{明日|あした}。', en: 'Get some sleep. See you tomorrow.' } },
    { if: 'reiMagic', then: [
      { msg: { from: 'rei', jp: '{今日|きょう}の、あれ。{何|なに}？', en: 'That thing today. What was it?' } },
      { narrate: 'You read it three times. You don\'t answer.' },
    ] },
    { narrate: 'You find the box with the sheets, make the bed, and lie down facing the wall.' },
    { summary: true },
  ],
};

// Spells used by scenes above, referenced by name from `spell: 'name'` steps.
// Each verb lists its forms [surface, reading]; the ring offers their endings as tiles plus distractors.
// `typed`: real Japanese that isn't a tile but can be typed on desktop, with its own literal result.
export const SPELLS = {
  jam: {
    goal: 'Get the stuck page out.',
    hints: ['Ask it, the way you\'d ask a person.', 'The way Emi asked you.', 'The way Emi asked you: これ、コピーして.'],
    markAfter: 2, stopAfter: 2, giveUpLabel: 'Stop, and dig the page out by hand',
    verbs: [{ key: '出す', en: 'to take out, to put out', forms: [['出す', 'だす'], ['出して', 'だして'], ['出せ', 'だせ'], ['出した', 'だした']], typed: [['出て', 'でて'], ['出てきて', 'でてきて']] }],
    answer: '出して',
    success: [{ narrate: 'The torn page slides out by itself and drops into your hand. The copier sighs, and its screen lights up green.' }],
    pass: {
      '出せ': [
        { narrate: 'It spits out the page. Then the whole paper tray. A hundred sheets hit the door like startled pigeons.' },
        { noise: 1 }, { narrate: 'The screen lights up green. You spend a few minutes picking up paper.' }, { time: 3 },
      ],
    },
    outcomes: {
      '出す': [{ narrate: 'The copier hums, as if agreeing that paper does come out of copiers. Nothing comes out.' }],
      '出した': [{ narrate: 'It prints the last thing it ever printed: a sheet that says こわれています. So that\'s where the sign came from. Then it jams again.' }],
      '出て': [{ narrate: 'The torn page wriggles halfway out, the way you\'d step out of a door, and stops there.' }],
      '出てきて': [{ narrate: 'The torn page wriggles halfway out, the way you\'d step out of a door, and stops there.' }],
      default: [{ narrate: 'The words come out wrong. Nothing happens.' }],
    },
    giveUp: [{ narrate: 'You fish the rest of the page out with a ruler, one strip at a time. Twenty minutes later the screen lights up green.' }, { time: 20 }],
  },
  speed: {
    goal: 'Make it go faster.',
    giveUpLabel: 'Stop, and wait instead',
    verbs: [{ key: '急ぐ', en: 'to hurry', forms: [['急ぐ', 'いそぐ'], ['急いで', 'いそいで'], ['急げ', 'いそげ'], ['急いだ', 'いそいだ']] }],
    answer: '急いで',
    success: [{ if: 'copies100',
      then: [{ narrate: 'Four hundred pages in a minute. The tray overflows and paper slides across the floor.' }, { noise: 1 }, { time: 1 }],
      else: [{ narrate: 'The pages come out in a blur. Thirty seconds, and every sheet is neat.' }] }],
    pass: {
      '急げ': [{ narrate: 'It goes so fast the whole machine shakes. Ten seconds, a smell of hot toner, and half the pages come out crooked.' }, { noise: 1 }, { set: { crooked: true } }],
    },
    outcomes: {
      '急ぐ': [{ narrate: 'It agrees that hurrying is good. It doesn\'t hurry.' }],
      '急いだ': [{ narrate: 'It repeats the last thing it did: it prints the last page again, once, at the same crawl.' }],
      default: [{ narrate: 'The words come out wrong. Nothing happens.' }],
    },
    giveUp: WAIT,
  },
  sort: {
    goal: 'Put the pages in order.',
    giveUpLabel: 'Stop, and sort by hand',
    verbs: [{ key: '並ぶ', en: 'to line up', forms: [['並ぶ', 'ならぶ'], ['並んで', 'ならんで'], ['並べ', 'ならべ'], ['並んだ', 'ならんだ']], typed: [['並べて', 'ならべて']] }],
    answer: '並んで',
    success: [{ narrate: 'The pages lift off the tray and line up along the desk, one, two, three, four, one, two, three, four, like people queueing for a train. You only have to pick them up.' }, { time: 2 }],
    pass: {
      '並べ': [{ narrate: 'The pages snap into line so hard the desk rattles and the stapler falls off.' }, { noise: 1 }, { set: { staplerFell: true } }, { time: 2 }],
    },
    outcomes: {
      '並ぶ': [{ narrate: 'They agree that lining up is proper. They stay a pile.' }],
      '並んだ': [{ narrate: 'They repeat their last move: they slide off the tray onto the floor.' }],
      '並べて': [{ narrate: 'The pages look around for something to arrange. The toner boxes on the shelf shuffle into a neat row.' }],
      default: [{ narrate: 'The words come out wrong. Nothing happens.' }],
    },
    giveUp: SORT_BY_HAND,
  },
  reiSpell: {
    goal: 'Get Rei to give you the numbers.',
    noRetry: true,
    verbs: [
      { key: '渡す', en: 'to hand over', forms: [['渡す', 'わたす'], ['渡して', 'わたして'], ['渡せ', 'わたせ'], ['渡した', 'わたした']] },
      { key: '見せる', en: 'to show', forms: [['見せる', 'みせる'], ['見せて', 'みせて'], ['見せろ', 'みせろ'], ['見せた', 'みせた']] },
    ],
    answer: '渡して',
    success: [
      { say: 'rei', expr: 'confused', jp: '……え？　あ、うん。はい、これ。', en: '"...Huh? Oh, sure. Here."' },
      { narrate: 'She hands you a thick folder, then stares at her own empty hand.' },
      { say: 'rei', expr: 'confused', jp: '……あれ？　なんで？', en: '"...Huh? Why did I...?"' },
      { say: 'rei', expr: 'cold', jp: '……{午後|ごご}、なのに。', en: '"...And I said this afternoon."' },
      { if: '!witnessGone', then: [{ narrate: 'The man at the next desk looks from Rei\'s empty hand to you, then back to his screen.' }] },
      SALES_WITNESS,
      { set: { gotDocs: true, reiMagic: true } }, { fx: { rei: 1 } }, { sus: { rei: 1 } },
    ],
    pass: {
      '渡せ': [
        { say: 'rei', expr: 'confused', jp: '……っ。', en: 'A sharp breath.' },
        { narrate: 'Her hand slaps the folder down on the desk in front of you. She looks at her hand, then at you.' },
        { if: 'reiCommanded', then: [{ say: 'rei', expr: 'cold', jp: '……また？', en: '"...Again?"' }],
          else: [{ say: 'rei', expr: 'cold', jp: '……{今|いま}、{私|わたし}に{命令|めいれい}した？', en: '"...Did you just give me an order?"' }] },
        { if: '!witnessGone', then: [{ narrate: 'The man at the next desk has stopped typing.' }] },
        SALES_WITNESS,
        { set: { gotDocs: true, reiMagic: true, reiCommanded: true } }, { sus: { rei: 2 } },
      ],
    },
    outcomes: {
      '見せて': [
        { narrate: 'She opens the folder and holds it up for you. Rows of numbers. Then she snaps it shut.' },
        { say: 'rei', expr: 'confused', jp: '……{見|み|見る}た？', en: '"...Did you see that?"' },
        { narrate: 'You saw rows of numbers, too fast to keep.' },
        { if: '!witnessGone', then: [{ narrate: 'The man at the next desk glances over, then back at his screen.' }] },
        SALES_WITNESS,
        { set: { reiShowed: true, reiMagic: true } }, { sus: { rei: 1 } },
      ],
      '見せろ': [
        { narrate: 'She shoves the open folder at your face, pages flapping, and pulls it back.' },
        { if: 'reiCommanded', then: [{ say: 'rei', expr: 'cold', jp: '……また？', en: '"...Again?"' }],
          else: [{ say: 'rei', expr: 'cold', jp: '……{今|いま}、{私|わたし}に{命令|めいれい}した？', en: '"...Did you just give me an order?"' }] },
        { if: '!witnessGone', then: [{ narrate: 'The man at the next desk has stopped typing.' }] },
        SALES_WITNESS,
        { set: { reiCommanded: true, reiMagic: true } }, { sus: { rei: 2 } },
      ],
      '渡す': [{ say: 'rei', expr: 'cold', jp: 'うん、{渡|わた|渡す}すよ。{午後|ごご}に。', en: '"Sure, I\'ll hand them over. This afternoon."' }],
      '見せる': [{ say: 'rei', expr: 'cold', jp: 'うん、{午後|ごご}にね。', en: '"Sure. This afternoon."' }],
      '渡した': [{ narrate: 'She does the last thing she was doing: she types. A little faster.' }],
      '見せた': [{ narrate: 'She does the last thing she was doing: she types. A little faster.' }],
      default: [{ if: 'reiHeardNothing',
        then: [{ say: 'rei', expr: 'cold', jp: '……{何|なに}？', en: '"...What?"' }],
        else: [{ say: 'rei', expr: 'cold', jp: '……{何|なに}か{言|い|言う}った？', en: '"...Did you say something?"' }, { set: { reiHeardNothing: true } }] }],
    },
  },
};
