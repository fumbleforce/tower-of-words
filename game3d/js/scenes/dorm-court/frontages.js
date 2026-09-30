// The dorm courtyard's two background frontages (scenes/dorm-court.js): the coin laundry and the sento. Only their
// fronts are built; nobody goes in on day 1.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, rbox, sh, textTexture, plane, JP_FONT } from '../../props.js';
import { lightPool } from '../../places/life.js';
import { boxes } from '../forecourt/details.js';

// the coin laundry: a one-storey lit shopfront west of the hall, washers seen through the glass
export function laundry(root, nav, { west, roofMat }) {
  const x0 = -4.9,
    x1 = -1.2,
    z = -1.9;
  root.add(rbox(x1 - x0, 2.1, 0.8, '#9c9ea1', { x: (x0 + x1) / 2, z: z - 0.4, seg: 1, r: 0.02 }));
  root.add(rbox(x1 - x0 + 0.1, 0.12, 2.4, null, { x: (x0 + x1) / 2, y: 2.1, z: z - 1.2, seg: 1, r: 0.01, m: roofMat }));
  // the lit room behind the window: a pale back wall, a row of washers under a row of dryers, round doors
  root.add(
    rbox(2.6, 1.3, 0.03, null, {
      x: x0 + 1.55,
      y: 0.15,
      z: z + 0.005,
      seg: 1,
      r: 0.005,
      m: mat('#cfd3cc', { emissive: new THREE.Color('#eef0e6'), emissiveIntensity: 0.28 }),
      cast: false,
    }),
  );
  const bodies = [],
    doors = [];
  for (let i = 0; i < 4; i++) {
    const x = x0 + 0.6 + i * 0.64;
    bodies.push([0.54, 0.6, 0.12, x, 0.15, z + 0.08], [0.46, 0.44, 0.12, x, 0.84, z + 0.08]);
    for (const [y, r] of [
      [0.47, 0.17],
      [1.06, 0.14],
    ])
      doors.push(new THREE.CylinderGeometry(r, r, 0.03, 14).rotateX(Math.PI / 2).translate(x, y, z + 0.15));
  }
  root.add(boxes(bodies, '#e4e6e3'));
  root.add(sh(new THREE.Mesh(mergeGeometries(doors), mat('#4a5560')), false));
  doors.forEach((g) => g.dispose());
  // the window frame: sill, head and mullions
  const frame = [
    [2.7, 0.06, 0.08, x0 + 1.55, 1.45, z + 0.2],
    [2.7, 0.06, 0.08, x0 + 1.55, 0.1, z + 0.2],
  ];
  for (let i = 0; i < 4; i++) frame.push([0.05, 1.35, 0.06, x0 + 0.25 + i * 0.87, 0.1, z + 0.2]);
  root.add(boxes(frame, PAL.trim));
  // a glass door at its east end
  root.add(rbox(0.6, 1.5, 0.05, '#7e929c', { x: x1 - 0.55, z: z + 0.02, seg: 1, r: 0.01, cast: false }));
  root.add(rbox(0.7, 0.06, 0.08, PAL.trim, { x: x1 - 0.55, y: 1.5, z: z + 0.03, seg: 1, r: 0.01 }));
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
    { emissiveK: 0.35 },
  );
  sign.position.set(x0 + 1.55, 1.78, z + 0.03);
  root.add(sign);
  root.add(lightPool(x0 + 1.55, z + 0.7, 1.0, { color: '#f4ead2', k: 0.24, sx: 1.5 }));
  nav.block(west, x1, z - 1, z + 0.3);
}

// the sento: a low front with a dark tiled eave, the navy ゆ noren over its door, and its chimney behind
export function sento(root, nav, { east, roofMat }) {
  const x0 = 2.9,
    x1 = east + 0.4,
    z = -1.5;
  root.add(rbox(x1 - x0, 1.9, 1.6, '#c9c6bf', { x: (x0 + x1) / 2, z: z - 0.8, seg: 1, r: 0.02 }));
  // the eave: a shallow dark tiled slope along the front
  const eave = rbox(x1 - x0 + 0.3, 0.12, 0.7, '#3d434c', { x: (x0 + x1) / 2, y: 1.9, z: z + 0.05, seg: 1, r: 0.02 });
  eave.rotation.x = 0.35;
  root.add(eave);
  root.add(
    rbox(x1 - x0 + 0.1, 0.12, 2.2, null, { x: (x0 + x1) / 2, y: 2.05, z: z - 1.4, seg: 1, r: 0.01, m: roofMat }),
  );
  // timber posts and lattice in a grey-blue stain, a lit doorway with the noren over it
  const dx = x0 + 0.95;
  root.add(
    boxes(
      [
        [0.1, 1.9, 0.1, x0 + 0.1, 0, z + 0.05],
        [0.1, 1.9, 0.1, x1 - 0.1, 0, z + 0.05],
        [x1 - x0, 0.08, 0.08, (x0 + x1) / 2, 1.5, z + 0.05],
      ],
      '#4f5763',
    ),
  );
  const lattice = [];
  for (let i = 0; i < 9; i++) lattice.push([0.04, 1.1, 0.03, dx + 0.8 + i * 0.16, 0.25, z + 0.02]);
  root.add(boxes(lattice, '#5d6672'));
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
  root.add(lightPool(dx, z + 0.6, 0.7, { k: 0.22 }));
  // the chimney, in the gap between the bath house and the dorm, standing above the dorm's roof
  root.add(rbox(0.4, 11.4, 0.4, '#8c8e91', { x: x1 - 0.8, z: z - 2.0, seg: 1, r: 0.02 }));
  const bands = [
    [0.46, 0.16, 0.46, x1 - 0.8, 11.4, z - 2.0],
    [0.44, 0.08, 0.44, x1 - 0.8, 9.6, z - 2.0],
  ];
  root.add(boxes(bands, '#5c6068'));
  nav.block(x0, east, z - 1.6, z + 0.35);
}
