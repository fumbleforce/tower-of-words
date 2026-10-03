// The fountain plaza's own buildings, placed and sized from the island layout (scenes/island-layout.js): the
// two-storey canteen on the plaza's north side, and the covered shop street (shotengai) south of the lane, two
// rows of two-storey shops facing each other under one arcade roof. Everything is merged per material; the lit
// glass is its own material so the evening can turn it on.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, mat, textTexture, plane, JP_FONT } from '../props.js';
import { TOWN } from './town.js';
import { Parts } from './outdoor/parts.js';
import { BLOCKS, roof, arcadeRoof } from './shop-roofs.js';
import { signSet } from './shop-signs.js';
import { drain } from '../perf/slice.js';

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
// canteenSteps is the same as a generator that yields between parts, for a place built in slices (js/perf/slice.js)
export const canteen = (...a) => drain(canteenSteps(...a));
export function* canteenSteps(root, [x0, z0, x1, z1], floorH, doorX = (x0 + x1) / 2) {
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
  yield;
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
  yield;
  cloth.build(root);
  yield;
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
  yield;
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
// `depth` deep, with the arcade between them. The rows are bays of `bays.w` from `bays.u0` (island-south.js BAYS),
// grouped into buildings each with its own height, wall colour and roof (shop-roofs.js BLOCKS); the south row
// leaves out the alleys' bays. Only the buildings with a bay between `from` and `to` are built (each place builds
// the stretch its map tile shows). The ground floor is a shopfront under an awning (or a shutter down), sized to
// the storey. shops: the named shops (island-south.js SHOPS): a sign board on the front over their bays and a
// projecting sign over the arcade at their door bay, all in one mesh (shop-signs.js).
// farLayer: the camera layer for the arcade's roof and the south row's roofs, which no camera of the backdrop's
// places sees (the island map's: they cost nothing in play). Returned: the lit glass, the group, the signs and the
// arcade roof's meshes (its glass, ribs and ridge; the gutters stay with the rows), for a place that walks under
// it to fade (scenes/occluders.js).
// shopStreetSteps is the same as a generator that yields after every building and between the meshes, for a place
// built in slices (js/perf/slice.js)
export const shopStreet = (...a) => drain(shopStreetSteps(...a));
export function* shopStreetSteps(
  root,
  { a, dir, depth, storeyH, bays, from = 0, to = Infinity, shops = [], farLayer = null },
) {
  const g = new THREE.Group();
  g.position.set(a[0], 0, a[1]);
  g.rotation.y = -Math.atan2(dir[1], dir[0]); // local +x along the street, +z across it to the south
  root.add(g);
  const glass = litGlass('#556372');
  const H = storeyH * 2;
  const walls = TOWN.walls.map(() => []),
    trims = [],
    panes = [],
    shutters = [],
    plant = [],
    awnings = [[], [], []],
    top = new Parts(),
    far = new Parts(),
    arc = new Parts();
  const AWN = ['#6e7f8c', '#7d7a8c', '#6f8474'];
  const bayW = bays.w,
    uOf = (i) => bays.u0 + bayW * i; // a bay's west side
  const rows = {
    north: { v0: 0, front: depth, back: 0, dirF: 1 }, // its front (+z) faces the arcade
    south: { v0: depth * 2, front: depth * 2, back: depth * 3, dirF: -1 }, // its front (-z) faces the arcade
  };
  // the named shops' bays keep their shopfronts (never a shutter down)
  const doors = new Set(shops.map(({ row, door }) => row + door));
  const named = new Set(
    shops.flatMap(({ row, bays: [i0, i1] }) => [...Array(i1 - i0 + 1)].map((_, k) => row + (i0 + k))),
  );
  let uMin = Infinity,
    uMax = -Infinity;
  for (const [name, row] of Object.entries(rows))
    for (const [bi, [i0, i1, kind, dh]] of BLOCKS[name].entries()) {
      const ua = uOf(i0),
        ub = uOf(i1 + 1);
      if (ub <= from || ua >= to) continue;
      uMin = Math.min(uMin, ua);
      uMax = Math.max(uMax, ub);
      const ri = name === 'north' ? 0 : 1,
        storeys = dh > 1 ? 3 : 2, // an extra height over a storey's is a third storey
        h = storeys === 3 ? storeyH * 3 : H + dh,
        vc = row.v0 + depth / 2,
        f = row.front + row.dirF * 0.03,
        b = row.back - row.dirF * 0.03;
      walls[(bi * 3 + ri) % 4].push(box(ub - ua - 0.06, h, depth, (ua + ub) / 2, 0, vc));
      trims.push(box(ub - ua - 0.06, 0.22, 0.12, (ua + ub) / 2, H - 0.02, row.front + row.dirF * 0.02));
      roof(ri ? far : top, kind, ua + 0.03, ub - 0.03, row.v0, row.v0 + depth, h, bi * 7 + ri, ri ? 1 : -1);
      for (let i = i0; i <= i1; i++) {
        const u = uOf(i) + bayW / 2;
        // ground floor: a shopfront or a shutter; an awning; upper-floor windows
        if ((i + ri) % 5 === 3 && !named.has(name + i))
          shutters.push(box(bayW - 0.9, storeyH * 0.76, 0.05, u, 0.05, f));
        else panes.push(box(bayW - 0.9, storeyH * 0.72, 0.05, u, 0.12, f));
        // the named shops' door bays have no awning, so the door shows from the street
        if (!doors.has(name + i))
          awnings[(i + ri) % 3].push(
            new THREE.BoxGeometry(bayW - 0.5, 0.05, 0.8)
              .rotateX(row.dirF * 0.35)
              .translate(u, storeyH * 0.9, row.front + row.dirF * 0.4),
          );
        for (let s = 1; s < storeys; s++)
          for (const o of [-1, 1]) panes.push(box(1.2, storeyH * 0.45, 0.05, u + o * 1.05, storeyH * (s + 0.28), f));
        // the back: a window on each upper floor, a door, a condenser on the wall
        for (let s = 1; s < storeys; s++) panes.push(box(0.9, storeyH * 0.38, 0.05, u + 0.9, storeyH * (s + 0.32), b));
        trims.push(box(0.8, storeyH * 0.8, 0.05, u - 1.2, 0, b));
        plant.push(box(0.7, 0.5, 0.35, u + 0.6, 0.1, b - row.dirF * 0.2));
      }
      // the rows' end walls, seen from the walks past them: a window either side on every floor
      for (const [end, ue] of [
        [i0 === 0, ua - 0.03],
        [i1 === bays.n - 1, ub + 0.03],
      ])
        for (let s = 0; end && s < storeys; s++)
          for (const o of [-1.1, 1.1])
            panes.push(box(0.05, storeyH * 0.42, 1.0, ue, storeyH * (s + (s ? 0.3 : 0.36)), vc + o));
      yield;
    }
  // the arcade's glass roof over the walk between the rows, on thin posts
  arcadeRoof(arc, uMin, uMax, depth, depth * 2, H + 0.1, far);
  yield;
  const posts = [];
  for (let u = uMin + 1; u < uMax; u += bayW)
    for (const v of [depth + 0.35, depth * 2 - 0.35]) posts.push(box(0.1, H + 0.1, 0.1, u, 0, v));
  walls.forEach((parts, k) => parts.length && g.add(merged(parts, mat(TOWN.walls[k]))));
  g.add(merged(trims, mat('#8c939b')));
  g.add(merged(panes, glass, { cast: false }));
  yield;
  if (shutters.length) g.add(merged(shutters, mat('#9ba1a8', { roughness: 0.6 })));
  g.add(merged(plant, mat('#a3a9b0')));
  awnings.forEach((parts, k) => parts.length && g.add(merged(parts, mat(AWN[k]))));
  g.add(merged(posts, mat(PAL.dark)));
  yield;
  // the named shops' signs: a board over their bays on the front, and a projecting sign over the arcade at the
  // door bay's west pier, its kana stacked, read from up and down the street
  const signs = signSet(),
    face = { north: [depth, 1], south: [depth * 2, -1] };
  for (const {
    row,
    bays: [i0, i1],
    door,
    sign,
    tag,
  } of shops) {
    if (uOf(i1 + 1) <= from || uOf(i0) >= to) continue;
    const [v, n] = face[row],
      w = Math.min(3.0 + (i1 - i0) * 2, (i1 - i0 + 1) * bayW - 0.6);
    const at = [(uOf(i0) + uOf(i1 + 1)) / 2, storeyH + 0.36, v + n * 0.08];
    signs.board(sign[0], sign[1], sign[2], w, 0.66, at, n > 0 ? 0 : Math.PI);
    const pu = uOf(door) + 0.2;
    signs.upright(tag, sign[2], 0.62, 1.5, [pu, storeyH + 0.95, v + n * 0.62], Math.PI / 2);
    top.box(PAL.dark, 0.08, 1.62, 0.7, pu, storeyH + 0.14, v + n * 0.62); // the board's edge, between its faces
    top.box(PAL.dark, 0.05, 0.05, 0.32, pu, storeyH + 1.72, v + n * 0.16); // the bracket off the wall
  }
  top.build(g);
  yield;
  const onFar = (tag) => (m, i) => {
    m.name = `shops:${tag}${i}`; // named: the place's merge pass leaves it as it is
    if (farLayer === null) return;
    m.layers.set(farLayer);
    m.userData.noBatch = true;
  };
  far.build(g).forEach(onFar('far'));
  const arcade = arc.build(g);
  arcade.forEach(onFar('arcade'));
  yield;
  const lit = signs.build(g);
  return { glass, group: g, signs: lit, arcade };
}
