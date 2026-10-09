// The campus's walkable ground (movement/walk-ground.js; notes/grounds-system.md): the paths, streets and the
// garden's bench court from the plan (campus/plan.js), less the buildings standing on them. The walk grid and the
// drawn kerbs both come from it. The forecourt draws the same streets, seen past its court (forecourt/ground.js).
import { walkGround } from '../../movement/walk-ground.js';
import * as P from './plan.js';

// the walk grid's area (scenes/campus.js)
export const WALK_AREA = [P.BOUNDS[0] - 0.3, P.BOUNDS[1] + 0.3, P.BOUNDS[2] - 0.3, P.BOUNDS[3] + 0.3];

// where a walk runs out of the campus into the next place (each exit's trip, campus/plan.js EXITS), the walk carried
// on 10 past its end: no kerb is drawn across it. side: the walk's end it leaves by ('n', 's', 'e', 'w')
export const RUNS_ON = Object.entries(P.EXITS).map(
  ([
    to,
    {
      edge: [x, z],
    },
  ]) => {
    const r = P.WALKS.find((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]);
    // the end of the walk (along its length) nearer the exit's trigger
    const ends = (
      r[3] - r[2] > r[1] - r[0]
        ? [
            ['n', z - r[2], [r[0], r[1], r[2] - 10, r[2]]],
            ['s', r[3] - z, [r[0], r[1], r[3], r[3] + 10]],
          ]
        : [
            ['w', x - r[0], [r[0] - 10, r[0], r[2], r[3]]],
            ['e', r[1] - x, [r[1], r[1] + 10, r[2], r[3]]],
          ]
    ).sort((a, b) => a[1] - b[1])[0];
    return { to, side: ends[0], rect: ends[2] };
  },
);
export const BUILDINGS = P.SOLIDS.map((rect) => ({ kind: 'building', rect }));

export function ground() {
  return walkGround({
    walk: P.WALKS,
    cut: P.SOLIDS,
    barriers: [...BUILDINGS, ...RUNS_ON.map(({ rect }) => ({ kind: 'open', rect }))],
    bounds: WALK_AREA,
  });
}
