// The island under the monorail as it pulls in to Honsha (places/train.js): the coast, the land and the town round
// the platform shed, cut from the island layout (scenes/island-layout.js) the way the outdoor places cut theirs,
// so the run in shows the same coast and buildings the map and the forecourt do.
//
// The ride's frame: the car stands still and the world slides past it (train/world.js). When it stops, the car is
// at the train chunk's island point (CHUNKS.train.at), and it has come in up the beam's last leg into the shed's
// south end: so x runs north along the shed, z east (the platform side the camera looks from), and the island
// slides in with the station (its x is the distance still to run). Lengths are the island's, scaled to the car's
// (CHUNKS.train.scale).
//
// Heights: the bay is far below the beam (world.js SEA_Y), the shed's platforms one storey above the ground. So the
// line comes down on the way in: the sea and the island rise together under the car, the ground ending up the shed
// deck's height below the car floor; the sea wall stands WALL above the sea throughout. The beam ends at a buffer
// at the shed's north end.
//
//   const isl = buildRideIsland(scene)      // hidden until the station shows
//   isl.update(rem, world)                  // rem: the distance still to run (Infinity on the open bay)
//
// The run in itself, on the train place's motion state st ({ v, dist, mode, decel, stopAt, stopX }): the arrival
// starts RUN_IN out, at speed, so the coast comes in from beyond the frame; at the braking distance the brakes go
// on and the car stops with the station's centre beside it.
//   startRunIn(st)                          // the story's `arrive`
//   runIn(st, dt, { brake, stop })          // every frame: brake() as the brakes go on, stop() on the stop
import * as THREE from 'three';
import * as LAYOUT from '../scenes/island-layout.js';
import { skylineSteps } from '../scenes/skyline.js';
import { coastSteps } from '../scenes/outdoor/coast.js';
import { coastLand } from '../scenes/island-west.js';
import { TOWN } from '../scenes/town.js';
import { drain } from '../perf/slice.js';
import { SEA_Y, BEAM2_Z } from './world.js';

const { scale: S, turn: TURN } = LAYOUT.CHUNKS.train;
// an island point in the ride's frame, before the scale: the train place's own frame (its chunk's turn makes north +x,
// east +z), the stop at the origin
const rideAt = (x, z) => LAYOUT.toLocal('train', x, z).map((v) => v * S);
const SHED = LAYOUT.BUILDINGS.find((b) => b.id === 'platform_shed').rect;
const GROUND_TINT = '#a2c2a6';
export const WALL = 1.5; // the sea wall's height above the sea, car units
const GROUND_STOP = -2.1; // the ground under the platforms when stopped: the shed's deck (2.5, station-shed.js) down
const BEAM_END = rideAt(0, SHED[1])[0] / S; // the buffer at the shed's north end, from the stop
const DESCENT = [12, 80]; // the line comes down between these distances from the stop
// The arrival starts RUN_IN out: the sea wall comes into the frame within its first second. Over the island the car
// eases off from cruising speed to V_IN (EASE a second), so the coast and the lawn slide by readably, and the brakes
// (DECEL) go on late and firmly along the platform: about eight and a half seconds from the doors to the stop, about
// three of them over the island and three along the platform.
export const RUN_IN = 50;
const V_IN = 6.5,
  EASE = 0.9,
  DECEL = 2.8;
// the train's own platforms, track beams and walkway stand here (ride frame, before the scale): nothing grows into them
const DECK = { x: 21, z0: -10.6, z1: 5.6 };
const BEAM2 = BEAM2_Z * S;
const clear = (x, z) =>
  !(Math.abs(x) < DECK.x && z > DECK.z0 && z < DECK.z1) && !(x < 0 && (Math.abs(z) < 2.4 || Math.abs(z - BEAM2) < 2.2));

export function startRunIn(st) {
  st.decel = DECEL;
  st.mode = 'approach';
  st.stopAt = st.stopX = st.dist + Math.max(RUN_IN, (st.v * st.v) / (2 * st.decel));
}
export function runIn(st, dt, { brake, stop }) {
  if (st.mode === 'approach') st.v = Math.max(Math.min(st.v, V_IN), st.v - EASE * dt);
  if (st.mode === 'approach' && st.stopAt - st.dist <= (st.v * st.v) / (2 * st.decel)) {
    st.mode = 'brake';
    brake();
  }
  if (st.mode === 'brake') {
    const rem = st.stopAt - st.dist;
    st.v = Math.sqrt(Math.max(0, 2 * st.decel * rem));
    if (rem < 0.01) {
      st.v = 0;
      st.mode = 'stopped';
      st.dist = st.stopAt;
      stop();
    }
  }
  st.dist += st.v * dt;
}

export function buildRideIsland(scene) {
  const root = new THREE.Group();
  root.name = 'ride-island';
  root.scale.setScalar(1 / S);
  root.visible = false;
  scene.add(root);
  const layout = {
    ...LAYOUT,
    CHUNKS: { ride: {} },
    toLocal: (_, x, z) => rideAt(x, z),
  };
  drain(
    (function* () {
      yield* coastSteps(root, {
        at: rideAt,
        turn: (TURN * Math.PI) / 180,
        sea: -WALL * S,
        clip: clear,
      });
      const sky = yield* skylineSteps(root, 'ride', {
        layout,
        skip: ['platform_shed'], // the train's own platforms
        walk: [-90, DECK.z0, 30, DECK.z1], // the run in: nothing on the camera's side stands taller than its distance
        near: 30,
        far: 70,
        sea: false,
        land: coastLand(LAYOUT.COAST.line),
        landColor: TOWN.grass,
      });
      // the car's warm low sun lifts the town's greens toward olive: the ground a shade darker and cooler
      for (const m of sky.meshes) if (m.name === 'skyline:ground') m.material.color.set(GROUND_TINT);
    })(),
  );
  let last = null;
  return {
    root,
    update(rem, world) {
      const on = Number.isFinite(rem) && rem < 400;
      root.visible = on;
      if (!on) {
        if (last !== null) world.setRide(SEA_Y, Infinity);
        last = null;
        return;
      }
      const k = 1 - THREE.MathUtils.smoothstep(rem, DESCENT[0], DESCENT[1]),
        ground = THREE.MathUtils.lerp(SEA_Y + WALL, GROUND_STOP, k);
      root.position.set(rem, ground, 0);
      world.setRide(ground - WALL, rem + BEAM_END);
      last = rem;
    },
  };
}
