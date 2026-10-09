// The forecourt's walkable ground (movement/walk-ground.js; notes/grounds-system.md): the one list the walk grid
// and the drawn borders both come from, every rectangle from the plan (forecourt/plan.js). He walks on paving and
// gravel; lawn and planting are never walkable, and a kerb stands wherever the two meet unless a building, a wall or
// a gate already does.
import { walkGround } from '../../movement/walk-ground.js';
import { T } from '../head-office/frame.js';
import { southLinkFrame } from './south-link.js';
import { WALKS as NORTH_WALKS } from '../campus/plan.js';
import { RUNS_ON, BUILDINGS as NORTH_BUILDINGS } from '../campus/ground.js';
import * as P from './plan.js';

const { STATION, DOOR_X, X0, ZN, HZ, SHED_ST: SH, SERVICE, LANE, STRIP_S: S } = P;
// the walk grid's area: north to the tower's north wall (the lobby's back rooms), east to where the plaza trip
// starts on the lane
export const WALK_AREA = [X0 - 0.6, P.LANE_WALK, HZ - 9.8, 12.75];
export const TOWER = [T.o[0], T.o[0] + T.W, T.o[1] - T.D, T.o[1]];
// the station's doorway: walkable, shut to him by a tagged block a step in (forecourt.js)
export const DOORWAY = [DOOR_X - 0.55, DOOR_X + 0.55, ZN - 0.1, ZN + 1.4];
// the service yard's mouth, up to its closed gate (forecourt/service.js)
export const YARD_MOUTH = [SERVICE[0], SERVICE[1], HZ - 0.25, HZ];
// the bench bays cut into the lane's south strip (forecourt/lane.js), paved and walked into
export const BAY_X = [P.LANE_TREES[1] + 2, P.LANE_TREES[4] + 2];
export const BAYS = BAY_X.map((x) => [x - 1.0, x + 1.0, S[2], S[2] + 0.9]);

// the court's raised north bed (forecourt/court.js), taken out of the court back to its north edge
export const NORTH_BED = [P.NORTH_BED[0], P.NORTH_BED[1], HZ, P.NORTH_BED[3]];

export function ground() {
  const link = southLinkFrame('forecourt').walk;
  return walkGround({
    walk: [
      link,
      P.COURT,
      P.BIKES,
      LANE,
      ...BAYS,
      P.GARDEN_PATH,
      P.GARDEN_COURT,
      P.SHED_WALK,
      YARD_MOUTH,
      TOWER,
      DOORWAY,
    ],
    // the campus's streets, seen past the court's north bed: walkable there, drawn the same way here
    backdrop: NORTH_WALKS,
    indoor: [TOWER],
    cut: [NORTH_BED],
    barriers: [
      // raised beds behind their own low walls
      { kind: 'wall', rect: NORTH_BED },
      { kind: 'wall', rect: P.GARDEN },
      {
        kind: 'building',
        rect: [STATION.x0, STATION.x1, STATION.zN, STATION.zS],
      },
      { kind: 'building', rect: P.WING },
      {
        kind: 'gate',
        rect: [SERVICE[0], SERVICE[1], SERVICE[2], YARD_MOUTH[2]],
      },
      // where trips start: the campus up the shed street, the plaza along the lane, the shops down the south link
      { kind: 'open', rect: [SH[0], SH[1], SH[2] - 10, P.SHED_WALK[2]] },
      { kind: 'open', rect: [52, 80, LANE[2], LANE[3]] },
      { kind: 'open', rect: [link[0], link[1], link[3], link[3] + 10] },
      // the campus's buildings and its own trips' starts, past the streets seen from here
      ...NORTH_BUILDINGS,
      ...RUNS_ON.filter((r) => r.to !== 'forecourt').map(({ rect }) => ({
        kind: 'open',
        rect,
      })),
    ],
    bounds: WALK_AREA,
  });
}
