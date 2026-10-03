// Tama on the garden bench after work (docs/game/places.md, forecourt): the bench on the gravel court south of the
// lane, with Tama asleep at its east end and room for Eric at the other. The story sits him down with the generic sit
// (the seat is `garden_bench`); the `gardenCat` hook moves her: `lap` gets her up, along the bench and onto his lap,
// where she turns round once and curls up while he holds his hands clear; `bench` hops her back off to her end.
//   state: 'end' (asleep at her end of the bench) or 'lap'
// Her legs step by how far she really moves and turns (creatures/cat.js), so the moves here only place her.
import * as THREE from 'three';
import { makeCat, catHop } from '../creatures/cat.js';
import { K } from '../scenes/office.js';
import { GARDEN_BENCH as B } from '../scenes/forecourt/plan.js';
import { flags } from '../narrative/state.js';
import { hold } from './eric-hold.js';

const ease = (k) => k * k * (3 - 2 * k);

export function gardenCat(game, root) {
  const rig = makeCat('calico', { mode: 'sleep' }),
    tama = rig.root;
  tama.scale.setScalar(1.15 * K * 0.9); // her size on Eric's chair in the office
  root.add(tama);
  const seat = { x: B.x - 0.3, z: B.z, top: B.top, ry: 0 }; // his end, the west one
  const END = new THREE.Vector3(B.x + 0.5, B.top, B.z + 0.02),
    BESIDE = new THREE.Vector3(seat.x + 0.3, B.top, B.z + 0.02), // next to him on the seat
    LAP = new THREE.Vector3(seat.x, B.top + 0.13 * K, seat.z + 0.17 * K),
    LAP_YAW = -Math.PI / 2; // curled across his lap, head to his right
  let state = 'end',
    lastT = null;
  const shown = () => !!flags.going_home; // she is at the station and in the office until work is over

  function set(s) {
    state = s;
    rig.set('sleep', { now: true });
    tama.position.copy(s === 'lap' ? LAP : END);
    tama.rotation.y = s === 'lap' ? LAP_YAW : 0;
    tama.visible = shown();
    hold(game.player, 'clear', s === 'lap');
  }
  set('end');

  // small moves, each finished before the next: up on her feet, turning on the spot, walking along the seat, a hop
  const up = () => (rig.set('stand'), game.wait(600));
  const turn = (to, dur) => {
    const from = tama.rotation.y;
    return game.tween(dur, (k) => (tama.rotation.y = from + (to - from) * ease(k)));
  };
  const go = (to, dur) => {
    const from = tama.position.clone();
    return game.tween(dur, (k) => tama.position.lerpVectors(from, to, ease(k)));
  };
  const settle = () => (rig.set('sleep'), game.wait(500));

  const hooks = {
    gardenCat: async ({ state: to }) => {
      if (to === 'lap' && state === 'end') {
        hold(game.player, 'clear', true);
        await up();
        await turn(-Math.PI / 2, 0.5);
        await go(BESIDE, 1.2);
        await game.wait(200);
        await catHop(game, rig, [LAP.x, LAP.z], LAP.y, { dur: 0.5, h: 0.1 });
        await turn(LAP_YAW + Math.PI * 2, 1.1); // round once before she lies down
        tama.rotation.y = LAP_YAW;
        await settle();
        state = 'lap';
      } else if (to === 'bench' && state === 'lap') {
        await up();
        await catHop(game, rig, [BESIDE.x, BESIDE.z], BESIDE.y, {
          dur: 0.45,
          h: 0.09,
        });
        hold(game.player, 'clear', false);
        await go(END, 1.0);
        await turn(0, 0.5);
        await settle();
        state = 'end';
      } else set(to === 'lap' ? 'lap' : 'end');
    },
  };
  return {
    anchor: (v) => v.set(B.x, 0.75, B.z),
    spot: () => [seat.x, seat.z + 0.5],
    face: () => [seat.x, seat.z],
    seat,
    person: rig,
    seatOut: () => [seat.x, seat.z + 0.5],
    hooks,
    snapshot: () => state,
    restore: (s) => set(s || state),
    sync: () => set(state),
    update(t) {
      rig.update(Math.min(0.1, t - (lastT ?? t)));
      lastT = t;
    },
  };
}
