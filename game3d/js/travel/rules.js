import { bakeryOpen } from '../gameplay/shop-hours.js';
// Fast travel's rules (docs/game/systems.md, Fast travel): every place's state now, with its one-line reason.
//   here     where Eric is
//   go       he can fast travel there now
//   wait     he could, but something is running (a conversation, a scene, a trip, the place's start)
//   scene    the only way there plays a scene (the lift to B2, the stairs up to his room on day 1)
//   later    in today's story, but no way there is open yet (the dorms before work is over on day 1)
//   stuck    he can't walk out of where he is (the train, B2 during work)
//   closed   open on an earlier day, not today
//   hidden   never in the public story by today: drawn as a plain building, no pin
// placeStates is pure; readGame gathers its inputs from the running game.
import { NEXT, TRIPS, PLACE_NAMES } from '../places/definitions.js';
import { OPEN_PLACES as DAY2_OPEN } from '../../story/day2/index.js';
import { OPEN_PLACES as DAY3_OPEN } from '../../story/day3/index.js';
import { OPEN_PLACES as DAY5_OPEN } from '../../story/day5/index.js';
import { OPEN_PLACES as DAY4_OPEN } from '../../story/day4/index.js';
import { ROUTES } from '../../story/ongoing/routes.js';
import { findRoute } from './route.js';
import { isLift } from './ways.js';
import { nameOf } from './pins.js';

const DAY1_OPEN = [...new Set([...Object.entries(NEXT).flat(), ...Object.entries(TRIPS).flat(2)])].filter(
  (id) => id !== 'bakery',
);
const OPEN = { 1: DAY1_OPEN, 2: DAY2_OPEN, 3: DAY3_OPEN, 4: DAY4_OPEN, 5: DAY5_OPEN, 6: Object.keys(ROUTES) };
export const openToday = (day) => OPEN[day] || OPEN[Math.max(...Object.keys(OPEN).map(Number))];
export function openEver(day) {
  const s = new Set();
  for (const [d, list] of Object.entries(OPEN)) if (+d <= day) list.forEach((p) => s.add(p));
  return s;
}
export const ALL_PLACES = Object.keys(PLACE_NAMES);

export const REASON = {
  talking: 'Finish the conversation first.',
  busy: 'Wait until this moment is over.',
  stuck: 'There is no way out of here yet.',
  sceneOut: 'Walk out of here first.',
  lift: 'By the lift from the forecourt.',
  afterWork: 'Open after work.',
  later: 'No way there right now.',
  closed: 'Not open today.',
};

// in: here, day, graph (ways.js waysGraph, ways open now), afterWork (the same with going_home set, day 1 only),
// busy ('talking' | 'busy' | ''), visited (Set). Out: { place: { id, name, state, reason, route, visited } }.
export function placeStates({
  here,
  day = 1,
  period = 'morning',
  graph,
  afterWork = null,
  busy = '',
  visited = new Set(),
}) {
  const today = new Set(openToday(day)),
    ever = openEver(day);
  const plainOut = (graph[here] || []).some((w) => !w.scene);
  const anyOut = (graph[here] || []).length > 0;
  const out = {};
  for (const id of ALL_PLACES) {
    const s = { id, name: nameOf(id), visited: visited.has(id), route: null, state: 'hidden', reason: '' };
    out[id] = s;
    if (id === here) {
      s.state = 'here';
      continue;
    }
    if (!ever.has(id)) continue;
    if (!today.has(id)) {
      s.state = 'closed';
      s.reason = REASON.closed;
      continue;
    }
    if (id === 'bakery' && !bakeryOpen(day, period)) {
      s.state = 'closed';
      s.reason = 'Open in the morning, at lunch and in the afternoon.';
      continue;
    }
    const route = findRoute(graph, here, id);
    if (route) {
      s.route = route;
      s.state = busy ? 'wait' : 'go';
      s.reason = busy ? REASON[busy] || REASON.busy : '';
      continue;
    }
    if (!plainOut) {
      s.state = 'stuck';
      s.reason = anyOut ? REASON.sceneOut : REASON.stuck;
      continue;
    }
    const withScenes = findRoute(unlocked(graph), here, id);
    if (withScenes) {
      s.state = 'scene';
      const p = withScenes.path,
        last = p[p.length - 2];
      s.reason = isLift(last, id) ? REASON.lift : `Walk in from ${theName(last)}.`;
      continue;
    }
    s.state = 'later';
    s.reason = afterWork && findRoute(unlocked(afterWork), here, id) ? REASON.afterWork : REASON.later;
  }
  return out;
}
// the place's name in a sentence: "the forecourt", "the dorm courtyard"
const theName = (id) => {
  const n = nameOf(id);
  return /^[A-Z][a-z]+'s /.test(n) ? n : 'the ' + n.charAt(0).toLowerCase() + n.slice(1);
};
// the graph with its scene ways counted as ways (to tell "only by a scene" from "not now")
const unlocked = (graph) =>
  Object.fromEntries(Object.entries(graph).map(([k, ways]) => [k, ways.map((w) => ({ ...w, scene: false }))]));
