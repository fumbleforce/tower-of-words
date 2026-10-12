// The playable southern garden, built once by the dorm cluster for every neighbouring view.
import { COAST_GARDEN as G } from '../island-dorms.js';
import { walkGround } from '../../movement/walk-ground.js';
import { walkEdges } from '../outdoor/walk-edges.js';
import { GRANITE } from '../outdoor/paving.js';
import { lowWall } from '../outdoor/edges.js';
import { bench, bins, lamps } from '../outdoor/furniture.js';
import { pine, maple, mound, grass } from '../outdoor/planting.js';
import { planter } from '../../kit/planting/planter.js';
import { drain } from './terrace-details.js';

const inclusive = (x, z, r) => x >= r[0] - 0.001 && x <= r[1] + 0.001 && z >= r[2] - 0.001 && z <= r[3] + 0.001;

export function* coastGardenSteps(pv, p, lights) {
  for (const r of G.paths) pv.field(r, { pattern: 'bond', module: [0.8, 0.4], tones: GRANITE.pale, origin: [0, 0] });
  // Join the pergola and row square without a kerb across either mouth. Only new path edges are drawn here.
  const ground = walkGround({ walk: G.paths, backdrop: [G.pergola, [109, 119.5, 8.4, 12]], bounds: [82, 130, 8, 32] });
  ground.edges = ground.edges.filter((e) =>
    G.paths.some((r) => inclusive((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, r)),
  );
  walkEdges(p, ground);
  yield;
  // Low retaining walls and their coping make a short, optional climbing line beside the open lawn.
  for (const [x, z, h] of G.stones) lowWall(p, [x - 0.43, z], [x + 0.43, z], { h, w: 0.75 });
  for (const [x, z, face] of G.benches) bench(p, x, z, face, { len: 1.8 });
  bins(p, 111.5, 25.8);
  lamps(lights, p, G.lamps, { pool: 2.2 });
  // The rest court has two flower troughs aligned with its paving and a clear gap toward the sea.
  for (const x of [105.5, 109.5]) planter(p, { at: [x, 29.05], variant: 'flowering', seed: Math.round(x * 10) });
  drain(p, [104.3, 28.55], [110.7, 28.55]);
  yield;
  // Keep the lawn open. Planting follows the building foundation and the path's outside edges.
  for (let x = 97.3; x < 115.8; x += 1.4) {
    mound(p, x, 21.1, 0.22 + (Math.round(x * 10) % 3) * 0.04, '#667f55', { squash: 0.55 });
    grass(p, x + 0.4, 21.2, { h: 0.34, seed: Math.round(x * 10), color: '#a5ad85' });
  }
  for (const [x, z] of [
    [96.4, 29.8],
    [101.5, 30.7],
    [113.4, 28.6],
    [120.6, 21.3],
  ]) {
    grass(p, x, z, { h: 0.45, seed: Math.round(x + z) });
    mound(p, x + 0.5, z - 0.1, 0.3, '#6c805a', { squash: 0.55 });
  }
  yield;
  // A few individual pines shelter the garden without closing the southern horizon.
  pine(p, 96.4, 30.5, 0.85, 191);
  pine(p, 114.5, 27.5, 0.85, 194);
  pine(p, 121.4, 18.5, 0.9, 195);
  maple(p, 113.4, 20.6, 0.8, 196);
  yield;
}
