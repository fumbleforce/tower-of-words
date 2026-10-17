// The dorm quarter's park (the plan is dorm-quarter/plan.js), in the island frame:
//   its edges: on the promenade a verge (a bed of ground cover with a low clipped hedge at its back) open where the
//   walks come in, cherries behind it; a low hedge on its other sides, open at the walks
//   the big lawn inside the loop walk, open for ball games and hanami: two cherries at its ends, benches round the
//   loop looking in, lamps at its corners; zelkovas and maples between the loop and the edges
//   the wisteria shelter on the court gate's axis behind the verge, a bench either side under it
//   the pond: a ring of rounded stones, dark still water with lily pads and koi, reeds at its ends; the north-south
//   walk over it on a timber bridge with a rail each side, and a boardwalk east off the bridge to the cherry's ring
//   the cherry: a big one in its paved round, a ring seat about its trunk
//   the play corner: sand in a timber edge, a swing frame, a slide, two spring riders, a bench for the grown-ups
//   the common room's apron: a bike rack and two planters beside its door
import * as THREE from 'three';
import { verge } from '../outdoor/lane.js';
import { hedge, keyaki, sakura, maple, ginkgo, mound, grass, LEAF } from '../outdoor/planting.js';
import { lamps, bench, bins, bikeRack, fingerSign } from '../outdoor/furniture.js';
import { hash2 } from '../outdoor/parts.js';
import { planter } from '../../kit/planting/planter.js';
import { pergola, boards, ringSeat, swingFrame, slide, springRider, WOOD as TIMBER } from '../outdoor/park-kit.js';
import * as Q from './plan.js';
import { LOOP_BENCHES, PARK_LAMPS, PROM_PARK_LAMPS } from './fittings.js';

const STONES = ['#8d8f8b', '#9a9a94', '#7f817f', '#a3a29b'],
  SAND = '#d4c49d';
const [PX0, PX1, PZ0, PZ1] = Q.PARK;

// the water's surface, still and dark with a sheen; the pond's floor under it
function water(group) {
  const [x0, x1, z0, z1] = Q.POND;
  const m = new THREE.MeshStandardMaterial({
    color: '#3d6670',
    roughness: 0.06,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    emissive: new THREE.Color('#9fc8cf'),
    emissiveIntensity: 0.05,
  });
  m.userData.noTraversal = true;
  const g = new THREE.PlaneGeometry(x1 - x0 - 0.5, z1 - z0 - 0.5).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set((x0 + x1) / 2, 0.07, (z0 + z1) / 2);
  mesh.name = 'pond:water';
  mesh.userData.noBatch = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function pond(p, group, far) {
  const [x0, x1, z0, z1] = Q.POND,
    cx = (x0 + x1) / 2;
  // the floor: dark silt, a hair over the lawn, under the water
  p.box('#2e4443', x1 - x0 - 0.3, 0.02, z1 - z0 - 0.3, cx, 0, (z0 + z1) / 2, { cast: false, surf: 'soil' });
  water(group);
  // the stones round its edge, rounded and of mixed size, sitting a little into the water; none under the bridge
  const ring = [];
  const per = 2 * (x1 - x0 + z1 - z0);
  for (let u = 0; u < per; u += 0.42 + hash2(u, 3, 9) * 0.2) {
    let x, z;
    if (u < x1 - x0) [x, z] = [x0 + u, z0];
    else if (u < x1 - x0 + z1 - z0) [x, z] = [x1, z0 + u - (x1 - x0)];
    else if (u < 2 * (x1 - x0) + z1 - z0) [x, z] = [x1 - (u - (x1 - x0) - (z1 - z0)), z1];
    else [x, z] = [x0, z1 - (u - 2 * (x1 - x0) - (z1 - z0))];
    if (x > Q.BRIDGE[0] - 0.25 && x < Q.BRIDGE[1] + 0.25) continue;
    if (Math.abs(x - x1) < 0.01 && z > Q.BOARDWALK[2] - 0.2 && z < Q.BOARDWALK[3] + 0.2) continue;
    ring.push([x, z]);
  }
  for (const [x, z] of ring) {
    const r = 0.18 + hash2(x, z, 11) * 0.16;
    const g = new THREE.DodecahedronGeometry(r, far ? 0 : 1).scale(1.25, 0.55, 1.05).rotateY(hash2(z, x, 13) * 6);
    p.geo(STONES[Math.floor(hash2(x, z, 15) * 4)], g.translate(x, r * 0.25, z), { surf: 'stone' });
  }
  // lily pads in two drifts, a few with a flower; reeds and an iris clump at its ends
  for (const [lx, lz, n] of [
    [104.9, -23.6, 7],
    [108.9, -17.0, 6],
    [104.8, -16.8, 4],
  ])
    for (let i = 0; i < n; i++) {
      const a = i * 2.3 + lx,
        d = 0.15 + (i % 3) * 0.22;
      const x = lx + Math.cos(a) * d,
        z = lz + Math.sin(a) * d * 1.3;
      p.geo('#4f7448', new THREE.CylinderGeometry(0.13, 0.13, 0.01, 9, 1, false, 0.3, 5.7).translate(x, 0.075, z), {
        cast: false,
      });
      if (i % 3 === 1) p.geo('#e8d7e0', new THREE.ConeGeometry(0.04, 0.05, 5).translate(x, 0.1, z), { cast: false });
    }
  for (const [x, z, s] of [
    [104.4, -24.1, 4],
    [109.2, -24.0, 6],
    [104.4, -16.1, 8],
    [109.1, -16.3, 9],
  ]) {
    grass(p, x, z, { h: 0.55, color: '#6f7d4f', seed: s });
    grass(p, x + 0.18, z + 0.12, { h: 0.45, color: '#7c8a5a', seed: s + 1 });
  }
  // koi, under the surface
  if (!far)
    for (const [x, z, a, c] of [
      [105.0, -21.8, 0.4, '#e07a3a'],
      [105.3, -21.4, 1.9, '#f0ece2'],
      [108.6, -22.6, 2.6, '#e07a3a'],
      [108.8, -19.1, 4.0, '#d6a04a'],
      [104.9, -18.6, 5.1, '#e07a3a'],
    ])
      p.geo(c, new THREE.BoxGeometry(0.22, 0.03, 0.07).rotateY(a).translate(x, 0.035, z), { cast: false });
}

// the bridge: planks across the walk over the pond, a rail on each side (open on the east for the boardwalk), and
// the boardwalk east to the cherry's round, on low posts, a rail where it crosses the water
function bridge(p) {
  const [x0, x1, z0, z1] = Q.BRIDGE,
    y = 0.1;
  boards(p, Q.BRIDGE, { y, along: 'z' });
  // stringers under it, and the posts of its rails
  for (const x of [x0 + 0.15, x1 - 0.15])
    p.box(TIMBER.mid, 0.12, 0.12, z1 - z0, x, -0.02, (z0 + z1) / 2, { cast: false });
  const bw = [Q.BOARDWALK[2], Q.BOARDWALK[3]];
  for (const [x, gap] of [
    [x0 + 0.06, null],
    [x1 - 0.06, bw],
  ]) {
    const runs = gap
      ? [
          [z0 + 0.4, gap[0]],
          [gap[1], z1 - 0.4],
        ]
      : [[z0 + 0.4, z1 - 0.4]];
    for (const [a, b] of runs) {
      for (let z = a; z <= b + 0.01; z += (b - a) / Math.max(1, Math.round((b - a) / 1.3)))
        p.box(TIMBER.dark, 0.09, 0.85, 0.09, x, y, z, { surf: 'wood' });
      p.box(TIMBER.pale, 0.1, 0.06, b - a + 0.1, x, y + 0.85, (a + b) / 2, { surf: 'wood' });
      p.box(TIMBER.mid, 0.05, 0.05, b - a, x, y + 0.45, (a + b) / 2, { cast: false });
    }
  }
  // the boardwalk
  const [bx0, , bz0, bz1] = Q.BOARDWALK,
    by = 0.08;
  boards(p, Q.BOARDWALK, { y: by, along: 'x' });
  const wx = Q.POND[1] + 0.2;
  for (const z of [bz0 + 0.06, bz1 - 0.06]) {
    for (const x of [bx0 + 0.3, (bx0 + wx) / 2, wx]) p.box(TIMBER.dark, 0.08, 0.6, 0.08, x, by, z, { surf: 'wood' });
    p.box(TIMBER.pale, wx - bx0 - 0.2, 0.05, 0.08, (bx0 + 0.3 + wx) / 2, by + 0.6, z, { surf: 'wood' });
  }
}

// the cherry and its ring seat round its trunk
function cherry(p) {
  const { x, z, seat } = Q.RING;
  sakura(p, x, z, 1.45, 91);
  ringSeat(p, x, z, seat);
}

// the wisteria shelter: posts, beams along it, rafters across, and the vine over it with its flowers hanging
function wisteria(p) {
  const [x0, x1, z0, z1] = Q.WISTERIA,
    h = 2.3;
  pergola(p, Q.WISTERIA, { h, along: 'x', slat: 0.5 });
  // the vine: low flattened leaf blobs over the rafters, a few long shoots hanging down from them (it flowered in
  // May; in October it is all leaf)
  for (let x = x0 + 0.4; x < x1; x += 0.95)
    for (let z = z0 + 0.45; z < z1; z += 0.95) {
      mound(p, x + hash2(x, z, 3) * 0.3, z, 0.5, hash2(z, x, 5) < 0.5 ? LEAF.mid : LEAF.fresh, {
        y: h + 0.1,
        squash: 0.35,
      });
      if (hash2(x, z, 9) < 0.45) {
        const fx = x + (hash2(x, z, 1) - 0.5) * 0.6,
          fz = z + (hash2(z, x, 1) - 0.5) * 0.6,
          L = 0.3 + hash2(fx, fz, 7) * 0.35;
        p.geo(LEAF.deep, new THREE.ConeGeometry(0.06, L, 4).rotateX(Math.PI).translate(fx, h - L / 2 + 0.05, fz), {
          cast: false,
        });
      }
    }
  // its trunk at a corner post, twisting up
  p.geo('#6a5a4c', new THREE.CylinderGeometry(0.06, 0.09, h, 6).translate(x0 + 0.35, h / 2, z1 - 0.3), {
    surf: 'bark',
  });
  // the benches under it, either side of the walk, looking out over the lawn
  for (const x of [Q.GATE_X - 1.75, Q.GATE_X + 1.75]) bench(p, x, (z0 + z1) / 2 - 0.2, Math.PI, { len: 1.6 });
}

// the play corner: sand in a timber edge, a swing frame, a slide, two spring riders, a bench for the grown-ups
function play(p) {
  const [x0, x1, z0, z1] = Q.PLAY,
    cx = (x0 + x1) / 2;
  p.box(SAND, x1 - x0 - 0.2, 0.03, z1 - z0 - 0.2, cx, 0, (z0 + z1) / 2, { cast: false, surf: 'sand' });
  for (const [w, d, x, z] of [
    [x1 - x0, 0.14, cx, z0 + 0.07],
    [x1 - x0, 0.14, cx, z1 - 0.07],
    [0.14, z1 - z0, x0 + 0.07, (z0 + z1) / 2],
    [0.14, z1 - z0, x1 - 0.07, (z0 + z1) / 2],
  ])
    p.box(TIMBER.pale, w, 0.12, d, x, 0, z, { surf: 'wood' });
  swingFrame(p, x0 + 2.1, z0 + 1.4);
  slide(p, x1 - 1.5, z0 + 1.2);
  springRider(p, cx - 0.6, z1 - 1.2, '#c0533f');
  springRider(p, cx + 0.6, z1 - 1.0, '#e0b33b');
  bench(p, x0 - 0.7, (z0 + z1) / 2, Math.PI / 2, { len: 1.6 });
  bins(p, x0 - 0.7, z1 - 0.6, Math.PI / 2);
}

// trees between the loop and the park's edges, and in its east part; the big lawn stays open
const PARK_TREES = [
  [keyaki, 81.2, -27.3, 1.05, 101],
  [maple, 81.3, -14.1, 0.8, 102],
  [keyaki, 102.9, -27.3, 1.0, 103],
  [maple, 104.4, -27.4, 0.8, 104], // the two that stood on the walk at the north edge, now at its sides
  [maple, 109.2, -27.4, 0.85, 105],
  [ginkgo, 112.0, -26.0, 0.95, 106],
  [keyaki, 124.6, -26.3, 1.1, 107],
  [ginkgo, 124.8, -21.4, 0.95, 108],
  [maple, 112.4, -16.0, 0.85, 109],
];
// the cherries behind the verge on the promenade, none in front of the courtyard's gate (the wisteria is there)
const VERGE_CHERRIES = [81.8, 95.6, 99.8, 103.3, 110.8];
export function* parkSteps(pv, p, lights, group, { far = false } = {}) {
  // the verge on the promenade, open at the walks in; a low hedge round the rest
  const ns = [Q.NS_X[0], Q.NS_X[1]];
  verge(p, [PX0, PZ1], [PX1, PZ1], 'n', {
    crossings: [ns, [Q.COMMONS[0], Q.COMMONS[1]]],
    seed: 61,
    ground: true,
  });
  yield;
  const H = { w: 0.45, h: 0.55 };
  const run = (a, b, along, at, gaps, seed) => {
    let t = a;
    for (const [g0, g1] of [...gaps.sort((u, v) => u[0] - v[0]), [b, b]]) {
      if (g0 - t > 0.4)
        hedge(p, along === 'x' ? [t, at] : [at, t], along === 'x' ? [g0, at] : [at, g0], { ...H, seed: seed++ });
      t = g1;
    }
  };
  run(
    PX0 + 0.3,
    PX1 - 0.3,
    'x',
    PZ0 + 0.35,
    [[Q.GATE_X - 0.5, Q.GATE_X + 0.5], ns, [Q.PLAY_LINK[0], Q.PLAY_LINK[1]]],
    62,
  );
  run(PZ0 + 0.3, PZ1 - 1.4, 'z', PX0 + 0.35, [], 66);
  run(PZ0 + 0.3, PZ1 - 1.4, 'z', PX1 - 0.35, [], 69);
  yield;
  for (const x of VERGE_CHERRIES) sakura(p, x, PZ1 - 2.1, 1.0 + hash2(x, 1, 2) * 0.15, Math.round(x));
  yield;
  for (const [kind, x, z, s, seed] of PARK_TREES) {
    kind(p, x, z, s, seed);
    yield;
  }
  pond(p, group, far);
  yield;
  bridge(p);
  cherry(p);
  yield;
  wisteria(p);
  yield;
  if (far) {
    lamps(lights, p, PROM_PARK_LAMPS, { pool: 1.4, poolShift: [0, 0.8] });
    return;
  }
  play(p);
  for (const [x, z, f] of LOOP_BENCHES) bench(p, x, z, f, { len: 1.6 });
  bins(p, Q.LOOP[0] - 0.45, -16.6, Math.PI / 2);
  bins(p, 99.2, Q.LOOP[3] + 0.45, Math.PI);
  lamps(lights, p, PARK_LAMPS, { pool: 1.3 });
  // a finger sign where the north-south walk crosses the promenade: the beach east, the station back west
  fingerSign(group, p, Q.NS_X[0] - 0.45, Q.PROM[2] - 0.55, [
    { text: 'Beach', sub: '海', dir: 1 },
    { text: 'Station', sub: '駅', dir: -1 },
  ]);
  lamps(lights, p, PROM_PARK_LAMPS, { pool: 1.4, poolShift: [0, 0.8] });
  yield;
  // the common room's apron: a bike rack along its west end, a planter either side of its door
  bikeRack(p, [Q.COMMONS[0] - 0.6, Q.COMMONS[3] - 3.0], [Q.COMMONS[0] - 0.6, Q.COMMONS[3] - 0.6], { n: 3 });
  for (const s of [-1, 1])
    planter(p, { at: [Q.COMMONS_DOOR[0] + s * 1.5, Q.COMMONS[3] + 0.45], variant: 'box', seed: 7 + s });
  // flowering troughs at the apron's ends on the promenade, and either side of the park's way in on the gate's axis
  for (const x of [Q.COMMONS[0] + 1.4, Q.COMMONS[1] - 1.4])
    planter(p, { at: [x, Q.PROM[2] - 0.35], variant: 'flowering', seed: Math.round(x) });
  for (const s of [-1, 1])
    planter(p, { at: [Q.GATE_X + s * 1.9, Q.PARK_N[3] + 1.05], variant: 'flowering', seed: 11 + s });
  // drifts of low planting along the common room's ends and back, against its walls
  for (const [x0, x1, z0, z1] of [
    [Q.COMMONS[0] - 0.9, Q.COMMONS[0], Q.COMMONS[2], Q.COMMONS[3] - 3.4],
    [Q.COMMONS[1], Q.COMMONS[1] + 0.9, Q.COMMONS[2], Q.COMMONS[3]],
    [Q.COMMONS[0], Q.COMMONS[1], Q.COMMONS[2] - 0.8, Q.COMMONS[2]],
  ])
    for (let i = 0; i < 6; i++) {
      const t = (i + 0.5) / 6;
      const x = x1 - x0 > z1 - z0 ? x0 + (x1 - x0) * t : (x0 + x1) / 2,
        z = x1 - x0 > z1 - z0 ? (z0 + z1) / 2 : z0 + (z1 - z0) * t;
      mound(p, x, z, 0.24 + (i % 3) * 0.02, [LEAF.deep, LEAF.mid, LEAF.fresh][i % 3]);
    }
  yield;
}
