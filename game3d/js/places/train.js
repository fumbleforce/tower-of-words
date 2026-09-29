// Place 1, the train. The car, its passengers and its motion come from side/train (copied into js/train/
// unchanged); this file only recolours it to the muted palette (colours and light only), adds Mio as the
// player, the company station with its platforms, the doors and the walk out to the covered walkway.
// Every word said here comes from game3d/story/train.js (placeholder: story/placeholder/train.js).
import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { buildWorld, SPEED } from '../train/world.js';
import { buildCar, buildBellows, bagMesh, LX, LZ, T, HF, SEAT_Y, BENCH_D, BENCHES, DOOR_X, DOOR_W, NEAR_END, COL, mat as carMat } from '../train/car.js';
import { buildPassengers, cat, walkPose, HIP, sit, armsHold } from '../train/people.js';
import { PEOPLE } from '../cast.js';
import { Nav, blob } from '../engine.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { rbox, mat, emissive, textTexture, plane, JP_FONT, plant as propPlant } from '../props.js';
import { glide, withList } from './lobby.js';
import { standOut, walkRig } from '../move.js';
import { flags } from '../runner.js';
import { dust, lightPool } from './life.js';
import { route } from './route.js';

// Muted palette, after game3d/ref/2-security-gate-muted.png (Jørgen: "mute train too"): slate and charcoal,
// dark navy seats, a calmer floor. Only colours; set before the car is built.
Object.assign(COL, {
  shell: '#a7afba', shellDark: '#838b97', inner: '#bdbab5', floor: '#aea9a2', stripe: '#445d7d',
  seat: '#37425c', seatBack: '#313b53', seatBase: '#747b86', metal: '#aeb4bc', strap: '#707984', loop: '#dde1e6',
  frame: '#aab1ba', lamp: '#ffe7c6', door: '#b6bcc5', rack: '#9ea6b1',
});

export async function trainPlace(game) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3f5a6b');

  // light: a slightly dimmer, cooler car with warm low sun through the far windows
  const SUN_DIR = new THREE.Vector3(-0.45, 0.62, -0.75).normalize();
  scene.add(new THREE.HemisphereLight('#c3ccd8', '#8a8078', 1.9));
  const sun = new THREE.DirectionalLight('#ffc98f', 5.6);
  sun.position.copy(SUN_DIR).multiplyScalar(22); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 8, far: 40 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5; sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.45); fill.position.set(0.3, 1, 0.9); scene.add(fill);

  const world = buildWorld(scene, { sunDir: SUN_DIR });
  const U = world.sea.material.uniforms;
  U.uDeep.value.set('#132a36'); U.uMid.value.set('#1d3d4c'); U.uShallow.value.set('#34596a'); U.uFoam.value.set('#b9c6cc'); U.uShadow.value.set('#162430');   // slate sea (production grade)

  const pivot = new THREE.Group(); pivot.position.y = -0.6; scene.add(pivot);
  const car = buildCar('land'); car.root.position.y = 0.6; pivot.add(car.root);
  for (const x of [-2.0, 2.0]) { const p = new THREE.PointLight('#ffc07a', 0.8, 3.6, 1.6); p.position.set(x, 1.0, 0); car.root.add(p); }
  { const p = new THREE.PointLight('#dfe6ff', 0.9, 2.2, 1.6); p.position.set(3.2, 1.1, -0.2); car.root.add(p); }   // fill by the far-right door
  const neighbours = [];
  for (const s of [-1, 1]) {
    const nPivot = new THREE.Group(); nPivot.position.set(s * (2 * (LX + T) + 0.52), -0.6, 0);
    // the neighbours are closed cars, the same build as ours with its walls up and a roof (Jørgen: the open one
    // behind "looks like some sort of pavilion")
    const nc = buildCar('closed', { furnished: false }); nc.root.remove(nc.proxy);
    const grey = new THREE.Color('#7f8896');
    nc.root.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.color && !o.material.transparent) o.material.color.lerp(grey, 0.25).multiplyScalar(0.9); if (o.material.emissive) o.material.emissiveIntensity *= 0.5; } });
    nc.root.position.y = 0.6; nPivot.add(nc.root); scene.add(nPivot);
    const b = buildBellows(); b.position.set(s * (LX + T + 0.26), 0, 0); scene.add(b);
    neighbours.push({ pivot: nPivot, lag: s * 0.34, bellows: b });
  }

  // passengers, cat and bags as in side/train
  const list = buildPassengers(LZ, SEAT_Y);
  const [kuroda, aoi, reader, music, stander, bun, youth] = list;
  const blobs = {};
  for (const p of list) {
    car.root.add(p.root);
    const seated = p.root.position.y > 0.01;
    const b = blob(0.5, seated ? 0.3 : 0.4);
    b.position.set(p.root.position.x, 0.004, p.root.position.z + (seated ? Math.sign(-p.root.position.z) * 0.26 : 0));
    car.root.add(b); p.blob = b;
  }
  blobs.kuroda = kuroda.blob; blobs.aoi = aoi.blob;
  const kitty = cat(); kitty.scale.setScalar(1.15); kitty.position.set(-0.85, SEAT_Y, -(LZ - 0.24)); kitty.rotation.y = 0.2; car.root.add(kitty);
  const kb = blob(0.42, 0.3); kb.position.set(-0.85, SEAT_Y + 0.003, -(LZ - 0.24)); car.root.add(kb);
  const bags = [['brief', '#5b4336', -2.12, -1, 0.1], ['tote', '#b88563', -1.3, -1, -0.2], ['tote', '#2f3446', -2.08, 1, 0.3], ['brief', '#6b4a36', 2.12, 1, -0.1], ['pack', '#3f4656', -1.3, 1, 0.15], ['tote', '#7a6a5a', 1.4, 1, -0.2]];
  const bagObjs = [];
  for (const [k, c, x, side, ry] of bags) {
    const b = bagMesh(k, c); b.position.set(x, SEAT_Y, side * (LZ - 0.24)); b.rotation.y = ry + (side > 0 ? Math.PI : 0);
    car.root.add(b); car.nodders.push({ obj: b, k: 0.25 }); bagObjs.push(b);
    const sb = blob(0.36, 0.35); sb.position.set(x, SEAT_Y + 0.003, side * (LZ - 0.24)); car.root.add(sb); b.userData.blob = sb;
  }

  // Jørgen: the dark standing man by the far door read as a burglar; he's gone
  stander.root.visible = false; if (stander.blob) stander.blob.visible = false; list.splice(list.indexOf(stander), 1);
  // Rei (the writer's train conversation) takes the headphone girl's place on the far bench, laptop on
  // her knees, her folder and a lidded coffee on the free seat beside her
  // the girl with headphones moves to the near bench (seen from behind), still nodding along
  music.root.position.set(0.75, music.root.position.y, LZ - 0.24); music.root.rotation.y = Math.PI; music.blob.position.set(0.75, 0.004, LZ - 0.5);
  const rei = PEOPLE.rei(); sit(rei); armsHold(rei, -1.05, 0.5); rei.seated = true; rei.root.position.set(2.1, rei.root.position.y, -(LZ - 0.24)); rei.root.rotation.y = 0; car.root.add(rei.root);
  rei.head.rotation.x = -0.2; rei.breath = 0.012; list.push(rei);
  { const b = blob(0.5, 0.3); b.position.set(2.1, 0.004, -(LZ - 0.24) + 0.26); car.root.add(b); rei.blob = b; }
  const laptop = new THREE.Group();
  { // keyboard on the lap, hinge at the far edge, screen tilted back and facing the sitter (who faces +z... so -z)
    const base = rbox(0.24, 0.015, 0.16, '#b9bec6', { r: 0.006 });
    const kb = rbox(0.2, 0.004, 0.08, '#3a3f48', { y: 0.015, z: -0.02, r: 0.002, cast: false });
    const hinge = new THREE.Group(); hinge.position.set(0, 0.015, 0.08); hinge.rotation.x = 0.3;
    const lid = rbox(0.24, 0.16, 0.012, '#c9ced6', { r: 0.006 }); lid.position.z = 0.006; hinge.add(lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.13), emissive('#cfe4ff', '#9fc8ff', 0.8)); scr.rotation.y = Math.PI; scr.position.set(0, 0.08, -0.002); hinge.add(scr);
    laptop.add(base, kb, hinge); }
  laptop.position.set(0, 0.02, 0.2); rei.torso.add(laptop);
  const folder = rbox(0.22, 0.025, 0.3, '#2f3a55', { x: 1.55, y: SEAT_Y, z: -(LZ - 0.26), r: 0.008 }); car.root.add(folder);
  const cup = new THREE.Group();
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 12), mat('#f1ede6')); body.position.y = 0.06; const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 12), mat('#3a3f48')); lid.position.y = 0.125; const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.04, 0.05, 12), mat('#9a7a58')); sleeve.position.y = 0.06; for (const m of [body, lid, sleeve]) { m.castShadow = true; cup.add(m); } }
  cup.position.set(1.6, SEAT_Y + 0.025, -(LZ - 0.28)); car.root.add(cup);
  const cupSt = { want: 0, k: 0 };
  // Mio's bag of food from her mother, on the free seat beside her (the folder and cup were Rei's; Mio has the seat now)
  folder.visible = false; cup.visible = false;
  const foodBag = new THREE.Group(); let bagWobble = false;
  { const b = rbox(0.24, 0.2, 0.14, '#c9b48d', { r: 0.03 }); const band = rbox(0.245, 0.04, 0.145, '#b8573f', { y: 0.12, r: 0.01 }); const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 5, 10, Math.PI), mat('#8a6c4a')); h1.position.y = 0.2; const lid = rbox(0.1, 0.05, 0.09, '#e8e2d0', { y: 0.2, x: 0.05, r: 0.015 }); foodBag.add(b, band, h1, lid); }
  foodBag.position.set(1.62, SEAT_Y, -(LZ - 0.26)); car.root.add(foodBag);

  // ---- the station: platforms both sides, yellow tactile strips, the sign, a covered walkway exit ----
  const station = new THREE.Group(); scene.add(station);
  const PL = 34;                                   // platform length
  const edge = LZ + T + 0.08;
  for (const s of [-1, 1]) {
    const w = 3.2;
    const slab = rbox(PL, 0.5, w, '#737a86', { x: 0, y: -0.5, z: s * (edge + w / 2), r: 0.02 }); station.add(slab);
    slab.receiveShadow = true;
    // edge line and the yellow tactile strip with bumps
    station.add(rbox(PL, 0.012, 0.08, '#e9e6de', { y: 0, z: s * (edge + 0.06), r: 0.004, cast: false }));
    station.add(rbox(PL, 0.012, 0.28, '#a8914f', { y: 0.001, z: s * (edge + 0.55), r: 0.004, cast: false }));
    const dot = new THREE.CylinderGeometry(0.018, 0.018, 0.012, 6);
    const inst = new THREE.InstancedMesh(dot, mat('#977f45'), Math.floor(PL / 0.12) * 3);
    let n = 0; const m4 = new THREE.Matrix4();
    for (let x = -PL / 2 + 0.06; x < PL / 2; x += 0.12) for (const dz of [-0.08, 0, 0.08]) { m4.makeTranslation(x, 0.012, s * (edge + 0.55) + dz); inst.setMatrixAt(n++, m4); }
    inst.count = n; station.add(inst);
    // tile seams
    for (let x = -PL / 2; x <= PL / 2; x += 1.2) station.add(rbox(0.02, 0.004, w - 0.9, '#666c77', { x, y: 0.001, z: s * (edge + 0.9 + (w - 0.9) / 2), r: 0.001, cast: false }));
    // canopy posts, benches and bins along the platform
    for (let x = -12; x <= 12; x += 4) {
      station.add(rbox(0.16, 1.9, 0.16, '#6b727d', { x, z: s * (edge + 2.35), r: 0.03 }));
      if (x % 8 === 0) { const bn = new THREE.Group(); bn.add(rbox(1.0, 0.07, 0.36, '#37425c', { y: 0.2, r: 0.02 }), rbox(1.0, 0.3, 0.06, '#313b53', { y: 0.24, z: s * 0.17, r: 0.02 }), rbox(0.05, 0.22, 0.34, '#747b86', { x: -0.45, r: 0.01 }), rbox(0.05, 0.22, 0.34, '#747b86', { x: 0.45, r: 0.01 })); bn.position.set(x + 1.6, 0, s * (edge + 2.2)); station.add(bn); }
    }
    { const p = propPlant({ size: 1.1, seed: s > 0 ? 3 : 5 }); p.position.set(-5.2, 0, s * (edge + 2.5)); station.add(p); }
  }

  // boarding marks at each door position (painted chevrons and a queue line), a timetable board, vending pair and
  // bins on the near platform, so the bands either side of the car read as a working station
  for (const s of [-1, 1]) for (const dx of [-DOOR_X, DOOR_X]) {
    // painted boarding marks: an arrow either side of the door pointing at it, and a queue line behind each
    for (const k of [-1, 1]) {
      const a = new THREE.Group();
      a.add(rbox(0.06, 0.004, 0.34, '#c9ccd0', { z: 0, r: 0.002, cast: false }));
      for (const w2 of [-1, 1]) { const h = rbox(0.06, 0.004, 0.2, '#c9ccd0', { r: 0.002, cast: false }); h.position.set(w2 * 0.06, 0.002, -s * 0.12); h.rotation.y = w2 * s * 0.7; a.add(h); }
      a.position.set(dx + k * 0.45, 0.002, s * (edge + 0.95)); station.add(a);
      station.add(rbox(0.5, 0.004, 0.05, '#aeb2b8', { x: dx + k * 0.45, y: 0.002, z: s * (edge + 1.45), r: 0.001, cast: false }));
    }
  }
  let timetableTex;
  { const tb = new THREE.Group();
    const tt = timetableTex = textTexture((g, W, H) => { g.fillStyle = '#1d2433'; g.fillRect(0, 0, W, H); g.fillStyle = '#e0bf4a'; g.fillRect(0, 0, W, 10);
      for (let i = 0; i < 4; i++) { g.fillStyle = i ? '#9fb4cf' : '#f2f4f7'; g.font = '700 34px ' + JP_FONT; g.fillText(['8:42', '8:50', '8:58', '9:06'][i], 24, 58 + i * 46); g.fillStyle = '#6f86a6'; g.fillRect(140, 38 + i * 46, 150 + (i * 37) % 60, 12); g.fillStyle = i ? '#46d18a' : '#e0bf4a'; g.fillRect(W - 60, 40 + i * 46, 30, 12); } }, 420, 240);
    tb.add(rbox(0.06, 1.2, 0.06, '#5b626d', { r: 0.02 }), rbox(1.02, 0.6, 0.06, '#232b3d', { y: 1.0, r: 0.02 }));
    const p = plane(0.94, 0.52, tt, { emissiveK: 0.55 }); p.position.set(0, 1.3, 0.035); tb.add(p);
    tb.position.set(-2.6, 0, edge + 2.55); station.add(tb); }
  for (const [x, c, lit] of [[-7.4, '#2d3b63', true], [-6.55, '#8a3b3b', true]]) {
    const vm = new THREE.Group(); vm.add(rbox(0.8, 1.35, 0.55, c, { r: 0.03 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), emissive('#cfe0f2', lit ? '#9fc2ff' : '#000', 0.8)); face.position.set(-0.05, 0.85, 0.28); vm.add(face);
    const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#f2e2b0'];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) vm.add(rbox(0.09, 0.13, 0.03, cols[(r * 4 + q) % 5], { x: -0.27 + q * 0.14, y: 0.63 + r * 0.18, z: 0.29, r: 0.02, cast: false }));
    vm.add(rbox(0.46, 0.12, 0.03, '#15181d', { x: -0.05, y: 0.14, z: 0.29, r: 0.02, cast: false }));
    vm.rotation.y = Math.PI; vm.position.set(x, 0, edge + 2.95); station.add(vm);
    station.add(lightPool(x, edge + 2.3, 0.8, { k: 0.2, color: '#9fc2ff' }));
  }
  for (const s of [-1, 1]) for (const x of [-9.8, 5.9]) { const bin = new THREE.Group(); const bz = s > 0 ? edge + 2.2 : edge + 2.75; for (const [dx, c] of [[-0.14, '#4f6f9a'], [0.14, '#6a8f5c']]) bin.add(rbox(0.24, 0.5, 0.24, c, { x: dx, r: 0.03 }), rbox(0.2, 0.02, 0.2, '#2c3038', { x: dx, y: 0.5, r: 0.01, cast: false })); bin.position.set(x, 0, s * bz); station.add(bin); }

  // coping: a pale concrete lip along each platform edge, and the far platform gets its own timetable, vending and planters
  for (const s of [-1, 1]) station.add(rbox(PL, 0.03, 0.16, '#a9adb3', { y: -0.02, z: s * (edge + 0.02), r: 0.01, cast: false }));
  { const tb = new THREE.Group(); tb.add(rbox(0.06, 1.2, 0.06, '#5b626d', { r: 0.02 }), rbox(1.02, 0.6, 0.06, '#232b3d', { y: 1.0, r: 0.02 }));
    const p = plane(0.94, 0.52, timetableTex, { emissiveK: 0.55 }); p.position.set(0, 1.3, 0.035); tb.add(p);
    tb.position.set(-6.2, 0, -(edge + 2.7)); station.add(tb); }
  { const vm = new THREE.Group(); vm.add(rbox(0.8, 1.35, 0.55, '#2d3b63', { r: 0.03 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), emissive('#cfe0f2', '#9fc2ff', 0.8)); face.position.set(-0.05, 0.85, 0.28); vm.add(face);
    const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#f2e2b0'];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) vm.add(rbox(0.09, 0.13, 0.03, cols[(r * 4 + q) % 5], { x: -0.27 + q * 0.14, y: 0.63 + r * 0.18, z: 0.29, r: 0.02, cast: false }));
    vm.position.set(6.4, 0, -(edge + 2.95)); station.add(vm); station.add(lightPool(6.4, -(edge + 2.3), 0.8, { k: 0.2, color: '#9fc2ff' })); }
  for (const x of [-1.2, 4.6, 10.4]) { const p = propPlant({ size: 1.0, seed: 7 + Math.round(x) }); p.position.set(x, 0, -(edge + 2.75)); station.add(p); }
  for (const x of [-9.2, 0.2, 12.0]) { const p = propPlant({ size: 0.9, seed: 9 + Math.round(x) }); p.position.set(x, 0, edge + 2.2); station.add(p); }
  // light spilling out of each open door onto the platform
  const doorSpill = [-DOOR_X, DOOR_X].map((dx) => { const m = lightPool(dx, LZ + T + 0.7, 0.8, { k: 0.001, sx: 1.2, sz: 1.1, color: '#ffe0b0', y: 0.012 }); car.root.add(m); return m; });
  // a canopy over each platform that only the sun sees, so the platforms sit in cool shade as in the reference
  { const sm = new THREE.MeshBasicMaterial({ color: '#000', colorWrite: false, depthWrite: false });
    void sm; }
  // station signs: one on each platform, facing the camera side
  const signTex = textTexture((g, W, H) => {
    g.fillStyle = '#2c3a55'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f2f4f7'; g.fillRect(20, 20, 118, 118);
    g.fillStyle = '#2c3a55'; g.fillRect(44, 40, 70, 60); g.fillRect(52, 104, 16, 16); g.fillRect(90, 104, 16, 16); g.fillStyle = '#f2f4f7'; g.fillRect(52, 50, 54, 22);
    g.fillStyle = '#f2f4f7'; g.font = '700 96px ' + JP_FONT; g.textBaseline = 'middle'; g.fillText('本社', 170, 66);
    g.font = '600 38px ' + JP_FONT; g.fillStyle = '#b9c6da'; g.fillText('HONSHA · Head Office', 172, 132);
    g.fillStyle = '#e0bf4a'; g.fillRect(0, H - 14, W, 14);
  }, 640, 170);
  const signs = [];
  for (const [x, s] of [[2.6, 1], [-2.2, -1]]) {
    const sg = new THREE.Group();
    sg.add(rbox(0.08, 1.35, 0.08, '#5b626d', { x: -0.9, r: 0.02 }), rbox(0.08, 1.35, 0.08, '#5b626d', { x: 0.9, r: 0.02 }));
    const p = plane(2.1, 0.56, signTex, { emissiveK: 0.25 }); p.position.set(0, 1.35, 0.05); sg.add(p);
    sg.add(rbox(2.16, 0.62, 0.06, '#232b3d', { y: 1.04, r: 0.02 }));
    sg.position.set(x, 0, s * (edge + 1.85)); if (s < 0) sg.rotation.y = 0; station.add(sg); signs.push(sg);
  }
  // covered walkway to the company building, at the right end of the near platform
  const walk = new THREE.Group();
  // cutaway like everything else: posts, a low glass side and the sign, no roof over the player
  walk.add(rbox(3.2, 0.1, 0.12, '#6b727d', { y: 1.72, z: 1.25, r: 0.03 }), rbox(3.2, 0.1, 0.12, '#6b727d', { y: 1.72, z: -1.25, r: 0.03 }));
  walk.add(rbox(3.0, 0.5, 0.04, '#c9d6de', { y: 0.05, z: -1.25, r: 0.01, m: new THREE.MeshStandardMaterial({ color: '#d5e2ea', transparent: true, opacity: 0.45, roughness: 0.1 }) }));
  for (const [dx, dz] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) walk.add(rbox(0.12, 1.75, 0.12, '#5b626d', { x: dx, z: dz, r: 0.02 }));
  const wt = textTexture((g, W, H) => { g.fillStyle = '#2c3a55'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2f4f7'; g.font = '700 58px ' + JP_FONT; g.textBaseline = 'middle'; g.fillText('本社ビル →', 24, H / 2); g.fillStyle = '#b9c6da'; g.font = '600 32px ' + JP_FONT; g.fillText('To the office', 330, H / 2 + 6); }, 560, 110);
  const wp = plane(1.9, 0.37, wt, { emissiveK: 0.3 }); wp.position.set(0, 1.5, 1.32); walk.add(wp);
  walk.position.set(8.4, 0, edge + 1.9); station.add(walk);
  station.visible = false;

  const carDust = dust([-LX + 0.3, LX - 0.3, 0.15, 1.3, -LZ + 0.3, LZ - 0.3], 70, { opacity: 0.5, size: 0.024 }); car.root.add(carDust);

  // ---- Mio lives in the car ----
  const space = car.root;
  const nav = new Nav(-LX, LX + 8, -LZ, LZ + 3.2, 0.1);
  nav.R = 0.16;
  for (const [x0, x1] of BENCHES) { nav.block(x0 - 0.04, x1 + 0.04, -LZ, -(LZ - BENCH_D) + 0.1); nav.block(Math.max(x0, -NEAR_END) - 0.04, Math.min(x1, NEAR_END) + 0.04, LZ - BENCH_D - 0.1, LZ); }
  nav.block(-3.85, -3.35, -1.2, -0.58);
  for (const z of [-0.5, 0.5]) nav.block(-0.05, 0.05, z - 0.05, z + 0.05);
  nav.block(LX, LX + 8, -LZ, LZ + T + 0.05);                                                  // beyond the car end
  // near wall, with gaps at the doors; the gaps and the platform are shut until the doors open
  nav.block(-LX, -DOOR_X - DOOR_W / 2 + 0.05, LZ, LZ + T + 0.05); nav.block(-DOOR_X + DOOR_W / 2 - 0.05, DOOR_X - DOOR_W / 2 + 0.05, LZ, LZ + T + 0.05); nav.block(DOOR_X + DOOR_W / 2 - 0.05, LX, LZ, LZ + T + 0.05);
  nav.blockTagged('doors', -LX, LX + 8, LZ - 0.02, LZ + T + 0.06);
  nav.block(-LX, -LX + 0.2, LZ + T, LZ + 3.2);
  nav.extra = (x, z) => {
    if (z > LZ + 0.02) return true;
    const cx = Math.abs(x) - (LX - 0.34), cz = Math.abs(z) - (LZ - 0.34);
    return !(cx > 0 && cz > 0 && Math.hypot(cx, cz) > 0.34 - 0.17);
  };

  // doors: the near-side sliding leaves in the shell
  let doorLeaves = [];
  // the platform-side door sets, made to read from above (Jørgen: "the train has no door"): dark frame posts
  // standing a little proud of the cut wall, a header with a lamp (amber shut, green open), a yellow edge
  // stripe on each leaf and a yellow threshold on the floor
  // Built to the cut wall's doorway exactly: the leaves sit inside the wall's thickness and are no taller than
  // the opening, so when they slide into the wall they vanish into it instead of overlapping it.
  const doorLamps = [], myLeaves = [];
  const lampShut = emissive('#ffcf8a', '#ffb24a', 1.8), lampOpen = emissive('#b8f5c8', '#46d18a', 2.2);
  const doorSets = new THREE.Group(); car.root.add(doorSets);
  function buildDoors(md) {
    doorSets.clear(); doorLamps.length = 0; myLeaves.length = 0;
    // leaves and frames are full height, as on a real monorail; in the cut-away view the part above the cut wall
    // belongs to the closed overlay and fades out with it (car.setClosed), so the play camera still sees inside
    const cutH = md === 'land' ? 0.62 : HF, fullTop = 1.22, hH = fullTop - 0.04, split = cutH - 0.1;
    const fade = (m) => { if (md === 'land') car.addFade(m); return m; };
    for (const dx of [-DOOR_X, DOOR_X]) {
      const zo = LZ + T + 0.004;                  // just on the outer face of the wall, thin, so the leaves slide over it
      for (const s of [-1, 1]) {
        doorSets.add(rbox(0.07, cutH, 0.012, '#2a2f38', { x: dx + s * (DOOR_W / 2 + 0.035), z: zo, r: 0.004 }));
        if (md === 'land') doorSets.add(fade(rbox(0.07, HF - cutH, 0.012, '#2a2f38', { x: dx + s * (DOOR_W / 2 + 0.035), y: cutH, z: zo, r: 0.004 })));
      }
      const lamp = rbox(0.26, 0.05, 0.03, null, { x: dx, y: md === 'land' ? split + 0.12 : fullTop + 0.05, z: zo, r: 0.01, m: lampShut, cast: false });
      doorSets.add(lamp); doorLamps.push(lamp);
      if (md === 'land') { const up = rbox(0.26, 0.05, 0.03, null, { x: dx, y: fullTop + 0.05, z: zo, r: 0.01, m: lampShut, cast: false }); doorSets.add(up); doorLamps.push(up); up.userData.upper = true; lamp.userData.lower = true; }
      doorSets.add(rbox(DOOR_W - 0.04, 0.004, 0.1, '#d8b447', { x: dx, y: 0.003, z: LZ - 0.07, r: 0.002, cast: false }));
      // the leaves hang just outside the wall (outside-sliding doors) and both slide toward the middle of the car
      // over the wall, the far one further, so nothing ever has to pass through the wall or the rounded corner
      for (const s of [-1, 1]) {
        const leaf = new THREE.Group();
        const lowH = md === 'land' ? split : hH;
        leaf.add(rbox(DOOR_W / 2 - 0.004, lowH, 0.03, '#56698a', { r: 0.01 }));
        leaf.add(rbox(0.03, lowH - 0.02, 0.038, '#e0b83a', { x: -s * (DOOR_W / 4 - 0.02), y: 0.01, r: 0.008, cast: false }));
        if (md === 'land') {
          // the top of the leaf with its tall window, above the cut
          leaf.add(fade(rbox(DOOR_W / 2 - 0.004, hH - split, 0.03, '#56698a', { y: split, r: 0.01 })));
          leaf.add(fade(rbox(DOOR_W / 2 - 0.1, hH - split - 0.2, 0.036, null, { y: split + 0.08, r: 0.015, m: emissive('#b9d3e6', '#9fc2dc', 0.35) })));
          leaf.add(fade(rbox(0.03, hH - split - 0.02, 0.038, '#e0b83a', { x: -s * (DOOR_W / 4 - 0.02), y: split, r: 0.008, cast: false })));
        } else {
          const wy = Math.max(0.08, hH - 0.24);
          leaf.add(rbox(DOOR_W / 2 - 0.1, Math.min(0.2, hH * 0.4), 0.036, null, { y: wy, r: 0.015, m: emissive('#b9d3e6', '#9fc2dc', 0.35) }));
        }
        const far = s * Math.sign(dx) > 0;
        // plug doors: shut, the leaf sits in the opening flush with the body (Jørgen: they seemed to hover in
        // front of it); opening, it steps out a hair, then slides along the outside of the wall
        const zShut = LZ + T - 0.02, zSlide = LZ + T + (far ? 0.052 : 0.024);
        leaf.position.set(dx + s * DOOR_W / 4, 0.037, zShut);
        doorSets.add(leaf); myLeaves.push({ g: leaf, x0: leaf.position.x, s, far, zShut, zSlide });
      }
    }
  }
  buildDoors('land');
  function findDoors() {
    // Jørgen: no visible light fixtures in the car; the point lights stay
    const lm = carMat('lamp', COL.lamp); car.root.traverse((o) => { if (o.isMesh && o.material === lm) o.visible = false; });
    doorLeaves = [];
    const dm = carMat('door', COL.door);
    car.root.traverse((o) => { if (o.isMesh && o.material === dm && Math.abs(o.position.z - (LZ + 0.03)) < 0.002) doorLeaves.push({ m: o, x0: o.position.x }); });
    for (const d of doorLeaves) if (!d.m.userData.stripe) {
      const inner = d.x0 < Math.sign(d.x0) * DOOR_X - 0.1 ? DOOR_W / 2 - 0.03 : 0.02;   // the edge where the leaves meet
      const st = rbox(0.03, 0.44, 0.05, '#e0b83a', { x: inner, y: 0.02, z: 0.01, r: 0.01, cast: false }); d.m.add(st); d.m.userData.stripe = st;
    }
  }
  findDoors();
  const st = { v: SPEED, dist: 0, mode: 'cruise', brakeFrom: 0, stopAt: 0, door: 0, doorWant: 0, hold: false, chimeT: -1, arrived: false };

  // ---- camera: side/train's framing (whole car on a wide screen, the car running up a phone screen) ----
  const camera = new THREE.PerspectiveCamera(20, 16 / 9, 1, 160);
  const cam = {
    camera, dir: new THREE.Vector3(), dist: 10, target: new THREE.Vector3(), base: new THREE.Vector3(), fitDist: 10, follow: false, fx: 0, close: null,
    place() { camera.position.copy(this.target).addScaledVector(this.dir, this.dist); camera.up.set(0, 1, 0); camera.lookAt(this.target); camera.updateMatrixWorld(); },
    closeOn([x, z], zoom = 1.8) { this.close = { x, z, zoom }; },
    release() { this.close = null; },
    wanted(p) {
      if (this.close) return [new THREE.Vector3(this.close.x, 0.45, this.close.z), this.fitDist / this.close.zoom];
      const t = this.base.clone();
      if (this.follow && p) t.x = THREE.MathUtils.clamp(p.x + 0.6, -1.7, 2.6);
      return [t, this.fitDist];
    },
    update(dt, p) { const [t, d] = this.wanted(p); const k = Math.min(1, dt * (this.close ? 2.2 : 3)); this.target.lerp(t, k); this.dist += (d - this.dist) * k; this.place(); },
    snap(p) { const [t, d] = this.wanted(p); this.target.copy(t); this.dist = d; this.place(); },
  };
  const _v = new THREE.Vector3();
  function fit(aspect) {
    const mode = aspect >= 1 ? 'land' : 'port';
    if (car.mode !== mode) { car.setMode(mode); findDoors(); buildDoors(mode); setDoors(st.door); }
    camera.aspect = aspect;
    let pts, limX, limY;
    cam.follow = false;
    if (mode === 'land') {
      camera.fov = 20; const elev = THREE.MathUtils.degToRad(58);
      cam.base.set(0, 0.45, 0.1); cam.dir.set(0, Math.sin(elev), Math.cos(elev));
      pts = []; for (const x of [-4.72, 4.72]) for (const z of [-LZ - T - 0.3, LZ + T + 0.45]) for (const y of [-0.45, 1.45]) pts.push([x, y, z]);
      limX = 1.0; limY = 0.95;
    } else {
      camera.fov = 40; const elev = THREE.MathUtils.degToRad(62);
      cam.base.set(0, 0.3, 0.3); cam.dir.set(-Math.cos(elev), Math.sin(elev), 0);
      pts = []; for (const z of [-LZ - T - 0.42, LZ + T + 0.9]) for (const y of [0, 1.45]) pts.push([0, y, z]);
      limX = 1.0; limY = 3; cam.follow = true;
    }
    camera.updateProjectionMatrix();
    cam.target.copy(cam.base);
    let lo = 2, hi = 120;
    for (let i = 0; i < 40; i++) { cam.dist = (lo + hi) / 2; cam.place(); let ok = true; for (const p of pts) { _v.set(...p).project(camera); if (Math.abs(_v.x) > limX || Math.abs(_v.y) > limY) { ok = false; break; } } if (ok) hi = cam.dist; else lo = cam.dist; }
    cam.dist = hi; cam.fitDist = hi; cam.place();
  }

  // ---- motion (side/train's sway, scaled by speed) ----
  const noise = new SimplexNoise({ random: (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })() });
  const JOINT = 1.36, BOGIE_GAP = 0.3;
  const ringF = (tb) => (tb < 0 ? 0 : Math.exp(-tb / 0.11) * Math.sin(2 * Math.PI * 4.2 * tb));
  function carMotion(tj, t, k) {
    const tf = ((tj % JOINT) + JOINT) % JOINT, tr = (((tj - BOGIE_GAP) % JOINT) + JOINT) % JOINT;
    const rf = ringF(tf) * k, rr = ringF(tr) * k;
    return { y: 0.026 * (rf + rr) + 0.006 * noise.noise(t * 0.9, 3) * k, pitch: 0.006 * (rf - rr), roll: (0.011 * noise.noise(t * 0.31, 1) + 0.004 * noise.noise(t * 1.05, 2)) * k + 0.0015 * (rf + rr), z: 0.02 * noise.noise(t * 0.22, 5) * k, yaw: 0.0012 * noise.noise(t * 0.17, 9) * k };
  }
  const applyMotion = (obj, m) => { obj.position.y = -0.6 + m.y; obj.position.z = m.z; obj.rotation.set(m.roll, m.yaw, m.pitch); };
  let prevM = carMotion(0, 0, 1), lastJ = 0;

  // the shot for the doors closing on the sleeping man: the left door and Hamada (far bench, x -2.55)
  const DOOR_SHOT = [-2.85, 0.62];
  function setDoors(k) {
    // the leaves slide into the wall pocket; once they're mostly in, they're hidden (the low cut wall can't cover them)
    for (const d of doorLeaves) { const dx = Math.sign(d.x0) * DOOR_X; d.m.position.x = d.x0 + (d.x0 < dx - 0.1 ? -1 : 1) * k * (DOOR_W / 2 - 0.02); d.m.visible = false; }
    for (const d of myLeaves) {
      const toC = -Math.sign(d.x0), out = THREE.MathUtils.smoothstep(k, 0, 0.16), slide = Math.max(0, (k - 0.16) / 0.84);
      d.g.position.z = d.zShut + out * (d.zSlide - d.zShut);
      d.g.position.x = d.x0 + toC * slide * (d.far ? DOOR_W - 0.01 : DOOR_W / 2 - 0.005); d.g.visible = true;
    }
    for (const l of doorLamps) l.material = k > 0.3 ? lampOpen : lampShut;
    for (const m of doorSpill) m.material.color.set('#ffe0b0').multiplyScalar(0.4 * k);
  }

  // ---- people ids for the story ----
  const people = { kuroda, aoi, reader, rei, music, stander, bun, youth, tama: { root: kitty, head: kitty.userData.head } };
  const seats = {
    seat_aoi: { x: -1.25, z: -(LZ - 0.24), side: -1, bag: 1, top: SEAT_Y, ry: 0 }, seat_far_r: { x: 1.58, z: -(LZ - 0.24), side: -1, props: true, top: SEAT_Y, ry: 0 },
    seat_near_l: { x: -1.3, z: LZ - 0.24, side: 1, bag: 4, top: SEAT_Y, ry: Math.PI }, seat_near_r: { x: 1.4, z: LZ - 0.24, side: 1, bag: 5, top: SEAT_Y, ry: Math.PI },
    seat_mio: { x: 2.1, z: -(LZ - 0.24), side: -1, top: SEAT_Y, ry: 0 },
  };
  const spots = { aisle: [0.4, 0.1], door_l: [-DOOR_X, LZ - 0.45], door_r: [DOOR_X, LZ - 0.45], by_aoi: [-1.7, -0.35], by_kuroda: [-2.55, -0.35], platform: [DOOR_X, LZ + 1.0], walkway: [8.4, LZ + 1.9],
    plat_l: [-3.0, 2.2], plat_l2: [-2.2, 2.25], plat_hamada: [-3.75, 2.35] };
  const rigAnchor = (rig, h = 1.12) => (v) => { rig.root.getWorldPosition(v); v.y += h; return v; };
  const carPt = (x, y, z) => (v) => { v.set(x, y, z); car.root.localToWorld(v); return v; };
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });
  const things = {
    aoi: { label: 'Aoi', kind: 'person', anchor: rigAnchor(aoi), ...at(-1.7, -0.3, -1.7, -1.0), enabled: () => aoi.root.visible },
    kuroda: { label: 'Sleeping man', kind: 'person', anchor: rigAnchor(kuroda), ...at(-2.55, -0.3, -2.55, -1.0), enabled: () => kuroda.root.visible && !kuroda._walk },
    reader: { label: 'Man with a book', kind: 'person small', anchor: rigAnchor(reader), ...at(1.05, -0.3, 1.05, -1.0) },
    music: { label: 'Girl with headphones', kind: 'person small', anchor: rigAnchor(music), ...at(0.75, 0.35, 0.75, 1.0) },
    rei: { label: 'Woman with a laptop', kind: 'person', anchor: rigAnchor(rei), ...at(2.1, -0.3, 2.1, -1.0), enabled: () => rei.root.visible },
    cup: { label: 'Coffee', kind: 'thing small', anchor: carPt(1.6, 0.6, -(LZ - 0.28)), ...at(1.6, -0.3, 1.6, -1.0), noMarker: true },
    bun: { label: 'Woman with a bun', kind: 'person small', anchor: rigAnchor(bun), ...at(-2.5, 0.35, -2.5, 1.0) },
    youth: { label: 'Young man', kind: 'person small', anchor: rigAnchor(youth), ...at(2.55, 0.35, 2.55, 1.0) },
    tama: { label: 'Cat', verb: 'Pet', kind: 'person small', anchor: carPt(-0.85, 0.5, -(LZ - 0.24)), ...at(-0.85, -0.3, -0.85, -1.0) },
    doors: { label: 'Doors', kind: 'thing', anchor: carPt(DOOR_X, 1.1, LZ), ...at(DOOR_X, LZ - 0.22, DOOR_X, LZ), enabled: () => st.door > 0.3 },
    door_l: { label: 'Doors', kind: 'thing', anchor: carPt(-DOOR_X, 1.1, LZ), ...at(-DOOR_X, LZ - 0.45, -DOOR_X, LZ), noMarker: true },
    door_r: { label: 'Doors', kind: 'thing', anchor: carPt(DOOR_X, 1.1, LZ), ...at(DOOR_X, LZ - 0.45, DOOR_X, LZ), noMarker: true },
    plant: { label: 'Plant', kind: 'thing small', anchor: carPt(-3.6, 0.7, -0.82), ...at(-3.2, -0.5, -3.6, -0.82), noMarker: true },
    bags: { label: 'Bags', kind: 'thing small', anchor: carPt(-1.3, 0.5, -(LZ - 0.24)), ...at(-1.3, -0.3, -1.3, -1.0), noMarker: true },
    rack: { label: 'Luggage rack', kind: 'thing small', anchor: carPt(0, 1.5, -LZ), ...at(0, -0.3, 0, -1.0), noMarker: true },
    straps: { label: 'Straps', kind: 'thing small', anchor: carPt(-1.5, 1.3, -0.65), ...at(-1.5, -0.2, -1.5, -0.65), noMarker: true },
    window: { label: 'Window', kind: 'thing small', anchor: carPt(-1.1, 1.0, -LZ), ...at(-1.1, -0.3, -1.1, -LZ), noMarker: true },
    poster: { label: 'Poster', kind: 'thing small', anchor: carPt(-LX, 1.0, -0.78), ...at(-3.5, -0.4, -LX, -0.78), noMarker: true },
    sign: { label: 'Station sign', kind: 'thing small', anchor: (v) => { signs[0].getWorldPosition(v); v.y += 1.5; return v; }, ...at(2.6, LZ + 1.3, 2.6, LZ + 1.9), enabled: () => st.arrived && game.player.root.position.z > LZ },
    foodbag: { label: 'Her lunch bag', verb: 'Catch', kind: 'thing small', anchor: (v) => { foodBag.getWorldPosition(v); v.y += 0.35; return v; }, ...at(1.62, -0.35, 1.62, -(LZ - 0.26)), enabled: () => bagWobble },
    stander: { label: 'Man with a bag', kind: 'person small', anchor: rigAnchor(stander), ...at(3.3, -0.45, 3.58, -0.78), enabled: () => stander.root.visible },
    platform: { label: 'Platform', kind: 'thing small', anchor: carPt(DOOR_X, 0.3, LZ + 1.2), ...at(DOOR_X, LZ + 1.0, DOOR_X, LZ + 1.5), noMarker: true },
  };
  const zones = { door_zone: (x, z) => st.door > 0.3 && z > LZ - 0.35 && Math.abs(Math.abs(x) - DOOR_X) < 0.45,
    // standing on the free seat's floor spot (seat_far_r)
    free_seat: (x, z) => Math.hypot(x - 1.58, z - (-(LZ - 0.24) + 0.55)) < 0.3 };

  function standUp(r) {
    r.seated = false; r.root.position.y = 0; for (const l of r.legs) l.rotation.set(0, 0, 0); for (const k of r.knees) k.rotation.set(0, 0, 0); for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.head.rotation.set(0, 0, 0); r.act = null;
    r.root.position.z += Math.sign(-r.root.position.z) * 0.4;
  }

  let simT = 0;
  const _camDir = new THREE.Vector3();
  const CLOSE_LO = +(new URLSearchParams(location.search).get('closeLo') || 42), CLOSE_HI = +(new URLSearchParams(location.search).get('closeHi') || 48);   // camera pitch (deg) where the car closes
  const P = {
    // colour grade (js/post.js): muted like the lobby, a warm key, the sea kept from going cyan
    grade: { exposure: 1.0, temp: 0.03, sat: 0.9, contrast: 1.05, shadowTint: [-0.004, 0.0, 0.014], highTint: [0.018, 0.008, -0.01], vignette: 0.24, bloom: 0.3, bloomThreshold: 0.9, focusBand: 0.28 },
    scene, camera, cam, space, nav, sun, charScale: 1, floorY: 0,
    start: [-0.2, 0.1], startFacing: 0.0, things, people, spots, zones, seats,
    beforeAO: new (class extends Pass { constructor() { super(); this.needsSwap = false; } render() { car.proxy.visible = false; } })(),
    beforeRender() { car.proxy.visible = !st.departing; },
    fit,
    pick(rc) {
      const floorM = car.root.getObjectByName('floor');
      const hit = rc.intersectObject(floorM, false)[0];
      if (hit) return car.root.worldToLocal(hit.point.clone());
      if (st.arrived) { const p = new THREE.Vector3(); if (rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return car.root.worldToLocal(p); }
      return null;
    },
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id]; if (!r || !r.hips) return Promise.resolve();
      if (r.seated !== false && r.root.position.y > 0.01) standUp(r);
      return walkPerson(r, route(nav, r.root.position, [x, z]), { speed: speed || 1.2, blobM: r.blob });
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId]; if (!s) return;
      if ((id === 'eric' || id === 'player')) {
        if (s.bag !== undefined) { const b = bagObjs[s.bag]; b.visible = false; b.userData.blob.visible = false; }
        if (s.props) { folder.visible = false; if (cupSt.state !== 'safe') cup.visible = false; }
        if (game.mioNpc.root.visible && seatId === 'seat_far_r') { /* keep the laptop on Mio's lap */ }
        await game.walkTo(s.x, s.z + (s.side < 0 ? 0.55 : -0.55));
        const m = game.player; m.seated = true;
        m.sitAt(s.x, SEAT_Y, s.z - s.side * 0.02, s.side < 0 ? 0 : Math.PI); game.walker.facing = m.root.rotation.y;
        return;
      }
    },
    async standPerson(id) {
      if ((id === 'eric' || id === 'player')) { const m = game.player; if (!m.seated) return; for (const b of bagObjs) { b.visible = true; b.userData.blob.visible = true; } await standOut(game, m, m.root.position.z < 0 ? 0.55 : -0.55); return; }
      const r = people[id]; if (r && r.hips) standUp(r);
    },
    update(dt, t) {
      // cut-away for the steep play camera, the closed car for shallow shots from outside (the title) and while it
      // pulls out of the station
      { camera.getWorldDirection(_camDir); const elev = Math.asin(Math.max(-1, Math.min(1, -_camDir.y))) * 180 / Math.PI;
        const want = st.leaving ? 1 : 1 - THREE.MathUtils.smoothstep(elev, CLOSE_LO, CLOSE_HI);
        st.closedK = st.closedK === undefined ? want : st.closedK + (want - st.closedK) * Math.min(1, dt * (st.leaving ? 2.5 : 6));
        car.setClosed(st.closedK);
        for (const l of doorLamps) l.visible = l.userData.upper ? st.closedK > 0.5 : l.userData.lower ? st.closedK <= 0.5 : true; }
      simT += dt;
      // speed: cruise, brake into the station, stop, leave
      if (st.mode === 'brake') {
        const rem = st.stopAt - st.dist;
        st.v = Math.sqrt(Math.max(0, 2 * st.decel * rem));
        if (rem < 0.01) { st.v = 0; st.mode = 'stopped'; st.dist = st.stopAt; onStop(); }
      }
      st.dist += st.v * dt;
      const k = st.v / SPEED;
      world.update(st.dist / SPEED, camera); U.uTime.value = simT; carDust.userData.update(simT);
      station.position.x = st.stopX - st.dist;
      const tj = st.dist / SPEED;
      const m = carMotion(tj, simT, Math.max(0.04, k));
      applyMotion(pivot, m);
      for (const n of neighbours) { const mn = carMotion(tj - n.lag + 5, simT + 5, Math.max(0.04, k)); applyMotion(n.pivot, mn); n.bellows.rotation.x = (m.roll + mn.roll) / 2; n.bellows.position.y = (m.y + mn.y) / 2; }
      const latVel = (m.z - prevM.z) / Math.max(dt, 1e-3), bump = (m.y - prevM.y) / Math.max(dt, 1e-3), rollVel = (m.roll - prevM.roll) / Math.max(dt, 1e-3);
      const brakeKick = st.mode === 'brake' ? -st.decel * 0.05 : 0;
      for (const s of car.straps) {
        const wv = 6.2 + (s.ph % 1.3), zeta = 0.09;
        s.v += (-(wv * wv) * (s.a - (-m.roll * 7 - latVel * 2.5 - rollVel * 0.6)) - 2 * zeta * wv * s.v) * dt; s.a += s.v * dt;
        s.w += (-(wv * wv) * (s.b - (-m.pitch * 6 + bump * 1.2 * (0.6 + 0.4 * Math.sin(s.ph)) + brakeKick)) - 2 * zeta * wv * s.w) * dt; s.b += s.w * dt;
        s.piv.rotation.x = s.a + 0.03 * Math.sin(simT * 1.3 + s.ph); s.piv.rotation.z = s.b;
      }
      for (const nd of car.nodders) { nd.obj.rotation.z = -m.roll * 4 * nd.k + Math.sin(simT * 1.7) * 0.015 * nd.k; nd.obj.rotation.x = bump * 0.5 * nd.k; }
      for (const p of list) { if (p.torso && p.breath) p.torso.scale.y = 1 + p.breath * Math.sin(simT * 1.7 + p.ph); if (p.act) p.act(simT, p, m.roll); }
      const tc = (simT + 0.8) % 3.4;
      kitty.userData.tail.rotation.y = tc < 0.6 ? Math.sin(tc / 0.6 * Math.PI * 2) * 0.35 : Math.sin(simT * 0.8) * 0.05;
      kitty.userData.tip.rotation.y = tc < 0.6 ? Math.sin(tc / 0.6 * Math.PI * 2 - 0.8) * 0.6 : 0;
      kitty.userData.head.rotation.x = Math.sin(simT * 0.35) * 0.05;
      if (bagWobble) { foodBag.rotation.x = Math.sin(simT * 7) * 0.12; foodBag.rotation.z = -0.15 + Math.sin(simT * 5.3) * 0.05; }
      sun.intensity = 5.6 * (1 - 0.12 * world.pillarNear() * k) * (station.visible && Math.abs(station.position.x) < PL / 2 + 4 ? 0.85 : 1);
      if (st.v > 0.5) { const j = Math.floor(tj / JOINT); if (j !== lastJ) { lastJ = j; if (k > 0.3) sfx('clack'); } }
      prevM = m;
      // doors
      if (st.chimeT >= 0) { st.chimeT += dt; if (st.chimeT > 3 && !st.hold) st.doorWant = 0; }
      // while they creep shut the closing chime keeps going, so a kotodama can cut it off mid-note
      if (st.slide) { st.chimeLoop = (st.chimeLoop ?? 2.2) - dt; if (st.chimeLoop <= 0) { st.chimeLoop = 2.6; sfx('chime'); } }
      if (st.slide) { const s = st.slide; s.t += dt; const k = Math.min(1, s.t / s.dur); st.door = s.from + (s.to - s.from) * k; if (k >= 1) st.slide = null; }
      else if (!st.frozen) st.door += (st.doorWant - st.door) * Math.min(1, dt * (st.doorWant ? 3 : 2));
      if (st.hold && st.door < st.holdAt) st.door = st.holdAt;
      setDoors(st.door);
      if (st.door > 0.3) nav.unblock('doors');
      else if (!nav.rects.some((r) => r.tag === 'doors')) nav.blockTagged('doors', -LX, LX + 8, LZ - 0.02, LZ + T + 0.06);
      stepPeople([...list, rei], dt);
      if (cupSt.state === 'tip') { cupSt.k += (cupSt.want - cupSt.k) * Math.min(1, dt * 3); cup.rotation.z = -cupSt.k * 0.5 + Math.sin(simT * 9) * 0.04 * cupSt.k; }
      const p = game.player.root.position;
      if (aoi.lookTarget) lookAt(aoi, aoi.lookTarget[0], aoi.lookTarget[1], 1);
      else if (!aoi.act && Math.hypot(p.x - aoi.root.position.x, p.z - aoi.root.position.z) < 2) lookAt(aoi, p.x, p.z, 0.8);
    },
    hooks: {
      announce: ({ text, voice: v }) => ui.board(text, { voiceKey: v }),
      arrive: () => {
        station.visible = true;
        st.decel = 1.15; st.mode = 'brake';
        const D = (st.v * st.v) / (2 * st.decel);
        st.stopAt = st.dist + D; st.stopX = st.stopAt;           // the station's centre lines up with the car when stopped
        sfx('brake'); game.event('approach');
      },
      doorsOpen: () => { st.doorWant = 1; st.chimeT = -1; st.hold = false; st.slide = null; st.frozen = false; sfx('door'); },
      // { to, ms }: a slow, steady slide from where they are to `to` (1 open, 0 shut) over ms; without ms, the quick close
      doorsClose: ({ to = 0, ms } = {}) => {
        st.hold = false; st.chimeT = -1; st.doorWant = to;
        if (ms) { st.slide = { from: st.door, to, t: 0, dur: ms / 1000 }; sfx('doorslow'); } else { st.slide = null; sfx('door'); } // the story frames the shot itself (Jørgen missed the man when it jumped to the door)
      },
      chime: () => { st.chimeT = 0; sfx('chime'); game.event('chime'); },
      // kotodama: they freeze dead where they are, with the effect; otherwise they bounce back a little, as before
      doorsHold: async ({ kotodama } = {}) => {
        st.slide = null; st.hold = true; st.chimeT = -1;
        if (kotodama) { st.holdAt = st.door; st.doorWant = st.door; st.frozen = true; await game.kotodama(myLeaves.map((d) => d.g), { pulse: myLeaves.filter((d) => d.x0 < 0).map((d) => d.g) }); return; } // the camera stays on the door until the story pulls back
        st.holdAt = Math.max(0.45, st.door); st.doorWant = st.holdAt; sfx('no');
      },
      // everyone still in the car gets off, a second or so apart: up, to the nearest open door, out and along the
      // platform to the walkway, then gone. Resolves when only `except` (and Eric and Mio) are left.
      alight: async ({ except = [] } = {}) => {
        const skip = new Set(except);
        const leaving = Object.entries(people).filter(([id, r]) => !skip.has(id) && r && r.hips && r.root.visible && r.root.position.z < LZ);
        const walks = leaving.map(([id, r], i) => (async () => {
          await game.wait(250 + i * 900);
          if (r.root.position.y > 0.01) standUp(r);
          r.act = null;
          const dx = r.root.position.x < 0 ? -DOOR_X : DOOR_X;
          await walkPerson(r, [...route(nav, r.root.position, [dx, LZ - 0.4]), [dx, LZ + 1.0], [dx + 1.2, LZ + 1.45], [7.6, LZ + 1.5], [8.4, LZ + 1.9]], { speed: 1.35, blobM: r.blob });   // along the platform clear of the sign posts
          r.root.visible = false; if (r.blob) r.blob.visible = false;
        })());
        await Promise.all(walks);
      },
      // the empty car pulls out and away; people on the platform (Eric, Mio, whoever got off) stay where they are
      depart: async () => {
        st.leaving = true;
        const stay = new Set([game.player.root, game.mioNpc.root, kitty, kb]);
        for (const r of Object.values(people)) if (r && r.root && r.root.position.z > LZ + T) { stay.add(r.root); if (r.blob) stay.add(r.blob); }
        // the shadow proxy (roof and full walls for the sun) goes too, hidden: it shows in the AO pass once it moves
        if (car.proxy) { car.proxy.visible = false; stay.add(car.proxy); }
        const movers = car.root.children.filter((o) => !stay.has(o));   // the closed overlay is a child of the car, so it leaves with it
        const x0 = movers.map((o) => o.position.x), n0 = neighbours.map((n) => n.pivot.position.x), b0 = neighbours.map((n) => n.bellows.position.x);
        sfx('brake'); st.departing = true;
        await game.tween(7, (k) => {
          const d = -34 * k * k;                           // a slow start, then away
          movers.forEach((o, i) => { o.position.x = x0[i] + d; });
          neighbours.forEach((n, i) => { n.pivot.position.x = n0[i] + d; n.bellows.position.x = b0[i] + d; });
        });
        for (const o of movers) if (!o.isLight) o.visible = false;
        for (const n of neighbours) { n.pivot.visible = false; n.bellows.visible = false; }
        st.departed = true;
      },
      wake: ({ who = 'kuroda' }) => { const r = people[who]; if (!r || !r.hips) return; r.act = null; r.head.rotation.set(0.1, 0, 0); },
      bag: async ({ state }) => {
        const p0 = foodBag.position.clone(); bagWobble = false; foodBag.rotation.x = 0;
        // teeter: slides to the front edge of the free seat and wobbles there until it's caught or knocked off
        if (state === 'teeter') {
          sfx('clack');
          await game.tween(0.6, (k) => { foodBag.position.set(p0.x, SEAT_Y, p0.z + 0.2 * k); foodBag.rotation.z = -0.15 * k; });
          bagWobble = true; return;
        }
        if (state === 'slide') {
          sfx('clack');
          await game.tween(0.7, (k) => { foodBag.position.set(p0.x + 0.05 * k, SEAT_Y + 0.02 * Math.sin(k * Math.PI) - SEAT_Y * k * k, p0.z + 0.5 * k); foodBag.rotation.z = -1.2 * k; });
        } else if (state === 'caught') {
          await game.tween(0.4, (k) => { foodBag.position.set(p0.x + (2.5 - p0.x) * k, p0.y + (SEAT_Y - p0.y) * k + 0.1 * Math.sin(k * Math.PI), p0.z + (-(LZ - 0.26) - p0.z) * k); foodBag.rotation.z *= 1 - k; });
        } else if (state === 'dropped') {
          sfx('tap'); await game.tween(0.3, (k) => { foodBag.position.y = p0.y * (1 - k); foodBag.rotation.z = -1.2 - 0.37 * k; });
        }
      },
      cup: ({ state }) => {
        cupSt.state = state;
        if (state === 'tip') { cupSt.want = 1; sfx('no'); }
        if (state === 'safe') { cupSt.want = 0; cup.rotation.set(0, 0, 0); if (rei.root.visible) { cup.position.set(0.08, 0.14, 0.18); rei.torso.add(cup); } else { cup.position.set(2.32, SEAT_Y + 0.02, -(LZ - 0.3)); } }
      },
      catTo: async ({ to }) => { const p = game.posOf(to); if (!p) return; await glide(game, kitty, p, 1.0); kitty.position.y = 0; },
    },
    onEnter: async () => {},
    // Mio (the Meshy model) sits where the laptop woman sat, laptop on her knees
    placeMio(m) {
      rei.root.visible = false; rei.blob.visible = false; if (list.includes(rei)) list.splice(list.indexOf(rei), 1);
      m.root.visible = true; m.sitAt(2.1, SEAT_Y, -(LZ - 0.24) + 0.02, 0); m.seated = true;
      car.root.attach(laptop); laptop.position.set(2.1, SEAT_Y + 0.2, -(LZ - 0.24) + 0.3); laptop.rotation.set(0, 0, 0);
    },
    capState(s) {
      if (s.startsWith('dk')) { P.capState('stopped'); st.door = st.doorWant = +s.slice(2); setDoors(st.door); }   // QA: doors at k (0 shut .. 1 open)
      if (s === 'stopped') { station.visible = true; st.mode = 'stopped'; st.v = 0; st.stopX = st.dist; st.arrived = true; st.door = 1; st.doorWant = 1; setDoors(1); }
      if (s === 'platform') { P.capState('stopped'); game.player.root.position.set(DOOR_X, 0, LZ + 1.0); }
      if (s === 'sit') { const q = seats.seat_far_r; folder.visible = false; cup.visible = false; const m = game.player; m.seated = true; m.sitAt(q.x, SEAT_Y, q.z + 0.02, 0); game.walker.facing = 0; }
    },
    // leaving: out onto the platform if she isn't there yet, then along it to the covered walkway
    async tripOut(g, slot) {
      const mio = g.player; mio.scripted = true;
      if (mio.seated) await P.standPerson('eric');
      const p = mio.root.position;
      mio.setState('walk');
      if (p.z < LZ + 0.2) { const dx = Math.abs(p.x - DOOR_X) < Math.abs(p.x + DOOR_X) ? DOOR_X : -DOOR_X; await glide(g, mio.root, [dx, LZ - 0.35], 1.4); await glide(g, mio.root, [dx, LZ + 0.9], 1.4); }
      for (const id of withList(slot)) {
        const r = people[id] || (id === 'mio' ? game.mioNpc : null); if (!r) continue;
        // Mio (Meshy): out of the car if she's still in it, then beside Eric (a body to his left, a step behind), never on his line
        if (r.meshy) {
          (async () => {
            if (r.seated) await standOut(game, r, 0.5);
            r.root.visible = true;
            if (r.root.position.z < LZ) { await glide(game, r.root, [DOOR_X - 0.3, LZ - 0.3], 1.4); await glide(game, r.root, [DOOR_X - 0.3, LZ + 1.3], 1.4); }
            else await g.wait(350);
            await walkRig(game, r, [7.0, LZ + 2.2], { speed: 1.45, route: false });   // steers round Eric
            r.setState('idle'); r.setGait?.(null);
          })();
          continue;
        }
        if (!r.hips) continue;
        r.root.visible = true; if (r.blob) r.blob.visible = true;
        const go = () => walkPerson(r, [[DOOR_X - 0.3, LZ + 1.3], [7.6, LZ + 1.7]], { speed: 1.45, blobM: r.blob });
        if (r.root.position.z < LZ) P.walkPerson(id, [DOOR_X - 0.3, LZ - 0.3]).then(go); else go();
      }
      cam.closeOn([p.x, LZ + 1.0], 1.35);
      const follow = setInterval(() => { cam.close = { x: mio.root.position.x, z: LZ + 1.0, zoom: 1.35 }; }, 50);
      await glide(g, mio.root, [7.4, LZ + 1.5], 1.45);
      clearInterval(follow);
      mio.setState('idle');
    },
  };
  function onStop() {
    st.arrived = true; flags.arrived = true;
    sfx('brake');
    P.hooks.doorsOpen();
    game.event('arrived');
  }
  st.stopX = 1e6; P._st = st; P._setDoors = setDoors;
  P.kotodamaTargets = (name) => (name === 'doors' ? myLeaves.map((d) => d.g) : []);
  kitty.userData.tail.rotation.y = 0;
  return P;
}
// Mio's sitting pose on a bench: offsets from the seat top (tuned against screenshots)
const _q = new URLSearchParams(location.search);
export const MIO_SIT = { y: _q.has('sy') ? +_q.get('sy') : -0.36, dz: _q.has('sdz') ? +_q.get('sdz') : 0.1 };
