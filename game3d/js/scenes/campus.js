import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { applyGround } from '../movement/walk-ground.js';
import { ground, WALK_AREA } from './campus/ground.js';
import { walkEdges } from './outdoor/walk-edges.js';
import { Parts } from './outdoor/parts.js';
import { outdoorLight, eveningLight, SUN, TOWN } from './town.js';
import { lightSet } from './outdoor/furniture.js';
import { northSteps } from './forecourt/north.js';
import { campusGrounds } from './campus/grounds.js';
import { campusFronts } from './campus/fronts.js';
import { coastSteps } from './outdoor/coast.js';
import { coastLand } from './island-west.js';
import { skylineSteps } from './skyline.js';
import * as LAYOUT from './island-layout.js';
import * as P from './campus/plan.js';
import { SHELTER_BIKES } from './forecourt/plan.js';
import { mergeStaticSteps } from './merge-static.js';
import { drain } from '../perf/slice.js';

export const buildCampus = () => drain(campusSteps());
export function* campusSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene),
    lights = lightSet();
  // one walkable ground for the walk grid and the kerbs (campus/ground.js)
  const nav = new Nav(...WALK_AREA, 0.14),
    walkable = ground();
  applyGround(nav, walkable);
  for (const r of P.BEDS) nav.block(...P.rect(r));
  nav.block(P.BENCH.x - 1.02, P.BENCH.x + 1.02, P.BENCH.z - 0.34, P.BENCH.z + 0.34);
  nav.block(...SHELTER_BIKES); // the staff bike shelter's parked bikes and posts (forecourt/north.js)
  const north = yield* northSteps(root, lights, { closed: false });
  yield* campusGrounds(root, lights);
  const edges = new Parts();
  walkEdges(edges, walkable);
  edges.build(root);
  const fronts = campusFronts(root);
  const coast = new THREE.Group();
  root.add(coast);
  yield* coastSteps(coast, {
    at: (x, z) => P.pt([x, z]),
    sea: -0.9,
    data: {
      coast: [{ line: LAYOUT.COAST.line.filter(([x, z]) => x < -48 && z >= -54 && z <= -23), plant: false }],
      walks: {},
      paved: [],
    },
  });
  // The coast wall is shared kit; campusGrounds owns all surface paving.
  const lamps = lights.build(root);
  const sky = yield* skylineSteps(root, 'campus', {
    layout: LAYOUT,
    skip: ['head_office', 'head_office_wing', 'office_e1', 'w3', 'b_h'],
    land: coastLand(LAYOUT.COAST.line),
    landColor: TOWN.grass,
    near: 40,
    far: 80,
  });
  yield* mergeStaticSteps(root);
  yield* nav.buildSteps();
  const lightState = [];
  scene.traverse((o) => {
    if (o.isLight) lightState.push([o, o.color.clone(), o.groundColor?.clone(), o.intensity, o.position.clone()]);
  });
  const poolState = [];
  root.traverse((o) => {
    if (o.userData.lampPool) poolState.push([o, o.userData.k, o.userData.gain]);
  });
  const glowState = [];
  root.traverse((o) => {
    if (o.material?.emissive) glowState.push([o.material, o.material.color.clone(), o.material.emissiveIntensity]);
  });
  let night = false;
  function period(value) {
    const next = value === 'evening';
    if (next === night) return;
    night = next;
    if (next) {
      eveningLight(scene);
      lamps.evening();
    } else {
      for (const [o, c, g, i, p] of lightState) {
        o.color.copy(c);
        if (g) o.groundColor.copy(g);
        o.intensity = i;
        o.position.copy(p);
      }
      for (const [m, c, i] of glowState) {
        m.color.copy(c);
        m.emissiveIntensity = i;
      }
      for (const [o, k, g] of poolState) {
        o.userData.gain = g;
        o.userData.set(k);
      }
    }
    if (north.lit) north.lit.visible = next;
    if (fronts.lit) fronts.lit.visible = next;
    sky.onPeriod(value);
  }
  const follow = (x, z) => {
    sun.target.position.set(Math.round(x / 2) * 2, 0, Math.round(z / 2) * 2);
    sun.position
      .copy(sun.target.position)
      .addScaledVector(new THREE.Vector3(...SUN[night ? 'evening' : 'morning']).normalize(), 40);
  };
  return { root, scene, nav, sun, follow, period, exits: P.EXITS, start: P.IN, seats: { campus_bench: P.BENCH } };
}
