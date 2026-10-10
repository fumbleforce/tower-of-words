import { emiNeedsIntro, emiIntroduction, emiClubFact } from './day3/shared.js';
// The clubs and the single events on the plaza's notice board (docs/game/progression.md, Clubs; systems.md, Clubs
// and Notice board). The engine (js/clubs/) reads this file: the board's posters, joining by taking a slip, and
// which session node runs when Eric, a member, arrives at a club's place while it meets. The contract is in
// story/FORMAT.md (Clubs).
//
//   clubs.<id>: name, ja, ro (the club's name in Japanese and its reading), open (a condition: when its poster is on
//     the board), meets (when and where it meets: weekday Sun..Sat, period, place, where (the poster's English for
//     the place), from / until (first and last day of the game this line applies)), members (people ids, or
//     role:<role> through data/cast/roles.json), poster (one short English line), sessions (node names: the n-th
//     visit runs the n-th, the last one repeats), events (special sessions: { id, node, after: n visits, if }; the
//     first one due runs instead of that week's session), show (markers in the club's places, for members only:
//     { thing: condition })
//   events: single events on the board: { id, title, ja, ro, day, period, place, where, text, if }; shown until
//     their day has passed
//   labels: the poster's Japanese labels, with reading and English
//   nodes: the session scenes. Each runs in the club's place, as that place's own node.
//
// The first swimming visit is authored; later sessions remain with their day’s writing task.
export default {
  labels: {
    boshu: { ja: '募集', ro: 'boshū', en: 'members wanted' },
    nichiji: { ja: '日時', ro: 'nichiji', en: 'when' },
    basho: { ja: '場所', ro: 'basho', en: 'where' },
    nyukai: { ja: '入会', ro: 'nyūkai', en: 'join' },
  },
  clubs: {
    swimming: {
      name: 'Swimming club',
      ja: '水泳部',
      ro: 'suieibu',
      open: 'day >= 3',
      meets: [
        { weekday: 'Sat', period: 'evening', place: 'pool', where: 'Outdoor pool', until: 3 },
        { weekday: 'Sat', period: 'evening', place: 'gym', where: 'Gym', from: 4 },
      ],
      members: ['role:team_lead', 'role:receptionist'],
      poster: '3 October only: one last outdoor swim. Saturdays after that, meet in the gym.',
      sessions: ['club_swimming_1', 'club_swimming_2'],
      events: [],
      show: {},
    },
    tennis: {
      name: 'Tennis club',
      ja: 'テニス部',
      ro: 'tenisubu',
      open: 'day >= 3',
      meets: [{ weekday: 'Sun', period: 'evening', place: 'sports', where: 'Tennis courts' }],
      members: ['role:new_hire', 'role:sales'],
      poster: 'Sunday practice and doubles on the west court. You can borrow a racket.',
      sessions: ['club_tennis_1', 'club_tennis_2'],
      events: [],
      show: {},
    },
    art: {
      name: 'Art club',
      ja: '美術部',
      ro: 'bijutsubu',
      open: 'day >= 3',
      meets: [{ weekday: 'Tue', period: 'evening', place: 'dorm_commons', where: 'Dorm common room' }],
      members: ['role:section_chief'],
      poster: 'Tuesday in the common room. Paper and pencils provided; bring something you want to draw.',
      sessions: ['club_art_1', 'club_art_2'],
      events: [],
      show: {},
    },
    karaoke: {
      name: 'Karaoke club',
      ja: 'カラオケ部',
      ro: 'karaokebu',
      open: 'day >= 3',
      meets: [{ weekday: 'Wed', period: 'evening', place: 'karaoke_booth', where: 'Karaoke box, shop street' }],
      members: ['role:engineer', 'kuroda'],
      poster: 'Our booth is booked for Wednesday. Choose a song, or come and listen.',
      sessions: ['club_karaoke_1', 'club_karaoke_2'],
      events: [],
      show: {},
    },
  },
  events: [],
  nodes: {
    club_swimming_1: [
      { call: 'club_swimming_intro' },
      { if: "place == 'gym'", then: [{ go: 'club_swimming_winter' }], else: [{ go: 'club_swimming_pool' }] },
    ],
    club_swimming_intro: [
      { do: 'cam', on: 'emi', zoom: 1.2 },
      { if: emiNeedsIntro, then: emiIntroduction, else: [
        { unset: 'd3_emi_needs_intro' },
        { say: 'emi', emo: 'bright', text: '{mc.name}! I was hoping you’d make it.' },
      ] },
      emiClubFact,
      { if: '!d3_kuro_intro', then: [
        { do: 'cam', on: 'kuro', zoom: 1.2 },
        { if: 'd2_kuro_weekend_seen && day == 3', then: [
          { say: 'kuro', name: 'Receptionist', overheard: true, emo: 'warm', text: '来たんですね。……忘れると思ってました。' },
          { say: 'eric', emo: 'warm', text: 'You pointed me at the club yesterday. I thought I’d come and see.' },
          { say: 'kuro', name: 'Receptionist', overheard: true, emo: 'amused', text: '玖路です。' },
        ], else: [{ if: 'kuro_reception_seen || d2_kuro_greeted', then: [
          { say: 'kuro', name: 'Receptionist', overheard: true, emo: 'amused', text: 'こんばんは。今日は、何階？' },
          { say: 'eric', emo: 'warm', text: 'I think I’m in the right place this time.' },
          { say: 'kuro', name: 'Receptionist', overheard: true, emo: 'polite', text: '玖路です。受付の。' },
        ], else: [
          { say: 'kuro', name: 'Receptionist', overheard: true, emo: 'polite', text: 'こんばんは。玖路です。本社の受付です。' },
          { say: 'eric', emo: 'warm', text: 'I’m {mc.name}. Nice to meet you.' },
        ] }] },
        { do: 'meet', who: 'kuro' }, { set: 'd3_kuro_intro' },
      ] },
      { do: 'cam', back: true },
    ],
    club_swimming_pool: [
      { call: 'd3_pool_begin' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'このプール、今日で最後なんですよ。', clear: ['プール'] },
      { say: 'emi', emo: 'casual', text: 'Last evening at this pool. The water’s fine once you’re in, apparently.' },
      { say: 'emi', emo: 'casual', text: 'I came down to put these bags away and have a quick swim. I haven’t managed either yet.' },
      { say: 'member', overheard: true, emo: 'polite', text: 'エミさん、これもお願いします。備品のリストです。', clear: ['リスト'] },
      { call: 'd3_pool_list' },
      { say: 'emi', emo: 'amused', text: 'Oh, she’s found me something else. That can wait until I’m dry again.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'teasing', text: 'エミさん、泳ぎに来たんでしょう？' },
      { say: 'emi', emo: 'warm', text: 'Yes, I did come here to swim. You’re quite right.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'curious', text: '今日は、{oyogu}？' },
      { choice: [
        { text: 'Swim with Kuro.', go: 'club_swimming_join' },
        { text: 'Ask how to say you’ll swim.', if: '!know_oyogu', go: 'club_swimming_word' },
        { text: 'Carry Emi’s bags to the attendant.', go: 'club_swimming_bags' },
        { text: 'Sit on the deck and watch.', go: 'club_swimming_watch' },
        { text: 'Leave them to their evening.', go: 'club_swimming_leave_early' },
      ] },
    ],
    club_swimming_word: [
      { say: 'emi', emo: 'casual', text: 'She’s asking you too. {oyogu} means swim. Or you can sit with us, there’s no test.' },
      { say: 'kuro', name: 'Kuro', emo: 'slow', slow: true, text: '{oyogu}。' },
      { do: 'type', word: 'oyogu', from: 'kuro', prompt: 'Try the word she used for swimming: oyogu.' },
      { go: 'club_swimming_join' },
    ],
    club_swimming_slow: [
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: 'ゆっくりで、いいですよ。', clear: [{ ja: 'ゆっくり', ro: 'yukkuri', en: 'slowly' }] },
      { say: 'emi', emo: 'warm', text: 'Take it slowly, she says. I could do with remembering that myself.' },
      { say: 'eric', emo: 'warm', text: 'I may need a moment at the other end.' },
    ],
    club_swimming_join: [
      { if: 'know_oyogu', then: [{ say: 'eric', emo: 'warm', text: '{oyogu}. I’ll come in, but I’m a bit out of practice.' }],
        else: [{ say: 'eric', emo: 'warm', text: 'I’ll come in, but I’m a bit out of practice.' }] },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: 'こっちです。' },
      { do: 'gesture', who: 'kuro', kind: 'beckon', to: 'eric' },
      { set: 'd3_player_swims' }, { call: 'd3_pool_enter' },
      { do: 'cam', on: 'attendant', zoom: 1.2 },
      { say: 'emi', overheard: true, emo: 'casual', text: '{sumimasen}、これ、お願いできますか？' },
      { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、預かりますね。' },
      { call: 'd3_pool_emi_hands_over' }, { go: 'club_swimming_length' },
    ],
    club_swimming_bags: [
      { say: 'eric', emo: 'warm', text: 'I can carry those over. Go on.' },
      { say: 'emi', emo: 'bright', text: 'Thank you. Just take them over to him by the steps.' },
      { call: 'd3_pool_bags' },
      { choice: [
        { text: 'Get in the water.', go: 'club_swimming_after_bags' },
        { text: 'Take a seat on the deck.', go: 'club_swimming_deck' },
      ] },
    ],
    club_swimming_after_bags: [{ set: 'd3_player_swims' }, { call: 'd3_pool_enter' }, { go: 'club_swimming_length' }],
    club_swimming_watch: [
      { if: 'know_mitai', then: [{ say: 'eric', emo: 'warm', text: '{mitai}. I’ll watch for a bit. Don’t wait for me.' }],
        else: [{ say: 'eric', emo: 'warm', text: 'I’ll watch for a bit. Don’t wait for me.' }] },
      { do: 'cam', on: 'attendant', zoom: 1.2 },
      { say: 'emi', overheard: true, emo: 'casual', text: '{sumimasen}、これ、お願いできますか？' },
      { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、預かりますね。' },
      { call: 'd3_pool_emi_hands_over' }, { go: 'club_swimming_deck' },
    ],
    club_swimming_deck: [{ do: 'sit', who: 'eric', at: 'deck_bench_s' }, { go: 'club_swimming_length' }],
    club_swimming_length: [
      { call: 'd3_pool_emi_enters' },
      { if: 'd3_player_swims', then: [{ call: 'club_swimming_slow' }] },
      { say: 'emi', emo: 'surprised', text: 'Oh. That’s colder than it was in August.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '泳げば、少し温かくなりますよ。' },
      { call: 'd3_pool_length' },
      { if: 'd3_player_swims', then: [
        { do: 'cam', on: 'kuro', zoom: 1.2 },
        { say: 'kuro', name: 'Kuro', overheard: true, emo: 'curious', text: '速かった？' },
        { say: 'eric', emo: 'warm', text: 'Yes. I just need a moment at the wall.' },
      ] },
      { say: 'emi', emo: 'warm', text: 'I nearly stayed upstairs to finish an email. I’m glad I didn’t.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: 'もう一本、泳ぎませんか。' },
      { say: 'emi', emo: 'bright', text: 'One more length? Yes, we’ve got time.' },
      { do: 'cam', on: 'attendant', zoom: 1.2 },
      { say: 'emi', overheard: true, emo: 'casual', text: '{sumimasen}、リスト、テーブルに置いてもらえますか？', clear: ['リスト', 'テーブル'] },
      { say: 'attendant', overheard: true, emo: 'polite', text: 'はい、置いておきます。' },
      { call: 'd3_pool_another' },
      { set: 'd3_swim_done' }, { call: 'club_swimming_shared' },
      { do: 'remember', who: 'emi', id: 'first_club', text: 'You were there for the last outdoor swim.' },
      { do: 'save' },
      { choice: [
        { text: 'Sit with them after the swim.', go: 'club_swimming_sit' },
        { text: 'Say goodnight and leave the pool.', go: 'club_swimming_goodnight' },
      ] },
    ],
    club_swimming_sit: [
      { call: 'd3_pool_sit' },
      { say: 'emi', emo: 'warm', text: 'I used to keep my goggles in my work bag so I’d actually come down. Then I started carrying everyone else’s things instead.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'dry', text: '荷物は、自分で。' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'warm', text: '次は、{isshoni}。' },
      { say: 'attendant', overheard: true, emo: 'polite', text: '来週から体育館です。室内用の靴を持ってきてくださいね。' },
      { say: 'emi', emo: 'casual', text: 'Gym from next week, he says, and bring indoor shoes. They really do send you home without them.' },
      { say: 'eric', emo: 'warm', text: 'I’ll know where to find you if the email can wait.' },
      { do: 'remember', who: 'kuro', id: 'club_seat', text: 'Sat with her after the club session.' },
      { call: 'd3_pool_free' }, { do: 'cam', back: true },
      { do: 'goal', text: 'Stay by the pool, or go home to room 203 when you want to sleep.' }, { do: 'save' },
    ],
    club_swimming_goodnight: [
      { say: 'eric', emo: 'warm', text: 'I’ll head back. Thanks for having me.' },
      { say: 'emi', emo: 'warm', text: 'See you next Saturday, if you’re free. We’ll be in the gym by then.' },
      { call: 'd3_pool_exit' }, { do: 'cam', back: true }, { do: 'trip', to: 'sports' },
    ],
    club_swimming_leave_early: [
      { say: 'emi', emo: 'casual', text: 'All right. We’ll be here if you come back.' },
      { do: 'cam', back: true }, { do: 'trip', to: 'sports' },
    ],
    // First visit after the seasonal pool date: its own scene, with the same early social progress available.
    club_swimming_winter: [
      { call: 'd3_winter_setup' },
      { say: 'emi', emo: 'bright', text: 'We’re indoors for the winter. You missed the last outdoor swim, but so did half the club.' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'amused', text: '持ってきちゃいました。' },
      { say: 'emi', emo: 'casual', text: 'Mine are in here somewhere. Shall we find out what we’re doing?' },
      { choice: [
        { text: 'Sit with them for the introduction.', go: 'club_swimming_winter_sit' },
        { text: 'Say hello and leave for tonight.', go: 'club_swimming_winter_leave' },
      ] },
    ],
    club_swimming_winter_sit: [
      { do: 'sit', who: 'eric', at: 'gym_bench_n' },
      { say: 'attendant', overheard: true, emo: 'polite', text: 'このあたりは自由に使えます。マットは、そこの棚です。', clear: ['マット'] },
      { do: 'gesture', who: 'attendant', kind: 'point' },
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'tired', text: '寒い……靴下、もっと厚いのにすればよかった。' },
      { say: 'eric', emo: 'warm', text: 'I’ll remember that for next time.' },
      { do: 'remember', who: 'emi', id: 'first_club', text: 'Joined her for your first winter club meeting.' },
      { do: 'remember', who: 'kuro', id: 'club_seat', text: 'Sat with her at the club’s winter meeting.' },
      { call: 'club_swimming_shared' }, { set: 'd3_winter_intro_done' }, { do: 'stand', who: 'eric' },
      { do: 'cam', back: true }, { do: 'goal', text: 'Stay at the gym, or head home when you want to sleep.' }, { do: 'save' },
    ],
    club_swimming_shared: [
      { if: '!d3_swimming_shared', then: [
        { do: 'bond', who: 'emi', source: 'scene', why: 'spent an evening at the swimming club' },
        { do: 'bond', who: 'kuro', source: 'scene', why: 'spent an evening at the swimming club' },
        { set: 'd3_swimming_shared' },
      ] },
    ],
    club_swimming_winter_leave: [
      { say: 'kuro', name: 'Kuro', overheard: true, emo: 'polite', text: 'また土曜日に。' },
      { do: 'gesture', who: 'kuro', kind: 'point', to: 'eric' },
      { do: 'cam', back: true }, { do: 'trip', to: 'sports' },
    ],
    club_swimming_2: [
      { if: '!d3_swim_done && !d3_winter_intro_done', then: [{ go: 'club_swimming_1' }] },
      '> Placeholder: an ordinary swimming club evening (Codex writes it).',
    ],
    club_tennis_1: [{ call: 'd4_tennis_offer' }],
    club_tennis_2: [{ if: '!d4_tennis_done', then: [{ call: 'd4_tennis_offer' }], else: [{ call: 'd4_tennis_repeat' }] }],
    club_art_1: ["> Placeholder: the art club's first session (Codex writes it)."],
    club_art_2: ['> Placeholder: an ordinary art club evening (Codex writes it).'],
    club_karaoke_1: ["> Placeholder: the karaoke club's first session (Codex writes it)."],
    club_karaoke_2: ['> Placeholder: an ordinary karaoke club evening (Codex writes it).'],
  },
};
