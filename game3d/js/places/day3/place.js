// A place's part of day 3: the bodies it makes for the day (places/day-cast.js), registered explicitly by the place
// (people.<id>: d3.people.<id>, things.<id>: { ...PLACE_DETAILS.<place>.things.<id>, ...d3.thing(id) }), and its
// `day3` function for the story's day3Setup: Saturday's plan for the period (plan.js), anyone the place already had
// taken in as they are, the small signs for the day (signs.js), then the place's own arrangement (also()).
//   day3Place(game, name, { root, K, ids })  -> { people, thing, cast, setup(P, a), also(fn), update(dt) }
//   installDay3(game)  the global day3Setup hook: the place's own day3, or (a place that makes nobody for the day)
//                      one made the first time, which only moves the people it has and puts up its signs
import { dayCast } from '../day-cast.js';
import { applyPlan, isDay3 } from './index.js';
import { PLANS } from './plan.js';
import { placeSigns } from './signs.js';

export function day3Place(game, name, { root, K = 1, ids = [] } = {}) {
  const cast = dayCast(game, { root, K, ids });
  const extra = [];
  return {
    cast,
    people: cast.people,
    thing: cast.thing,
    async setup(P, a = {}) {
      const plan = PLANS[name] || {};
      for (const id of Object.keys(plan)) if (!cast.people[id] && P.people[id]) cast.adopt(id, P.people[id]);
      applyPlan(cast, P, plan);
      placeSigns(P, name);
      for (const f of extra) await f(a);
    },
    also(f) {
      extra.push(f);
    },
    update: (dt) => cast.update(dt),
  };
}

export function installDay3(game) {
  // { do: 'day3Setup', state }: the place's people and props for now; state picks a place's special arrangement
  game.hooks.day3Setup = async (a = {}) => {
    const P = game.place;
    if (!isDay3() || !P) return;
    if (!P.day3) {
      const d3 = day3Place(game, P.name, { root: P.space, K: P.charScale || 1 });
      if (P.onDay3) d3.also(P.onDay3); // the place's own props for the day (the station's monitor)
      P.day3 = (o) => d3.setup(P, o);
    }
    await P.day3(a);
  };
}
