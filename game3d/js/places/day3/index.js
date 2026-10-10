// Day 3, Saturday (story/day3/README.md; docs/game/places.md "Who's there when"): who is where for each period, from
// the outline's Saturday schedule (notes/days3-5-outline.md, "Where everyone is"). The story's `day3Setup` step (every
// day-3 place's start node, so every arrival and Continue) runs the place's own `day3` function, which puts the
// place's people where the plan has them now and hides the rest; a place's scene hooks (station, monitor, booking,
// pool, board) are in the other files here. Nobody is moved on any other day.
//   applyPlan(cast, P, plan)           the plan for the current period: { id: { period | '*': spec | [spec, ...] } }
//     spec: { at, face } standing (each a point, or a function of the place); { seat } on a seat (a place seat id,
//     or a function giving { x, z, top, ry }); { home: true } where the place itself keeps them; `if` a condition;
//     `pose` a cat's (sleep, sit, stand). No spec for a period: offstage.
import { sim } from '../../sim.js';
import { cond } from '../../narrative/state.js';

export const isDay3 = () => sim.day === 3;

const val = (v, P) => (typeof v === 'function' ? v(P) : v);
export function pickSpec(per) {
  let e = per?.[sim.period] ?? per?.['*'];
  if (Array.isArray(e)) e = e.find((x) => !x.if || cond(x.if)) || null;
  else if (e?.if && !cond(e.if)) e = null;
  return e || null;
}
export function applyPlan(cast, P, plan) {
  for (const [id, per] of Object.entries(plan)) {
    const e = pickSpec(per);
    if (!e) cast.hide(id);
    else if (e.home) cast.home(id);
    else if (e.seat) cast.seat(id, typeof e.seat === 'string' ? P.seats[e.seat] : val(e.seat, P));
    else cast.put(id, val(e.at, P), val(e.face, P), { yaw: e.yaw, pose: e.pose });
  }
}
