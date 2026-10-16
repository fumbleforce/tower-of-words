// The lift's car (places/lift.js runs the ride): a small lit room behind the landing doors, the same car in the lobby
// and on B2, built here so the doorway checks (game3d/test/unit/doorway-clearance.test.mjs) can build it without the
// game. The car's doorway is a walkable doorway, as high as movement/clearance.js asks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { textTexture } from '../props.js';
import { lightPool } from './life.js';
import { clipLiftMaterial } from './lift-materials.js';
import { planes } from './lift-cut.js';
import { indicatorMat, copMat } from './lift-displays.js';
import { doorHeight, PEOPLE_SCALE } from '../movement/clearance.js';

// ---------- the car, in its own space: x 0 is the door's centre, z 0 the back face of the landing wall ----------
export const DW = 1.0,
  DH = doorHeight(PEOPLE_SCALE); // door opening, a walkable doorway
export const W = 1.44,
  D = 1.55,
  H = DH + 0.2,
  T = 0.05; // inside width and depth, wall height (a transom over the doors), wall thickness
// car door leaves: closed centres (x from the middle) and depth for the fast (0) and slow (1) leaf of each side;
// open, the fast one travels DW/2 and the slow one DW/4, both ending over the front panel (DW/2 .. W/2+T)
// (the fast leaves meet at the middle; the slow one overlaps the fast one's outer edge from behind)
export const LEAF_WS = [DW / 4, DW / 4 + 0.02],
  LEAF_X = [DW / 8, (3 * DW) / 8 - 0.01],
  LEAF_Z = [-0.011, -0.03],
  LEAF_OPEN = DW / 2 + 0.13;
export const LEAF_RUN = LEAF_X.map((x) => LEAF_OPEN - x);
export const ZF = -0.09,
  ZB = ZF - D; // inside faces of the front and back walls
export const SILL_Z = 0.125; // the car floor's front edge, where the landing's sill starts

// own materials (not props.js's shared cache: the front of the car gets the cutaway clip planes, and nothing
// else in the car may share a material with the places' walls)
const mats = new Map();
function M(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o }));
  return mats.get(k);
}
function box(w, h, d, m, x = 0, y = 0, z = 0, r = 0.01, cast = true) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)),
    m,
  );
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  return mesh;
}
function rod(len, r, m, axis) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), m);
  if (axis === 'x') c.rotation.z = Math.PI / 2;
  else if (axis === 'z') c.rotation.x = Math.PI / 2;
  c.castShadow = true;
  return c;
}

let _mirrorTex = null;
function mirrorMat() {
  if (!_mirrorTex) {
    _mirrorTex = textTexture(
      (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, h);
        gr.addColorStop(0, '#c9d2dc');
        gr.addColorStop(0.55, '#aab4c0');
        gr.addColorStop(1, '#8f99a6');
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        // two soft diagonal highlights, so it reads as glass
        g.globalAlpha = 0.35;
        g.fillStyle = '#eef3f8';
        for (const [x0, ww] of [
          [0.18, 0.1],
          [0.36, 0.04],
        ]) {
          g.beginPath();
          g.moveTo(w * x0, 0);
          g.lineTo(w * (x0 + ww), 0);
          g.lineTo(w * (x0 + ww - 0.3), h);
          g.lineTo(w * (x0 - 0.3), h);
          g.closePath();
          g.fill();
        }
        g.globalAlpha = 1;
      },
      256,
      192,
    );
  }
  return new THREE.MeshStandardMaterial({
    map: _mirrorTex,
    roughness: 0.15,
    metalness: 0.35,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: _mirrorTex,
    emissiveIntensity: 0.18,
  });
}

export function buildCar(site) {
  const g = new THREE.Group();
  const wallM = M('#a9aeb5', {
    roughness: 0.42,
    metalness: 0.25,
    emissive: new THREE.Color('#e9e2d6'),
    emissiveIntensity: 0.07,
  });
  const seamM = M('#7d838c', { roughness: 0.5 });
  const kickM = M('#5c626b', { roughness: 0.55 });
  const floorM = M('#5f6570', { roughness: 0.85 });
  const inlayM = M('#9aa0a8', { roughness: 0.4, metalness: 0.3 });
  const railM = M('#d3d7dc', { roughness: 0.25, metalness: 0.7 });
  const shaftM = M('#2b2f36', { roughness: 0.95 });
  const zc = (ZF + ZB) / 2;
  // floor, with a pale inlay border and the door sill
  // (the floor runs forward under the landing wall to meet the landing's sill: no dark gap across the doorway)
  g.add(box(W + 2 * T, 0.02, (ZB - T) * -1 + SILL_Z, floorM, 0, 0, (ZB - T + SILL_Z) / 2, 0.004, false));
  for (const [w, d, x, z] of [
    [W - 0.12, 0.03, 0, ZB + 0.08],
    [W - 0.12, 0.03, 0, ZF - 0.08],
    [0.03, D - 0.16, -W / 2 + 0.06, zc],
    [0.03, D - 0.16, W / 2 - 0.06, zc],
  ])
    g.add(box(w, 0.004, d, inlayM, x, 0.02, z, 0.002, false));
  g.add(box(DW, 0.006, SILL_Z - ZF + 0.03, inlayM, 0, 0.02, (ZF - 0.03 + SILL_Z) / 2, 0.002, false)); // the car's sill, one strip across the doorway
  // back wall: stainless panels, a mirror across the middle, a handrail, the floor display above the mirror
  g.add(box(W + 2 * T, H, T, wallM, 0, 0, ZB - T / 2));
  g.add(box(W, 0.12, 0.012, kickM, 0, 0, ZB + 0.006, 0.004, false));
  for (const x of [-0.46, 0.46]) g.add(box(0.012, H - 0.14, 0.008, seamM, x, 0.12, ZB + 0.004, 0.003, false));
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.66), mirrorMat());
  mirror.position.set(0, 0.98, ZB + 0.006);
  g.add(mirror);
  g.add(
    box(0.84, 0.02, 0.012, seamM, 0, 0.64, ZB + 0.004, 0.004, false),
    box(0.84, 0.02, 0.012, seamM, 0, 1.31, ZB + 0.004, 0.004, false),
  );
  const backInd = indicatorMat();
  {
    g.add(box(0.36, 0.14, 0.02, M('#23262c'), 0, 1.37, ZB + 0.01, 0.01, false));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.11), backInd);
    p.position.set(0, 1.44, ZB + 0.022);
    g.add(p);
  }
  {
    const r = rod(W - 0.2, 0.017, railM, 'x');
    r.position.set(0, 0.5, ZB + 0.06);
    g.add(r);
    for (const x of [-0.5, 0.5]) g.add(box(0.03, 0.03, 0.06, railM, x, 0.485, ZB + 0.03, 0.008, false));
  }
  // side walls, with a seam and a handrail each
  for (const s of [-1, 1]) {
    g.add(box(T, H, D, wallM, s * (W / 2 + T / 2), 0, zc));
    g.add(box(0.012, 0.12, D, kickM, s * (W / 2 - 0.006), 0, zc, 0.004, false));
    g.add(box(0.008, H - 0.14, 0.012, seamM, s * (W / 2 - 0.004), 0.12, zc, 0.003, false));
    const r = rod(D - 0.45, 0.017, railM, 'z');
    r.position.set(s * (W / 2 - 0.06), 0.5, zc - 0.12);
    g.add(r);
    for (const z of [ZB + 0.12, ZF - 0.36])
      g.add(box(0.06, 0.03, 0.03, railM, s * (W / 2 - 0.03), 0.485, z, 0.008, false));
  }
  // button panel on the right wall by the door, facing into the car
  const cop = copMat();
  {
    const p = box(
      0.02,
      0.5,
      0.17,
      M('#8d939b', { roughness: 0.4, metalness: 0.3 }),
      W / 2 - 0.012,
      0.56,
      ZF - 0.2,
      0.006,
      false,
    );
    g.add(p);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.48), cop);
    f.rotation.y = -Math.PI / 2;
    f.position.set(W / 2 - 0.023, 0.81, ZF - 0.2);
    g.add(f);
  }
  // front wall (cut away while he's inside): two narrow panels, the transom, and the car doors
  const frontM = new THREE.MeshStandardMaterial({
    color: '#9ea3aa',
    roughness: 0.42,
    metalness: 0.25,
    emissive: new THREE.Color('#e9e2d6'),
    emissiveIntensity: 0.06,
  });
  const leafM = new THREE.MeshStandardMaterial({ color: '#b3b8bf', roughness: 0.35, metalness: 0.35 });
  const leafSeamM = new THREE.MeshStandardMaterial({ color: '#7d838c', roughness: 0.5 });
  const front = new THREE.Group();
  const pw = W / 2 + T - DW / 2;
  for (const s of [-1, 1]) front.add(box(pw, H, T, frontM, s * (DW / 2 + pw / 2), 0, ZF - T / 2 + T, 0.006));
  front.add(box(W + 2 * T, H - DH, T, frontM, 0, DH, ZF + T / 2, 0.006));
  // the car doors: two-speed, two leaves a side (a fast one at the middle, a slow one behind it), so when open
  // both stack behind the narrow front panels and never poke out past the car's sides into the shaft
  const leaves = [];
  for (const s of [-1, 1])
    for (const [i, z] of [
      [0, LEAF_Z[0]],
      [1, LEAF_Z[1]],
    ]) {
      const l = box(LEAF_WS[i], DH, 0.018, leafM, s * LEAF_X[i], 0, z, 0.004);
      if (i === 0)
        l.add(box(0.008, DH - 0.06, 0.02, leafSeamM, -s * (LEAF_WS[0] / 2 - 0.004), -DH / 2 + 0.03, 0, 0.002, false));
      l.castShadow = false; // cut to the wall's cut height while he's inside, but a shadow would still be full height
      l.userData.door = { s, i };
      front.add(l);
      leaves.push(l);
    }
  g.add(front);
  // the shaft around the car (dark), so nothing shows through past the car's sides
  const sh = site.wallH;
  // (on B2 the stairwell is on the left, so there the shaft is just the back and the pit)
  const sw = site.shaft ? W + 2 * T + 0.9 : W + 2 * T + 0.08;
  g.add(box(sw, sh, 0.08, shaftM, 0, -0.02, ZB - T - 0.16, 0.01, false));
  if (site.shaft)
    for (const s of [-1, 1])
      g.add(box(0.08, sh, D + 0.3, shaftM, s * (W / 2 + T + 0.45), -0.02, zc - 0.05, 0.01, false));
  g.add(box(sw + 0.08, 0.01, D + 0.5, M('#23262c', { roughness: 1 }), 0, -0.012, zc - 0.05, 0.003, false));
  // its own light: warm-white from above (no fixture: the car has no ceiling in this view)
  const lamp = new THREE.PointLight('#fff1de', 2.6, 2.8, 1.6);
  lamp.position.set(0, 1.45, zc + 0.05);
  g.add(lamp);
  // and a soft one just inside the doors, high up, so faces turned to the doors aren't in their own shadow
  const fill = new THREE.PointLight('#ffeedd', 1.6, 3.0, 1.6);
  fill.position.set(0, 1.8, ZF + 0.25);
  g.add(fill);
  const pool = lightPool(0, zc, 0.62, { color: '#fff0d8', k: 0.22, sx: 1.05, sz: 1.05, y: 0.026 });
  g.add(pool);
  // a landing outside, for stops on other floors: lit floor in front of the doors (only while the doors are open
  // there), wide enough for the Sales pair to walk out along it both ways (EXITS) before the dark takes them
  const landing = new THREE.Group();
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 1.15),
    new THREE.MeshStandardMaterial({ color: '#7d8698', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.03, site.zFront - site.zBack + 0.62); // over the lobby's runner and guide line
  carpet.receiveShadow = true;
  landing.add(carpet);
  const spill = lightPool(0, site.zFront - site.zBack + 0.5, 0.8, {
    color: '#ffe3bd',
    k: 0.3,
    sx: 1.2,
    sz: 1.0,
    y: 0.034,
  });
  landing.add(spill);
  const landLamp = new THREE.PointLight('#ffe2bd', 0, 3.0, 1.6);
  landLamp.position.set(0, 1.2, site.zFront - site.zBack + 0.5);
  g.add(landLamp); // not in `landing`: a light coming and going changes every shader's light count (a mid-ride recompile)
  landing.visible = false;
  g.add(landing);
  // at a landing with a tall wall (the lobby), a floor display over the landing doors: it counts the car in
  let hallInd = null;
  if (site.wallH > 1.8) {
    hallInd = indicatorMat();
    const hz = site.zFront - site.zBack;
    g.add(box(0.36, 0.14, 0.02, M('#23262c'), 0, DH + 0.1, hz - 6e-3, 0.01, false));
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.11), hallInd);
    p.position.set(0, DH + 0.17, hz + 0.012);
    g.add(p);
    hallInd.userData.meshes = [p, g.children[g.children.length - 2]];
  }
  // the lid: in the lobby the car sits behind a tall wall; from the lobby's own camera nothing of it should show
  // above the wall, so a lid in the room's background colour covers it until the ride begins
  let cap = null;
  if (site.cap) {
    cap = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 2 * T + 1.3, D + 0.9),
      new THREE.MeshBasicMaterial({ color: '#000', toneMapped: false, transparent: true, depthWrite: true }),
    );
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(0, site.wallH + 0.004, zc - 0.1);
    cap.renderOrder = 3;
    g.add(cap);
  }
  clipLiftMaterial(frontM, planes);
  clipLiftMaterial(leafM, planes);
  clipLiftMaterial(leafSeamM, planes);
  g.position.set(site.x, 0, site.zBack);
  return {
    g,
    leaves,
    front,
    backInd,
    hallInd,
    cop,
    lamp,
    pool,
    landing,
    landLamp,
    spill,
    cap,
    k: 0,
    want: 0,
    land: 0,
    landWant: 0,
  };
}
