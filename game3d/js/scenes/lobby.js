// Place 2: the company lobby with the security gate (game3d/ref/2-security-gate-muted.png).
// Local space: floor at y = 0, the entrance at +z (near the camera), lifts on the back wall at -z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  PAL,
  mat,
  emissive,
  rbox,
  plant,
  bench,
  wallLamp,
  lampPost,
  door,
  wall,
  tileFloor,
  shadowProxy,
  textTexture,
  plane,
  JP_FONT,
  sh,
} from '../props.js';
import { PEOPLE, sit, armsLap, walkPose, HIP, idle } from '../cast.js';
import { makeCat } from '../creatures/cat.js';
import { blob, Nav } from '../engine.js';
import { K } from './office.js';
import { lightPool, dust, clockHands, groundShadows } from '../places/life.js';
import { drain } from '../perf/slice.js';
import { exitFrame, exitSign, fareMachines, floorMarks, sign, EXIT_X, FARES } from './station-fittings.js';
import { stationFitout, LOCKER_BOUNDS } from './station-fitout.js';
import { countTex } from './gate-count.js';

const X = 6.3,
  Z = 4.5,
  WH = 1.9; // half sizes, wall height

function poster(lines, sky) {
  const tex = textTexture(
    (g, W, H) => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#39414f');
      gr.addColorStop(1, '#232830');
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      // a skyline or hills at the bottom
      g.fillStyle = '#4b5566';
      if (sky === 'city') {
        for (let i = 0; i < 9; i++) {
          const w = 22 + ((i * 13) % 20),
            h = 40 + ((i * 37) % 90);
          g.fillRect(20 + i * 28, H - 30 - h, w, h + 30);
        }
      } else {
        g.beginPath();
        g.moveTo(0, H - 40);
        for (let x = 0; x <= W; x += 16) g.lineTo(x, H - 70 - 40 * Math.sin(x / 50) - 20 * Math.sin(x / 17));
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.fill();
      }
      g.fillStyle = '#c9ced6';
      g.font = '600 30px ' + JP_FONT;
      lines.forEach((l, i) => g.fillText(l, 26, 56 + i * 38));
    },
    300,
    420,
  );
  const grp = new THREE.Group();
  grp.add(rbox(0.86, 1.18, 0.03, PAL.charcoal, { r: 0.01, cast: false }));
  const p = plane(0.8, 1.12, tex);
  p.position.set(0, 0.59, 0.017);
  grp.add(p);
  return grp;
}

function readerPost() {
  const g = new THREE.Group();
  g.add(rbox(0.26, 0.62, 0.3, '#4a4f59', { r: 0.03 }));
  g.add(rbox(0.2, 0.05, 0.24, '#3a3e46', { y: 0.62, r: 0.02 }));
  // the pad on top, angled toward the entrance
  const pad = rbox(0.16, 0.03, 0.16, null, { y: 0.66, r: 0.01, m: mat('#20242b', { roughness: 0.3 }) });
  g.add(pad);
  // status light on the side facing the player
  const light = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ color: '#46d18a' }));
  light.position.set(0, 0.42, 0.152);
  g.add(light);
  const tex = { ok: arrowTex('#46d18a', 'ok'), no: arrowTex('#e0564f', 'no'), idle: arrowTex('#46d18a', 'arrow') };
  light.material.map = tex.idle;
  light.material.color.set('#ffffff');
  g.userData.set = (k) => {
    light.material.map = tex[k];
    light.material.needsUpdate = true;
  };
  return g;
}
function arrowTex(col, kind) {
  return textTexture(
    (g, W, H) => {
      g.fillStyle = '#15181d';
      g.fillRect(0, 0, W, H);
      g.strokeStyle = col;
      g.fillStyle = col;
      g.lineWidth = 12;
      g.lineCap = 'round';
      if (kind === 'arrow') {
        g.beginPath();
        g.moveTo(30, 98);
        g.lineTo(96, 32);
        g.moveTo(52, 32);
        g.lineTo(96, 32);
        g.lineTo(96, 76);
        g.stroke();
      }
      if (kind === 'ok') {
        g.beginPath();
        g.arc(64, 64, 34, 0, Math.PI * 2);
        g.stroke();
      }
      if (kind === 'no') {
        g.beginPath();
        g.moveTo(34, 34);
        g.lineTo(94, 94);
        g.moveTo(94, 34);
        g.lineTo(34, 94);
        g.stroke();
      }
    },
    128,
    128,
  );
}

function arch() {
  const g = new THREE.Group();
  const W = 1.3,
    H = 1.45;
  for (const s of [-1, 1]) {
    g.add(rbox(0.16, H, 0.3, '#8b919c', { x: s * (W / 2), r: 0.03 }));
    const strip = rbox(0.03, H * 0.62, 0.05, null, {
      x: s * (W / 2 - 0.09),
      y: H * 0.22,
      r: 0.012,
      m: emissive('#9fd4ff', '#6ab8ff', 1.4),
      cast: false,
    });
    g.add(strip);
    strip.userData.glow = true;
  }
  g.add(rbox(W + 0.16, 0.2, 0.34, '#7d838e', { y: H, r: 0.04 }));
  const bar = rbox(0.5, 0.04, 0.05, null, {
    y: H - 0.05,
    z: 0.15,
    r: 0.015,
    m: emissive('#9fd4ff', '#6ab8ff', 1.6),
    cast: false,
  });
  g.add(bar);
  g.userData.lights = [];
  g.traverse((o) => {
    if (o.isMesh && o.material.emissive && o.material.emissiveIntensity > 1) g.userData.lights.push(o);
  });
  const glowMats = {
    idle: emissive('#9fd4ff', '#6ab8ff', 1.5),
    ok: emissive('#a8f0c8', '#46d18a', 1.8),
    no: emissive('#ffb3ad', '#e0564f', 2.0),
  };
  g.userData.set = (k) => {
    for (const l of g.userData.lights) l.material = glowMats[k];
  };
  // two glass flaps across the opening, hinged on the posts
  const flapM = new THREE.MeshStandardMaterial({
    color: '#dfeaf1',
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const flaps = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(s * (W / 2 - 0.08), 0, 0);
    const f = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.42, 0.03, 2, 0.012), flapM);
    f.position.set(-s * 0.26, 0.42, 0);
    f.renderOrder = 2;
    const edge = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.03, 0.04, 1, 0.01), mat('#9aa0aa'));
    edge.position.set(-s * 0.26, 0.64, 0);
    hinge.add(f, edge);
    g.add(hinge);
    flaps.push([hinge, s]);
  }
  g.userData.flaps = (k) => {
    for (const [h, s] of flaps) h.rotation.y = ((s * k * Math.PI) / 2) * 0.95;
  };
  // the head count: a small screen on the crossbar, right of the light bar, tipped toward the entrance. The
  // tailgating jam shows the gate counting two (Hamada and his briefcase, story/gate.js bench_wait).
  const cnt = new THREE.Group();
  cnt.position.set(0.44, H + 0.28, 0.02);
  cnt.rotation.x = -0.75;
  cnt.add(rbox(0.36, 0.22, 0.05, '#3a3e46', { y: -0.11, r: 0.015, cast: false }));
  const face = { idle: countTex('#9fd4ff', 1), ok: countTex('#8fe0b4', 1), two: countTex('#ff8f86', 2) };
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.17), new THREE.MeshBasicMaterial({ map: face.idle }));
  scr.position.set(0, 0, 0.027);
  scr.name = 'gate-count';
  scr.userData.noBatch = true;
  cnt.add(scr);
  g.add(cnt);
  g.userData.count = (k) => {
    scr.material.map = face[k] || face.idle;
    scr.material.needsUpdate = true;
  };
  return g;
}
function guardDesk() {
  const g = new THREE.Group();
  g.add(rbox(1.9, 0.5, 0.62, '#8c929c', { r: 0.03 }));
  g.add(rbox(1.96, 0.05, 0.68, '#b9bdc3', { y: 0.5, r: 0.02 }));
  g.add(rbox(1.9, 0.06, 0.01, '#5b7ea8', { y: 0.24, z: 0.316, r: 0.004, cast: false }));
  // monitor facing the guard (away from camera), a phone, a small plant
  const mon = new THREE.Group();
  mon.add(rbox(0.46, 0.3, 0.04, PAL.monitor, { y: 0.08, r: 0.015 }));
  mon.add(rbox(0.05, 0.1, 0.04, PAL.monitor, { r: 0.01 }));
  mon.position.set(0.2, 0.55, 0.05);
  g.add(mon);
  g.add(rbox(0.16, 0.05, 0.12, '#2c3038', { x: -0.45, y: 0.55, z: 0.05, r: 0.015 }));
  const pl = plant({ size: 0.5, seed: 4 });
  pl.position.set(0.72, 0.55, 0.05);
  g.add(pl);
  return g;
}

function entrance() {
  const g = new THREE.Group();
  // two fixed glass side panels and two sliding leaves, standing open: the leaves sit slid aside just inside the
  // side panels (Jørgen: "I walk straight through the glass of the doors. Just leave them open.")
  const glassM = new THREE.MeshStandardMaterial({
    color: '#9fb8c9',
    roughness: 0.05,
    metalness: 0.2,
    emissive: new THREE.Color('#5f7d92'),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const frame = mat('#3f444e');
  const W = 4.6,
    H = 1.2,
    IN = W / 4 + 0.05; // IN: the edge of the opening, where the side panels start
  g.add(rbox(W + 0.2, 0.08, 0.14, null, { y: H, m: frame }));
  for (const x of [-W / 2, -IN, IN, W / 2]) g.add(rbox(0.09, H, 0.12, null, { x, m: frame }));
  for (const [x0, x1] of [
    [-W / 2, -IN],
    [IN, W / 2],
  ]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.09, H - 0.04, 0.02), glassM);
    p.position.set((x0 + x1) / 2, H / 2, 0);
    p.renderOrder = 2;
    g.add(p);
  }
  // the open leaves: glass in a thin frame, parked over the side panels on the inside
  for (const s of [-1, 1]) {
    const lw = IN - 0.1,
      cx = s * (IN + lw / 2 + 0.02),
      z = -0.1;
    const p = new THREE.Mesh(new THREE.BoxGeometry(lw - 0.06, H - 0.1, 0.02), glassM);
    p.position.set(cx, H / 2, z);
    p.renderOrder = 2;
    g.add(p);
    for (const dx of [-lw / 2, lw / 2]) g.add(rbox(0.04, H - 0.06, 0.04, null, { x: cx + dx, y: 0.02, z, m: frame }));
    g.add(
      rbox(lw, 0.04, 0.04, null, { x: cx, y: H - 0.1, z, m: frame }),
      rbox(lw, 0.04, 0.04, null, { x: cx, y: 0.02, z, m: frame }),
    );
    g.add(rbox(0.03, 0.34, 0.04, '#c9cdd3', { x: cx - s * (lw / 2 - 0.08), y: 0.45, z: z - 0.05, r: 0.01 }));
  }
  // a floor track across the opening
  g.add(rbox(2 * IN, 0.01, 0.1, '#5a606b', { y: 0.0, cast: false }));
  return g;
}

const stationExit = (x, z) => ({ g: exitFrame(x, z), k: 1, want: 1, leaves: [], update() {} });

let _winTex = null;
function winMat(k) {
  if (!_winTex)
    _winTex = textTexture(
      (g, W, H) => {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#b9cde0');
        gr.addColorStop(0.5, '#e6dccb');
        gr.addColorStop(1, '#ffcf96');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(60,68,80,.75)';
        g.fillRect(W / 2 - 3, 0, 6, H);
        g.fillRect(0, H * 0.33, W, 5);
        g.fillRect(0, 0, W, 4);
        g.fillRect(0, H - 4, W, 4);
        g.fillRect(0, 0, 4, H);
        g.fillRect(W - 4, 0, 4, H);
      },
      64,
      128,
    );
  return new THREE.MeshStandardMaterial({
    map: _winTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: _winTex,
    emissiveIntensity: k,
    roughness: 0.3,
  });
}
function mat2(w, d, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, d), mat(color, { roughness: 0.95 }));
  m.position.y = 0.006;
  m.receiveShadow = true;
  return m;
}

// buildLobby() builds it all at once; lobbySteps() is the same as a generator that yields between parts, so the game
// can build it in slices while the train is played (places/lifecycle.js, js/perf/slice.js)
export const buildLobby = () => drain(lobbySteps());
export function* lobbySteps() {
  const root = new THREE.Group();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#454a53');
  scene.add(root);

  yield;
  // light: cool dim room, warm low sun through the right-hand windows, warm wall lamps
  const SUN_DIR = new THREE.Vector3(0.86, 0.3, -0.42).normalize();
  scene.add(new THREE.HemisphereLight('#b7c1d2', '#6a625c', 1.55));
  const sun = new THREE.DirectionalLight('#ffc990', 3.8);
  sun.position.copy(SUN_DIR).multiplyScalar(30);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 5, far: 70 });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.6);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);
  for (const x of [-5.3, -2.9, 2.9, 5.3]) {
    const p = new THREE.PointLight('#ffc27e', 2.2, 3.6, 1.8);
    p.position.set(x, 1.05, x === -2.9 ? -3.2 : -4.1); // clear of the fare machines
    scene.add(p);
    yield;
  }
  for (const z of [-3.4, -0.4, 2.0])
    for (const s of [-1, 1]) {
      const p = new THREE.PointLight('#ffd3a0', 1.2, 3.0, 1.8);
      p.position.set(s * 5.9, 0.9, z);
      scene.add(p);
      yield;
    }
  {
    const p = new THREE.PointLight('#ffc27e', 0.9, 4, 1.8);
    p.position.set(0, 0.9, 4.3);
    scene.add(p);
  }

  yield;
  // floor, with the darker stone bands of the reference
  root.add(
    tileFloor(-X, X, -Z, Z, 1.25, {
      bands: [
        ['z', -1.25, 0.28],
        ['z', 1.25, 0.28],
        ['x', -2.45, 0.28],
        ['x', 2.7, 0.28],
        ['z', -0.35, 0.06],
        ['z', 0.35, 0.06],
      ],
    }),
  );
  yield;
  // outside strip beyond the entrance
  root.add(tileFloor(-X - 1, X + 1, Z, Z + 2.2, 1.25, { color: '#8e8a86', seam: '#7b7774' }));

  yield;
  // back wall with lifts, doors, posters, lamps and a sign
  root.add(
    wall('x', -X - 0.15, X + 0.15, -Z - 0.08, WH, 0.16, {
      holes: [
        [3.5, 4.4, 0, 1.35],
        [-1.62, -0.38, 0, 1.4],
      ],
    }),
  );
  const lifts = [stationExit(EXIT_X, -Z)];
  lifts.forEach((l) => root.add(l.g));
  const [es, fm] = [exitSign(), fareMachines()];
  es.position.set(EXIT_X, 1.6, -Z + 0.02);
  fm.position.set(FARES.x, 0, -Z);
  root.add(es, fm);
  {
    const d = door(0.9, 1.35);
    d.position.set(3.95, 0, -Z);
    root.add(d);
  }
  const { group: fitout, screen: scr } = stationFitout();
  root.add(fitout);
  const p1 = poster(['PEOPLE', 'IDEAS', 'PROGRESS'], 'hills');
  p1.position.set(-2.1, 0.45, -Z + 0.02);
  root.add(p1);
  const p2 = poster(['A', 'BRIGHTER', 'TOMORROW'], 'city');
  p2.position.set(2.1, 0.45, -Z + 0.02);
  root.add(p2);
  {
    const pl = textTexture(
      (g, W, H) => {
        g.fillStyle = '#e9ebee';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#2b3140';
        g.font = '700 58px ' + JP_FONT;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('階段', W / 2, H * 0.36);
        g.globalAlpha = 0.72;
        g.font = '700 30px ' + JP_FONT;
        g.fillText('STAIRS', W / 2, H * 0.78);
      },
      256,
      128,
    );
    const pp = plane(0.36, 0.18, pl);
    pp.position.set(3.95, 1.5, -Z + 0.03);
    root.add(pp);
  }
  for (const x of [-5.3, 2.9, 5.3]) {
    const l = wallLamp(0.72, 0.14);
    l.position.set(x, 1.0, -Z + 0.01);
    root.add(l);
    yield;
  }
  const sg = sign('本社', 'STATION');
  sg.position.set(0, 1.68, -Z + 0.03);
  root.add(sg);
  yield;
  // wall clock over the guard's side of the gate (the guard points at it: registration opens at nine)
  const clockFace = (hi) =>
    textTexture(
      (g, W, H) => {
        const c = W / 2,
          r = W / 2 - 6;
        g.fillStyle = '#f4f5f7';
        g.beginPath();
        g.arc(c, c, r, 0, Math.PI * 2);
        g.fill();
        g.lineWidth = 10;
        g.strokeStyle = '#2b3140';
        g.stroke();
        if (hi) {
          g.fillStyle = 'rgba(111, 208, 198, .45)';
          g.beginPath();
          g.moveTo(c, c);
          g.arc(c, c, r - 8, Math.PI, Math.PI * 1.5);
          g.closePath();
          g.fill();
        }
        g.fillStyle = '#2b3140';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.fillRect(c + Math.sin(a) * (r - 22) - 4, c - Math.cos(a) * (r - 22) - 10, 8, 20);
        }
        g.font = '700 44px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        for (const [n, a] of [
          [12, 0],
          [3, 0.5],
          [6, 1],
          [9, 1.5],
        ]) {
          g.fillStyle = hi && n === 9 ? '#1f8f84' : '#2b3140';
          g.fillText(String(n), c + Math.sin(a * Math.PI) * (r - 58), c - Math.cos(a * Math.PI) * (r - 58));
        }
        // quarter to nine
        const hand = (a, len, w) => {
          g.lineWidth = w;
          g.lineCap = 'round';
          g.beginPath();
          g.moveTo(c, c);
          g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len);
          g.stroke();
        };
        g.strokeStyle = '#2b3140';
        hand((8.75 / 12) * Math.PI * 2, r * 0.5, 14);
        hand(0.75 * Math.PI * 2, r * 0.78, 9);
        g.fillStyle = '#c0392b';
        g.beginPath();
        g.arc(c, c, 10, 0, Math.PI * 2);
        g.fill();
      },
      256,
      256,
    );
  const clockTex = [clockFace(false), clockFace(true)];
  const clock = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.05, 40),
    new THREE.MeshStandardMaterial({ color: '#3a404b', roughness: 0.5 }),
  );
  rim.rotation.x = Math.PI / 2;
  clock.add(rim);
  const faceM = new THREE.MeshStandardMaterial({
    map: clockTex[0],
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: clockTex[0],
    emissiveIntensity: 0.25,
    roughness: 0.6,
  });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.225, 40), faceM);
  face.position.z = 0.027;
  clock.add(face);
  clock.position.set(2.9, 1.42, -Z + 0.04);
  root.add(clock);
  clock.userData.highlight = (on) => {
    faceM.map = faceM.emissiveMap = clockTex[on ? 1 : 0];
    faceM.emissiveIntensity = on ? 0.6 : 0.25;
    faceM.needsUpdate = true;
  };

  yield;
  // side walls with tall warm windows
  const winHoles = [
    [-3.4, -2.2, 0.3, 1.6],
    [-1.0, 0.2, 0.3, 1.6],
    [1.4, 2.6, 0.3, 1.6],
  ];
  for (const s of [-1, 1]) {
    root.add(wall('z', -Z, Z - 0.9, s * (X + 0.08), WH, 0.16, { holes: winHoles }));
    for (const [a, b, y0, y1] of winHoles) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(b - a, y1 - y0), winMat(s > 0 ? 0.85 : 0.6));
      pane.position.set(s * (X + 0.06), (y0 + y1) / 2, (a + b) / 2);
      pane.rotation.y = (-s * Math.PI) / 2;
      root.add(pane);
    }
    yield;
  }
  yield;
  // front wall: low, with the glass entrance in the middle
  root.add(wall('x', -X - 0.15, -2.4, Z + 0.06, 0.5, 0.16));
  root.add(wall('x', 2.4, X + 0.15, Z + 0.06, 0.5, 0.16));
  const ent = entrance();
  ent.position.set(0, 0, Z + 0.06);
  root.add(ent);
  {
    const im = mat2(2.2, 1.2, '#3c4658');
    im.position.set(0, 0.006, Z - 0.75);
    root.add(im);
  }
  const outMat = mat2(2.4, 1.3, '#3c4658');
  outMat.position.set(0, 0.006, Z + 1.0);
  root.add(outMat);
  for (const x of [-2.85, 2.85]) {
    const lp = lampPost();
    lp.position.set(x, 0, Z + 0.5);
    root.add(lp);
    yield;
  }

  yield;
  // shadow proxy: tall walls with the same window slits and a roof, only for the sun
  const PH = 3.4;
  const proxyParts = [
    [2 * X + 0.4, 0.2, 2 * Z + 0.4, 0, PH, 0],
    [2 * X + 0.4, PH, 0.2, 0, PH / 2, -Z - 0.1],
  ];
  yield;
  // right wall: solid between tall window slits
  const slits = winHoles.map(([a, b]) => [a + 0.1, b - 0.1]); // the sun comes through the windows you can see
  let zc = -Z;
  for (const [a, b] of slits) {
    if (a > zc) proxyParts.push([0.2, PH, a - zc, X + 0.1, PH / 2, (zc + a) / 2]);
    zc = b;
    yield;
  }
  proxyParts.push([0.2, PH, Z - zc, X + 0.1, PH / 2, (zc + Z) / 2]);
  proxyParts.push([0.2, 0.3, 2 * Z, X + 0.1, 0.15, 0]); // sill
  const proxy = shadowProxy(proxyParts);
  root.add(proxy);

  yield;
  // plants
  const plants = [
    [-5.7, -3.9],
    [2.95, -3.95],
    [5.7, -3.9],
    [-5.75, -1.6],
    [5.75, -1.6],
    [-1.95, 3.95],
    [1.95, 3.95],
    [-5.8, 4.0],
    [5.8, 4.0],
  ];
  plants.forEach(([x, z], i) => {
    const p = plant({ size: 1.15, seed: i + 2 });
    p.position.set(x, 0, z);
    root.add(p);
  });

  yield;
  // barrier: glass panels on steel posts, readers either side of the arch, guard desk on the right
  const BZ = -0.55;
  root.add(floorMarks(Z, BZ));
  const glassM = new THREE.MeshStandardMaterial({
    color: '#9fbccf',
    roughness: 0.05,
    metalness: 0.2,
    emissive: new THREE.Color('#5f7d92'),
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  function glassRun(x0, x1) {
    const n = Math.max(1, Math.round((x1 - x0) / 1.3));
    for (let i = 0; i <= n; i++)
      root.add(rbox(0.1, 0.62, 0.1, '#6b717c', { x: x0 + ((x1 - x0) * i) / n, z: BZ, r: 0.02 }));
    root.add(rbox(x1 - x0, 0.04, 0.08, '#7c828d', { x: (x0 + x1) / 2, y: 0.58, z: BZ, r: 0.015 }));
    const g = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, 0.02), glassM);
    g.position.set((x0 + x1) / 2, 0.31, BZ);
    g.renderOrder = 2;
    root.add(g);
    root.add(rbox(x1 - x0, 0.02, 0.03, '#d6e2ea', { x: (x0 + x1) / 2, y: 0.55, z: BZ + 0.012, r: 0.005, cast: false })); // a bright top edge so the glass reads
    root.add(rbox(x1 - x0, 0.03, 0.05, '#5a606b', { x: (x0 + x1) / 2, y: 0.03, z: BZ, r: 0.005 }));
  }
  glassRun(-X + 0.35, -1.2);
  glassRun(3.25, X - 0.35);
  const readers = [-0.93, 0.93].map((x) => {
    const r = readerPost();
    r.position.set(x, 0, BZ);
    root.add(r);
    return r;
  });
  const ar = arch();
  ar.scale.setScalar(1.08);
  ar.position.set(0, 0, BZ);
  root.add(ar);
  const dk = guardDesk();
  dk.position.set(2.2, 0, BZ);
  root.add(dk);
  yield;
  // guard's chair behind the desk
  root.add(rbox(0.4, 0.3, 0.4, '#2c3242', { x: 2.35, z: BZ - 0.62, r: 0.04 }));

  yield;
  // visitor counter on the public side, left of the gate, with the visitor book (the receptionist works in the
  // head office lobby: scenes/head-office.js)
  const counter = new THREE.Group();
  counter.add(
    rbox(1.9, 0.52, 0.5, '#8c929c', { r: 0.03 }),
    rbox(1.96, 0.05, 0.56, '#bfc3c8', { y: 0.52, r: 0.02 }),
    rbox(1.9, 0.06, 0.01, '#5b7ea8', { y: 0.26, z: 0.256, r: 0.004, cast: false }),
  );
  counter.add(
    rbox(0.34, 0.03, 0.24, '#f2f0ea', { x: 0.45, y: 0.57, z: 0.08, r: 0.005 }),
    rbox(0.02, 0.02, 0.18, '#2b3140', { x: 0.62, y: 0.58, z: 0.1, r: 0.005 }),
  );
  counter.add(rbox(0.3, 0.2, 0.03, PAL.monitor, { x: -0.5, y: 0.58, z: -0.08, r: 0.01 }));
  {
    const cp = plant({ size: 0.45, seed: 11 });
    cp.position.set(-0.8, 0.57, 0.05);
    counter.add(cp);
  }
  counter.position.set(-4.2, 0, 0.75);
  root.add(counter);
  {
    const t = textTexture(
      (g, W, H) => {
        g.fillStyle = '#2a2f38';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#e9ecf0';
        g.font = '700 54px ' + JP_FONT;
        g.textBaseline = 'middle';
        g.fillText('受付', 24, H / 2 + 2);
        g.fillStyle = '#9aa3b0';
        g.font = '600 34px ' + JP_FONT;
        g.fillText('VISITORS', 160, H / 2 + 4);
      },
      400,
      100,
    );
    const p = plane(0.8, 0.2, t);
    p.position.set(-4.2, 0.27, 1.02);
    p.rotation.x = -0.2;
    root.add(p);
  }
  const lost = new THREE.Group();
  yield;
  // open shelves (sides, back, three boards) so the umbrellas, a scarf, a lunch bag and a phone charger show
  lost.add(rbox(0.9, 0.95, 0.04, '#8a909a', { z: -0.16, r: 0.01 }));
  for (const sx of [-1, 1]) lost.add(rbox(0.04, 0.95, 0.36, '#9aa0a9', { x: sx * 0.43, r: 0.01 }));
  for (let i = 0; i < 3; i++) lost.add(rbox(0.84, 0.03, 0.32, '#b8bcc2', { y: 0.02 + i * 0.31, r: 0.006 }));
  lost.add(
    rbox(0.22, 0.14, 0.2, '#6a4f3e', { x: -0.24, y: 0.05, r: 0.03 }),
    rbox(0.3, 0.05, 0.2, '#b0506a', { x: 0.2, y: 0.36, r: 0.02 }),
    rbox(0.2, 0.08, 0.14, '#d8c9a4', { x: -0.15, y: 0.36, r: 0.02 }),
    rbox(0.24, 0.1, 0.18, '#4f7a64', { x: 0.18, y: 0.67, r: 0.03 }),
  );
  for (const [x, c] of [
    [-0.3, '#2f3649'],
    [-0.18, '#7a3b3b'],
    [0.28, '#3f5f8a'],
  ]) {
    const u = rbox(0.05, 0.62, 0.05, c, { x, y: 0.05, z: 0.12, r: 0.02 });
    u.rotation.z = x * 0.3;
    lost.add(u);
  }
  {
    const t = textTexture(
      (g, W, H) => {
        g.fillStyle = '#f2f0ea';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#2b3140';
        g.font = '700 34px ' + JP_FONT;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('忘れ物', W / 2, H * 0.34);
        g.globalAlpha = 0.72;
        g.font = '700 22px ' + JP_FONT;
        g.fillText('LOST PROPERTY', W / 2, H * 0.76);
      },
      256,
      96,
    );
    const p = plane(0.4, 0.15, t);
    p.position.set(0, 1.05, 0.0);
    lost.add(p);
    lost.add(rbox(0.44, 0.17, 0.02, '#8a909a', { y: 0.965, z: -0.015, r: 0.005, cast: false }));
  }
  lost.position.set(-5.7, 0, 0.55);
  root.add(lost);
  const kiosk = new THREE.Group();
  kiosk.add(rbox(0.8, 1.25, 0.6, '#4a4f59', { r: 0.03 }));
  kiosk.add(
    rbox(0.6, 0.5, 0.02, null, { x: 0, y: 0.62, z: 0.3, r: 0.02, m: emissive('#f1d8b8', '#e8b27a', 0.7), cast: false }),
  );
  kiosk.add(rbox(0.24, 0.2, 0.2, '#1c1d20', { y: 0.2, z: 0.26, r: 0.02 }));
  {
    const t = textTexture(
      (g, W, H) => {
        g.fillStyle = '#4a4f59';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#f1e4d0';
        g.font = '700 56px ' + JP_FONT;
        g.textAlign = 'center';
        g.fillText('COFFEE', W / 2, 70);
        g.font = '600 34px ' + JP_FONT;
        g.fillText('¥120', W / 2, 118);
      },
      256,
      140,
    );
    const p = plane(0.5, 0.27, t);
    p.position.set(0, 0.62, 0.315);
    kiosk.add(p);
  }
  kiosk.position.set(5.45, 0, 3.0);
  kiosk.rotation.y = -Math.PI / 2;
  root.add(kiosk);
  yield;
  // benches
  const b1 = bench(2.1);
  b1.position.set(-3.9, 0, 2.55);
  root.add(b1);
  const b2 = bench(2.1);
  b2.position.set(3.95, 0, 1.3);
  root.add(b2);
  const bag = rbox(0.22, 0.17, 0.1, '#6a4f3e', { x: 4.55, y: 0.29, z: 1.3, r: 0.03 });
  root.add(bag);
  for (const [x, z, s] of [
    [-3.9, 2.55, 2.6],
    [3.95, 1.3, 2.6],
    [-4.2, 0.75, 2.4],
    [2.2, BZ, 2.4],
  ]) {
    const b = blob(s, 0.28);
    b.scale.set(1, 0.35, 1);
    b.position.set(x, 0.004, z);
    root.add(b);
  }

  yield;
  // P2: the doorway lit so people coming in aren't silhouettes; a waste bin by the coffee machine, a welcome stand
  root.add(lightPool(0, Z - 0.4, 1.1, { k: 0.3, sx: 1.4 }));
  {
    const p = new THREE.PointLight('#ffd8a8', 0.8, 3, 1.8);
    p.position.set(0, 1.1, Z - 0.6);
    scene.add(p);
  }
  {
    const st2 = new THREE.Group();
    const tt = textTexture(
      (g, W, H) => {
        g.fillStyle = '#2a2f38';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#e9ecf0';
        g.font = '700 44px ' + JP_FONT;
        g.textAlign = 'center';
        g.fillText('WELCOME', W / 2, 70);
        g.fillStyle = '#9aa3b0';
        g.font = '600 26px ' + JP_FONT;
        g.fillText('Visitors: reception', W / 2, 118);
        g.fillText('on the left', W / 2, 152);
      },
      300,
      200,
    );
    st2.add(rbox(0.05, 0.62, 0.05, '#5b626d', { r: 0.01 }), rbox(0.3, 0.03, 0.3, '#5b626d', { r: 0.01 }));
    const pp = plane(0.5, 0.33, tt, { emissiveK: 0.2 });
    pp.position.set(0, 0.72, 0.03);
    pp.rotation.x = -0.35;
    st2.add(pp);
    st2.add(rbox(0.54, 0.37, 0.03, '#23262c', { y: 0.55, z: 0.0, r: 0.01, cast: false }));
    st2.children[3].rotation.x = -0.35;
    st2.position.set(-1.9, 0, 2.6);
    root.add(st2);
  }

  yield;
  // a cleaning cart parked by the right bench
  {
    const cc = new THREE.Group();
    cc.add(
      rbox(0.9, 0.06, 0.45, '#5b6474', { y: 0.06, r: 0.02 }),
      rbox(0.06, 0.62, 0.4, '#5b6474', { x: -0.42, r: 0.02 }),
      rbox(0.34, 0.4, 0.34, '#4a505b', { x: -0.18, y: 0.12, r: 0.12, seg: 3 }),
    );
    {
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.3, 14), mat('#e0b83a'));
      bk.position.set(0.22, 0.27, 0);
      cc.add(sh(bk));
      const wr = rbox(0.26, 0.08, 0.14, '#3a3f48', { x: 0.22, y: 0.42, r: 0.02 });
      cc.add(wr);
      const wt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 14), mat('#6b8fa8', { roughness: 0.2 }));
      wt.position.set(0.22, 0.38, 0);
      cc.add(wt);
    }
    const mop = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 6), mat('#b9bdc3'));
    mop.position.set(0.3, 0.9, -0.1);
    mop.rotation.z = 0.2;
    cc.add(mop);
    cc.position.set(3.95, 0, 2.8);
    root.add(cc);
  }

  yield;
  // a bike rack on the plaza outside
  {
    const br = new THREE.Group();
    br.add(rbox(1.6, 0.04, 0.08, '#6b727d', { r: 0.01 }));
    for (let i = 0; i < 5; i++) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 5, 12, Math.PI), mat('#8a919c'));
      h.position.set(-0.64 + i * 0.32, 0.02, 0);
      br.add(sh(h));
    }
    br.position.set(-4.2, 0, Z + 1.2);
    root.add(br);
  }
  yield;
  groundShadows(root, { skip: new Set([proxy]), opacity: 0.6 });
  yield;
  // life: warm pools under the lamps, dust turning in the sun shafts, a second hand on the clock
  for (const x of [-5.3, -2.9, 2.9, 5.3]) root.add(lightPool(x, -Z + 0.45, 0.9, { k: 0.3, sx: 0.9, sz: 1.2 }));
  for (const z of [-3.4, -0.4, 2.0])
    for (const s of [-1, 1]) root.add(lightPool(s * (X - 0.35), z, 0.8, { k: 0.18, sx: 0.8, sz: 1.4 }));
  for (const x of [-2.85, 2.85]) root.add(lightPool(x, Z + 0.5, 0.6, { k: 0.3 }));
  const motes = dust([0.2, X - 0.3, 0.15, 1.6, -3.6, 3.4], 90, { opacity: 0.55, size: 0.026 });
  root.add(motes);
  const sec = clockHands(0.2);
  sec.children.slice(0, 2).forEach((c) => {
    c.visible = false;
  });
  sec.position.set(2.9, 1.42, -Z + 0.072);
  root.add(sec);

  yield;
  // people
  const up = (r) => {
    r.root.scale.multiplyScalar(K);
    return r;
  };
  const guard = up(PEOPLE.guard());
  sit(guard);
  armsLap(guard);
  guard.root.position.set(2.35, 0.08, BZ - 0.62);
  root.add(guard.root);
  guard.arms[0].rotation.x = -1.1;
  guard.arms[1].rotation.x = -1.1;
  {
    const gb = blob(0.6, 0.3);
    gb.position.set(2.35, 0.004, BZ - 0.55);
    root.add(gb);
  }
  const man = up(PEOPLE.kuroda());
  man.root.position.set(-1.2, 0, Z + 1.6);
  man.root.rotation.y = Math.PI;
  root.add(man.root);
  const manBlob = blob(0.55, 0.38);
  manBlob.position.set(-1.2, 0.004, Z + 1.6);
  root.add(manBlob);
  const tamaRig = makeCat('calico', { mode: 'eat' }), // eating from her bowl (docs/game/places.md, Gate)
    tama = tamaRig.root;
  tama.scale.setScalar(1.45 * K);
  tama.position.set(3.45, 0, BZ + 0.42);
  tama.rotation.y = -1.05;
  root.add(tama);
  {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 14), mat('#d9dde2'));
    bowl.position.set(3.2, 0.025, BZ + 0.56);
    root.add(bowl);
    const tb = blob(0.5, 0.3);
    tb.position.set(3.4, 0.004, BZ + 0.45);
    root.add(tb);
  }
  const aoi = up(PEOPLE.aoi());
  aoi.root.position.set(1.0, 0, Z + 0.8);
  root.add(aoi.root);
  const aoiBlob = blob(0.55, 0.38);
  root.add(aoiBlob);

  yield;
  // walk grid
  const nav = new Nav(-X, X, -Z, Z + 1.5, 0.1);
  nav.block(-X - 1, X + 1, Z + 0.02, Z + 0.3); // front wall (gap made below)
  nav.rects.pop();
  nav.block(-X - 1, -2.4, Z - 0.02, Z + 0.3);
  nav.block(2.4, X + 1, Z - 0.02, Z + 0.3);
  nav.block(-2.4, -1.12, Z - 0.16, Z + 0.3);
  nav.block(1.12, 2.4, Z - 0.16, Z + 0.3); // the fixed glass and the parked leaves either side of the doorway
  nav.block(-X + 0.3, -1.1, BZ - 0.08, BZ + 0.08);
  nav.block(3.2, X, BZ - 0.08, BZ + 0.08);
  for (const x of [-0.93, 0.93]) nav.block(x - 0.15, x + 0.15, BZ - 0.17, BZ + 0.17);
  nav.block(-0.75, -0.6, BZ - 0.17, BZ + 0.17);
  nav.block(0.6, 0.75, BZ - 0.17, BZ + 0.17);
  nav.block(1.2, 3.25, BZ - 0.34, BZ + 0.34); // desk
  nav.block(1.9, 2.8, BZ - 1.0, BZ - 0.34); // guard and chair
  nav.blockTagged('gate', -0.6, 0.6, BZ - 0.1, BZ + 0.1);
  for (const [x, z] of plants) nav.block(x - 0.2, x + 0.2, z - 0.2, z + 0.2);
  nav.block(-5.0, -2.8, 2.25, 2.85);
  nav.block(2.85, 5.05, 1.0, 1.6);
  for (const x of [-2.85, 2.85]) nav.block(x - 0.15, x + 0.15, Z + 0.35, Z + 0.65);
  nav.block(3.1, 3.75, BZ + 0.2, BZ + 0.75); // the cat and her bowl
  nav.block(-5.2, -3.2, BZ, 1.05); // counter
  nav.block(-X, -5.2, 0.3, 0.8); // lost and found
  nav.block(5.05, X, 2.55, 3.45); // coffee machine
  nav.block(FARES.x - 0.55, FARES.x + 0.55, -Z, -Z + FARES.d + 0.1);
  nav.block(...LOCKER_BOUNDS);
  nav.block(-2.1, -1.7, 2.45, 2.8);
  nav.block(3.3, 4.6, 2.5, 3.1); // bins, welcome stand

  const world = {
    root,
    scene,
    sun,
    proxy,
    nav,
    readers,
    arch: ar,
    guard,
    man,
    aoi,
    aoiBlob,
    manBlob,
    tama,
    tamaRig,
    lifts,
    screen: scr,
    BZ,
    X,
    Z,
  };
  let lastT = null;
  world.update = (t) => {
    motes.userData.update(t);
    sec.userData.set(0, Math.floor(t));
    idle(guard, t);
    for (const l of lifts) l.update(t);
    scr.userData.update(t);
    guard.head.rotation.y = Math.sin(t * 0.3) * 0.25;
    if (!man._walk) idle(man, t);
    tamaRig.update(Math.min(0.1, t - (lastT ?? t)));
    lastT = t;
    if (aoi.seated) idle(aoi, t);
  };
  world.clock = clock;
  return world;
}
