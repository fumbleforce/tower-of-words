// The fountain plaza's own buildings, placed and sized from the island layout (scenes/island-layout.js): the
// two-storey canteen on the plaza's north side, and the covered shop street (shotengai) south of the lane, two
// rows of two-storey shops facing each other under one arcade roof. Everything is merged per material; the lit
// glass is its own material so the evening can turn it on.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, textTexture, plane, JP_FONT } from '../props.js';
import { TOWN } from './town.js';
import { Parts } from './outdoor/parts.js';

// parts merged into one mesh of one material (the parts are disposed)
export function merged(parts, material, { cast = true } = {}) {
  const mesh = new THREE.Mesh(mergeGeometries(parts), material);
  parts.forEach((part) => part.dispose());
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);

function litGlass(color = '#4c5a68') {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    emissive: new THREE.Color('#ffc98a'),
    emissiveIntensity: 0,
  });
}

// a sign board: the kana large, the English small under it (also the east lane's, plaza/east-lane.js)
export function signBoard(text, en, w, h, color) {
  const tex = textTexture(
    (ctx, W, H) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#eeede8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + Math.round(H * 0.46) + 'px ' + JP_FONT;
      ctx.fillText(text, W / 2, H * 0.38, W - 30);
      ctx.globalAlpha = 0.85;
      ctx.font = '600 ' + Math.round(H * 0.19) + 'px sans-serif';
      ctx.fillText(en, W / 2, H * 0.8, W - 30);
    },
    Math.round(256 * (w / h)),
    256,
  );
  return plane(w, h, tex);
}

// The canteen: rect [x0, z0, x1, z1] in the chunk's frame, two storeys of floorH. Its south face (toward the
// fountain) is glazed on the ground floor with the doors in the bay at doorX (on the fountain's axis) under a
// canopy with the sign, striped canvas awnings over the other bays, a window band above; a blue-grey roof with a
// parapet and plant.
export const AWNING = { canvas: '#3f6f77', stripe: '#e3e0d7' };
export function canteen(root, [x0, z0, x1, z1], floorH, doorX = (x0 + x1) / 2) {
  const w = x1 - x0,
    d = z1 - z0,
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2,
    H = floorH * 2,
    S = z1; // the south face
  const glass = litGlass('#6a7b8a');
  const walls = [box(w, H, d, cx, 0, cz)],
    bands = [],
    frames = [],
    panes = [],
    plant = [];
  // ground floor: a glazed front between piers
  const bays = Math.round(w / 2.3),
    bw = w / bays;
  for (let i = 0; i < bays; i++) {
    const bx = x0 + bw * (i + 0.5);
    panes.push(box(bw - 0.24, 1.55, 0.04, bx, 0.18, S + 0.02));
    frames.push(box(0.05, 1.55, 0.06, bx, 0.18, S + 0.04));
    panes.push(box(bw - 0.3, 0.95, 0.04, bx, floorH + 0.5, S + 0.02));
  }
  for (let i = 0; i <= bays; i++) frames.push(box(0.24, H, 0.1, x0 + bw * i, 0, S + 0.05));
  // side windows on the east and west faces, upper floor only
  for (const sx of [x0 - 0.02, x1 + 0.02])
    for (let k = 0; k < 3; k++) panes.push(box(0.04, 0.95, 1.8, sx, floorH + 0.5, z0 + d * (0.2 + k * 0.3)));
  // floor band, base plinth, parapet
  bands.push(box(w + 0.1, 0.24, 0.16, cx, floorH - 0.02, S + 0.06), box(w + 0.1, 0.16, 0.14, cx, 0, S + 0.05));
  bands.push(
    box(w + 0.2, 0.36, 0.18, cx, H, S - 0.09),
    box(w + 0.2, 0.36, 0.18, cx, H, z0 + 0.09),
    box(0.18, 0.36, d, x0 - 0.01, H, cz),
    box(0.18, 0.36, d, x1 + 0.01, H, cz),
  );
  // the doors: a canopy over their bay, and the doors' middle frame
  const dx = doorX;
  frames.push(box(2.2, 0.08, 1.1, dx, 1.95, S + 0.55), box(0.06, 1.8, 0.06, dx, 0.18, S + 0.05));
  // the awnings: a sloping canvas over each other bay, in stripes, with a straight valance at the front
  const cloth = new Parts();
  for (let i = 0; i < bays; i++) {
    const bx = x0 + bw * (i + 0.5);
    if (Math.abs(bx - dx) < bw / 2) continue;
    const n = 7,
      sw = (bw - 0.3) / n,
      out = 0.95,
      slope = 0.32;
    for (let k = 0; k < n; k++) {
      const color = k % 2 ? AWNING.stripe : AWNING.canvas;
      const sx = bx - (bw - 0.3) / 2 + sw * (k + 0.5);
      cloth.geo(
        color,
        new THREE.BoxGeometry(sw, 0.03, out)
          .rotateX(slope)
          .translate(sx, 2.02 - (Math.sin(slope) * out) / 2, S + (Math.cos(slope) * out) / 2 + 0.04),
      );
      cloth.box(color, sw, 0.16, 0.02, sx, 2.02 - Math.sin(slope) * out - 0.16, S + Math.cos(slope) * out + 0.04);
    }
  }
  cloth.build(root);
  // roof plant: three condenser boxes, a duct, a small stair housing
  for (const [px, pz, pw, pd, ph] of [
    [x0 + w * 0.2, cz - 1.2, 2.2, 1.4, 0.8],
    [x0 + w * 0.45, cz + 0.8, 1.6, 1.2, 0.7],
    [x0 + w * 0.72, cz - 0.6, 2.6, 1.6, 0.9],
    [x1 - 2.2, z0 + 2.0, 2.4, 2.0, 1.3],
  ])
    plant.push(box(pw, ph, pd, px, H, pz));
  plant.push(box(w * 0.3, 0.3, 0.35, x0 + w * 0.6, H + 0.15, cz + 2.2));
  root.add(merged(walls, mat(TOWN.walls[1])));
  root.add(merged(frames, mat('#6c737c')));
  root.add(merged(bands, mat(TOWN.band)));
  root.add(merged(panes, glass, { cast: false }));
  root.add(merged(plant, mat('#9aa1a9')));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.08, d - 0.1), mat('#56697d', { roughness: 0.85 }));
  roof.position.set(cx, H + 0.02, cz);
  roof.receiveShadow = true;
  root.add(roof);
  const sign = signBoard('しょくどう', 'CANTEEN', 2.6, 0.62, '#44535f');
  // standing on the door canopy's front edge
  sign.position.set(dx, 2.3, S + 1.08);
  root.add(sign);
  return { glass };
}

// The shop street: two rows along a line from `a` (the north row's north-west corner) in direction `dir`, each
// `depth` deep, with the arcade between them; u0..u1 is the stretch built. Shops are bays of about 4.5.
// signs: [[bay, kana, English, colour], ...] on the north row's arcade side.
export function shopStreet(root, { a, dir, depth, u0, u1, storeyH, signs = [] }) {
  const g = new THREE.Group();
  g.position.set(a[0], 0, a[1]);
  g.rotation.y = -Math.atan2(dir[1], dir[0]); // local +x along the street, +z across it to the south
  root.add(g);
  const glass = litGlass('#556372');
  const H = storeyH * 2;
  const walls = TOWN.walls.map(() => []),
    roofs = [],
    trims = [],
    panes = [],
    shutters = [],
    plant = [],
    awnings = [[], [], []],
    arcade = [],
    posts = [];
  const AWN = ['#6e7f8c', '#7d7a8c', '#6f8474'];
  const bayW = 4.5,
    n = Math.floor((u1 - u0) / bayW);
  const rows = [
    { v0: 0, front: depth, back: 0, dirF: 1 }, // north row: its front (+z) faces the arcade
    { v0: depth * 2, front: depth * 2, back: depth * 3, dirF: -1 }, // south row: its front (-z) faces the arcade
  ];
  rows.forEach((row, ri) => {
    for (let i = 0; i < n; i++) {
      const u = u0 + bayW * (i + 0.5),
        vc = row.v0 + depth / 2,
        k = (i * 7 + ri * 3) % 4,
        h = H + (((i + ri) % 3) - 1) * 0.12;
      walls[k].push(box(bayW - 0.06, h, depth, u, 0, vc));
      roofs.push(box(bayW - 0.2, 0.06, depth - 0.2, u, h, vc));
      trims.push(box(bayW - 0.06, 0.22, 0.12, u, h - 0.02, row.front + row.dirF * 0.02));
      // ground floor: a shopfront or a shutter; an awning; upper-floor windows
      const f = row.front + row.dirF * 0.03;
      if ((i + ri) % 5 === 3) shutters.push(box(bayW - 0.9, 1.35, 0.05, u, 0.05, f));
      else panes.push(box(bayW - 0.9, 1.3, 0.05, u, 0.1, f));
      awnings[(i + ri) % 3].push(
        new THREE.BoxGeometry(bayW - 0.5, 0.05, 0.7)
          .rotateX(row.dirF * 0.35)
          .translate(u, 1.62, row.front + row.dirF * 0.35),
      );
      for (const o of [-1, 1]) panes.push(box(1.2, 0.7, 0.05, u + o * 1.05, storeyH + 0.45, f));
      // the back: a small window, a door, a condenser on the wall
      const b = row.back - row.dirF * 0.03;
      panes.push(box(0.9, 0.55, 0.05, u + 0.9, storeyH + 0.5, b));
      trims.push(box(0.8, 1.2, 0.05, u - 1.2, 0, b));
      plant.push(box(0.7, 0.5, 0.35, u + 0.6, 0.1, b - row.dirF * 0.2), box(1.0, 0.45, 0.8, u - 0.6, h, vc));
    }
  });
  // the arcade: a slim opaque roof over the lane between the rows, a little higher in the middle, on thin posts
  const L = n * bayW,
    uc = u0 + L / 2;
  arcade.push(
    new THREE.BoxGeometry(L, 0.08, depth * 0.55).rotateX(0.16).translate(uc, H + 0.32, depth + depth * 0.26),
    new THREE.BoxGeometry(L, 0.08, depth * 0.55).rotateX(-0.16).translate(uc, H + 0.32, depth * 2 - depth * 0.26),
    new THREE.BoxGeometry(L, 0.12, 0.3).translate(uc, H + 0.5, depth * 1.5),
  );
  for (let u = u0 + 1; u < u0 + L; u += bayW)
    for (const v of [depth + 0.35, depth * 2 - 0.35]) posts.push(box(0.1, H + 0.2, 0.1, u, 0, v));
  walls.forEach((parts, k) => parts.length && g.add(merged(parts, mat(TOWN.walls[k]))));
  g.add(merged(roofs, mat('#7a7f87', { roughness: 0.85 })));
  g.add(merged(trims, mat('#8c939b')));
  g.add(merged(panes, glass, { cast: false }));
  if (shutters.length) g.add(merged(shutters, mat('#9ba1a8', { roughness: 0.6 })));
  g.add(merged(plant, mat('#a3a9b0')));
  awnings.forEach((parts, k) => parts.length && g.add(merged(parts, mat(AWN[k]))));
  g.add(merged(arcade, mat('#9aa4ad', { roughness: 0.7 })));
  g.add(merged(posts, mat(PAL.dark)));
  // shop signs on the north row, under the arcade
  for (const [bay, kana, en, color] of signs) {
    const s = signBoard(kana, en, 3.0, 0.75, color);
    s.position.set(u0 + bayW * (bay + 0.5), 2.05, depth + 0.1);
    g.add(s);
  }
  return { glass, n };
}
