// The north outlook from the market uses the fountain plaza’s own builders.
import { Parts } from '../outdoor/parts.js';
import { lightSet } from '../outdoor/furniture.js';
import { paver } from '../outdoor/paving.js';
import { laneField } from '../outdoor/lane.js';
import { circleSteps } from '../plaza/ground.js';
import { ringSteps } from '../plaza/green.js';
import { buildBenches, buildNoticeBoard, buildLamps } from '../plaza/furniture.js';
import { fountain } from '../plaza/fountain.js';
import { F, BASIN, MARKET, local } from '../plaza/plan.js';
import { MARKET_ROUTE as M } from '../market-route.js';

export function* plazaContextSteps(root) {
  const paving = paver();
  laneField(paving, [...MARKET.slice(0, 3), local([M.x, M.seamZ - 1.6])[1]], {
    along: 'z',
    origin: [MARKET[0], MARKET[2]],
  });
  paving.build(root);
  yield* circleSteps(root);
  const parts = new Parts(),
    lights = lightSet();
  yield* ringSteps(parts);
  const nav = { block() {} }; // backdrop furniture, never an active walk grid
  buildBenches(parts, nav);
  buildNoticeBoard(parts, nav);
  const uplights = buildLamps(lights, parts, nav, root);
  parts.build(root);
  const lit = lights.build(root);
  const water = fountain(root, ...F, BASIN);
  return { glows: [...lit.glows, ...uplights, ...water.glows], update: water.update };
}
