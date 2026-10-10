import { PEOPLE } from '../../cast.js';
import { roleBody } from '../../chibi-crowd.js';
import { blob } from '../../engine.js';
import { sim } from '../../sim.js';
import { flags } from '../../narrative/state.js';
import { flagKeys } from '../../narrative/engine-flags.js';
import { BENCHES, PATCHES, BOUNDS } from '../../scenes/station-garden/plan.js';
import { snapshotPeople, restorePeople } from '../saved-people.js';
import { canteenSave } from '../canteen-state.js';
import { gardenRoutine } from './routine.js';
import { freeBench } from './state.js';

const KEYS = flagKeys('game3d/js/places/station-garden/index.js');
export function stationGarden(game, { w, K }) {
  const garden = w.garden;
  let P;
  const stage = {
    space: w.root,
    nav: w.nav,
    get people() {
      return P?.people || {};
    },
    get crowd() {
      return P?.crowd || [];
    },
  };
  // the grounds worker: older-1 in an olive work jacket (crowd/roles.js grounds); the code-built worker if it didn't load
  const worker = roleBody('grounds', 5, { proxy: true, tint: { top: '#5f6b4c' } }) || PEOPLE.worker(5);
  worker.root.scale.multiplyScalar(K);
  worker.root.add(blob(0.28, 0.22));
  w.root.add(worker.root);
  const routine = gardenRoutine(game, stage, worker, garden.tools);
  const things = {};
  let pointedBench = null,
    talking = false;
  function context() {
    const crowd = P.crowd || [];
    pointedBench = freeBench(BENCHES, [game.player, ...Object.values(P.people), ...Object.values(crowd)]);
    flags[KEYS.garden_bench_free] = !!pointedBench;
    flags[KEYS.garden_worker_done] = routine.state.collected.every((k) => k === 1);
    flags[KEYS.garden_worker_busy] = routine.state.phase === 'collect';
    P.spots.garden_free_bench = pointedBench ? [BENCHES[pointedBench].x, BENCHES[pointedBench].z] : PATCHES[0];
    P.spots.garden_next_patch = PATCHES[1 - routine.state.patch];
  }
  things.station_worker = {
    fixedSpot: true,
    enabled: () => worker.root.visible && routine.state.phase !== 'walk',
    anchor: (v) => worker.root.getWorldPosition(v).add({ x: 0, y: 1.1, z: 0 }),
    spot() {
      const p = worker.root.position;
      for (const [dx, dz] of [
        [-0.85, 0],
        [0.85, 0],
        [0, -0.85],
      ])
        if (P.nav.free(p.x + dx, p.z + dz)) return [p.x + dx, p.z + dz];
      return [p.x, p.z - 0.85];
    },
    face: () => [worker.root.position.x, worker.root.position.z],
  };
  for (const [id, seat] of Object.entries(BENCHES)) {
    things[id] = {
      pin: 'near',
      anchor: (v) => v.set(seat.x, 0.75, seat.z),
      spot: () => seat.out,
      face: () => [seat.x, seat.z],
      enabled: () => freeBench({ [id]: seat }, [...Object.values(P.people), ...(P.crowd || [])]) === id,
    };
  }
  const interact = async ({ state }) => {
    if (state === 'begin') {
      game.walker.stop();
      game.walker.sync();
      context();
      talking = true;
      routine.pause();
      if (flags[KEYS.garden_worker_busy]) await routine.collect();
      routine.park();
    } else if (state === 'end') {
      talking = false;
      routine.resume();
      P.cam.release();
    } else throw new Error(`Unknown garden worker state ${state}`);
  };
  function install(place) {
    P = place;
    const save = canteenSave(game, P.nav, P.start, P.cam, P.seats);
    const snapshot = P.snapshotState,
      restore = P.restoreState,
      update = P.update,
      period = P.onPeriod,
      leave = P.leave;
    P.snapshotState = () => ({
      ...snapshot?.(),
      ...save.snapshot(),
      stationGarden: { routine: routine.snapshot(), talking, people: snapshotPeople({ station_worker: worker }) },
    });
    P.restoreState = (saved) => {
      restore?.(saved);
      save.restore(saved);
      routine.restore(saved.world?.stationGarden?.routine);
      talking = !!saved.world?.stationGarden?.talking;
      routine.period(sim.period, sim.day);
      context();
      if (talking) {
        routine.pause();
        routine.park();
        restorePeople({ station_worker: worker }, saved.world?.stationGarden?.people);
      }
    };
    P.onPeriod = (value) => {
      period?.(value);
      routine.period(value, sim.day);
      garden.period(value);
      context();
    };
    P.update = (dt, t) => {
      update?.(dt, t);
      routine.update(dt, t || 0);
      garden.update(game.player.root.position, dt, P.cam.dir);
    };
    P.leave = () => {
      routine.leave();
      leave?.();
    };
    const fit = P.fit;
    P.fit = (aspect) => {
      fit(aspect);
      if (P.cam.clamp) {
        P.cam.clamp[1] = Math.max(P.cam.clamp[1], BOUNDS[1] - 0.5);
        P.cam.clamp[2] = Math.min(P.cam.clamp[2], BOUNDS[2] + 1.2);
      }
    };
    P.stationGarden = { routine, worker, tools: garden.tools, context };
    routine.period(sim.period, sim.day);
    context();
  }
  return {
    people: { station_worker: worker },
    seats: BENCHES,
    spots: {
      station_garden: PATCHES[0],
      station_garden_approach: PATCHES[1],
      garden_free_bench: BENCHES.garden_bench_1.out,
      garden_next_patch: PATCHES[1],
    },
    hooks: { gardenWorker: interact },
    thing: (id) => things[id],
    install,
  };
}
