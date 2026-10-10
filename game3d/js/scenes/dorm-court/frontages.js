// The dorm courtyard's two background frontages (scenes/dorm-court.js): the coin laundry and the sento. Only their
// fronts are built; nobody goes in on day 1.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, rbox, sh, textTexture, plane, JP_FONT } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { Parts } from '../outdoor/parts.js';
import { flatRoof, tiledRoof } from './roofs.js';

// boxes [w, h, d, x, y (bottom), z] of one colour into a Parts collector
const put = (p, list, color) => list.forEach(([w, h, d, x, y, z]) => p.box(color, w, h, d, x, y, z));

// the roofs of the fronts, shared with the dorms scene, which looks down on them from the 2F corridor
// (scenes/dorms/below.js): the laundry's flat roof back to the block, its parapet on the court side and the west
// end, the plant on it
export function laundryRoof(p, { x0, x1, z, back }) {
  flatRoof(p, [x0, x1 + 0.05, back, z + 0.05], 2.24, {
    edges: 'sw',
    units: [
      [x0 + 1.0, z - 1.25],
      [x0 + 1.85, z - 1.3],
      [x1 - 1.1, z - 1.6], // clear of the 2F corridor over the roof's back
    ],
    vents: [[x0 + 3.0, z - 1.0]],
  });
}
// the sento's tiled gable, the boiler room's flat roof behind it and the chimney; `cut` stops the chimney at that
// height with a dark cap (the dorms scene, where it would stand between the camera and the corridor)
export const SENTO_Z = -1.5;
export function sentoRoofs(p, { east, back, cut = 0 }) {
  const x0 = 2.9,
    x1 = east + 0.4,
    z = SENTO_Z;
  tiledRoof(p, {
    x0: x0 - 0.2,
    x1: x1 - 0.06,
    zf: z + 0.4,
    zb: z - 1.9,
    eave: 1.92,
    ridge: 2.6,
    walls: [x0, x1 - 0.1],
    wallZ: [z - 1.6, z],
    wallTop: 1.9,
  });
  flatRoof(p, [x0 + 0.1, x1 - 0.05, back, z - 1.6], 1.72, { edges: 'nsw', units: [[x0 + 0.9, back + 0.35]] });
  // the chimney, in the gap between the bath house and the dorm, standing above the dorm's roof
  const top = cut || 11.4;
  p.box('#8c8e91', 0.4, top, 0.4, x1 - 0.8, 0, z - 2.0);
  if (cut) p.box('#31363e', 0.41, 0.02, 0.41, x1 - 0.8, cut, z - 2.0, { cast: false });
  else
    put(
      p,
      [
        [0.46, 0.16, 0.46, x1 - 0.8, 11.4, z - 2.0],
        [0.44, 0.08, 0.44, x1 - 0.8, 9.6, z - 2.0],
      ],
      '#5c6068',
    );
}

// the entrance hall's flat roof, from under the 2F corridor to `front`: in the court it stops at the hall's back
// wall (the hall itself is open to the camera), from 2F it covers the whole hall
export function hallRoof(p, { x0, x1, back, front, full = false }) {
  flatRoof(p, [x0 - 0.1, x1 + 0.1, back, front], 2.34, {
    edges: full ? 'sew' : 's',
    units: [[x1 - 0.55, back + 0.45]],
    vents: [[x0 + 0.5, back + 0.4]],
  });
}

// the coin laundry: a one-storey lit shopfront west of the hall, washers seen through the glass; its west end is
// blank wall, with the two drinks machines in front of it (dorm-court/fittings.js)
export function laundry(root, nav, { x0, x1, z, west, back }) {
  const p = new Parts();
  const wx0 = -3.85,
    wx1 = -2.15,
    wc = (wx0 + wx1) / 2,
    ww = wx1 - wx0;
  p.box('#a3a6a9', x1 - x0, 2.1, 0.8, (x0 + x1) / 2, 0, z - 0.4);
  laundryRoof(p, { x0, x1, z, back });
  // a shallow steel canopy over the shopfront, under the sign
  p.box('#4a4f58', x1 - x0 - 0.5, 0.05, 0.42, (x0 + x1) / 2 + 0.55, 1.56, z + 0.21);
  // the lit room behind the window: a pale back wall, a row of washers under a row of dryers, round doors
  root.add(
    rbox(ww - 0.1, 1.3, 0.03, null, {
      x: wc,
      y: 0.15,
      z: z + 0.005,
      seg: 1,
      r: 0.005,
      m: mat('#cfd3cc', { emissive: new THREE.Color('#eef0e6'), emissiveIntensity: 0.34 }),
      cast: false,
    }),
  );
  const bodies = [],
    doors = [];
  for (let i = 0; i < 3; i++) {
    const x = wx0 + 0.3 + i * 0.55;
    bodies.push([0.5, 0.6, 0.12, x, 0.15, z + 0.08], [0.44, 0.44, 0.12, x, 0.84, z + 0.08]);
    for (const [y, r] of [
      [0.47, 0.16],
      [1.06, 0.13],
    ])
      doors.push(new THREE.CylinderGeometry(r, r, 0.03, 14).rotateX(Math.PI / 2).translate(x, y, z + 0.15));
  }
  put(p, bodies, '#e4e6e3');
  root.add(sh(new THREE.Mesh(mergeGeometries(doors), mat('#4a5560')), false));
  doors.forEach((g) => g.dispose());
  // the window frame: sill, head and mullions
  const frame = [
    [ww + 0.1, 0.06, 0.08, wc, 1.45, z + 0.2],
    [ww + 0.1, 0.06, 0.08, wc, 0.1, z + 0.2],
  ];
  for (let i = 0; i < 3; i++) frame.push([0.05, 1.35, 0.06, wx0 + i * (ww / 2), 0.1, z + 0.2]);
  put(p, frame, PAL.trim);
  // a glass door at its east end
  root.add(rbox(0.6, 1.5, 0.05, '#7e929c', { x: x1 - 0.55, z: z + 0.02, seg: 1, r: 0.01, cast: false }));
  p.box(PAL.trim, 0.7, 0.06, 0.08, x1 - 0.55, 1.5, z + 0.03);
  const sign = plane(
    2.4,
    0.34,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#3f5f7a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#eef0ec';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 84px ' + JP_FONT;
        ctx.fillText('コインランドリー', w * 0.37, h / 2 + 4, w * 0.66);
        ctx.font = '600 44px sans-serif';
        ctx.globalAlpha = 0.8;
        ctx.fillText('COIN LAUNDRY', w * 0.84, h / 2 + 2, w * 0.28);
      },
      1024,
      144,
    ),
    { emissiveK: 0.45 },
  );
  sign.position.set((wx0 + x1) / 2, 1.8, z + 0.03);
  root.add(sign);
  root.add(lightPool(wc, z + 0.75, 1.0, { color: '#f4ead2', k: 0.26, sx: 1.4, y: 0.02 }));
  nav.block(west, x1, z - 1, z + 0.3);
  p.build(root);
}

// the sento: a low front under a tiled gable roof, the navy ゆ noren over its door, and its chimney behind
export function sento(root, nav, { east, back }) {
  const p = new Parts();
  const x0 = 2.9,
    x1 = east + 0.4,
    z = SENTO_Z;
  p.box('#c9c6bf', x1 - x0, 1.9, 1.6, (x0 + x1) / 2, 0, z - 0.8);
  p.box('#c9c6bf', x1 - x0 - 0.3, 1.6, z - 1.6 - back, (x0 + x1) / 2 + 0.15, 0, (back + z - 1.6) / 2);
  sentoRoofs(p, { east, back });
  // timber posts and lattice in a grey-blue stain, a lit doorway with the noren over it
  const dx = x0 + 0.95;
  put(
    p,
    [
      [0.1, 1.9, 0.1, x0 + 0.1, 0, z + 0.05],
      [0.1, 1.9, 0.1, x1 - 0.1, 0, z + 0.05],
      [x1 - x0, 0.08, 0.08, (x0 + x1) / 2, 1.5, z + 0.05],
    ],
    '#4f5763',
  );
  const lattice = [];
  for (let i = 0; i < 9; i++) lattice.push([0.04, 1.1, 0.03, dx + 0.8 + i * 0.16, 0.25, z + 0.02]);
  put(p, lattice, '#5d6672');
  root.add(
    rbox(0.9, 1.45, 0.04, null, {
      x: dx,
      z: z + 0.01,
      seg: 1,
      r: 0.01,
      m: mat('#e6d7bb', { emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 0.6 }),
      cast: false,
    }),
  );
  const noren = plane(
    0.95,
    0.5,
    textTexture(
      (ctx, w, h) => {
        ctx.fillStyle = '#2e4461';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1f2f45';
        ctx.fillRect(w / 2 - 2, h * 0.35, 4, h);
        ctx.fillStyle = '#f1efe8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 118px ' + JP_FONT;
        ctx.fillText('ゆ', w / 2, h * 0.4);
        ctx.font = '600 24px sans-serif';
        ctx.fillText('BATH', w / 2, h * 0.86);
      },
      256,
      136,
    ),
  );
  noren.position.set(dx, 1.2, z + 0.08);
  root.add(noren);
  root.add(lightPool(dx, z + 0.6, 0.7, { k: 0.22, y: 0.02 }));
  nav.block(x0, east, z - 1.6, z + 0.35);
  p.build(root);
}
