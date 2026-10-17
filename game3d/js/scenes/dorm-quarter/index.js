// The dorm quarter (Review dorm-quarter-5; the plan is dorm-quarter/plan.js): one builder for every place that
// shows it. The east coast walks it; the dorm courtyard, the east lane and the plaza see it past their own ground.
// Laid with the outdoor kit in the island frame, then turned into the place's frame (place-frame.js placeIn):
//   the ground: the promenade, the walks, the edges and the lawn (dorm-quarter/ground.js)
//   the buildings: N-W, N-E, S-E, the villas, the common room and the shed (dorm-quarter/blocks.js)
//   the park: the big lawn and its loop, the wisteria, the pond and its bridge, the cherry, the play corner
//   (dorm-quarter/park.js)
//   the beach promenade, its deck, steps, benches and plaza, the fitness corner (dorm-quarter/promenade.js)
//   the gardens: the allotments, the shed's yard and the orchard, the flats' hedged gardens, the sea garden and its
//   pergola, S-E's court (dorm-quarter/gardens.js)
//   the south: the sea terrace, the row's verges, the garden south of the row and the coastal loop (yards.js)
//   where the place doesn't build them: a stand-in for the dorm courtyard and Eric's block's exterior
// Collected in cells (dorm-court/cells.js) about 12 across, so the camera culls what it can't see.
import * as THREE from 'three';
import { cells } from '../dorm-court/cells.js';
import { lightSet } from '../outdoor/furniture.js';
import { CHUNKS } from '../island-layout.js';
import { ericBlock } from '../dorm-court/block.js';
import { lightUp } from '../../kit/light/glow.js';
import { groundSteps, lawn } from './ground.js';
import { blocksSteps } from './blocks.js';
import { parkSteps } from './park.js';
import { promenadeSteps } from './promenade.js';
import { gardensSteps } from './gardens.js';
import { southSteps } from './yards.js';
import { standIn } from './court-standin.js';
import { doorPots } from '../dorm-court/cluster-yards.js';
import { BLOCKS, doorOf } from './plan.js';
import * as Q from './plan.js';

export { placeIn } from '../place-frame.js';
// the layout's buildings the quarter builds, for the places' skyline skip lists
export const QUARTER_IDS = [...BLOCKS.map((k) => k.id), 'dorm_commons_hall', 'garden_shed'];

const XCUTS = [86, 98, 110, 122],
  ZCUTS = [-44, -30, -12, 2];
// the dorm courtyard's own ground, which it lays itself: its street (the promenade in front of it) and the court
const COURT_OWN = [
  [74, 106, Q.PROM[2], Q.PROM[3]],
  [79.7, 105.8, Q.PROM[3], 3.75],
];

// How much each place builds of it: 'full', 'far' (a lighter build for what it sees from a distance: fewer small
// things, the gardens' crops sparse) or 'none'; ground 'flat' lays the paths as plain pale strips with no stones or
// kerbs. The east coast walks it all; the courtyard sees the park's edge close and the gardens not at all; the east
// lane sees its west end close; the plaza sees it down the lane, far off.
const DETAIL = {
  east_coast: { ground: 'full', park: 'full', prom: 'full', gardens: 'full', south: 'full' },
  dorm_court: { ground: 'full', park: 'full', prom: 'far', gardens: 'none', south: 'full' },
  east_lane: { ground: 'full', park: 'full', prom: 'far', gardens: 'far', south: 'full' },
  plaza: { ground: 'flat', park: 'far', prom: 'none', gardens: 'none', south: 'none' },
};

// host: the place it is built into ('east_coast', 'dorm_court', 'east_lane', 'plaza'). A generator that yields
// between parts (js/perf/slice.js); returns what lights up after dark.
export function* quarterSteps(group, { host = 'east_coast' } = {}) {
  group.name = 'dorm-quarter';
  const D = DETAIL[host],
    far = (k) => D[k] === 'far',
    walked = host === 'east_coast',
    { parts: p, paver: pv } = cells(XCUTS, ZCUTS, { cast: walked }),
    lights = lightSet();
  const own =
    host === 'dorm_court'
      ? COURT_OWN
      : host === 'east_lane' || host === 'plaza'
        ? [[Q.DORM_STREET[1], Q.DORM_STREET[1] + 3, Q.PROM[2], Q.PROM[3]]]
        : [];
  yield* groundSteps(pv, p, { own, flat: D.ground === 'flat' });
  lawn(group, { own: host === 'dorm_court' ? COURT_OWN : [] });
  yield;
  const blocks = yield* blocksSteps(p, lights, { far: host === 'plaza' });
  doorPots(
    p,
    BLOCKS.map(doorOf)
      .filter(Boolean)
      .filter((d) => d.n[0] || d.n[1]),
  );
  yield;
  if (D.park !== 'none') yield* parkSteps(pv, p, lights, group, { far: far('park') });
  if (D.prom !== 'none') yield* promenadeSteps(pv, p, lights, group, { far: far('prom') });
  if (D.gardens !== 'none') yield* gardensSteps(pv, p, lights, { far: far('gardens') });
  if (D.south !== 'none') yield* southSteps(pv, p, lights, group);
  let exterior = null;
  if (host !== 'dorm_court') {
    yield* standIn(pv, p, lights);
    // Eric's block as the courtyard builds it, without its interiors (dorm-court/block.js backdrop)
    const eric = new THREE.Group(),
      frame = CHUNKS.dorm_court;
    exterior = ericBlock(eric, { backdrop: true });
    eric.position.set(frame.at[0], 0, frame.at[1]);
    eric.rotation.y = (-frame.turn * Math.PI) / 180;
    group.add(eric);
  }
  yield;
  blocks.meshes(group);
  yield* pv.build(group);
  const built = yield* p.build(group);
  if (!walked) for (const m of built) m.castShadow = false;
  const lit = lights.build(group);
  // no shadows received either: a place's shadow box ends a little way in, and its edge would show
  if (!walked) group.traverse((m) => m.isMesh && (m.receiveShadow = false));
  const glows = [...blocks.glows, ...lit.glows, ...(exterior?.glows || [])];
  return { glows, evening: () => lightUp(glows) };
}
