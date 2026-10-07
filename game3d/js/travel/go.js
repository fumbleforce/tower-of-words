// Fast travel in the running game (docs/game/systems.md, Fast travel): reads the game into travel/rules.js, and
// Go there checks the rules again and starts the trip: places/lifecycle.js travel(dest, { fast: true, via }), which
// skips the leaving walk and arrives as he would on foot from the route's last place. No clock cost.
import { sim } from '../sim.js';
import { cond } from '../narrative/state.js';
import { createConditionEvaluator } from '../narrative/conditions.js';
import { waysGraph, keepPublic } from './ways.js';
import { placeStates, openToday } from './rules.js';
import { visited } from './visited.js';

// the flags as they are, with work over (going_home)
const workOver = createConditionEvaluator((k) => (k === 'going_home' ? true : cond(k)));
const stories = new Map(); // `${day}:${place}` -> story, as runner.load gave it
async function storiesFor(game, day) {
  const out = {};
  await Promise.all(
    [...openToday(day), 'transitions'].map(async (p) => {
      const k = `${day}:${p}`;
      if (!stories.has(k)) {
        const s = await game.runner.load(p);
        keepPublic(s);
        stories.set(k, s);
      }
      out[p] = stories.get(k);
    }),
  );
  return out;
}

// what is running now, as the map says it: '' when nothing is
export function busyReason(game) {
  const talk = document.getElementById('talk');
  if (talk && !talk.hidden) return 'talking';
  if (game.busy || game.saying || game.transition || game.pendingStart || game.ended || game.queue?.length)
    return 'busy';
  if (document.body.classList.contains('trip') || game.walker?.locked) return 'busy';
  return '';
}

// every place's state now (rules.js placeStates)
export async function travelStates(game) {
  const day = sim.day || 1,
    here = game.place?.name;
  const all = await storiesFor(game, day);
  const { transitions, ...byPlace } = all;
  const opts = {
    day,
    cond,
    visited,
    transitions: day === 1 ? transitions : null,
    onceFor: (p) => (p === here ? game.runner.onceDone : null),
  };
  const places = openToday(day);
  const graph = waysGraph(byPlace, places, opts);
  // day 1: the same with work over, to tell "open after work" from "not now"
  const afterWork = day === 1 ? waysGraph(byPlace, places, { ...opts, cond: workOver }) : null;
  return placeStates({ here, day, period: sim.period, graph, afterWork, busy: busyReason(game), visited });
}

// Go there: true if the trip started
export async function goTo(game, dest) {
  const s = (await travelStates(game))[dest];
  if (!s || s.state !== 'go' || !s.route?.via || !game.travel) return false;
  game.prepare?.(dest);
  void game.travel(dest, { fast: true, via: s.route.via });
  return true;
}
