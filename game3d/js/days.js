// Which story set each day plays, where it starts and its ways between places. Day 1 is game3d/story/*.js with
// places/definitions.js NEXT and TRIPS; day 2 is game3d/story/day2/ (its index.js has the open places and trips,
// which places/definitions.js canTravel reads).
// A new day starts from the save the last one ended on: every choice, word, bond and find carries over, and only
// the state of being somewhere (the place's world, a running scene, a trip, one-off triggers) is cleared.
import { STORIES as DAY2_STORIES } from '../story/day2/index.js';
import { STORIES as DAY3_STORIES } from '../story/day3/index.js';

export const DAYS = {
  1: { dir: '', start: 'train', period: 'early' },
  2: { dir: 'day2/', start: 'dorms', period: 'morning', files: Object.keys(DAY2_STORIES) },
  // a test skeleton for the clubs (story/day3/index.js), reached only with ?day=3 until day 3's story lands (#229)
  3: { dir: 'day3/', start: 'dorms', period: 'morning', files: Object.keys(DAY3_STORIES) },
};
export const LAST_DAY = 2; // the last day a player plays on into; ?day=N starts any day in DAYS
export const dayOf = (n) => DAYS[n] || DAYS[1];
// the story module path for a place on a day, relative to game3d/js/
export const storyPath = (name, day = 1) => `../story/${dayOf(day).dir}${name}.js`;
// the next day's opening save, made from the save the day ended on
export function nextDaySave(prev) {
  const day = (prev.day || 1) + 1,
    D = dayOf(day);
  const flags = { ...prev.flags, day, period: D.period, place: D.start };
  return {
    ...prev,
    day,
    period: D.period,
    place: D.start,
    flags,
    pendingStart: D.start,
    transition: null,
    ended: false,
    runner: { onceDone: [] },
    world: { inside: true }, // a day starts in Eric's room (places/dorms.js restoreState)
    ui: { goal: '', sideGoal: '' },
  };
}
// ?day=2 with no day-1 save of one's own: a plain finished day 1 (the magic way through the gate, lunch with Mio).
// &history=mori takes lunch with Mori instead; &history=cold, lunch alone and no promise from Mio.
export function sampleDayOneEnd(history = 'mio') {
  const known = ['ohayo', 'yoroshiku', 'sumimasen', 'matte', 'akete', 'ugoite', 'irete'];
  const flags = {
    gate_magic: true,
    dorm_room_known: true,
    going_home: true,
    ...(history === 'mio' ? { lunch_mio: true, mio_warm: 2 } : {}),
    ...(history === 'mori' ? { lunch_mori: true, mio_warm: 1 } : {}),
    ...(history === 'cold' ? { mio_warm: 0 } : {}),
  };
  return {
    v: 1,
    day: 1,
    period: 'evening',
    flags,
    known,
    seen: [],
    found: [],
    taught: { ohayo: 'mio', yoroshiku: 'mio', sumimasen: 'mio', matte: 'mio', akete: 'kuroda', ugoite: 'mio' },
    met: ['mio', 'guard', 'kuroda', 'emi', 'kenji', 'mori'],
    inv: [],
    yen: 1000,
    bonds: {},
    place: 'dorms',
    ended: true,
  };
}
