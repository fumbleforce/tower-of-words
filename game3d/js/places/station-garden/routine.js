import { idle, walkPose } from '../../cast.js';
import { PATCHES } from '../../scenes/station-garden/plan.js';
import { gardenState } from './state.js';
import { gardenPoses } from './poses.js';

export function gardenRoutine(game, P, worker, tools) {
  const poses = gardenPoses(P, worker, tools);
  let state = gardenState(),
    paused = false,
    gone = false,
    contact = null;
  const position = () => [worker.root.position.x, worker.root.position.z];
  function litter() {
    tools.contents.forEach((leaf, i) => {
      leaf.visible = i < Math.floor(state.collected.reduce((a, b) => a + b, 0) * 3);
    });
    tools.leaves.forEach((leaves, patch) =>
      leaves.forEach((leaf, i) => {
        const k = state.collected[patch],
          home = leaf.userData.home;
        leaf.visible = k < 1;
        leaf.position.fromArray(home);
        if (patch === state.patch && state.phase === 'collect') {
          leaf.position.x += (PATCHES[patch][0] + 0.13 + ((i % 3) - 1) * 0.04 - home[0]) * k;
          leaf.position.z += (PATCHES[patch][1] + 0.3 + Math.floor(i / 3) * 0.018 - home[2]) * k;
          leaf.position.y = 0.022 + k * 0.018;
          leaf.visible = k < 1;
        }
      }),
    );
  }
  function pose() {
    if (!worker.root.visible) {
      poses.rest(true);
      return;
    }
    if (state.phase === 'walk') poses.carry();
    else if (state.phase === 'rest') poses.rest();
    else {
      const [x, z] = position();
      worker.root.rotation.y = 0;
      const progress = state.phase === 'collect' ? state.time / 3 : (Math.sin(state.time * 3) + 1) / 2;
      contact = poses.sweep(x, z, Math.min(1, progress));
    }
    litter();
  }
  function load(saved) {
    state = gardenState(saved ? { day: state.day, period: state.period, ...saved } : {});
    const [x, z] = state.at || PATCHES[state.patch];
    worker.root.position.set(x, 0, z);
    paused = false;
    pose();
  }
  load();
  return {
    get state() {
      return state;
    },
    get contact() {
      return contact;
    },
    snapshot: () => ({
      ...state,
      collected: [...state.collected],
      at: position(),
    }),
    restore: load,
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      pose();
    },
    park: () => poses.rest(),
    period(value, day) {
      gone = false;
      if (
        (state.day !== null && day !== undefined && state.day !== day) ||
        (state.period === 'evening' && value !== 'evening')
      )
        load();
      state.day = day ?? state.day;
      state.period = value;
      worker.root.visible = value !== 'evening';
      pose();
    },
    async collect() {
      state.phase = 'collect';
      const from = state.collected[state.patch];
      await game.tween(0.9, (k) => {
        if (gone) return;
        state.time = 3 * (from + (Math.max(from, 0.75) - from) * k);
        state.collected[state.patch] = state.time / 3;
        pose();
      });
    },
    update(dt, t) {
      if (gone || paused || game.busy || state.period === 'evening') return;
      idle(worker, t);
      state.time = Math.min(18, state.time + dt);
      if (state.phase === 'walk') {
        const [x, z] = PATCHES[state.patch],
          p = worker.root.position;
        const distance = Math.hypot(x - p.x, z - p.z),
          step = Math.min(distance, dt * 0.65);
        if (distance > 0.02) {
          const nx = p.x + ((x - p.x) * step) / distance,
            nz = p.z + ((z - p.z) * step) / distance;
          const people = [game.player, ...Object.values(P.people || {}), ...(P.crowd || [])];
          const clear = people.every(
            (r) =>
              r === worker || !r?.root.visible || Math.hypot(nx - r.root.position.x, nz - r.root.position.z) > 0.72,
          );
          if (P.nav.free(nx, nz, 0.3) && clear) {
            p.set(nx, 0, nz);
            worker.root.rotation.y = Math.atan2(x - p.x, z - p.z);
            walkPose(worker, state.time * 6, 0.65);
          }
        } else {
          state.phase = 'sweep';
          state.time = 0;
          walkPose(worker, 0, 0);
        }
      } else if (state.phase === 'sweep' && state.time >= 7) {
        state.phase = 'collect';
        state.time = 0;
      } else if (state.phase === 'collect') {
        state.collected[state.patch] = Math.max(state.collected[state.patch], Math.min(1, state.time / 3));
        if (state.time >= 3) {
          state.phase = 'rest';
          state.time = 0;
        }
      } else if (state.phase === 'rest' && state.time >= 12 && state.collected.some((k) => k < 1)) {
        state.patch = 1 - state.patch;
        state.phase = 'walk';
        state.time = 0;
      }
      pose();
    },
    leave() {
      gone = true;
      poses.rest();
      poses.dispose();
    },
  };
}
