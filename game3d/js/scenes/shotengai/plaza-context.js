// The north outlook from the market uses the fountain plaza’s own builders.
import { Parts } from '../outdoor/parts.js';
import { lightSet } from '../outdoor/furniture.js';
import { paver } from '../outdoor/paving.js';
import { laneField } from '../outdoor/lane.js';
import { circleSteps, terrace } from '../plaza/ground.js';
import { ringSteps } from '../plaza/green.js';
import { buildBenches, buildNoticeBoard, buildLamps } from '../plaza/furniture.js';
import { fountain } from '../plaza/fountain.js';
import { F, BASIN, MARKET, local, LINK, LZ, HALF, CANTEEN, DOOR_X, building } from '../plaza/plan.js';
import { canteenSteps } from '../plaza-buildings.js';
import { frontsSteps } from '../plaza/east-fronts.js';
import { M6, E2 } from '../plaza/north-plan.js';
import { groveSteps } from '../plaza/groves.js';
import { MARKET_ROUTE as M } from '../market-route.js';

export function* plazaContextSteps(root) {
  const paving = paver();
  laneField(paving, [...MARKET.slice(0, 3), local([M.x, M.seamZ - 1.6])[1]], {
    along: 'z',
    origin: [MARKET[0], MARKET[2]],
  });
  laneField(paving, LINK, { along: 'z', origin: [F[0], LZ - HALF] });
  terrace(paving);
  paving.build(root);
  yield* circleSteps(root);
  const parts = new Parts(),
    lights = lightSet();
  yield* ringSteps(parts);
  yield* groveSteps(parts);
  const fronts = yield* frontsSteps(parts, lights, [M6, E2]);
  fronts.meshes(root);
  const hall = yield* canteenSteps(root, CANTEEN, building('canteen').floorH, DOOR_X);
  const nav = { block() {} }; // backdrop furniture, never an active walk grid
  buildBenches(parts, nav);
  buildNoticeBoard(parts, nav);
  const uplights = buildLamps(lights, parts, nav, root);
  parts.build(root);
  const lit = lights.build(root);
  const water = fountain(root, ...F, BASIN);
  return {
    ids: ['canteen', M6.id, E2.id],
    glows: [...lit.glows, ...uplights, ...water.glows, ...hall.glows, ...fronts.glows],
    update: water.update,
  };
}
