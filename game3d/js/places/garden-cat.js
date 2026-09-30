// Tama on the garden bench after work (docs/game/places.md, forecourt): the bench on the gravel court south of the
// lane, with Tama asleep at its east end and room for Eric at the other. The story sits him down with the generic sit
// (the seat is `garden_bench`); the `gardenCat` hook moves her: `lap` gets her up, along the bench and onto his lap,
// where she turns round once and curls up while he holds his hands clear; `bench` hops her back off to her end.
//   state: 'end' (asleep at her end of the bench) or 'lap'
import * as THREE from 'three';
import { cat } from '../train/people.js';
import { K } from '../scenes/office.js';
import { GARDEN_BENCH as B } from '../scenes/forecourt/plan.js';
import { flags } from '../narrative/state.js';
import { hold } from './eric-hold.js';

const ease = (k) => k * k * (3 - 2 * k);

export function gardenCat(game, root) {
  const tama = new THREE.Group(),
    curled = cat(),
    up = cat({ curl: false }); // the sitting cat: her, awake and on her feet
  tama.add(curled, up);
  tama.scale.setScalar(1.15 * K * 0.9); // her size on Eric's chair in the office
  tama.userData.noBatch = true; // she moves: the draw-call pass leaves her alone (perf/batch.js)
  root.add(tama);
  const head = curled.userData.head;
  const seat = { x: B.x - 0.3, z: B.z, top: B.top, ry: 0 }; // his end, the west one
  const END = new THREE.Vector3(B.x + 0.5, B.top, B.z + 0.02),
    BESIDE = new THREE.Vector3(seat.x + 0.3, B.top, B.z + 0.02), // next to him on the seat
    LAP = new THREE.Vector3(seat.x, B.top + 0.13 * K, seat.z + 0.17 * K),
    LAP_YAW = -Math.PI / 2; // curled across his lap, head to his right
  let state = 'end';
  const awake = (on) => {
    up.visible = on;
    curled.visible = !on;
  };
  const shown = () => !!flags.going_home; // she is at the station and in the office until work is over

  function set(s) {
    state = s;
    awake(false);
    head.rotation.x = 0;
    tama.scale.y = tama.scale.x;
    tama.position.copy(s === 'lap' ? LAP : END);
    tama.rotation.y = s === 'lap' ? LAP_YAW : 0;
    tama.visible = shown();
    hold(game.player, 'clear', s === 'lap');
  }
  set('end');

  // small moves, each finished before the next: lifting her head, turning, walking with a little bob, a hop
  const stir = () => game.tween(0.4, (k) => (head.rotation.x = -0.35 * ease(k)));
  const turn = (to, dur) => {
    const from = tama.rotation.y;
    return game.tween(dur, (k) => (tama.rotation.y = from + (to - from) * ease(k)));
  };
  const go = (to, dur, { hop = 0, steps = 0 } = {}) => {
    const from = tama.position.clone();
    return game.tween(dur, (k) => {
      tama.position.lerpVectors(from, to, ease(k));
      tama.position.y += hop * Math.sin(Math.PI * k) + 0.012 * Math.abs(Math.sin(Math.PI * steps * k));
    });
  };
  const settle = () => {
    const s = tama.scale.x;
    head.rotation.x = 0;
    awake(false);
    return game.tween(0.45, (k) => (tama.scale.y = s * (1 - 0.12 * Math.sin(Math.PI * k))));
  };

  const hooks = {
    gardenCat: async ({ state: to }) => {
      if (to === 'lap' && state === 'end') {
        hold(game.player, 'clear', true);
        await stir();
        awake(true);
        await turn(-Math.PI / 2, 0.35);
        await go(BESIDE, 0.95, { steps: 4 });
        await game.wait(200);
        await go(LAP, 0.5, { hop: 0.1 });
        await turn(LAP_YAW + Math.PI * 2, 1.1); // round once before she lies down
        tama.rotation.y = LAP_YAW;
        await settle();
        state = 'lap';
      } else if (to === 'bench' && state === 'lap') {
        head.rotation.x = 0;
        awake(true);
        await turn(-Math.PI / 2 + Math.PI, 0.4);
        await go(BESIDE, 0.45, { hop: 0.09 });
        hold(game.player, 'clear', false);
        await go(END, 0.8, { steps: 3 });
        await turn(0, 0.35);
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
    person: { root: tama, head },
    seatOut: () => [seat.x, seat.z + 0.5],
    hooks,
    snapshot: () => state,
    restore: (s) => set(s || state),
    sync: () => set(state),
    update(t) {
      if (tama.visible && curled.visible) curled.userData.tail.rotation.y = Math.sin(t * 0.7) * 0.05; // asleep
    },
  };
}
