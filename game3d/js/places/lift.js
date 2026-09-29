// The lift: a small lit room behind the lift doors, built the same in the lobby (floor 1) and on B2, so the
// ride is watched from inside the car the whole way (Jørgen: "You should always be seeing your character. Ideally
// you'd have the elevator as a room in the lobby you go into.").
//
// How a ride goes: Eric walks up, the landing doors and the car doors open, the camera eases in on the car and he
// walks inside. As he crosses the threshold, the wall in front of the car drops to a low cut (the cutaway the
// office's near walls use) and the lights outside go down, so the car reads as a lit room with everyone in it.
// The ride's story steps run with the floor counting on the car's displays; at 5 the doors open onto a lit
// landing and the Sales pair walk out. At B2 the game changes place: both places show this same car in the dark
// from the same camera, so the crossfade between them is invisible. On B2 the lights come up, the doors open, he
// walks out, the wall rises again behind him and the camera eases back to the floor.
//
// Wiring (the builder): attachLift(game, place) once per place, after the place is built (prepare() in main.js).
// It adds the car to the lobby and to the office, and takes over the lobby's tripOut and the office's tripIn.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { textTexture, JP_FONT } from '../props.js';
import { PEOPLE, idle } from '../cast.js';
import { walkPerson } from '../story.js';
import { blob } from '../engine.js';
import { ui, sfx } from '../ui.js';
import { lightPool } from './life.js';
import { glide, withList } from './lobby.js';
import { K } from '../scenes/office.js';
import { clipLiftMaterial, isolateLiftMaterials } from './lift-materials.js';

// ---------- where the lift is in each place ----------
// x: the door's centre; zBack: the back face of the wall the doors are in (the car starts here); zFront: just in
// front of the landing's frame and indicator; hole: the doorway in that wall; wallH: that wall's height;
// floor: the floor the place is on; out: where he stands outside the doors.
const SITES = {
  office: { x: -5.45, zBack: -3.48, zFront: -3.22, hole: [-5.95, -4.95], wallH: 1.45, floor: 'B2', out: [-5.45, -2.4] },
};
const FLOORS = ['B2', 'B1', '1', '2', '3', '4', '5'];

// ---------- the car, in its own space: x 0 is the door's centre, z 0 the back face of the landing wall ----------
const W = 1.44,
  D = 1.55,
  H = 1.55,
  T = 0.05; // inside width and depth, wall height, wall thickness
const DW = 1.0,
  DH = 1.34; // door opening
// car door leaves: closed centres (x from the middle) and depth for the fast (0) and slow (1) leaf of each side;
// open, the fast one travels DW/2 and the slow one DW/4, both ending over the front panel (DW/2 .. W/2+T)
// (the fast leaves meet at the middle; the slow one overlaps the fast one's outer edge from behind)
const LEAF_WS = [DW / 4, DW / 4 + 0.02],
  LEAF_X = [DW / 8, (3 * DW) / 8 - 0.01],
  LEAF_Z = [-0.011, -0.03],
  LEAF_OPEN = DW / 2 + 0.13;
const LEAF_RUN = LEAF_X.map((x) => LEAF_OPEN - x);
const ZF = -0.09,
  ZB = ZF - D; // inside faces of the front and back walls
const SILL_Z = 0.125; // the car floor's front edge, where the landing's sill starts
const CUT = 0.5; // the front wall's height while he's inside (cutaway)
const RIDE_ELEV = 50; // camera elevation for the ride, the same in both places
const DARK = 0.4; // how much of a place's own light stays on during the ride (dimmed, not black: QA round 1)
const DARK_BG = new THREE.Color('#14171d'),
  BG_K = 0.45; // the background goes this far toward DARK_BG
// where people stand in the car (x, z in car space), all facing the doors
const SLOTS = {
  eric: [0, -0.42],
  sales1: [-0.47, -1.3],
  sales2: [0.47, -1.33],
  with0: [0.47, -0.8],
  with1: [-0.47, -0.8],
  aside: [-0.49, -0.5],
};
// the way out at another floor (car space): both along the right, well clear of him in the front left corner
// the second one sets off only once the first is out on the landing and turning away (not on a timer: at test
// speed a timer let them bunch up)
const EXITS = {
  sales2: {
    pts: [
      [0.3, -0.95],
      [0.28, -0.1],
      [0.28, 0.5],
      [2.3, 0.6],
    ],
  },
  sales1: {
    after: 'sales2',
    pts: [
      [-0.1, -1.1],
      [0.22, -0.95],
      [0.3, -0.1],
      [0.28, 0.5],
      [-2.3, 0.6],
    ],
  },
};
// the two from Sales who ride up to 5 (they're in the car when it arrives at 1)
const RIDERS = [
  { id: 'sales1', worker: 9, off: '5' },
  { id: 'sales2', worker: 1, off: '5' },
]; // grey-haired man in a light jacket; woman with long brown hair

// the ride's state, shared by both places (the lobby starts it, the office finishes it)
const ride = { on: false, aboard: new Set(), lit: new Set(), dir: 'up', floor: '1', pendingOpen: false };

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

// the clip planes that cut the wall in front of the car (world space; clipIntersection: only the box is cut)
const planes = [
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 999),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
];
function clipBox(site, cut) {
  const x0 = Math.min(site.x - W / 2 - T, site.hole[0] - 0.1) - 0.02,
    x1 = Math.max(site.x + W / 2 + T, site.hole[1] + 0.1) + 0.02;
  planes[0].constant = cut;
  planes[1].constant = x0;
  planes[2].constant = -x1;
  planes[3].constant = site.zBack + ZF - T - 0.02;
  planes[4].constant = -(site.zFront + 0.02);
}
// ---------- displays ----------
function drawIndicator(g, W2, H2, floor, dir, moving) {
  g.fillStyle = '#16181d';
  g.fillRect(0, 0, W2, H2);
  g.fillStyle = '#ffb45e';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.font = `700 ${Math.round(H2 * 0.62)}px sans-serif`;
  g.fillText(floor, W2 * 0.62, H2 / 2 + 2);
  g.globalAlpha = moving ? 1 : 0.28;
  g.font = `700 ${Math.round(H2 * 0.42)}px sans-serif`;
  g.fillText(dir === 'down' ? '▼' : '▲', W2 * 0.24, H2 / 2 + 2);
  g.globalAlpha = 1;
}
function indicatorMat() {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 80;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  m.userData.draw = (floor, dir, moving) => {
    drawIndicator(c.getContext('2d'), c.width, c.height, floor, dir, moving);
    tex.needsUpdate = true;
  };
  m.userData.draw('1', 'up', false);
  return m;
}
// the button panel: a floor readout at the top, then the floor buttons and open/close; pressed ones lit
const COP_BTNS = [
  ['5', '4'],
  ['3', '2'],
  ['1', 'B1'],
  ['B2', ''],
];
function copMat() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 384;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.4,
    metalness: 0.3,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: tex,
    emissiveIntensity: 0.35,
  });
  m.userData.draw = (floor, dir, moving, lit) => {
    const g = c.getContext('2d');
    g.fillStyle = '#9aa0a8';
    g.fillRect(0, 0, 128, 384);
    g.fillStyle = '#8a9098';
    g.fillRect(6, 6, 116, 372);
    // readout
    g.save();
    g.translate(14, 16);
    drawIndicator(g, 100, 46, floor, dir, moving);
    g.restore();
    COP_BTNS.forEach((row, i) =>
      row.forEach((lab, j) => {
        if (!lab) return;
        const x = 38 + j * 52,
          y = 104 + i * 58,
          on = lit.has(lab);
        g.beginPath();
        g.arc(x, y, 19, 0, Math.PI * 2);
        g.fillStyle = on ? '#3a2a18' : '#5d636c';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = on ? '#ffb45e' : '#c3c8cf';
        g.stroke();
        g.fillStyle = on ? '#ffcf8f' : '#eef0f3';
        g.font = '700 17px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(lab, x, y + 1);
      }),
    );
    // open and close
    for (const [x, s] of [
      [38, '◀|▶'],
      [90, '▶|◀'],
    ]) {
      g.beginPath();
      g.arc(x, 342, 19, 0, Math.PI * 2);
      g.fillStyle = '#5d636c';
      g.fill();
      g.fillStyle = '#eef0f3';
      g.font = '700 11px sans-serif';
      g.fillText(s, x, 343);
    }
    tex.needsUpdate = true;
  };
  m.userData.draw('1', 'up', false, new Set());
  return m;
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

function buildCar(site) {
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
  // a landing outside, for stops on other floors: lit floor in front of the doors (only while the doors are open there)
  const landing = new THREE.Group();
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.15),
    new THREE.MeshStandardMaterial({ color: '#7d8698', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.012, site.zFront - site.zBack + 0.62);
  carpet.receiveShadow = true;
  landing.add(carpet);
  const spill = lightPool(0, site.zFront - site.zBack + 0.5, 0.8, {
    color: '#ffe3bd',
    k: 0.3,
    sx: 1.2,
    sz: 1.0,
    y: 0.016,
  });
  landing.add(spill);
  const landLamp = new THREE.PointLight('#ffe2bd', 0, 3.0, 1.6);
  landLamp.position.set(0, 1.2, site.zFront - site.zBack + 0.5);
  landing.add(landLamp);
  landing.visible = false;
  g.add(landing);
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

// ---------- small timing helpers (game time: they follow the time scale, hurry and pause) ----------
function anim(game, secs, fn) {
  return new Promise((res) => {
    let t = 0,
      last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!game.paused) t += Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
      last = now;
      const k = Math.min(1, t / secs);
      fn(k * k * (3 - 2 * k));
      if (k >= 1) res();
      else requestAnimationFrame(tick);
    };
    tick();
  });
}
const lerp = (a, b, k) => a + (b - a) * k;
// wait until the car doors (and this landing's doors, when the car is at this place's floor) are open, so nobody
// walks through a leaf; capped, so a stalled frame loop can't hold the story up
async function doorsOpen(game, L, at = 0.96) {
  const land = L.place.liftLanding,
    here = () => (game.liftFloor || L.site.floor) === L.site.floor;
  for (let i = 0; i < 60; i++) {
    if (L.car.k >= at && (!land || !here() || land.k() >= at)) return;
    await game.wait(50);
  }
}

// ---------- one place's lift ----------
const cars = new Map(); // place -> lift
let looping = false;

export function attachLift(game, place) {
  const site = place.liftSite || SITES[place.name];
  if (!site || cars.has(place)) return;
  game.renderer.localClippingEnabled = true;
  hookDoors(game);
  const car = buildCar(site);
  place.space.add(car.g);
  // the place's own stand-in car behind the doors goes (the world agent is asked to remove it; until then, hide it)
  place.space.traverse((o) => {
    if (!o.isGroup || o === car.g) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    if (place.name === 'office' && Math.abs(p.x - site.x) < 0.02 && Math.abs(p.z + 3.975) < 0.03) o.visible = false;
    // the office stairwell runs into the car's left side: narrow it to x -6.75..-6.25
    if (place.name === 'office' && Math.abs(p.x + 6.42) < 0.02 && Math.abs(p.z + 4.0) < 0.02 && !o.userData.liftFit) {
      o.userData.liftFit = true;
      o.scale.x = 0.5 / 1.1;
      o.position.x -= 0.08;
    }
  });
  // everything in front of the car that the cut takes down: the wall above the doors, the landing doors and frame
  clipBox(site, CUT);
  const bx = new THREE.Box3(),
    x0 = planes[1].constant,
    x1 = -planes[2].constant,
    z0 = planes[3].constant,
    z1 = -planes[4].constant;
  const hide = [];
  const clipMesh = isolateLiftMaterials(place, planes);
  const people = new Set();
  for (const r of Object.values(place.people || {})) r && r.root && r.root.traverse((o) => people.add(o));
  place.space.updateMatrixWorld(true);
  place.space.traverse((o) => {
    if (!o.isMesh || people.has(o)) return;
    let q = o;
    while (q) {
      if (q === car.g) return;
      q = q.parent;
    }
    bx.setFromObject(o);
    if (bx.max.y < CUT + 0.03 || bx.max.x < x0 || bx.min.x > x1 || bx.max.z < z0 || bx.min.z > z1) return;
    const inside = (Math.min(bx.max.x, x1) - Math.max(bx.min.x, x0)) / Math.max(1e-3, bx.max.x - bx.min.x);
    // the 本社 sign and the B2 plate reach in a little: they stay whole, and step out while the wall is down
    if (inside < 0.5) {
      if (inside > 0.02) hide.push(o);
      return;
    }
    clipMesh(o);
  });
  clipBox(site, 999);
  // the cut's top face over the dropped wall, in the walls' top colour, like every cut wall in the office: one
  // piece each side of the doorway (never across it: people walk through there)
  const cutCap = new THREE.Group(),
    capM = new THREE.MeshStandardMaterial({ color: '#a3a9b3', roughness: 0.8 });
  for (const [a, b] of [
    [x0 + 0.02, site.x - DW / 2],
    [site.x + DW / 2, x1 - 0.02],
  ]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.014, z1 - z0), capM);
    m.position.set((a + b) / 2, CUT - 0.007, (z0 + z1) / 2);
    m.receiveShadow = true;
    cutCap.add(m);
  }
  cutCap.visible = false;
  place.space.add(cutCap);

  // riders: the Sales pair (chibi office workers), hidden until the ride
  const riders = RIDERS.map((d) => {
    const r = PEOPLE.worker(d.worker);
    r.root.scale.multiplyScalar(K);
    r.root.visible = false;
    const b = blob(0.5, 0.35);
    b.visible = false;
    r.blob = b;
    place.space.add(r.root, b);
    place.people[d.id] = r;
    return { ...d, r };
  });
  const L = {
    place,
    site,
    car,
    riders,
    hide,
    cutCap,
    cam: place.cam,
    elev0: place.cam ? place.cam.elev : 0,
    dark: 0,
    cut: 999,
    cap: 1,
    base: null,
  };
  cars.set(place, L);
  setCap(L, 1);
  // the car is in the place from the start; its lid hides it in the lobby
  if (place.name === 'forecourt') {
    place.tripOut = (g, slot) => rideOut(g, L, slot);
  }
  if (place.name === 'office') {
    place.tripIn = (g, slot) => rideIn(g, L, slot);
  }
  if (!looping) {
    looping = true;
    loop(game);
  }
  window.__lift = { cars, ride, state: (name) => capState(game, name) };
  return L;
}

// the per-frame part: doors easing, people walking, displays, the dim, the cut
function loop(game) {
  let last = performance.now(),
    t = 0,
    shown = '';
  const tick = () => {
    const now = performance.now(),
      dt = game.paused ? 0 : Math.min(0.05, (now - last) / 1000) * (game.timeScale || 1);
    last = now;
    t += dt;
    const L = cars.get(game.place);
    // the car's own displays show the floor; the HUD floor chip would sit on the riders' heads on a phone
    if (ride.on) {
      const hud = document.getElementById('liftInd');
      if (hud && !hud.hidden) hud.hidden = true;
    }
    if (L) {
      const c = L.car;
      c.k += (c.want - c.k) * Math.min(1, dt * 4.5);
      for (const l of c.leaves) {
        const { s, i } = l.userData.door;
        l.position.x = s * (LEAF_X[i] + c.k * LEAF_RUN[i]);
      }
      c.land += (c.landWant - c.land) * Math.min(1, dt * 5);
      c.landing.visible = c.land > 0.01;
      c.landLamp.intensity = 2.2 * c.land;
      c.spill.material.opacity = c.land;
      for (const rd of L.riders) {
        const r = rd.r;
        if (!r._walk && r.root.visible && rd.turn != null)
          r.root.rotation.y += (rd.turn - r.root.rotation.y) * Math.min(1, dt * 5);
        if (r._walk) {
          r._walk(dt);
          r.blob.position.set(r.root.position.x, 0.004, r.root.position.z);
        } else if (r.root.visible) idle(r, t + (rd.worker % 5));
      }
      // the displays follow the engine's floor count (hooks.floor in main.js)
      const f = game.liftFloor || L.site.floor;
      if (f !== ride.floor) {
        if (!ride.moving) ride.dir = FLOORS.indexOf(f) < FLOORS.indexOf(ride.floor) ? 'down' : 'up';
        ride.floor = f;
        ride.movedAt = now;
      }
      const moving = ride.on && (ride.moving || now - (ride.movedAt || 0) < 900);
      const key = f + ride.dir + moving + [...ride.lit].join();
      if (key !== shown) {
        shown = key;
        c.backInd.userData.draw(f, ride.dir, moving);
        c.cop.userData.draw(f, ride.dir, moving, ride.lit);
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
}

// light and background: k 0 = the place as built, 1 = the ride's dim
function setDark(L, k) {
  const sc = L.place.scene;
  if (!L.base) {
    L.base = [];
    sc.traverse((o) => {
      if (o.isLight && !isOurs(L, o)) L.base.push([o, o.intensity]);
    });
    L.bg = sc.background ? sc.background.clone() : null;
  }
  for (const [o, i] of L.base) o.intensity = i * lerp(1, DARK, k);
  // the additive light pools on the floors (life.js) are painted light: they dim with the rest
  if (!L.pools) {
    L.pools = [];
    sc.traverse((o) => {
      if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending && !isOurs(L, o))
        L.pools.push([o.material, o.material.opacity]);
    });
  }
  for (const [m, a] of L.pools) m.opacity = a * lerp(1, DARK, k);
  if (L.bg) sc.background = L.bg.clone().lerp(DARK_BG, k * BG_K);
  L.dark = k;
}
function isOurs(L, o) {
  let q = o;
  while (q) {
    if (q === L.car.g) return true;
    q = q.parent;
  }
  return false;
}
function setCut(L, h) {
  const prev = L.cut;
  L.cut = h;
  clipBox(L.site, h);
  L.cutCap.visible = h < CUT + 0.01;
  // the landing's own doors: while the wall is cut away only the car's doors show (one pair of doors, not two
  // stacked plates; at other floors the car has left this landing anyway). They're open whenever the cut starts.
  const land = L.place.liftLanding;
  if (land) for (const o of land.leaves) o.visible = h >= L.site.wallH;
  // signs half over the car go as the wall starts down and come back as it starts up
  const down = h < prev ? h < L.site.wallH : h <= CUT + 0.01;
  for (const o of L.hide) {
    if (down && o.visible) {
      o.visible = false;
      o.userData.liftHid = true;
    } else if (!down && o.userData.liftHid) {
      o.visible = true;
      o.userData.liftHid = false;
    }
  }
}
function setCap(L, k) {
  const cap = L.car.cap;
  if (!cap) return;
  if (L.place.scene.background) cap.material.color.copy(L.place.scene.background);
  cap.material.opacity = k;
  cap.visible = k > 0.01;
  L.cap = k;
}

// camera: the same shot of the car in both places (same elevation, target and distance)
function rideShot(L) {
  const cam = L.cam,
    asp = cam.camera.aspect,
    phone = asp < 0.9;
  const dist = phone ? 11.0 : 9.0;
  const lead = phone ? 1.25 : 0.5;
  return { at: [L.site.x, L.site.zBack + (ZF + ZB) / 2 + lead], zoom: cam.fitDist / dist, y: 0.55 };
}
function shootRide(L, { snap = false } = {}) {
  const s = rideShot(L),
    cam = L.cam;
  cam.closeOn(s.at, s.zoom, s.y);
  if (snap) {
    cam.elev = THREE.MathUtils.degToRad(RIDE_ELEV);
    cam.snap();
  }
}
function elevTo(game, L, deg, secs) {
  const cam = L.cam,
    a = cam.elev,
    b = THREE.MathUtils.degToRad(deg);
  return anim(game, secs, (k) => {
    cam.elev = lerp(a, b, k);
  });
}

const slotW = (L, key) => [L.site.x + SLOTS[key][0], L.site.zBack + SLOTS[key][1]];
function turnTo(game, root, ry, secs = 0.35) {
  const a = root.rotation.y;
  let d = ry - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return anim(game, secs, (k) => {
    root.rotation.y = a + d * k;
    if (game.walker && root === game.player.root) game.walker.facing = root.rotation.y;
  });
}
function placeRider(L, rd, key) {
  const r = rd.r,
    [x, z] = slotW(L, key || rd.id);
  rd.turn = null;
  r.root.position.set(x, 0, z);
  r.root.rotation.y = 0;
  r.root.visible = true;
  r.blob.visible = true;
  r.blob.position.set(x, 0.004, z);
}

// doors: the engine's liftDoors hook comes here while a ride is on (the car doors, the landing at other floors,
// riders getting off). Everything else keeps the engine's sound.
function hookDoors(game) {
  if (game.hooks.__liftDoors) return;
  const orig = game.hooks.liftDoors;
  game.hooks.__liftDoors = true;
  game.hooks.liftDoors = async (a) => {
    const L = cars.get(game.place);
    if (!L || !ride.on) return orig && orig(a);
    return doors(game, L, a.state);
  };
  // the floor count: the arrow follows where the car is heading (▼ on the way down to B2), set before the first step
  const origFloor = game.hooks.floor;
  game.hooks.floor = async (a) => {
    if (ride.on && a && a.to != null) {
      const i = FLOORS.indexOf(game.liftFloor || '1'),
        j = FLOORS.indexOf(String(a.to));
      if (j >= 0 && j !== i) {
        ride.dir = j < i ? 'down' : 'up';
        ride.moving = true;
      }
    }
    try {
      return await origFloor(a);
    } finally {
      ride.moving = false;
    }
  };
  // who's talking: the other rider turns to the speaker, and the speaker half turns to the listener
  const say = game.ui.say.bind(game.ui);
  game.ui.say = (speaker, text, o = {}) => {
    const L = cars.get(game.place);
    if (L && ride.on) {
      const me = L.riders.find((rd) => rd.id === o.whoId && ride.aboard.has(rd.id));
      for (const rd of L.riders) {
        if (!ride.aboard.has(rd.id) || rd.r._walk) continue;
        const other = L.riders.find((q) => q !== rd && ride.aboard.has(q.id));
        if (me && rd === me && other) {
          rd.r.lookTarget = [other.r.root.position.x, other.r.root.position.z];
          rd.turn = rd.id === 'sales1' ? 0.45 : -0.45;
        } else if (me) {
          rd.r.lookTarget = [me.r.root.position.x, me.r.root.position.z];
          rd.turn = rd.id === 'sales1' ? 0.3 : -0.3;
        }
      }
    }
    return say(speaker, text, o);
  };
}
async function doors(game, L, state) {
  const c = L.car,
    f = game.liftFloor || L.site.floor;
  if (state === 'open') {
    // the destination: its doors open in the next place, after the change of place
    if (f !== L.site.floor && f === 'B2') {
      ride.pendingOpen = true;
      return;
    }
    if (c.want === 1) return;
    ride.lit.delete(f);
    sfx('lift');
    c.want = 1;
    if (f !== L.site.floor) c.landWant = 1;
    await game.wait(650);
    await doorsOpen(game, L);
    // anyone getting off here walks out onto the landing
    const off = L.riders.filter((rd) => rd.off === f && ride.aboard.has(rd.id));
    // he steps aside to the front left corner so they can get by
    const eric = game.player;
    if (off.length) {
      eric.scripted = true;
      eric.setState('walk');
      await glide(game, eric.root, slotW(L, 'aside'), 0.9);
      eric.setState('idle');
      turnTo(game, eric.root, 0.5);
    }
    const out = {}; // id -> resolves when that one is out past the doors
    const walks = [];
    for (const rd of [...off].sort((a, b) => (EXITS[a.id]?.after ? 1 : 0) - (EXITS[b.id]?.after ? 1 : 0))) {
      const r = rd.r,
        e = EXITS[rd.id] || EXITS.sales2;
      r.lookTarget = null;
      rd.turn = null;
      const pts = e.pts.map(([x, z]) => [L.site.x + x, L.site.zBack + z]);
      const go = (e.after && out[e.after]) || Promise.resolve();
      const w = go.then(() => walkPerson(r, pts.slice(0, 3), { speed: 1.1 }));
      out[rd.id] = w;
      walks.push(w.then(() => walkPerson(r, pts.slice(3), { speed: 1.1 })));
    }
    L.leaving = Promise.all(walks).then(() => {
      for (const rd of off) ride.aboard.delete(rd.id);
    });
    await game.wait(900);
    return;
  }
  if (state === 'closed') {
    if (c.want === 0) return;
    if (L.leaving) {
      await L.leaving;
      L.leaving = null;
    }
    sfx('door');
    c.want = 0;
    await game.wait(500);
    c.landWant = 0;
    await game.wait(450);
    for (const rd of L.riders)
      if (!ride.aboard.has(rd.id)) {
        rd.r.root.visible = false;
        rd.r.blob.visible = false;
        rd.r._walk = null;
      }
    // and back to the middle once they're gone
    const eric = game.player,
      [ex, ez] = slotW(L, 'eric');
    if (Math.hypot(eric.root.position.x - ex, eric.root.position.z - ez) > 0.05) {
      eric.setState('walk');
      await glide(game, eric.root, [ex, ez], 0.9);
      eric.setState('idle');
      await turnTo(game, eric.root, 0);
    }
  }
}

// ---------- the lobby side: walk in, the cut and the dim, the ride's lines ----------
async function rideOut(g, L, slot) {
  const eric = g.player,
    P = L.place,
    cam = L.cam;
  g.busyTrip = true;
  // the lobby's commuters use this lift too: anyone already on the way stops coming (they'd walk into the car)
  for (const c of P._commuters || []) {
    c.r.root.visible = false;
    c.b.visible = false;
    c.stage = 'wait';
    c.t = -1e9;
  }
  await g.walkTo(L.site.out[0], L.site.out[1]);
  g.walker.locked = true;
  eric.scripted = true;
  // the car arrives at 1 with the two from Sales already in it (they came up from the car park)
  ride.on = true;
  ride.lit = new Set(['5']);
  ride.floor = g.liftFloor = L.site.floor;
  ride.dir = 'up';
  ride.pendingOpen = false;
  ride.aboard = new Set(RIDERS.map((d) => d.id));
  for (const rd of L.riders) placeRider(L, rd);
  L.riders[0].r.lookTarget = slotW(L, 'sales2');
  L.riders[1].r.lookTarget = slotW(L, 'sales1');
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  shootRide(L);
  elevTo(g, L, RIDE_ELEV, 1.4);
  await g.wait(700);
  await doorsOpen(g, L);
  eric.setState('walk');
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.05], 1.05);
  // across the threshold: the wall in front comes down and the lights outside go down
  const settle = Promise.all([
    anim(g, 0.7, (k) => {
      setCut(L, lerp(L.site.wallH + 0.25, CUT, k));
      setCap(L, 1 - k);
    }),
    anim(g, 1.1, (k) => setDark(L, k)),
  ]);
  const [ex, ez] = slotW(L, 'eric');
  await glide(g, eric.root, [ex, ez], 1.0);
  eric.setState('idle');
  // anyone coming along walks in after him
  const wl = withList(slot);
  await Promise.all(wl.slice(0, 2).map((id, i) => walkIn(g, L, id, 'with' + i)));
  await turnTo(g, eric.root, 0);
  // he presses B2 (5 is already lit)
  await g.wait(250);
  sfx('tap');
  ride.lit.add('B2');
  await settle;
  await g.wait(350);
  P.hooks.liftClose && P.hooks.liftClose();
  sfx('door');
  L.car.want = 0;
  await g.wait(900);
  await g.wait(400);
  const steps = slot.ride || [];
  if (steps.length) {
    await g.runner.steps(steps);
    ui.closeTalk();
  }
  if (g.liftFloor !== 'B2') await g.hooks.floor({ to: 'B2' });
  await g.wait(450);
  // the hand-over: the next place picks up with the same car, the same people aboard, the same shot
  ride.with = wl.slice(0, 2);
}
async function walkIn(g, L, id, key) {
  const r = L.place.people[id];
  if (!r) return;
  const [x, z] = slotW(L, key);
  r.root.visible = true;
  if (r.blob) r.blob.visible = true;
  if (r.meshy) {
    r.setState('walk');
    await glide(g, r.root, [L.site.x, L.site.zFront + 0.1], 1.1);
    await glide(g, r.root, [x, z], 1.0);
    r.setState('idle');
  } else if (r.hips)
    await walkPerson(
      r,
      [
        [L.site.x, L.site.zFront + 0.1],
        [x, z],
      ],
      { speed: 1.1 },
    );
  r.root.rotation.y = 0;
}

// ---------- the office side: same frame, the lights come up, the doors open, out he goes ----------
async function rideIn(g, L, slot) {
  const eric = g.player,
    P = L.place,
    cam = L.cam;
  eric.scripted = true;
  g.busyTrip = true;
  const fresh = !ride.on; // Continue from a save: no ride before this; start in the car at B2
  ride.on = true;
  ride.floor = g.liftFloor = 'B2';
  ride.lit.delete('B2');
  // the frame the lobby ended on: the car in the dark, the front cut, everyone in their place
  setDark(L, 1);
  setCut(L, CUT);
  L.car.want = 0;
  L.car.k = 0;
  const [ex, ez] = slotW(L, 'eric');
  eric.root.position.set(ex, 0, ez);
  eric.root.rotation.y = 0;
  eric.setState('idle');
  g.walker.facing = 0;
  for (const rd of L.riders) if (ride.aboard.has(rd.id)) placeRider(L, rd);
  const wl = (ride.with || []).filter((id) => P.people[id]);
  wl.forEach((id, i) => {
    const r = P.people[id],
      [x, z] = slotW(L, 'with' + i);
    r.root.visible = true;
    if (r.blob) r.blob.visible = true;
    r.root.position.set(x, 0, z);
    r.root.rotation.y = 0;
  });
  shootRide(L, { snap: true });
  await g.wait(fresh ? 300 : 1400); // the crossfade from the lobby's last frame
  // B2: the ding, the lights up, the doors
  sfx('lift');
  await anim(g, 0.9, (k) => setDark(L, 1 - k));
  P.hooks.liftOpen && P.hooks.liftOpen();
  L.car.want = 1;
  ride.pendingOpen = false;
  await g.wait(650);
  await doorsOpen(g, L);
  // out, while the camera eases back to the floor's own view
  cam.release();
  elevTo(g, L, THREE.MathUtils.radToDeg(L.elev0), 1.4);
  eric.setState('walk');
  await glide(g, eric.root, [L.site.x, L.site.zFront + 0.15], 1.1);
  const rise = anim(g, 0.6, (k) => setCut(L, lerp(CUT, L.site.wallH + 0.25, k)));
  const outs = wl.map((id, i) => walkOut(g, L, id, i));
  await glide(g, eric.root, L.site.out, 1.1);
  eric.setState('idle');
  g.walker.facing = 0;
  await turnTo(g, eric.root, 0, 0.2);
  eric.scripted = false;
  await rise;
  setCut(L, 999);
  await Promise.all(outs);
  await g.wait(300);
  P.hooks.liftClose && P.hooks.liftClose();
  L.car.want = 0;
  ride.on = false;
  g.busyTrip = false;
  ride.with = [];
  for (const rd of L.riders) {
    rd.r.root.visible = false;
    rd.r.blob.visible = false;
  }
}
async function walkOut(g, L, id, i) {
  const r = L.place.people[id];
  if (!r) return;
  await g.wait(350 + i * 300);
  const to = [L.site.out[0] + (i ? -0.7 : 0.7), L.site.out[1] + 0.2];
  if (r.meshy) {
    r.setState('walk');
    await glide(g, r.root, [L.site.x, L.site.zFront + 0.15], 1.1);
    await glide(g, r.root, to, 1.1);
    r.setState('idle');
  } else if (r.hips) await walkPerson(r, [[L.site.x, L.site.zFront + 0.15], to], { speed: 1.1 });
}

// ---------- stills for checking (?cap&place=gate&st=...) through window.__lift.state ----------
async function capState(game, name) {
  const L = cars.get(game.place);
  if (!L) return;
  const eric = game.player;
  ride.on = true;
  ride.aboard = new Set(RIDERS.map((d) => d.id));
  ride.lit = new Set(['5', 'B2']);
  if (name === 'open' || name === 'inside' || name === 'ride' || name === 'stop5') {
    for (const rd of L.riders) if (!(name === 'ride' && L.site.floor === 'B2')) placeRider(L, rd);
    L.car.want = L.car.k = name === 'open' || name === 'stop5' ? 1 : 0;
    const [ex, ez] = name === 'open' ? L.site.out : slotW(L, 'eric');
    eric.root.position.set(ex, 0, ez + (name === 'open' ? 0 : 0.05));
    eric.root.rotation.y = name === 'open' ? Math.PI : 0;
    if (name !== 'open') {
      setCut(L, CUT);
      setDark(L, 1);
      setCap(L, 0);
    }
    if (name === 'stop5') {
      game.liftFloor = '5';
      L.car.landWant = L.car.land = 1;
    }
    shootRide(L, { snap: true });
  }
}
