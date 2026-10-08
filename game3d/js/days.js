// Which story set each day plays, where it starts and its ways between places. Day 1 is game3d/story/*.js with
// places/definitions.js NEXT and TRIPS; day 2 is game3d/story/day2/ (its index.js has the open places and trips,
// which places/definitions.js canTravel reads).
// A new day starts from the save the last one ended on: every choice, word, bond and find carries over, and only
// the state of being somewhere (the place's world, a running scene, a trip, one-off triggers) is cleared.
import { STORIES as DAY2_STORIES } from '../story/day2/index.js';
import { STORIES as DAY3_STORIES } from '../story/day3/index.js';
import { STORIES as DAY4_STORIES } from '../story/day4/index.js';
import { STORIES as DAY5_STORIES } from '../story/day5/index.js';
import { ROUTES } from '../story/ongoing/routes.js';

export const DAYS = {
  1: { dir: '', start: 'train', period: 'early' },
  2: {
    dir: 'day2/',
    start: 'dorms',
    period: 'morning',
    files: Object.keys(DAY2_STORIES),
  },
  // Saturday: a free day (story/day3/README.md), its places from story/day3/index.js
  3: {
    dir: 'day3/',
    start: 'dorms',
    period: 'morning',
    files: Object.keys(DAY3_STORIES),
  },
  4: {
    dir: 'day4/',
    start: 'dorms',
    period: 'morning',
    files: Object.keys(DAY4_STORIES),
  },
  5: { dir: 'day5/', start: 'dorms', period: 'morning', files: Object.keys(DAY5_STORIES) },
};
// The title offers the authored opening days. Saves can keep advancing afterwards.
export const LAST_DAY = 5;
export const CONTINUING_DAY = { dir: 'ongoing/', start: 'dorms', period: 'morning', files: Object.keys(ROUTES) };
export const dayOf = (n) => DAYS[n] || (Number.isSafeInteger(n) && n > LAST_DAY ? CONTINUING_DAY : DAYS[1]);
export const canStartNextDay = (n) => Number.isSafeInteger(n) && n >= 1 && n < Number.MAX_SAFE_INTEGER;
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
    zones: null,
    ended: false,
    runner: { onceDone: [] },
    world: { inside: true }, // a day starts in Eric's room (places/dorms.js restoreState)
    ui: { goal: '', sideGoal: '' },
  };
}
// ?day=N with no save of one's own from the day before: a plain finished day N-1. history is a comma list: day 1's
// (mio, mori or cold) and day 2's report (order: the new sensor ordered, the default; keep: the old one kept).
export function sampleDayEnd(day, history = 'mio') {
  const h = String(history || 'mio').split(',');
  const one = sampleDayOneEnd(h.find((x) => ['mio', 'mori', 'cold'].includes(x)) || 'mio');
  const two = sampleDayTwoEnd(one, h.includes('keep') ? 'keep' : 'order');
  return day <= 2
    ? one
    : day === 3
      ? two
      : { ...two, day: day - 1, flags: { ...two.flags, d3_complete: true, ...(day > 4 ? { d4_complete: true } : {}) } };
}
// a plain finished day 2 on top of a finished day 1: the door report sent, the brief, the shift and the party done
function sampleDayTwoEnd(one, report) {
  const flags = {
    ...one.flags,
    d2_started: true,
    d2_station_seen: true,
    d2_checked: true,
    d2_ticket_done: true,
    ...(report === 'order' ? { d2_order_sensor: true } : {}),
    d2_brief_done: true,
    d2_shift_done: true,
    d2_met_kenji: true,
    d2_ate: true,
    d2_food: 'riceball',
    d2_party_done: true,
    d2_complete: true,
    going_home: true,
    ticket_T0001: 'done',
    ticket_T0002: 'progress',
    ticketread_T0001: true,
    ticketread_T0002: true,
  };
  return {
    ...one,
    day: 2,
    flags,
    known: [...one.known, 'tabetai'],
    yen: one.yen + 3000,
    ended: true,
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
    taught: {
      ohayo: 'mio',
      yoroshiku: 'mio',
      sumimasen: 'mio',
      matte: 'mio',
      akete: 'kuroda',
      ugoite: 'mio',
    },
    met: ['mio', 'guard', 'kuroda', 'emi', 'kenji', 'mori'],
    inv: [],
    yen: 1000,
    bonds: {},
    place: 'dorms',
    ended: true,
  };
}

// Entry links choose a starting point once; they must not force it again after Sleep.
export function dayExitUrl(href) {
  const url = new URL(href);
  for (const key of ['day', 'history', 'place', 'skip', 'test', 'route', 'cap']) url.searchParams.delete(key);
  return url.href;
}
