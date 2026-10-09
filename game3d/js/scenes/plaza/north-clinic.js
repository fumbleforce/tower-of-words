// The clinic behind the canteen and its court on the back lane (plaza/north-lane.js builds the rest; the plan is
// plaza/north-plan.js). Backdrop, nothing inside. A small town clinic's front, on the block builder
// (outdoor/block.js) and the outdoor kit:
//   the block: three storeys in a pale wall with a window to each bay in a dark frame over a pale sill; a glass
//   front below with slim mullions, frosted to the waist, the door in the middle; a glazed stair bay over the door
//   rising past the parapet to a crown with the green cross in a white box, クリニック down its glass on a white strip; a coped parapet, and on the roof a
//   stair house, a water tank, condensers and vents, and a green cross on its west end for the map
//   the entrance: a deep canopy with クリニック CLINIC and the cross on its front, a strip of light under it; a
//   raised landing with a mat at the door, two steps along its front and a ramp down its east end to the lane,
//   handrails both sides of the ramp; the hours (診療時間) on a white plate on the glass west of the canopy
//   the court: pale stone in running bond, a yellow tactile line from the lane to the steps, a bench against the
//   glass west of the door and a planter along the court's west edge, a sign stone at the lane with the cross and the name, a young zelkova in the bed past it; the bike
//   bay east of it in herringbone brick, three bikes at a rack and a bed of shrubs along its east edge
// After work the ground floor, the stair, the canopy's strip, some windows, the cross and the names are lit.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GRANITE } from '../outdoor/paving.js';
import { LANE_BORDER as BW } from '../outdoor/lane.js';
import { kerb, kerbRect } from '../outdoor/edges.js';
import { planter, keyaki, cluster, bed, mound, LEAF } from '../outdoor/planting.js';
import { bench, bikeRack } from '../outdoor/furniture.js';
import { officeBlockSteps, doorAt, BLOCK } from '../outdoor/block.js';
import { textTexture, plane, JP_FONT } from '../../props.js';
import { rowBike, slotYaw } from '../forecourt/details.js';
import { shrubBed } from './east-lane.js';
import * as N from './north-plan.js';

const { BACK, COURT, BIKES, VERGE, CLINIC } = N;
const VB = BACK[2] - VERGE; // the north verge's back
const WALL = '#b3b8be'; // a pale tile, paler than the town's offices
const DOOR = doorAt(CLINIC, 's', (COURT[0] + COURT[1]) / 2);
const BAY = DOOR.w + 0.36;
const GREEN = '#4f8a62';
// the landing: from west of the door to the court's east edge, the ramp off its east end down to the lane
const LAND = {
  from: COURT[0] + 1.7,
  to: COURT[1] - 0.2,
  d: 1.1,
  h: 0.15,
  rw: 1.1,
};
const STEP = CLINIC[3] + LAND.d + 0.72; // the lower step's front

// the court's paving and the bike bay's, and the tactile line from the lane to the step
export function clinicGround(pv) {
  const [cx0, cx1, cz0, cz1] = COURT;
  pv.field([cx0 + BW, cx1 - BW, cz0 + BW, cz1], {
    pattern: 'bond',
    module: [0.6, 0.3],
    tones: GRANITE.pale,
    origin: [cx0, cz0],
  });
  pv.border([cx0, cx1, cz0, cz1], { w: BW, sides: 'nwe' });
  const [bx0, bx1] = BIKES;
  pv.field([bx0, bx1 - BW, cz0 + BW, cz1], {
    pattern: 'herringbone',
    module: [0.3, 0.15],
    tones: GRANITE.brick,
    vary: 0.08,
    origin: [bx0, cz0],
  });
  pv.border([bx0 - 0.01, bx1, cz0, cz1], { w: BW, sides: 'ne' });
  pv.tactile([
    [DOOR.at, cz1 - 0.3],
    [DOOR.at, STEP + 0.3],
  ]);
}

// the court's furniture and planting: the west bed, a planter and a bench by the door, the sign stone, the bike
// rack and bikes, kerbs where the court and the bay leave the verge. Returns the sign stone's face. Yields between
// parts (js/perf/slice.js).
function* clinicCourt(q) {
  const [cx0, , cz0] = COURT;
  kerb(q, [cx0, cz0], [cx0, VB], { off: -0.08 });
  kerb(q, [BIKES[1], cz0], [BIKES[1], VB], { off: 0.08 });
  shrubBed(q, [CLINIC[0] + 0.2, cx0 - 0.16, cz0, VB - 0.1], 'sw', 36, 'w');
  keyaki(q, CLINIC[0] + 0.9, cz0 + 0.8, 0.62, 41);
  cluster(q, cx0 - 0.7, cz0 + 0.6, { n: 3, r: 0.28, seed: 42, y: 0.06 });
  yield;
  const px0 = cx0 + BW + 0.05,
    px1 = LAND.from - 0.1;
  bench(q, (px0 + px1) / 2, cz0 + 0.6, 0, { len: 1.2 }); // against the glass, facing the court
  planter(q, [cx0 + BW + 0.05, cx0 + BW + 0.5, cz0 + 0.95, cz0 + 1.85], { seed: 4 }); // along the court's west edge
  // the bikes, five side by side down the bay's west side at a rack, pointing east
  const rx = BIKES[0] + 0.45;
  for (const [i, [x, z]] of bikeRack(q, [rx, cz0 + 0.3], [rx, cz0 + 2.9], { n: 3 }).entries()) {
    yield;
    const b = rowBike(i, 4); // the forecourt's bikes, laid into the collector
    b.rotation.y = slotYaw(i, 4) - Math.PI / 2;
    b.position.set(x + 0.55, 0, z);
    intoParts(q, b);
  }
  yield;
  // along the bay's east edge a narrow kerbed bed of clipped shrubs
  const sb = [BIKES[1] - 0.6, BIKES[1] - 0.08, cz0 + 0.2, cz0 + 2.8];
  kerbRect(q, sb, { sides: 'w' });
  bed(q, sb, { y: 0.06 });
  for (let z = sb[2] + 0.35, i = 0; z < sb[3] - 0.2; z += 0.48, i++)
    mound(q, (sb[0] + sb[1]) / 2, z, 0.24 + (i % 3) * 0.04, [LEAF.deep, LEAF.mid, LEAF.fresh][i % 3], { y: 0.06 });
  return signStone(q, cx0 + 1.1, COURT[3] - 0.38);
}

// an object's meshes into a Parts collector, each by its material's colour (so they merge with the rest)
function intoParts(q, obj) {
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    if (!m.isMesh) return;
    q.geo('#' + m.material.color.getHexString(), m.geometry.clone().applyMatrix4(m.matrixWorld), { cast: false });
  });
}

// the sign stone at the court's lane corner: a dark slab on a plinth facing the lane; returns its face (the cross
// and the name), which shares one texture and one mesh with the canopy's front
function signStone(q, x, z) {
  q.box('#8f9092', 1.06, 0.12, 0.32, x, 0, z, { surf: 'concrete' });
  q.box(BLOCK.fascia, 0.94, 1.6, 0.2, x, 0.12, z);
  q.box('#b8bbba', 0.98, 0.04, 0.24, x, 1.72, z);
  return face(0.82, 1.44, [x, 0.12 + 0.8, z + 0.102], [0, 0.011, 0.5, 0.89]);
}

// a quad facing +z (south) of w x h centred at c, its texture the part [u0, v0, u1, v1] of the shared sheet
function face(w, h, c, [u0, v0, u1, v1]) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
  return g.translate(...c);
}

// the sheet: the canopy's name along the top (0.88..1 of its height), the stone's face below it on the left
function sheet() {
  return textTexture(
    (ctx, w, h) => {
      const cross = (cx, cy, s) => {
        ctx.fillStyle = '#eef0ee';
        ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        ctx.fillStyle = GREEN;
        ctx.fillRect(cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.24);
        ctx.fillRect(cx - s * 0.12, cy - s * 0.36, s * 0.24, s * 0.72);
      };
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(0, 0, w, h);
      // the canopy's front: 1024 x 120 along the top
      const bh = h * 0.12;
      cross(120, bh / 2, 84);
      ctx.fillStyle = '#eef0ee';
      ctx.textBaseline = 'middle';
      ctx.font = '700 70px ' + JP_FONT;
      ctx.fillText('クリニック', 190, bh / 2 + 4);
      ctx.font = '700 60px sans-serif';
      ctx.letterSpacing = '8px';
      ctx.fillText('CLINIC', 600, bh / 2 + 4);
      ctx.letterSpacing = '0px';
      // the stone's face: the left half below it, 512 x 900
      const sx = w / 4,
        top = h * 0.11;
      cross(sx, top + 290, 330);
      ctx.fillStyle = '#eef0ee';
      ctx.textAlign = 'center';
      ctx.font = '700 92px ' + JP_FONT;
      ctx.fillText('クリニック', sx, top + 640);
      ctx.fillStyle = GREEN;
      ctx.fillRect(sx - 160, top + 730, 320, 12);
      // the hours by the door: a white plate, 400 x 496 at (560, 160)
      ctx.fillStyle = '#f2f3f1';
      ctx.fillRect(560, 160, 400, 496);
      ctx.fillStyle = GREEN;
      ctx.fillRect(560, 160, 400, 92);
      ctx.fillStyle = '#f2f3f1';
      ctx.font = '700 54px ' + JP_FONT;
      ctx.fillText('診療時間', 760, 210);
      ctx.fillStyle = '#3f4650';
      ctx.font = '600 32px ' + JP_FONT;
      [
        ['月〜金', 'Mon–Fri', '9:00–18:00'],
        ['土', 'Sat', '9:00–12:00'],
        ['休診', 'Closed', 'Sun, holidays'],
      ].forEach(([ja, en, b], i) => {
        const y = 320 + i * 110;
        ctx.textAlign = 'left';
        ctx.fillText(ja, 590, y);
        ctx.fillText(en, 600 + ctx.measureText(ja).width, y, 110);
        ctx.textAlign = 'right';
        ctx.fillText(b, 935, y, 150);
        ctx.fillStyle = '#c3c8cc';
        ctx.fillRect(590, y + 45, 345, 3);
        ctx.fillStyle = '#3f4650';
      });
      // the departments on the glass: 512 x 80 at (512, 700)
      ctx.fillStyle = '#3f4650';
      ctx.fillRect(512, 700, 512, 80);
      ctx.fillStyle = '#eef0ee';
      ctx.textAlign = 'center';
      ctx.font = '700 54px ' + JP_FONT;
      ctx.fillText('内科・小児科', 768, 744);
      // the stair's vertical name: 56 x 570 at (966, 126), white with a green cross and green letters
      ctx.fillStyle = '#eef0ee';
      ctx.fillRect(966, 126, 56, 570);
      ctx.fillStyle = GREEN;
      ctx.fillRect(980, 150, 28, 8);
      ctx.fillRect(990, 140, 8, 28);
      ctx.fillStyle = '#1f6a3a';
      ctx.font = '900 46px ' + JP_FONT;
      const [ja, en] = ['クリニック', 'CLINIC'];
      [...ja].forEach((ch, i) => ctx.fillText(ch, 994, 220 + i * 84));
      ctx.save(); // and CLINIC up its foot, on its side
      ctx.translate(994, 640);
      ctx.rotate(Math.PI / 2);
      ctx.font = '700 26px sans-serif';
      ctx.fillText(en, 0, 0);
      ctx.restore();
    },
    1024,
    1024,
  );
}

// the block, its entrance and signs; the cross on the stair crown and the roof cross for the map. Returns the meshes
// that stay apart from the merge (the cross and the names, both lit after work) and what lights up after dark (glows). A generator
// that yields between parts, for building in slices (js/perf/slice.js).
export function* clinicSteps(sets, q, lights, sh) {
  const { doors, top } = yield* officeBlockSteps(sets, CLINIC, {
    storeys: 3,
    fh: 2,
    wall: WALL,
    upper: 'punched',
    glazed: 's',
    stair: { face: 's', at: DOOR.at, w: BAY },
    roof: 'plant',
    doors: [{ face: 's', at: DOOR.at, canopy: { out: 1.15, side: 0.85 }, platform: LAND }],
    seed: 8,
  });
  // the roof cross, on the roof's west end clear of the plant
  const rx = CLINIC[0] + 2.3,
    rz = (CLINIC[2] + CLINIC[3]) / 2 + 0.4;
  q.box('#5f6268', 1.5, 0.1, 1.5, rx, top, rz, { cast: false }); // a raised panel with a rim
  q.box('#d9dcdf', 1.38, 0.12, 1.38, rx, top, rz, { cast: false });
  q.box('#5d8a6c', 1.06, 0.13, 0.31, rx, top, rz, { cast: false });
  q.box('#5d8a6c', 0.31, 0.13, 1.06, rx, top, rz, { cast: false });
  // under the canopy a strip of light, lit with the lamps, and its pool at the door
  const { canopy: c } = doors[0];
  lights.glowParts.push(
    new THREE.BoxGeometry(c.c1 - c.c0 - 0.8, 0.03, 0.12).translate(DOOR.at, 2.13, CLINIC[3] + c.out / 2),
  );
  lights.lit.push([DOOR.at, CLINIC[3] + 0.9, 1.8]);
  // a downlight under the fascia lights the bike bay
  const bx = (BIKES[0] + BIKES[1]) / 2;
  lights.lit.push([bx, CLINIC[3] + 1.5, 1.4]);
  sh.block(CLINIC, top);
  yield;
  // the cross on the stair's crown, in a white box
  const cy = top + 0.42,
    z = CLINIC[3] + 0.18;
  q.box('#e3e6e4', 0.92, 0.92, 0.06, DOOR.at, cy - 0.46, z + 0.03);
  const sign = new THREE.MeshStandardMaterial({
    color: GREEN,
    emissive: new THREE.Color('#3f6b4d'),
    emissiveIntensity: 0.3,
  });
  const cross = new THREE.Mesh(
    mergeGeometries([
      new THREE.BoxGeometry(0.66, 0.2, 0.05).translate(DOOR.at, cy, z + 0.08),
      new THREE.BoxGeometry(0.2, 0.66, 0.05).translate(DOOR.at, cy, z + 0.08),
    ]),
    sign,
  );
  cross.name = 'clinic:cross'; // named, so the static merge leaves its material alone
  // the names: the canopy's front, the hours by the door and the sign stone, one mesh
  const band = face(
    c.c1 - c.c0 - 0.2,
    (c.c1 - c.c0 - 0.2) / 8.3, // the sheet's band, 1024 x 123
    [DOOR.at, c.y + c.h / 2, CLINIC[3] + c.out + 0.006],
    [0, 0.88, 1, 1],
  );
  const names = plane(1, 1, sheet(), { emissiveK: 0.08 });
  names.geometry.dispose();
  yield;
  const hx = LAND.from - 0.45,
    gz = CLINIC[3] - 0.045; // just proud of the ground floor's glass
  q.box('#3f4650', 0.58, 0.72, 0.02, hx, 0.99, gz - 0.02, { cast: false }); // the hours' frame
  const hours = face(0.5, 0.62, [hx, 1.35, gz], [0.547, 0.359, 0.9375, 0.844]);
  const depts = face(1.4, 0.22, [CLINIC[0] + 2.29, 1.58, gz], [0.5, 0.238, 1, 0.316]);
  const depts2 = face(1.4, 0.22, [CLINIC[1] - 2.29, 1.58, gz], [0.5, 0.238, 1, 0.316]);
  const blade = face(0.3, 3.05, [DOOR.at, 2.4 + 2.05, CLINIC[3] + 0.145], [0.943, 0.32, 0.998, 0.877]); // down the stair
  const stone = yield* clinicCourt(q);
  names.geometry = mergeGeometries([band, hours, depts, depts2, blade, stone]);
  names.name = 'clinic:names';
  return {
    meshes: [cross, names],
    // after dark (kit/light/glow.js)
    glows: [
      { mat: sign, night: { emissive: '#7fd39a', emissiveIntensity: 1.1 } },
      { mat: names.material, night: { emissiveIntensity: 1.3 } },
    ],
  };
}
