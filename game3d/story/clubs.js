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
// PLACEHOLDER: every node below is a one-line stand-in until Codex writes the sessions (#228 report lists them).
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
      poster: 'Last outdoor swim of the year. From next week we meet in the gym.',
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
      poster: 'Doubles and practice on the west court. Spare rackets to lend.',
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
      poster: 'Paper, pencils and paints are on the table. Just come.',
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
      poster: 'One booth, every Wednesday. Pick a song.',
      sessions: ['club_karaoke_1', 'club_karaoke_2'],
      events: [],
      show: {},
    },
  },
  events: [],
  nodes: {
    club_swimming_1: ["> Placeholder: the swimming club's first session (Codex writes it)."],
    club_swimming_2: ['> Placeholder: an ordinary swimming club evening (Codex writes it).'],
    club_tennis_1: ["> Placeholder: the tennis club's first session (Codex writes it)."],
    club_tennis_2: ['> Placeholder: an ordinary tennis club evening (Codex writes it).'],
    club_art_1: ["> Placeholder: the art club's first session (Codex writes it)."],
    club_art_2: ['> Placeholder: an ordinary art club evening (Codex writes it).'],
    club_karaoke_1: ["> Placeholder: the karaoke club's first session (Codex writes it)."],
    club_karaoke_2: ['> Placeholder: an ordinary karaoke club evening (Codex writes it).'],
  },
};
