// The fountain plaza, the second outdoor chunk of island-map-4, east of the head-office forecourt, placed and sized
// from the island layout (scenes/island-layout.js). The camera looks north and follows Eric. The round paved plaza
// (the map's, 23 across) has the fountain in the middle; the lane from head office comes in from the west-north-west,
// runs along the plaza's south edge and bends on east-south-east toward the dorms. North: the two-storey canteen
// with its umbrella terrace facing the fountain. South, past a planted verge: the covered shop street, two rows
// under one arcade. Everything else comes from the layout through buildSkyline. Palette and light are the
// forecourt's; after work the lamps, the canteen, the shops and the town's windows light up.
import * as THREE from 'three';
import { Nav } from '../movement/navigation.js';
import { mat, bench } from '../props.js';
import { planter, tree, bicycle } from './forecourt/details.js';
import { outdoorLight, paving, TOWN } from './town.js';
import * as LAYOUT from './island-layout.js';
import { skylineSteps } from './skyline.js';
import { drain } from '../perf/slice.js';
import { mergeStaticSteps } from './merge-static.js';
import { fountain, lamps, benches, terrace, laneDetails, bin, groves, merged } from './plaza-details.js';
import { canteen, shopStreet } from './plaza-buildings.js';

const CHUNK = 'plaza';
const local = ([x, z]) => LAYOUT.toLocal(CHUNK, x, z);
const building = (id) => LAYOUT.BUILDINGS.find((b) => b.id === id);
const path = (id) => LAYOUT.PATHS.find((p) => p.id === id);
const rad = (deg) => (deg * Math.PI) / 180;

// the plaza circle and the fountain on it
const [PCX, PCZ, R] = path('fountain_plaza').circle;
const F = local([PCX, PCZ]);
const BASIN = 4.3; // the map's basin, 8.6 across
const RING = 7.2; // the lighter paving round the basin
// the lane: route_home through the chunk, smoothed, 3 wide
const HALF = path('route_home').w / 2;
const LANE = (() => {
  const pts = path('route_home').line.map(local);
  const curve = new THREE.CatmullRomCurve3(
    pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  return curve.getSpacedPoints(90).map((v) => [v.x, v.z]);
})();
// the lane's centre z at x (it runs west to east through the chunk)
export function laneZ(x) {
  for (let i = 0; i + 1 < LANE.length; i++) {
    const [a, b] = [LANE[i], LANE[i + 1]];
    if (x >= a[0] && x <= b[0]) return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
  }
  return LANE[x < LANE[0][0] ? 0 : LANE.length - 1][1];
}
const lanePoint = (x) => [x, laneZ(x)];
// the lane's heading at x as a facing angle (0 = south, PI/2 = east)
const laneFace = (x) => Math.atan2(1, laneZ(x + 0.5) - laneZ(x - 0.5));
function laneDist(x, z) {
  let d = Infinity;
  for (let i = 0; i + 1 < LANE.length; i++) {
    const [a, b] = [LANE[i], LANE[i + 1]];
    if (Math.max(a[0], b[0]) < x - 4 || Math.min(a[0], b[0]) > x + 4) continue;
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    d = Math.min(d, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz));
  }
  return d;
}

// the canteen and the shop street, from the layout
const CANTEEN = (() => {
  const [x0, z0] = local(building('canteen').rect.slice(0, 2)),
    [x1, z1] = local(building('canteen').rect.slice(2));
  return [x0, z0, x1, z1];
})();
const SHOPS = (() => {
  const [nw, ne, , sw] = building('shops_north').poly.map(local);
  const L = Math.hypot(ne[0] - nw[0], ne[1] - nw[1]);
  return {
    a: nw,
    dir: [(ne[0] - nw[0]) / L, (ne[1] - nw[1]) / L],
    depth: Math.hypot(sw[0] - nw[0], sw[1] - nw[1]),
    length: L,
  };
})();
// the shops' north face (their backs, toward the lane) at x
const shopsZ = (x) => SHOPS.a[1] + ((x - SHOPS.a[0]) / SHOPS.dir[0]) * SHOPS.dir[1];

// walkable: the plaza disc, the lane, the canteen terrace; never the basin
const TERRACE = [CANTEEN[0] + 0.6, CANTEEN[2] - 0.6, CANTEEN[3] + 0.35, CANTEEN[3] + 4.2];
const WEST_X = -9.6, // the lane's west end: walking on past it goes back to the forecourt
  EAST_X = 10.6; // and its east end, on toward the dorms
const NAV = [-11.8, 13.2, CANTEEN[3] + 0.3, 11.2];

function shape(points, y) {
  const s = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2).translate(0, y, 0);
}
function flatMesh(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, mat(color, { roughness: 0.85, ...opts }));
  m.receiveShadow = true;
  return m;
}
// a line beside the lane's centre, o to the south (negative: north), between x0 and x1
function offsetLine(o, x0 = -40, x1 = 40) {
  const pts = LANE.filter(([x]) => x >= x0 && x <= x1);
  return pts.map(([x, z], i) => {
    const p = pts[Math.max(0, i - 1)],
      q = pts[Math.min(pts.length - 1, i + 1)],
      L = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [x - ((q[1] - p[1]) / L) * o, z + ((q[0] - p[0]) / L) * o];
  });
}
// the lane's outline, from a north of its centre line to b south of it
const strip = (a, b, x0, x1) => [...offsetLine(-a, x0, x1), ...offsetLine(b, x0, x1).reverse()];

function ground(root) {
  // the town's paving under everything near; the plaza, the lane, the verge and the terrace on top
  root.add(
    paving(-30, 30, CANTEEN[1] - 1, 40, 1.5, {
      color: '#848481',
      seam: '#797976',
      y: 0,
    }),
  );
  // the verge: from the lane's south kerb to the shops' backs, and a footpath along the backs
  const west = -30,
    east = 30;
  const south = offsetLine(HALF + 0.2, west, east);
  const back = [
    [east, shopsZ(east) - 1.7],
    [west, shopsZ(west) - 1.7],
  ];
  root.add(
    flatMesh(shape([...south, ...back], 0.012), TOWN.grass, {
      roughness: 0.95,
    }),
  );
  root.add(
    flatMesh(
      shape(
        [
          [west, shopsZ(west) - 1.7],
          [east, shopsZ(east) - 1.7],
          [east, shopsZ(east) + 0.05],
          [west, shopsZ(west) + 0.05],
        ],
        0.014,
      ),
      '#8a8782',
    ),
  );
  // the terrace in front of the canteen
  root.add(
    flatMesh(
      new THREE.PlaneGeometry(CANTEEN[2] - CANTEEN[0] + 1.4, 5.0)
        .rotateX(-Math.PI / 2)
        .translate((CANTEEN[0] + CANTEEN[2]) / 2, 0.016, CANTEEN[3] + 2.5),
      '#8d8983',
    ),
  );
  // the round plaza: outer paving, a lighter ring round the basin, seams, a kerb on its open sides
  const disc = new THREE.CircleGeometry(R, 72).rotateX(-Math.PI / 2).translate(F[0], 0.02, F[1]);
  root.add(flatMesh(disc, '#948f88', { roughness: 0.4 }));
  const ring = new THREE.RingGeometry(BASIN, RING, 72, 1).rotateX(-Math.PI / 2).translate(F[0], 0.024, F[1]);
  root.add(flatMesh(ring, '#a39e96', { roughness: 0.4 }));
  const seams = [];
  for (const r of [5.75, RING, 9.35]) seams.push(new THREE.RingGeometry(r - 0.025, r + 0.025, 72, 1));
  for (let a = 0; a < 360; a += 10)
    seams.push(new THREE.PlaneGeometry(R - RING, 0.04).translate((R + RING) / 2, 0, 0).rotateZ(rad(a)));
  const seamMesh = merged(
    seams.map((g) => g.rotateX(-Math.PI / 2).translate(F[0], 0.027, F[1])),
    mat('#827d77', { roughness: 0.7 }),
    { cast: false },
  );
  seamMesh.material.userData.noInk = true;
  root.add(seamMesh);
  // the kerb round the plaza where the lane doesn't cross it (from 170° round the north to 40°)
  const kerb2 = new THREE.LatheGeometry(
    [
      [R - 0.08, 0],
      [R + 0.08, 0],
      [R + 0.08, 0.1],
      [R - 0.08, 0.1],
      [R - 0.08, 0],
    ].map(([r, y]) => new THREE.Vector2(r, y)),
    60,
    rad(90 - 400),
    rad(230),
  ).translate(F[0], 0, F[1]);
  root.add(merged([kerb2], mat('#9a9993')));
  // the lane over it all
  root.add(flatMesh(shape(strip(HALF, HALF), 0.032), '#83817d', { roughness: 0.5 }));
}

// planted beds with a tree round the plaza's outer ring, at angles from the fountain (0 = east, 90 = south)
function beds(root, nav) {
  [190, 228, 312, 350, 20].forEach((deg, i) => {
    const a = rad(deg),
      x = F[0] + Math.cos(a) * 9.7,
      z = F[1] + Math.sin(a) * 9.7;
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
    g.add(planter(2.6));
    const t = tree(i + 2, 1.45 + (i % 2) * 0.15);
    t.position.set(0, 0.2, 0);
    g.add(t);
    root.add(g);
    nav.block(x - 1.35, x + 1.35, z - 1.35, z + 1.35);
  });
}

// the verge south of the lane: low shrub beds near the kerb, a row of trees further back (the occlusion rule: a
// tree 2.3 high stands at least 2.4 from the lane's edge), and bikes by the shops' back doors
function verge(root) {
  for (let x = -27; x <= 27; x += 6.5) {
    const [px, pz] = lanePoint(x),
      f = laneFace(x);
    const bed = planter(2.4);
    bed.position.set(px, 0.01, pz + HALF + 0.75);
    bed.rotation.y = f - Math.PI / 2;
    root.add(bed);
  }
  for (let x = -26; x <= 28; x += 3.4) {
    const row = Math.round((x + 26) / 3.4) % 2;
    const z = laneZ(x) + HALF + 2.7 + row * 2.6;
    if (z > shopsZ(x) - 2.2) continue;
    const t = tree(Math.round(x) + 40, 1.15 + row * 0.25);
    t.position.set(x + row * 0.6, 0, z);
    root.add(t);
  }
  const colors = ['#5a6b7a', '#6f6a7e', '#61705f', '#7a7f87'];
  for (let i = 0; i < 5; i++) {
    const x = -6 + i * 0.75,
      b = bicycle(colors[i % colors.length]);
    b.position.set(x, 0, shopsZ(x) - 0.7);
    b.rotation.y = Math.PI / 2 - Math.atan2(SHOPS.dir[1], SHOPS.dir[0]);
    root.add(b);
  }
}

// grass beds with trees on the paving round the plaza (the map's trees between the plaza and its neighbours):
// [x, z, radius, trees]
const GROVES = [
  [16.5, -3.5, 2.6, 3],
  [18.5, -11.5, 2.4, 2],
  [15.0, 3.8, 1.8, 2],
  [-15.5, -6.5, 2.4, 3],
  [-15.0, -14.0, 2.0, 2],
  [-17.5, 1.5, 1.8, 1],
  [21.5, 3.0, 2.0, 2],
];
// the clinic's green cross, on the south face of the layout's clinic (north of the canteen)
function clinicCross(root) {
  const [x0, , x1, z1] = [...local(building('clinic').rect.slice(0, 2)), ...local(building('clinic').rect.slice(2))];
  const x = (x0 + x1) / 2,
    y = building('clinic').storeys * building('clinic').floorH - 1.1;
  root.add(
    merged(
      [
        new THREE.BoxGeometry(1.0, 0.3, 0.08).translate(x, y, z1 + 0.05),
        new THREE.BoxGeometry(0.3, 1.0, 0.08).translate(x, y, z1 + 0.05),
      ],
      mat('#5d8a6c', {
        emissive: new THREE.Color('#3f6b4d'),
        emissiveIntensity: 0.3,
      }),
      { cast: false },
    ),
  );
}

// buildPlaza() builds it at once; plazaSteps() yields between parts, for building in slices (js/perf/slice.js)
export const buildPlaza = () => drain(plazaSteps());
export function* plazaSteps() {
  const root = new THREE.Group(),
    scene = new THREE.Scene();
  scene.background = new THREE.Color(TOWN.roof);
  scene.add(root);
  const sun = outdoorLight(scene);
  // the plaza is wider than the forecourt: the sun's shadow box covers the walkable part and the canteen front
  Object.assign(sun.shadow.camera, {
    left: -21,
    right: 21,
    top: 21,
    bottom: -21,
    far: 90,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(1, 0, -3);
  sun.position.add(sun.target.position);

  const nav = new Nav(NAV[0], NAV[1], NAV[2], NAV[3], 0.1);
  const inTerrace = (x, z) => x > TERRACE[0] && x < TERRACE[1] && z > TERRACE[2] && z < TERRACE[3];
  nav.extra = (x, z) => {
    const r = Math.hypot(x - F[0], z - F[1]);
    if (r < BASIN + 0.3) return false;
    return r < R - 0.3 || inTerrace(x, z) || laneDist(x, z) < HALF - 0.25;
  };

  ground(root);
  yield;
  const water = fountain(root, F[0], F[1], BASIN);
  yield;
  laneDetails(root, LANE, HALF);
  yield;
  benches(
    root,
    nav,
    [180, 0, 228, 312, 142].map((deg) => {
      const a = rad(deg);
      return [F[0] + Math.cos(a) * 5.9, F[1] + Math.sin(a) * 5.9, Math.atan2(-Math.cos(a), -Math.sin(a))];
    }),
    () => bench(1.6, { seats: 2 }),
  );
  bin(root, nav, F[0] + 6.2, F[1] + 2.4);
  beds(root, nav);
  yield;
  // lamps: four round the plaza's north side, three along the lane's north edge
  const lampPts = [
    ...[205, 248, 292, 335].map((deg) => [F[0] + Math.cos(rad(deg)) * 10.7, F[1] + Math.sin(rad(deg)) * 10.7]),
    ...[-6.5, 2.5, 10].map((x) => [x, laneZ(x) - HALF - 0.45]),
  ];
  for (const [x, z] of lampPts) nav.block(x - 0.16, x + 0.16, z - 0.16, z + 0.16);
  const lit = lamps(root, lampPts);
  yield;
  terrace(root, nav, [-5.4, -1.8, 1.8, 5.4, 9.0, 12.6], CANTEEN[3] + 1.9);
  yield;
  const hall = canteen(root, CANTEEN, building('canteen').floorH);
  yield;
  // the corner beds either side of the terrace, between the canteen and the plaza
  for (const [x, z] of [
    [CANTEEN[0] + 0.6, CANTEEN[3] + 3.6],
    [CANTEEN[2] - 0.4, CANTEEN[3] + 3.4],
  ]) {
    const bed = planter(2.2);
    bed.position.set(x, 0, z);
    root.add(bed);
    const t = tree(Math.abs(Math.round(x)), 1.6);
    t.position.set(x, 0.2, z);
    root.add(t);
    nav.block(x - 1.2, x + 1.2, z - 0.5, z + 0.5);
  }
  verge(root);
  groves(root, GROVES);
  yield;
  const street = shopStreet(root, {
    a: SHOPS.a,
    dir: SHOPS.dir,
    depth: SHOPS.depth,
    u0: 10,
    u1: SHOPS.length,
    storeyH: building('shops_north').floorH,
    // the island's one combined konbini, 100-yen shop and drugstore, and the bakery (island-places)
    signs: [
      [5, 'コンビニ', 'KONBINI · 100 YEN · DRUGSTORE', '#3f5f6e'],
      [8, 'パン', 'BAKERY', '#5d5a72'],
    ],
  });
  yield;
  clinicCross(root);
  const sky = yield* skylineSteps(root, CHUNK, {
    layout: LAYOUT,
    skip: ['canteen', 'shops_north', 'arcade', 'shops_south'],
  });
  yield* mergeStaticSteps(root);

  // the points the place uses; the lane's ends are where the walks to the forecourt and the dorms start
  const arriveIn = lanePoint(0.4);
  return {
    root,
    scene,
    sun,
    nav,
    fountain: F,
    fountainEdge: [F[0], F[1] + BASIN + 0.6],
    westLane: lanePoint(WEST_X - 0.5), // walking out west: to here, then on to the edge
    westEdge: lanePoint(WEST_X - 2.6),
    // arriving from the forecourt: the crossfade shows him close up on the lane just south-west of the fountain,
    // so the first view on a phone (narrow and tall) has the whole fountain above him
    arriveEdge: lanePoint(-2.0),
    arriveIn,
    arriveFace: laneFace(0.4),
    dormExit: lanePoint(EAST_X - 0.8),
    dormEdge: lanePoint(EAST_X + 2.2),
    westX: WEST_X,
    eastX: EAST_X,
    laneZ,
    camera: { elev: 46, fov: 24 },
    update(dt, t) {
      water.update(t);
    },
    evening() {
      lit.evening();
      hall.glass.emissiveIntensity = 0.45;
      water.evening();
      street.glass.emissiveIntensity = 0.55;
      sky.onPeriod('evening');
    },
    skyline: sky.stats,
  };
}
