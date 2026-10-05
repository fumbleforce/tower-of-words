// The shop street's own ground and fittings (scenes/shotengai.js), in the island frame, on the outdoor kit
// (scenes/outdoor/): the arcade's floor, the shop walk and the dorm street's end; a door in each named shop's door
// bay, shut, with a 準備中 card (本日休業, closed today, after work on day 2: shop-signs.js WHEN); lanterns on the
// arcade's posts; what stands out in front of the shops; low planters by the plain shopfronts; benches at the
// alleys' mouths; the chains across the beach stairs' heads.
//
//   const st = yield* streetSteps(group, p, lights, signs)    group: island-aligned; p: Parts; lights: lightSet();
//                                                              signs: a shop-signs.js signSet for the cards
//   st.keep                                                   rects [x0, z0, x1, z1] (island) to keep Eric off
import * as THREE from 'three';
import { paver, GRANITE } from '../outdoor/paving.js';
import { laneField } from '../outdoor/lane.js';
import { lamps, bench, bins, STEEL } from '../outdoor/furniture.js';
import { cluster, LEAF } from '../outdoor/planting.js';
import { bikeRow } from '../forecourt/details.js';
import * as S from '../island-south.js';
import * as P from './plan.js';

const { BAYS, ROWS_Z } = S;
const { ARCADE, SHOP_WALK, DORM_STREET, ROW_W, ROW_E } = P;
const DOOR = { frame: '#3f4650', glass: '#5d6c79', handle: '#b8bcc0' };
const SPINE = 1.5; // the arcade floor's middle band
const BANNERS = ['#5d7a8c', '#8c6464', '#6f8474', '#7d7a8c']; // the awnings' family, a shade deeper
const GOODS = { cabinet: ['#d7d3cc', '#6e88a6', '#c58c8f'], board: '#3f4650', crate: '#9b8466' };

// the arcade's floor: pale slabs, a band of darker stone down the middle laid across, a dark course on every bay
// line, carried from the promenade's (outdoor/seafront.js); the shop walk in the arcade's stone; the dorm street's
// end in the lanes' brick
function* floor(group) {
  const pv = paver(),
    [x0, z0, x1, z1] = ARCADE,
    zc = (z0 + z1) / 2;
  pv.field([x0, x1, z0, zc - SPINE / 2], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: [x0, z0],
  });
  pv.field([x0, x1, zc + SPINE / 2, z1], {
    pattern: 'grid',
    module: [0.6, 0.6],
    tones: GRANITE.pale,
    origin: [x0, z0],
  });
  pv.field([x0, x1, zc - SPINE / 2, zc + SPINE / 2], {
    pattern: 'bondZ',
    module: [0.5, 0.25],
    tones: GRANITE.mid,
    vary: 0.015,
    origin: [x0, zc],
  });
  // (2 mm over the seafront's dark course, 0.007, where their ends run onto it)
  for (let x = ROW_W; x <= ROW_E + 0.01; x += BAYS.w)
    pv.field([x - 0.08, x + 0.08, z0, z1], { pattern: 'grid', module: [0.16, 0.3], tones: GRANITE.dark, h: 0.009 });
  yield;
  const [w0, wz0, w1, wz1] = SHOP_WALK;
  pv.field([w0, w1, wz0, wz1], { pattern: 'grid', module: [0.6, 0.6], tones: GRANITE.mid, origin: [w0, wz0] });
  laneField(pv, [DORM_STREET[0], DORM_STREET[2], ROWS_Z.north - 3, DORM_STREET[3]], { along: 'z' });
  yield;
  pv.build(group);
}

// a shop door in its bay, shut: frame, glass, a bar handle, and the card hung on the glass
function door(p, signs, { id, at: [x, z], out }) {
  const f = z + out * 0.08,
    W = 1.1,
    H = 1.75;
  p.box(DOOR.frame, W + 0.14, H + 0.08, 0.06, x, 0, f);
  p.box(DOOR.glass, W - 0.1, H - 0.12, 0.07, x, 0.04, f, { cast: false });
  p.box(DOOR.frame, 0.04, H, 0.08, x, 0, f); // the meeting stiles of the pair
  for (const s of [-1, 1]) p.box(DOOR.handle, 0.03, 0.5, 0.04, x + s * 0.09, 0.7, f + out * 0.06, { cast: false });
  p.box('#a9a8a3', 1.6, 0.03, 0.4, x, 0, z + out * 0.3, { cast: false }); // the doorstep
  const card = [x + 0.3, 1.2, f + out * 0.045],
    ry = out > 0 ? 0 : Math.PI;
  // the karaoke box opens (places/karaoke.js): its card is up only on day 2, when it is shut
  signs.card('準備中', 'CLOSED', 0.46, 0.3, card, ry, { when: id === 'karaoke' ? 'prep2' : 'prep', door: id });
  // day 2 after work: closed today (the izakaya is booked instead: its card is on the noren, scenes/shotengai.js)
  if (id !== 'izakaya') signs.card('本日休業', 'CLOSED TODAY', 0.46, 0.3, card, ry, { when: 'evening2', door: id });
}

// a crane game cabinet: a pale case, a glass box on top with a coloured top light
function crane(p, x, z, k) {
  const c = GOODS.cabinet[k % 3];
  p.box(c, 0.8, 0.8, 0.75, x, 0, z);
  p.box('#9fb7c4', 0.74, 0.8, 0.68, x, 0.8, z, { cast: false });
  p.box(c, 0.82, 0.22, 0.77, x, 1.6, z);
  p.box(STEEL.dark, 0.3, 0.04, 0.12, x, 0.62, z + 0.38, { cast: false });
}

// an A-board on the walk: two leaning boards; note: a printed notice pinned on each face (the bakery's dorm
// deliveries, read in story/day2/shotengai.js)
function aBoard(p, x, z, ry, { note = false } = {}) {
  for (const s of [-1, 1]) {
    p.geo(
      GOODS.board,
      new THREE.BoxGeometry(0.5, 0.7, 0.03)
        .rotateX(s * 0.2)
        .translate(0, 0.33, s * 0.07)
        .rotateY(ry)
        .translate(x, 0, z),
    );
    if (note)
      p.geo(
        '#f4efe4',
        new THREE.BoxGeometry(0.32, 0.22, 0.004)
          .translate(0, 0.08, 0.017 * s)
          .rotateX(s * 0.2)
          .translate(0, 0.33, s * 0.07)
          .rotateY(ry)
          .translate(x, 0, z),
        { cast: false },
      );
  }
}

export function* streetSteps(group, p, lights, signs) {
  yield* floor(group);
  const keep = [];
  // the doors, and what stands out in front of each named shop (kept clear of the door)
  for (const d of P.DOORS) door(p, signs, d);
  yield;
  const [nz, sz] = [ROWS_Z.arcade + 0.55, ROWS_Z.south - 0.55]; // just out from the fronts, inside the posts
  const mid = (i) => S.bayMid(i);
  // bike shop: three bikes in a rack on the walk, the door's west
  const bikes = bikeRow(3, { seed: 4 });
  bikes.rotation.y = Math.PI;
  bikes.position.set(mid(2) - 0.9, 0, nz + 0.5);
  group.add(bikes);
  keep.push([mid(2) - 2.2, ROWS_Z.arcade, mid(2) - 0.6, nz + 0.8]);
  // konbini: the sorted bins by its door
  bins(p, mid(7) - 1.2, nz, 0);
  keep.push([mid(7) - 1.6, ROWS_Z.arcade, mid(7) - 0.8, nz + 0.25]);
  // bakery and karaoke: an A-board each
  aBoard(p, mid(10) + 1.1, nz + 0.2, 0, { note: true });
  aBoard(p, mid(14) - 1.1, sz - 0.2, Math.PI);
  keep.push(
    [mid(10) + 0.8, ROWS_Z.arcade, mid(10) + 1.4, nz + 0.45],
    [mid(14) - 1.4, sz - 0.45, mid(14) - 0.8, ROWS_Z.south],
  );
  // game centre: crane games along the front of its second bay
  for (let k = 0; k < 3; k++) crane(p, mid(13) - 1.1 + k * 1.0, nz + 0.05, k);
  keep.push([mid(13) - 1.6, ROWS_Z.arcade, mid(13) + 1.5, nz + 0.45]);
  yield;
  // low planters with a shrub at the plain shopfronts' piers, every other bay; benches facing the shops at the
  // alleys' mouths, on the north side
  const named = new Set(S.SHOPS.flatMap(({ row, bays: [a, b] }) => [...Array(b - a + 1)].map((_, k) => row + (a + k))));
  for (let i = 1; i < BAYS.n; i += 2)
    for (const [row, z] of [
      ['north', ROWS_Z.arcade + 0.3],
      ['south', ROWS_Z.south - 0.3],
    ]) {
      if (named.has(row + i) || named.has(row + (i - 1)) || (row === 'south' && S.BAYS.alleys.includes(i))) continue;
      const x = ROW_W + BAYS.w * i;
      p.box('#8f9196', 0.6, 0.4, 0.4, x, 0, z);
      cluster(p, x, z, {
        n: 3,
        r: 0.22,
        spread: 0.2,
        seed: i * 7 + (row === 'north'),
        y: 0.4,
        tones: [LEAF.mid, LEAF.fresh],
      });
      keep.push([x - 0.3, z - 0.2, x + 0.3, z + 0.2]);
    }
  for (const i of BAYS.alleys) {
    bench(p, mid(i), nz + 0.35, 0, { len: 1.6 });
    keep.push([mid(i) - 0.85, ROWS_Z.arcade, mid(i) + 0.85, nz + 0.65]);
  }
  yield;
  // lanterns on the arcade's posts, every other bay on each side, staggered, lighting the walk; on the posts between,
  // a cloth banner on a short arm, hung across the street's line so it shows up and down it
  const pts = [];
  for (const [k, [x, z]] of P.POSTS.entries()) {
    const north = z < (ARCADE[1] + ARCADE[3]) / 2,
      s = north ? 1 : -1;
    if ((Math.floor(k / 2) + (north ? 0 : 1)) % 2) {
      const c = BANNERS[Math.floor(k / 2) % BANNERS.length],
        bz = z + s * 0.32;
      p.box(STEEL.dark, 0.04, 0.04, 0.5, x, 3.5, z + s * 0.25);
      p.box(c, 0.03, 1.25, 0.4, x, 2.25, bz);
      p.box('#e3e0d7', 0.035, 0.14, 0.4, x, 3.3, bz); // a pale band at the head
      continue;
    }
    const zi = z + s * 0.16;
    p.box(STEEL.dark, 0.05, 0.05, 0.2, x, 2.95, (z + zi) / 2);
    pts.push([x, zi]);
  }
  lamps(lights, p, pts, { kind: 'lantern', y: 2.7, pool: 1.5, poolShift: [0, 0] });
  for (const [x, z] of P.POSTS) keep.push([x - 0.06, z - 0.06, x + 0.06, z + 0.06]);
  yield;
  // the beach stairs' heads: a post either side and a chain slung between them
  for (const [x0, x1] of P.CHAINS) {
    const z = S.WALL_Z - 0.12;
    for (const x of [x0 + 0.15, x1 - 0.15]) {
      p.geo(STEEL.dark, new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8).translate(x, 0.35, z));
      p.geo('#c9b25a', new THREE.SphereGeometry(0.06, 8, 6).translate(x, 0.72, z));
    }
    const n = 6,
      L = x1 - x0 - 0.3;
    for (let k = 0; k < n; k++) {
      const t0 = k / n,
        t1 = (k + 1) / n,
        y = (t) => 0.62 - 0.22 * 4 * t * (1 - t);
      const a = [x0 + 0.15 + L * t0, y(t0)],
        b = [x0 + 0.15 + L * t1, y(t1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      p.geo(
        '#c9b25a',
        new THREE.BoxGeometry(len, 0.03, 0.03)
          .rotateZ(Math.atan2(b[1] - a[1], b[0] - a[0]))
          .translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z),
        { cast: false },
      );
    }
  }
  return { keep };
}
