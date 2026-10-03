import { eventId } from '../narrative/events.js';
import { flagKeys } from '../narrative/engine-flags.js';
const ENGINE_KEYS = flagKeys('game3d/js/places/train.js');
import { PLACE_DETAILS } from './catalog.js';
import { snapshotPeople, restorePeople, snapshotObject, restoreObject } from './saved-people.js';
// Place 1, the train. The car, its passengers and its motion come from side/train (copied into js/train/
// unchanged); this file only recolours it to the muted palette (colours and light only), adds Mio as the
// player, the company station with its platforms, the doors and the walk out to the covered walkway.
// Every word said here comes from game3d/story/train.js (placeholder: story/placeholder/train.js).
import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { buildWorld, SPEED } from '../train/world.js';
import { buildRideIsland, startRunIn, runIn } from '../train/island.js';
import {
  buildCar,
  buildBellows,
  bagMesh,
  LX,
  LZ,
  T,
  SEAT_Y,
  BENCH_D,
  BENCHES,
  DOOR_X,
  DOOR_W,
  NEAR_END,
  COL,
  mat as carMat,
} from '../train/car.js';
import { buildDoorSets, lampShut, lampOpen } from '../train/doors.js';
import { swingStraps } from '../train/straps.js';
import { buildPassengers, cat, walkPose, HIP, sit, armsHold } from '../train/people.js';
import { PEOPLE } from '../cast.js';
import { Nav, blob } from '../engine.js';
import { ui, sfx } from '../ui.js';
import { walkPerson, stepPeople, lookAt } from '../story.js';
import { rbox, mat, emissive, textTexture, plane, JP_FONT, plant as propPlant } from '../props.js';
import { glide, withList } from './lobby.js';
import { standOut, walkRig } from '../move.js';
import { damp, goalSpot, keepEric, pulled, widenTo } from '../cam.js';
import { flags } from '../narrative/state.js';
import { dust, lightPool } from './life.js';
import { route } from './route.js';
import { trainDiscoveries } from '../train/discoveries.js';
const WALK_X = -10.4; // the walkway out: past the car's left end, south (CHUNKS.train turn 270) toward the shed's stairs

// Muted palette, after game3d/ref/2-security-gate-muted.png (Jørgen: "mute train too"): slate and charcoal,
// dark navy seats, a calmer floor. Only colours; set before the car is built.
Object.assign(COL, {
  shell: '#a7afba',
  shellDark: '#838b97',
  inner: '#bdbab5',
  floor: '#aea9a2',
  stripe: '#445d7d',
  seat: '#37425c',
  seatBack: '#313b53',
  seatBase: '#747b86',
  metal: '#aeb4bc',
  strap: '#707984',
  loop: '#dde1e6',
  frame: '#aab1ba',
  lamp: '#ffe7c6',
  door: '#b6bcc5',
  rack: '#9ea6b1',
});

export async function trainPlace(game) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3f5a6b');

  // light: a slightly dimmer, cooler car with warm low sun through the far windows
  const SUN_DIR = new THREE.Vector3(-0.45, 0.62, -0.75).normalize();
  scene.add(new THREE.HemisphereLight('#c3ccd8', '#8a8078', 1.9));
  const sun = new THREE.DirectionalLight('#ffc98f', 5.6);
  sun.position.copy(SUN_DIR).multiplyScalar(22);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 7, bottom: -7, near: 8, far: 40 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 5;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#dfe7ff', 0.45);
  fill.position.set(0.3, 1, 0.9);
  scene.add(fill);

  const world = buildWorld(scene, { sunDir: SUN_DIR });
  const U = world.sea.material.uniforms;
  U.uDeep.value.set('#132a36');
  U.uMid.value.set('#1d3d4c');
  U.uShallow.value.set('#34596a');
  U.uFoam.value.set('#b9c6cc');
  U.uShadow.value.set('#162430'); // slate sea (production grade)

  const pivot = new THREE.Group();
  pivot.position.y = -0.6;
  scene.add(pivot);
  const car = buildCar('land');
  car.root.position.y = 0.6;
  pivot.add(car.root);
  for (const x of [-2.0, 2.0]) {
    const p = new THREE.PointLight('#ffc07a', 0.8, 3.6, 1.6);
    p.position.set(x, 1.0, 0);
    car.root.add(p);
  }
  {
    const p = new THREE.PointLight('#dfe6ff', 0.9, 2.2, 1.6);
    p.position.set(3.2, 1.1, -0.2);
    car.root.add(p);
  } // fill by the far-right door
  const neighbours = [];
  for (const s of [-1, 1]) {
    const nPivot = new THREE.Group();
    nPivot.position.set(s * (2 * (LX + T) + 0.52), -0.6, 0);
    // the neighbours are closed cars, the same build as ours with its walls up and a roof (Jørgen: the open one
    // behind "looks like some sort of pavilion")
    const nc = buildCar('closed', { furnished: false });
    nc.root.remove(nc.proxy);
    const grey = new THREE.Color('#7f8896');
    nc.root.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        if (o.material.color && !o.material.transparent) o.material.color.lerp(grey, 0.25).multiplyScalar(0.9);
        if (o.material.emissive) o.material.emissiveIntensity *= 0.5;
      }
    });
    nc.root.position.y = 0.6;
    nPivot.add(nc.root);
    scene.add(nPivot);
    const b = buildBellows();
    b.position.set(s * (LX + T + 0.26), 0, 0);
    scene.add(b);
    neighbours.push({ pivot: nPivot, lag: s * 0.34, bellows: b });
  }

  // passengers, cat and bags as in side/train
  const list = buildPassengers(LZ, SEAT_Y);
  const [kuroda, aoi, reader, music, stander, bun, youth] = list;
  const blobs = {};
  for (const p of list) {
    car.root.add(p.root);
    const seated = p.seated;
    const b = blob(0.5, seated ? 0.3 : 0.4);
    b.position.set(p.root.position.x, 0.004, p.root.position.z + (seated ? Math.sign(-p.root.position.z) * 0.26 : 0));
    car.root.add(b);
    p.blob = b;
  }
  blobs.kuroda = kuroda.blob;
  blobs.aoi = aoi.blob;
  const kitty = cat();
  kitty.scale.setScalar(1.15);
  kitty.position.set(-0.85, SEAT_Y, -(LZ - 0.24));
  kitty.rotation.y = 0.2;
  car.root.add(kitty);
  const kb = blob(0.42, 0.3);
  kb.position.set(-0.85, SEAT_Y + 0.003, -(LZ - 0.24));
  car.root.add(kb);
  const bags = [
    ['brief', '#5b4336', -2.12, -1, 0.1],
    ['tote', '#b88563', -1.3, -1, -0.2],
    ['tote', '#2f3446', -2.08, 1, 0.3],
    ['brief', '#6b4a36', 2.12, 1, -0.1],
    ['pack', '#3f4656', -1.3, 1, 0.15],
    ['tote', '#7a6a5a', 1.4, 1, -0.2],
  ];
  const bagObjs = [];
  for (const [k, c, x, side, ry] of bags) {
    const b = bagMesh(k, c);
    b.position.set(x, SEAT_Y, side * (LZ - 0.24));
    b.rotation.y = ry + (side > 0 ? Math.PI : 0);
    car.root.add(b);
    car.nodders.push({ obj: b, k: 0.25 });
    bagObjs.push(b);
    const sb = blob(0.36, 0.35);
    sb.position.set(x, SEAT_Y + 0.003, side * (LZ - 0.24));
    car.root.add(sb);
    b.userData.blob = sb;
  }

  // Jørgen: the dark standing man by the far door read as a burglar; he's gone
  stander.root.visible = false;
  if (stander.blob) stander.blob.visible = false;
  list.splice(list.indexOf(stander), 1);
  // Rei (the writer's train conversation) takes the headphone girl's place on the far bench, laptop on
  // her knees, her folder and a lidded coffee on the free seat beside her
  // the girl with headphones moves to the near bench (seen from behind), still nodding along
  music.root.position.set(0.75, music.root.position.y, LZ - 0.24);
  music.root.rotation.y = Math.PI;
  music.blob.position.set(0.75, 0.004, LZ - 0.5);
  const rei = PEOPLE.rei();
  sit(rei);
  armsHold(rei, -1.05, 0.5);
  rei.seated = true;
  rei.root.position.set(2.1, rei.root.position.y, -(LZ - 0.24));
  rei.root.rotation.y = 0;
  car.root.add(rei.root);
  rei.head.rotation.x = -0.2;
  rei.breath = 0.012;
  list.push(rei);
  {
    const b = blob(0.5, 0.3);
    b.position.set(2.1, 0.004, -(LZ - 0.24) + 0.26);
    car.root.add(b);
    rei.blob = b;
  }
  const laptop = new THREE.Group();
  {
    // keyboard on the lap, hinge at the far edge, screen tilted back and facing the sitter (who faces +z... so -z)
    const base = rbox(0.24, 0.015, 0.16, '#b9bec6', { r: 0.006 });
    const kb = rbox(0.2, 0.004, 0.08, '#3a3f48', { y: 0.015, z: -0.02, r: 0.002, cast: false });
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.015, 0.08);
    hinge.rotation.x = 0.3;
    const lid = rbox(0.24, 0.16, 0.012, '#c9ced6', { r: 0.006 });
    lid.position.z = 0.006;
    hinge.add(lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.13), emissive('#cfe4ff', '#9fc8ff', 0.8));
    scr.rotation.y = Math.PI;
    scr.position.set(0, 0.08, -0.002);
    hinge.add(scr);
    laptop.add(base, kb, hinge);
  }
  laptop.position.set(0, 0.02, 0.2);
  rei.torso.add(laptop);
  const folder = rbox(0.22, 0.025, 0.3, '#2f3a55', { x: 1.55, y: SEAT_Y, z: -(LZ - 0.26), r: 0.008 });
  car.root.add(folder);
  const cup = new THREE.Group();
  {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.12, 12), mat('#f1ede6'));
    body.position.y = 0.06;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.02, 12), mat('#3a3f48'));
    lid.position.y = 0.125;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.04, 0.05, 12), mat('#9a7a58'));
    sleeve.position.y = 0.06;
    for (const m of [body, lid, sleeve]) {
      m.castShadow = true;
      cup.add(m);
    }
  }
  cup.position.set(1.6, SEAT_Y + 0.025, -(LZ - 0.28));
  car.root.add(cup);
  const cupSt = { want: 0, k: 0 };
  // Mio's bag of food from her mother, on the free seat beside her (the folder and cup were Rei's; Mio has the seat now)
  folder.visible = false;
  cup.visible = false;
  const foodBag = new THREE.Group();
  let bagWobble = false,
    bagMotion = null;
  {
    const b = rbox(0.24, 0.2, 0.14, '#c9b48d', { r: 0.03 });
    const band = rbox(0.245, 0.04, 0.145, '#b8573f', { y: 0.12, r: 0.01 });
    const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 5, 10, Math.PI), mat('#8a6c4a'));
    h1.position.y = 0.2;
    const lid = rbox(0.1, 0.05, 0.09, '#e8e2d0', { y: 0.2, x: 0.05, r: 0.015 });
    foodBag.add(b, band, h1, lid);
  }
  foodBag.position.set(1.62, SEAT_Y, -(LZ - 0.26));
  car.root.add(foodBag);

  // ---- the station: platforms both sides, yellow tactile strips, the sign, a covered walkway exit ----
  const station = new THREE.Group();
  scene.add(station);
  const PL = 34; // platform length
  const edge = LZ + T + 0.08;
  for (const s of [-1, 1]) {
    const w = 3.2;
    const slab = rbox(PL, 0.5, w, '#737a86', { x: 0, y: -0.5, z: s * (edge + w / 2), r: 0.02 });
    station.add(slab);
    slab.receiveShadow = true;
    // edge line and the yellow tactile strip with bumps
    station.add(rbox(PL, 0.012, 0.08, '#e9e6de', { y: 0, z: s * (edge + 0.06), r: 0.004, cast: false }));
    station.add(rbox(PL, 0.012, 0.28, '#a8914f', { y: 0.001, z: s * (edge + 0.55), r: 0.004, cast: false }));
    const dot = new THREE.CylinderGeometry(0.018, 0.018, 0.012, 6);
    const inst = new THREE.InstancedMesh(dot, mat('#977f45'), Math.floor(PL / 0.12) * 3);
    let n = 0;
    const m4 = new THREE.Matrix4();
    for (let x = -PL / 2 + 0.06; x < PL / 2; x += 0.12)
      for (const dz of [-0.08, 0, 0.08]) {
        m4.makeTranslation(x, 0.012, s * (edge + 0.55) + dz);
        inst.setMatrixAt(n++, m4);
      }
    inst.count = n;
    station.add(inst);
    // tile seams
    for (let x = -PL / 2; x <= PL / 2; x += 1.2)
      station.add(
        rbox(0.02, 0.004, w - 0.9, '#666c77', {
          x,
          y: 0.001,
          z: s * (edge + 0.9 + (w - 0.9) / 2),
          r: 0.001,
          cast: false,
        }),
      );
    // canopy posts, benches and bins along the platform
    for (let x = -12; x <= 12; x += 4) {
      station.add(rbox(0.16, 1.9, 0.16, '#6b727d', { x, z: s * (edge + 2.35), r: 0.03 }));
      if (x % 8 === 0) {
        const bn = new THREE.Group();
        bn.add(
          rbox(1.0, 0.07, 0.36, '#37425c', { y: 0.2, r: 0.02 }),
          rbox(1.0, 0.3, 0.06, '#313b53', { y: 0.24, z: s * 0.17, r: 0.02 }),
          rbox(0.05, 0.22, 0.34, '#747b86', { x: -0.45, r: 0.01 }),
          rbox(0.05, 0.22, 0.34, '#747b86', { x: 0.45, r: 0.01 }),
        );
        bn.position.set(x + 1.6, 0, s * (edge + 2.2));
        station.add(bn);
      }
    }
    {
      const p = propPlant({ size: 1.1, seed: s > 0 ? 3 : 5 });
      p.position.set(-5.2, 0, s * (edge + 2.5));
      station.add(p);
    }
  }

  // boarding marks at each door position (painted chevrons and a queue line), a timetable board, vending pair and
  // bins on the near platform, so the bands either side of the car read as a working station
  for (const s of [-1, 1])
    for (const dx of [-DOOR_X, DOOR_X]) {
      // painted boarding marks: an arrow either side of the door pointing at it, and a queue line behind each
      for (const k of [-1, 1]) {
        const a = new THREE.Group();
        a.add(rbox(0.06, 0.004, 0.34, '#c9ccd0', { z: 0, r: 0.002, cast: false }));
        for (const w2 of [-1, 1]) {
          const h = rbox(0.06, 0.004, 0.2, '#c9ccd0', { r: 0.002, cast: false });
          h.position.set(w2 * 0.06, 0.002, -s * 0.12);
          h.rotation.y = w2 * s * 0.7;
          a.add(h);
        }
        a.position.set(dx + k * 0.45, 0.002, s * (edge + 0.95));
        station.add(a);
        station.add(
          rbox(0.5, 0.004, 0.05, '#aeb2b8', {
            x: dx + k * 0.45,
            y: 0.002,
            z: s * (edge + 1.45),
            r: 0.001,
            cast: false,
          }),
        );
      }
    }
  let timetableTex;
  {
    const tb = new THREE.Group();
    const tt = (timetableTex = textTexture(
      (g, W, H) => {
        g.fillStyle = '#1d2433';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#e0bf4a';
        g.fillRect(0, 0, W, 10);
        for (let i = 0; i < 4; i++) {
          g.fillStyle = i ? '#9fb4cf' : '#f2f4f7';
          g.font = '700 34px ' + JP_FONT;
          g.fillText(['8:42', '8:50', '8:58', '9:06'][i], 24, 58 + i * 46);
          g.fillStyle = '#6f86a6';
          g.fillRect(140, 38 + i * 46, 150 + ((i * 37) % 60), 12);
          g.fillStyle = i ? '#46d18a' : '#e0bf4a';
          g.fillRect(W - 60, 40 + i * 46, 30, 12);
        }
      },
      420,
      240,
    ));
    tb.add(rbox(0.06, 1.2, 0.06, '#5b626d', { r: 0.02 }), rbox(1.02, 0.6, 0.06, '#232b3d', { y: 1.0, r: 0.02 }));
    const p = plane(0.94, 0.52, tt, { emissiveK: 0.55 });
    p.position.set(0, 1.3, 0.035);
    tb.add(p);
    tb.position.set(-2.6, 0, edge + 2.55);
    station.add(tb);
  }
  for (const [x, c, lit] of [
    [-7.4, '#2d3b63', true],
    [-6.55, '#8a3b3b', true],
  ]) {
    const vm = new THREE.Group();
    vm.add(rbox(0.8, 1.35, 0.55, c, { r: 0.03 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), emissive('#cfe0f2', lit ? '#9fc2ff' : '#000', 0.8));
    face.position.set(-0.05, 0.85, 0.28);
    vm.add(face);
    const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#f2e2b0'];
    for (let r = 0; r < 3; r++)
      for (let q = 0; q < 4; q++)
        vm.add(
          rbox(0.09, 0.13, 0.03, cols[(r * 4 + q) % 5], {
            x: -0.27 + q * 0.14,
            y: 0.63 + r * 0.18,
            z: 0.29,
            r: 0.02,
            cast: false,
          }),
        );
    vm.add(rbox(0.46, 0.12, 0.03, '#15181d', { x: -0.05, y: 0.14, z: 0.29, r: 0.02, cast: false }));
    vm.rotation.y = Math.PI;
    vm.position.set(x, 0, edge + 2.95);
    station.add(vm);
    station.add(lightPool(x, edge + 2.3, 0.8, { k: 0.2, color: '#9fc2ff' }));
  }
  for (const s of [-1, 1])
    for (const x of [-9.8, 5.9]) {
      const bin = new THREE.Group();
      const bz = s > 0 ? edge + 2.2 : edge + 2.75;
      for (const [dx, c] of [
        [-0.14, '#4f6f9a'],
        [0.14, '#6a8f5c'],
      ])
        bin.add(
          rbox(0.24, 0.5, 0.24, c, { x: dx, r: 0.03 }),
          rbox(0.2, 0.02, 0.2, '#2c3038', { x: dx, y: 0.5, r: 0.01, cast: false }),
        );
      bin.position.set(x, 0, s * bz);
      station.add(bin);
    }

  // coping: a pale concrete lip along each platform edge, and the far platform gets its own timetable, vending and planters
  for (const s of [-1, 1])
    station.add(rbox(PL, 0.03, 0.16, '#a9adb3', { y: -0.02, z: s * (edge + 0.02), r: 0.01, cast: false }));
  {
    const tb = new THREE.Group();
    tb.add(rbox(0.06, 1.2, 0.06, '#5b626d', { r: 0.02 }), rbox(1.02, 0.6, 0.06, '#232b3d', { y: 1.0, r: 0.02 }));
    const p = plane(0.94, 0.52, timetableTex, { emissiveK: 0.55 });
    p.position.set(0, 1.3, 0.035);
    tb.add(p);
    tb.position.set(-6.2, 0, -(edge + 2.7));
    station.add(tb);
  }
  {
    const vm = new THREE.Group();
    vm.add(rbox(0.8, 1.35, 0.55, '#2d3b63', { r: 0.03 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.7), emissive('#cfe0f2', '#9fc2ff', 0.8));
    face.position.set(-0.05, 0.85, 0.28);
    vm.add(face);
    const cols = ['#e46a5a', '#f0b64a', '#5aa35d', '#4e8fd1', '#f2e2b0'];
    for (let r = 0; r < 3; r++)
      for (let q = 0; q < 4; q++)
        vm.add(
          rbox(0.09, 0.13, 0.03, cols[(r * 4 + q) % 5], {
            x: -0.27 + q * 0.14,
            y: 0.63 + r * 0.18,
            z: 0.29,
            r: 0.02,
            cast: false,
          }),
        );
    vm.position.set(6.4, 0, -(edge + 2.95));
    station.add(vm);
    station.add(lightPool(6.4, -(edge + 2.3), 0.8, { k: 0.2, color: '#9fc2ff' }));
  }
  for (const x of [-1.2, 4.6, 10.4]) {
    const p = propPlant({ size: 1.0, seed: 7 + Math.round(x) });
    p.position.set(x, 0, -(edge + 2.75));
    station.add(p);
  }
  for (const x of [-9.2, 0.2, 12.0]) {
    const p = propPlant({ size: 0.9, seed: 9 + Math.round(x) });
    p.position.set(x, 0, edge + 2.2);
    station.add(p);
  }
  // light spilling out of each open door onto the platform
  const doorSpill = [-DOOR_X, DOOR_X].map((dx) => {
    const m = lightPool(dx, LZ + T + 0.7, 0.8, { k: 0.001, sx: 1.2, sz: 1.1, color: '#ffe0b0', y: 0.012 });
    car.root.add(m);
    return m;
  });
  // a canopy over each platform that only the sun sees, so the platforms sit in cool shade as in the reference
  {
    const sm = new THREE.MeshBasicMaterial({ color: '#000', colorWrite: false, depthWrite: false });
    void sm;
  }
  // station signs: one on each platform, facing the camera side
  const signTex = textTexture(
    (g, W, H) => {
      g.fillStyle = '#2c3a55';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f4f7';
      g.fillRect(20, 20, 118, 118);
      g.fillStyle = '#2c3a55';
      g.fillRect(44, 40, 70, 60);
      g.fillRect(52, 104, 16, 16);
      g.fillRect(90, 104, 16, 16);
      g.fillStyle = '#f2f4f7';
      g.fillRect(52, 50, 54, 22);
      g.fillStyle = '#f2f4f7';
      g.font = '700 96px ' + JP_FONT;
      g.textBaseline = 'middle';
      g.fillText('本社', 170, 66);
      g.font = '600 38px ' + JP_FONT;
      g.fillStyle = '#b9c6da';
      g.fillText('HONSHA · Head Office', 172, 132);
      g.fillStyle = '#e0bf4a';
      g.fillRect(0, H - 14, W, 14);
    },
    640,
    170,
  );
  const signs = [];
  for (const [x, s] of [
    [2.6, 1],
    [-2.2, -1],
  ]) {
    const sg = new THREE.Group();
    sg.add(
      rbox(0.08, 1.35, 0.08, '#5b626d', { x: -0.9, r: 0.02 }),
      rbox(0.08, 1.35, 0.08, '#5b626d', { x: 0.9, r: 0.02 }),
    );
    const p = plane(2.1, 0.56, signTex, { emissiveK: 0.25 });
    p.position.set(0, 1.35, 0.05);
    sg.add(p);
    sg.add(rbox(2.16, 0.62, 0.06, '#232b3d', { y: 1.04, r: 0.02 }));
    sg.position.set(x, 0, s * (edge + 1.85));
    if (s < 0) sg.rotation.y = 0;
    station.add(sg);
    signs.push(sg);
  }
  // covered walkway to the company building, at the left end of the near platform (WALK_X)
  const walk = new THREE.Group();
  // cutaway like everything else: posts, a low glass side and the sign, no roof over the player
  walk.add(
    rbox(3.2, 0.1, 0.12, '#6b727d', { y: 1.72, z: 1.25, r: 0.03 }),
    rbox(3.2, 0.1, 0.12, '#6b727d', { y: 1.72, z: -1.25, r: 0.03 }),
  );
  walk.add(
    rbox(3.0, 0.5, 0.04, '#c9d6de', {
      y: 0.05,
      z: -1.25,
      r: 0.01,
      m: new THREE.MeshStandardMaterial({ color: '#d5e2ea', transparent: true, opacity: 0.45, roughness: 0.1 }),
    }),
  );
  for (const [dx, dz] of [
    [-1.5, -1.2],
    [1.5, -1.2],
    [-1.5, 1.2],
    [1.5, 1.2],
  ])
    walk.add(rbox(0.12, 1.75, 0.12, '#5b626d', { x: dx, z: dz, r: 0.02 }));
  const wt = textTexture(
    (g, W, H) => {
      g.fillStyle = '#2c3a55';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f4f7';
      g.font = '700 58px ' + JP_FONT;
      g.textBaseline = 'middle';
      g.fillText('← 本社ビル', 24, H / 2);
      g.fillStyle = '#b9c6da';
      g.font = '600 32px ' + JP_FONT;
      g.fillText('To the office', 330, H / 2 + 6);
    },
    560,
    110,
  );
  const wp = plane(1.9, 0.37, wt, { emissiveK: 0.3 });
  wp.position.set(0, 1.5, 1.32);
  walk.add(wp);
  walk.position.set(WALK_X, 0, edge + 1.9);
  station.add(walk);
  station.visible = false;
  const island = buildRideIsland(scene); // the island round the shed, sliding in with the station (train/island.js)

  const carDust = dust([-LX + 0.3, LX - 0.3, 0.15, 1.3, -LZ + 0.3, LZ - 0.3], 70, { opacity: 0.5, size: 0.024 });
  car.root.add(carDust);

  // ---- Mio lives in the car ----
  const space = car.root;
  const nav = new Nav(-LX - 8, LX, -LZ, LZ + 3.2, 0.1);
  nav.R = 0.16;
  for (const [x0, x1] of BENCHES) {
    nav.block(x0 - 0.04, x1 + 0.04, -LZ, -(LZ - BENCH_D) + 0.1);
    nav.block(Math.max(x0, -NEAR_END) - 0.04, Math.min(x1, NEAR_END) + 0.04, LZ - BENCH_D - 0.1, LZ);
  }
  nav.block(-3.85, -3.35, -1.2, -0.58);
  for (const z of [-0.5, 0.5]) nav.block(-0.05, 0.05, z - 0.05, z + 0.05);
  nav.block(-LX - 8, -LX, -LZ, LZ + T + 0.05); // beyond the car end
  // near wall, with gaps at the doors; the gaps and the platform are shut until the doors open
  nav.block(-LX, -DOOR_X - DOOR_W / 2 + 0.05, LZ, LZ + T + 0.05);
  nav.block(-DOOR_X + DOOR_W / 2 - 0.05, DOOR_X - DOOR_W / 2 + 0.05, LZ, LZ + T + 0.05);
  nav.block(DOOR_X + DOOR_W / 2 - 0.05, LX, LZ, LZ + T + 0.05);
  nav.blockTagged('doors', -LX - 8, LX, LZ - 0.02, LZ + T + 0.06);
  nav.block(LX - 0.2, LX, LZ + T, LZ + 3.2);
  nav.extra = (x, z) => {
    if (z > LZ + 0.02) return true;
    const cx = Math.abs(x) - (LX - 0.34),
      cz = Math.abs(z) - (LZ - 0.34);
    return !(cx > 0 && cz > 0 && Math.hypot(cx, cz) > 0.34 - 0.17);
  };

  // the platform-side door sets (train/doors.js), built to the car's doorways
  const { group: doorSets, leaves: myLeaves, lamps: doorLamps } = buildDoorSets();
  car.root.add(doorSets);
  function findDoors() {
    // Jørgen: no visible light fixtures in the car; the point lights stay
    const lm = carMat('lamp', COL.lamp);
    car.root.traverse((o) => {
      if (o.isMesh && o.material === lm) o.visible = false;
    });
  }
  findDoors();
  const st = {
    v: SPEED,
    dist: 0,
    mode: 'cruise',
    brakeFrom: 0,
    stopAt: 0,
    door: 0,
    doorWant: 0,
    hold: false,
    chimeT: -1,
    arrived: false,
  };

  // ---- camera: the whole car on a wide screen, along it on a phone ----
  const camera = new THREE.PerspectiveCamera(20, 16 / 9, 1, 160);
  const cam = {
    camera,
    dir: new THREE.Vector3(),
    dist: 10,
    target: new THREE.Vector3(),
    base: new THREE.Vector3(),
    fitDist: 10,
    follow: false,
    fx: 0,
    close: null,
    place() {
      camera.position.copy(this.target).addScaledVector(this.dir, this.dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(this.target);
      camera.updateMatrixWorld();
    },
    closeOn([x, z], zoom = 1.8) {
      this.close = { x, z, zoom };
    },
    release() {
      this.close = null;
    },
    // follows Eric out of the car too (QA round 1: the phone lost him on the platform), keeps him in view, leans to the
    // goal on a phone, and moves on the critically damped springs of the other places (cam.js damp, keepEric)
    vel: [0, 0, 0, 0],
    smooth: 0.32,
    wanted(p) {
      if (this.close) return widenTo(camera, this.close, this.fitDist, this.follow && p?.z > LZ && p.z);
      const t = this.base.clone();
      if (!p) return [t, this.fitDist];
      const clamp = THREE.MathUtils.clamp,
        out = st.arrived;
      if (this.follow) {
        // phone: the car runs up the screen (x); the platform is off to the side (z)
        let x = p.x + 0.6;
        const gs = goalSpot();
        if (gs) x += clamp((gs[0] - p.x) * 0.35, -1.1, 1.1);
        t.x = clamp(x, out ? -8.2 : -1.7, out ? 4.2 : 2.6);
        if (p.z > LZ) t.z = this.base.z + Math.min(2.4, (p.z - LZ) * 0.9);
      } else if (out && (Math.abs(p.x) > 4.0 || p.z > LZ + 1.0)) {
        // wide screen, off along the platform: shift
        t.x = clamp(p.x * 0.85, -6.5, 3.5);
        t.z = this.base.z + clamp((p.z - LZ - 0.8) * 0.8, 0, 2.0);
      }
      return [keepEric(this, t, p), this.fitDist];
    },
    update(dt, p) {
      if (dt <= 0) return;
      const [t, d] = pulled(this, p),
        s = this.close ? 0.7 : this.smooth;
      this.target.x = damp(this.target.x, t.x, this.vel, 0, s, dt);
      this.target.y = damp(this.target.y, t.y, this.vel, 1, s, dt);
      this.target.z = damp(this.target.z, t.z, this.vel, 2, s, dt);
      this.dist = damp(this.dist, d, this.vel, 3, s * 1.15, dt);
      this.place();
    },
    snap(p) {
      const [t, d] = this.wanted(p);
      this.target.copy(t);
      this.dist = d;
      this.vel.fill(0);
      this.place();
    },
  };
  const _v = new THREE.Vector3();
  // the cut-away for the screen's shape (a portrait phone sees the car from its end)
  function layout(aspect) {
    const mode = aspect >= 1 ? 'land' : 'port';
    if (car.mode !== mode) {
      car.setMode(mode);
      findDoors();
      setDoors(st.door);
    }
    return mode;
  }
  function fit(aspect) {
    const mode = layout(aspect);
    camera.aspect = aspect;
    let pts, limX, limY;
    cam.follow = false;
    if (mode === 'land') {
      camera.fov = 20;
      const elev = THREE.MathUtils.degToRad(58);
      cam.base.set(0, 0.45, 0.1);
      cam.dir.set(0, Math.sin(elev), Math.cos(elev));
      pts = [];
      for (const x of [-4.72, 4.72])
        for (const z of [-LZ - T - 0.3, LZ + T + 0.45]) for (const y of [-0.45, 1.45]) pts.push([x, y, z]);
      limX = 1.0;
      limY = 0.95;
    } else {
      camera.fov = 40;
      const elev = THREE.MathUtils.degToRad(62);
      cam.base.set(0, 0.3, 0.3);
      cam.dir.set(-Math.cos(elev), Math.sin(elev), 0);
      pts = [];
      for (const z of [-LZ - T - 0.42, LZ + T + 0.9]) for (const y of [0, 1.45]) pts.push([0, y, z]);
      limX = 1.0;
      limY = 3;
      cam.follow = true;
    }
    camera.updateProjectionMatrix();
    cam.target.copy(cam.base);
    let lo = 2,
      hi = 120;
    for (let i = 0; i < 40; i++) {
      cam.dist = (lo + hi) / 2;
      cam.place();
      let ok = true;
      for (const p of pts) {
        _v.set(...p).project(camera);
        if (Math.abs(_v.x) > limX || Math.abs(_v.y) > limY) {
          ok = false;
          break;
        }
      }
      if (ok) hi = cam.dist;
      else lo = cam.dist;
    }
    cam.dist = hi;
    cam.fitDist = hi;
    cam.place();
  }

  // ---- motion (side/train's sway, scaled by speed) ----
  const noise = new SimplexNoise({
    random: (() => {
      let s = 7;
      return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })(),
  });
  const JOINT = 1.36,
    BOGIE_GAP = 0.3;
  const ringF = (tb) => (tb < 0 ? 0 : Math.exp(-tb / 0.11) * Math.sin(2 * Math.PI * 4.2 * tb));
  function carMotion(tj, t, k) {
    const tf = ((tj % JOINT) + JOINT) % JOINT,
      tr = (((tj - BOGIE_GAP) % JOINT) + JOINT) % JOINT;
    const rf = ringF(tf) * k,
      rr = ringF(tr) * k;
    return {
      y: 0.026 * (rf + rr) + 0.006 * noise.noise(t * 0.9, 3) * k,
      pitch: 0.006 * (rf - rr),
      roll: (0.011 * noise.noise(t * 0.31, 1) + 0.004 * noise.noise(t * 1.05, 2)) * k + 0.0015 * (rf + rr),
      z: 0.02 * noise.noise(t * 0.22, 5) * k,
      yaw: 0.0012 * noise.noise(t * 0.17, 9) * k,
    };
  }
  const applyMotion = (obj, m) => {
    obj.position.y = -0.6 + m.y;
    obj.position.z = m.z;
    obj.rotation.set(m.roll, m.yaw, m.pitch);
  };
  let prevM = carMotion(0, 0, 1),
    lastJ = 0;

  // the shot for the doors closing on the sleeping man: the left door and Hamada (far bench, x -2.55)
  const DOOR_SHOT = [-2.85, 0.62];
  function setDoors(k) {
    if (st.departing) return;
    for (const d of myLeaves) {
      const toC = -Math.sign(d.x0),
        out = THREE.MathUtils.smoothstep(k, 0, 0.16),
        slide = Math.max(0, (k - 0.16) / 0.84);
      d.g.position.z = d.zShut + out * (d.zSlide - d.zShut);
      d.g.position.x = d.x0 + toC * slide * (d.far ? DOOR_W - 0.01 : DOOR_W / 2 - 0.005);
      d.g.visible = true;
    }
    for (const l of doorLamps) l.material = k > 0.3 ? lampOpen : lampShut;
    for (const m of doorSpill) m.material.color.set('#ffe0b0').multiplyScalar(0.4 * k);
  }

  // ---- people ids for the story ----
  const people = {
    kuroda,
    aoi,
    reader,
    rei,
    music,
    stander,
    bun,
    youth,
    tama: { root: kitty, head: kitty.userData.head },
  };
  // what the passengers can show Eric: their phone and bag hooks (train/discoveries.js)
  const finds = trainDiscoveries(game, { people, car: car.root, nav, SEAT_Y });
  const seats = {
    seat_aoi: { x: -1.25, z: -(LZ - 0.24), side: -1, bag: 1, top: SEAT_Y, ry: 0 },
    seat_far_r: { x: 1.58, z: -(LZ - 0.24), side: -1, props: true, top: SEAT_Y, ry: 0 },
    seat_near_l: { x: -1.3, z: LZ - 0.24, side: 1, bag: 4, top: SEAT_Y, ry: Math.PI },
    seat_near_r: { x: 1.4, z: LZ - 0.24, side: 1, bag: 5, top: SEAT_Y, ry: Math.PI },
    seat_mio: { x: 2.1, z: -(LZ - 0.24), side: -1, top: SEAT_Y, ry: 0 },
  };
  const spots = {
    aisle: [0.4, 0.1],
    door_l: [-DOOR_X, LZ - 0.45],
    door_r: [DOOR_X, LZ - 0.45],
    by_aoi: [-1.7, -0.35],
    by_kuroda: [-2.55, -0.35],
    platform: [DOOR_X, LZ + 1.0],
    walkway: [WALK_X, LZ + 1.9],
    plat_l: [-3.0, 2.2],
    plat_l2: [-2.2, 2.25],
    plat_hamada: [-3.75, 2.35],
  };
  const rigAnchor =
    (rig, h = 1.12) =>
    (v) => {
      rig.root.getWorldPosition(v);
      v.y += h;
      return v;
    };
  const carPt = (x, y, z) => (v) => {
    v.set(x, y, z);
    car.root.localToWorld(v);
    return v;
  };
  const at = (x, z, fx, fz) => ({ spot: () => [x, z], face: () => [fx, fz] });
  const things = {
    aoi: {
      ...PLACE_DETAILS.train.things.aoi,
      anchor: rigAnchor(aoi),
      ...at(-1.7, -0.3, -1.7, -1.0),
      enabled: () => aoi.root.visible,
    },
    kuroda: {
      ...PLACE_DETAILS.train.things.kuroda,
      anchor: rigAnchor(kuroda),
      ...at(-2.55, -0.3, -2.55, -1.0),
      enabled: () => kuroda.root.visible && !kuroda._walk,
    },
    reader: { ...PLACE_DETAILS.train.things.reader, anchor: rigAnchor(reader), ...at(1.05, -0.3, 1.05, -1.0) },
    music: { ...PLACE_DETAILS.train.things.music, anchor: rigAnchor(music), ...at(0.75, 0.35, 0.75, 1.0) },
    rei: {
      ...PLACE_DETAILS.train.things.rei,
      anchor: rigAnchor(rei),
      ...at(2.1, -0.3, 2.1, -1.0),
      enabled: () => rei.root.visible,
    },
    cup: {
      ...PLACE_DETAILS.train.things.cup,
      anchor: carPt(1.6, 0.6, -(LZ - 0.28)),
      ...at(1.6, -0.3, 1.6, -1.0),
      noMarker: true,
    },
    bun: { ...PLACE_DETAILS.train.things.bun, anchor: rigAnchor(bun), ...at(-2.5, 0.35, -2.5, 1.0) },
    youth: { ...PLACE_DETAILS.train.things.youth, anchor: rigAnchor(youth), ...at(2.55, 0.35, 2.55, 1.0) },
    tama: {
      ...PLACE_DETAILS.train.things.tama,
      anchor: carPt(-0.85, 0.5, -(LZ - 0.24)),
      ...at(-0.85, -0.3, -0.85, -1.0),
    },
    doors: {
      ...PLACE_DETAILS.train.things.doors,
      anchor: carPt(DOOR_X, 1.1, LZ),
      ...at(DOOR_X, LZ - 0.22, DOOR_X, LZ),
      enabled: () => st.door > 0.3,
    },
    door_l: {
      ...PLACE_DETAILS.train.things.door_l,
      anchor: carPt(-DOOR_X, 1.1, LZ),
      ...at(-DOOR_X, LZ - 0.45, -DOOR_X, LZ),
      noMarker: true,
    },
    door_r: {
      ...PLACE_DETAILS.train.things.door_r,
      anchor: carPt(DOOR_X, 1.1, LZ),
      ...at(DOOR_X, LZ - 0.45, DOOR_X, LZ),
      noMarker: true,
    },
    plant: {
      ...PLACE_DETAILS.train.things.plant,
      anchor: carPt(-3.6, 0.7, -0.82),
      ...at(-3.2, -0.5, -3.6, -0.82),
      noMarker: true,
    },
    bags: {
      ...PLACE_DETAILS.train.things.bags,
      anchor: carPt(-1.3, 0.5, -(LZ - 0.24)),
      ...at(-1.3, -0.3, -1.3, -1.0),
      noMarker: true,
    },
    rack: { ...PLACE_DETAILS.train.things.rack, anchor: carPt(0, 1.5, -LZ), ...at(0, -0.3, 0, -1.0), noMarker: true },
    straps: {
      ...PLACE_DETAILS.train.things.straps,
      anchor: carPt(-1.5, 1.3, -0.65),
      ...at(-1.5, -0.2, -1.5, -0.65),
      noMarker: true,
    },
    window: {
      ...PLACE_DETAILS.train.things.window,
      anchor: carPt(-1.1, 1.0, -LZ),
      ...at(-1.1, -0.3, -1.1, -LZ),
      noMarker: true,
      enabled: () => !station.visible, // its line is about the open bay
    },
    poster: {
      ...PLACE_DETAILS.train.things.poster,
      anchor: carPt(-LX, 1.0, -0.78),
      ...at(-3.5, -0.4, -LX, -0.78),
      noMarker: true,
    },
    sign: {
      ...PLACE_DETAILS.train.things.sign,
      anchor: (v) => {
        signs[0].getWorldPosition(v);
        v.y += 1.5;
        return v;
      },
      ...at(2.6, LZ + 1.3, 2.6, LZ + 1.9),
      enabled: () => st.arrived && game.player.root.position.z > LZ,
    },
    foodbag: {
      ...PLACE_DETAILS.train.things.foodbag,
      anchor: (v) => {
        foodBag.getWorldPosition(v);
        v.y += 0.35;
        return v;
      },
      ...at(1.62, -0.35, 1.62, -(LZ - 0.26)),
      enabled: () => bagWobble,
    },
    stander: {
      ...PLACE_DETAILS.train.things.stander,
      anchor: rigAnchor(stander),
      ...at(3.3, -0.45, 3.58, -0.78),
      enabled: () => stander.root.visible,
    },
    platform: {
      ...PLACE_DETAILS.train.things.platform,
      anchor: carPt(DOOR_X, 0.3, LZ + 1.2),
      ...at(DOOR_X, LZ + 1.0, DOOR_X, LZ + 1.5),
      noMarker: true,
    },
  };
  const zones = {
    door_zone: (x, z) => st.door > 0.3 && z > LZ - 0.35 && Math.abs(Math.abs(x) - DOOR_X) < 0.45,
    // standing on the free seat's floor spot (seat_far_r)
    free_seat: (x, z) => Math.hypot(x - 1.58, z - (-(LZ - 0.24) + 0.55)) < 0.3,
  };

  function standUp(r) {
    r.seated = false;
    r.root.position.y = 0;
    for (const l of r.legs) l.rotation.set(0, 0, 0);
    for (const k of r.knees) k.rotation.set(0, 0, 0);
    for (const a of r.arms) a.rotation.set(0, 0, 0);
    r.head.rotation.set(0, 0, 0);
    r.act = null;
    r.root.position.z += Math.sign(-r.root.position.z) * 0.4;
  }

  let simT = 0;
  const _camDir = new THREE.Vector3();
  const CLOSE_LO = +(new URLSearchParams(location.search).get('closeLo') || 42),
    CLOSE_HI = +(new URLSearchParams(location.search).get('closeHi') || 48); // camera pitch (deg) where the car closes
  function departureMovers() {
    const stay = new Set([game.player.root, game.mioNpc.root, kitty, kb]);
    for (const r of Object.values(people))
      if (r && r.root && r.root.position.z > LZ + T) {
        stay.add(r.root);
        if (r.blob) stay.add(r.blob);
      }
    // the shadow proxy (roof and full walls for the sun) goes too, hidden: it shows in the AO pass once it moves
    if (car.proxy) {
      car.proxy.visible = false;
      stay.add(car.proxy);
    }
    return car.root.children.filter((o) => !stay.has(o)); // the closed overlay is a child of the car, so it leaves with it
  }
  // Stable factory objects; shared actors are restored through people/player snapshots.
  const actorObjects = new Set([
    game.player.root,
    game.mioNpc.root,
    kb,
    ...Object.values(people).flatMap((person) => [person.root, person.blob]),
  ]);
  const trainObjects = car.root.children.filter((object) => !actorObjects.has(object));
  const factoryActions = Object.fromEntries(Object.entries(people).map(([id, person]) => [id, person.act]));

  const P = {
    // colour grade (js/post.js): muted like the lobby, a warm key, the sea kept from going cyan
    grade: {
      exposure: 1.0,
      temp: 0.03,
      sat: 0.9,
      contrast: 1.05,
      shadowTint: [-0.004, 0.0, 0.014],
      highTint: [0.018, 0.008, -0.01],
      vignette: 0.24,
      bloom: 0.3,
      bloomThreshold: 0.9,
      focusBand: 0.28,
    },
    scene,
    camera,
    cam,
    space,
    nav,
    sun,
    charScale: 1,
    floorY: 0,
    start: [-0.2, 0.1],
    startFacing: 0.0,
    things,
    people,
    spots,
    zones,
    seats,
    beforeAO: new (class extends Pass {
      constructor() {
        super();
        this.needsSwap = false;
      }
      render() {
        car.proxy.visible = false;
      }
    })(),
    beforeRender() {
      car.proxy.visible = !st.departing;
    },
    fit,
    layout,
    pick(rc) {
      const floorM = car.root.getObjectByName('floor');
      const hit = rc.intersectObject(floorM, false)[0];
      if (hit) return car.root.worldToLocal(hit.point.clone());
      if (st.arrived) {
        const p = new THREE.Vector3();
        if (rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p)) return car.root.worldToLocal(p);
      }
      return null;
    },
    walkPerson(id, [x, z], { speed } = {}) {
      const r = people[id];
      if (!r || !r.hips) return Promise.resolve();
      if (r.seated) standUp(r);
      return walkPerson(r, route(nav, r.root.position, [x, z]), { speed: speed || 1.2, blobM: r.blob });
    },
    async sitPerson(id, seatId) {
      const s = seats[seatId];
      if (!s) return;
      if (id === 'eric' || id === 'player') {
        if (s.bag !== undefined) {
          const b = bagObjs[s.bag];
          b.visible = false;
          b.userData.blob.visible = false;
        }
        if (s.props) {
          folder.visible = false;
          if (cupSt.state !== 'safe') cup.visible = false;
        }
        if (game.mioNpc.root.visible && seatId === 'seat_far_r') {
          /* keep the laptop on Mio's lap */
        }
        await game.walkTo(s.x, s.z + (s.side < 0 ? 0.55 : -0.55));
        const m = game.player;
        m.seated = true;
        m.sitAt(s.x, SEAT_Y, s.z - s.side * 0.02, s.side < 0 ? 0 : Math.PI);
        game.walker.facing = m.root.rotation.y;
        return;
      }
    },
    async standPerson(id) {
      if (id === 'eric' || id === 'player') {
        const m = game.player;
        if (!m.seated) return;
        for (const b of bagObjs) {
          b.visible = true;
          b.userData.blob.visible = true;
        }
        await standOut(game, m, m.root.position.z < 0 ? 0.55 : -0.55);
        return;
      }
      const r = people[id];
      if (r && r.hips) standUp(r);
    },
    update(dt, t) {
      finds.update(dt);
      // cut-away for the steep play camera, the closed car for shallow shots from outside (the title) and while it
      // pulls out of the station
      {
        camera.getWorldDirection(_camDir);
        const elev = (Math.asin(Math.max(-1, Math.min(1, -_camDir.y))) * 180) / Math.PI;
        const want = st.leaving ? 1 : 1 - THREE.MathUtils.smoothstep(elev, CLOSE_LO, CLOSE_HI);
        st.closedK =
          st.closedK === undefined ? want : st.closedK + (want - st.closedK) * Math.min(1, dt * (st.leaving ? 2.5 : 6));
        car.setClosed(st.closedK);
      }
      simT += dt;
      runIn(st, dt, { brake: () => sfx('brake'), stop: onStop }); // speed: cruise, run in, brake, stop (train/island.js)
      const k = st.v / SPEED;
      world.update(st.dist / SPEED, camera);
      U.uTime.value = simT;
      carDust.userData.update(simT);
      station.position.x = st.stopX - st.dist;
      island.update(station.visible ? st.stopX - st.dist : Infinity, world);
      const tj = st.dist / SPEED;
      const m = carMotion(tj, simT, Math.max(0.04, k));
      applyMotion(pivot, m);
      for (const n of neighbours) {
        const mn = carMotion(tj - n.lag + 5, simT + 5, Math.max(0.04, k));
        applyMotion(n.pivot, mn);
        n.bellows.rotation.x = (m.roll + mn.roll) / 2;
        n.bellows.position.y = (m.y + mn.y) / 2;
      }
      const latVel = (m.z - prevM.z) / Math.max(dt, 1e-3),
        bump = (m.y - prevM.y) / Math.max(dt, 1e-3),
        rollVel = (m.roll - prevM.roll) / Math.max(dt, 1e-3);
      const brakeKick = st.mode === 'brake' ? -st.decel * 0.05 : 0;
      swingStraps(car.straps, { m, latVel, bump, rollVel, brakeKick, simT, dt });
      for (const nd of car.nodders) {
        nd.obj.rotation.z = -m.roll * 4 * nd.k + Math.sin(simT * 1.7) * 0.015 * nd.k;
        nd.obj.rotation.x = bump * 0.5 * nd.k;
      }
      for (const p of list) {
        if (p.torso && p.breath) p.torso.scale.y = 1 + p.breath * Math.sin(simT * 1.7 + p.ph);
        if (p.act) p.act(simT, p, m.roll);
      }
      const tc = (simT + 0.8) % 3.4;
      kitty.userData.tail.rotation.y =
        tc < 0.6 ? Math.sin((tc / 0.6) * Math.PI * 2) * 0.35 : Math.sin(simT * 0.8) * 0.05;
      kitty.userData.tip.rotation.y = tc < 0.6 ? Math.sin((tc / 0.6) * Math.PI * 2 - 0.8) * 0.6 : 0;
      kitty.userData.head.rotation.x = Math.sin(simT * 0.35) * 0.05;
      if (bagWobble) {
        foodBag.rotation.x = Math.sin(simT * 7) * 0.12;
        foodBag.rotation.z = -0.15 + Math.sin(simT * 5.3) * 0.05;
      }
      sun.intensity =
        5.6 *
        (1 - 0.12 * world.pillarNear() * k) *
        (station.visible && Math.abs(station.position.x) < PL / 2 + 4 ? 0.85 : 1);
      if (st.v > 0.5) {
        const j = Math.floor(tj / JOINT);
        if (j !== lastJ) {
          lastJ = j;
          if (k > 0.3) sfx('clack');
        }
      }
      prevM = m;
      // doors
      if (st.chimeT >= 0) {
        st.chimeT += dt;
        if (st.chimeT > 3 && !st.hold) st.doorWant = 0;
      }
      // while they creep shut the closing chime keeps going, so a kotodama can cut it off mid-note
      if (st.slide) {
        st.chimeLoop = (st.chimeLoop ?? 2.2) - dt;
        if (st.chimeLoop <= 0) {
          st.chimeLoop = 2.6;
          sfx('chime');
        }
      }
      if (st.slide) {
        const s = st.slide;
        s.t += dt;
        const k = Math.min(1, s.t / s.dur);
        st.door = s.from + (s.to - s.from) * k;
        if (k >= 1) st.slide = null;
      } else if (!st.frozen) st.door += (st.doorWant - st.door) * Math.min(1, dt * (st.doorWant ? 3 : 2));
      if (st.hold && st.door < st.holdAt) st.door = st.holdAt;
      setDoors(st.door);
      if (st.door > 0.3) nav.unblock('doors');
      else if (!nav.rects.some((r) => r.tag === 'doors'))
        nav.blockTagged('doors', -LX - 8, LX, LZ - 0.02, LZ + T + 0.06);
      stepPeople([...list, rei], dt);
      if (cupSt.state === 'tip') {
        cupSt.k += (cupSt.want - cupSt.k) * Math.min(1, dt * 3);
        cup.rotation.z = -cupSt.k * 0.5 + Math.sin(simT * 9) * 0.04 * cupSt.k;
      }
      const p = game.player.root.position;
      // a story look: rig-gestures.js
      if (!aoi.lookTarget && !aoi.act && Math.hypot(p.x - aoi.root.position.x, p.z - aoi.root.position.z) < 2)
        lookAt(aoi, p.x, p.z, 0.8);
    },
    hooks: {
      announce: ({ text, voice: v }) => ui.board(text, { voiceKey: v }),
      arrive: () => {
        station.visible = true;
        startRunIn(st);
        game.event(eventId('train', 'approach'));
      },
      doorsOpen: () => {
        st.doorWant = 1;
        st.chimeT = -1;
        st.hold = false;
        st.slide = null;
        st.frozen = false;
        sfx('traindoor');
      },
      // { to, ms }: a slow, steady slide from where they are to `to` (1 open, 0 shut) over ms; without ms, the quick close
      doorsClose: ({ to = 0, ms } = {}) => {
        st.hold = false;
        st.chimeT = -1;
        st.doorWant = to;
        if (ms) {
          st.slide = { from: st.door, to, t: 0, dur: ms / 1000 };
          sfx('doorslow');
        } else {
          st.slide = null;
          sfx('traindoor');
        } // the story frames the shot itself (Jørgen missed the man when it jumped to the door)
      },
      chime: () => {
        st.chimeT = 0;
        sfx('chime');
        game.event(eventId('train', 'chime'));
      },
      // kotodama: they freeze dead where they are, with the effect; otherwise they bounce back a little, as before
      doorsHold: async ({ kotodama, word } = {}) => {
        st.slide = null;
        st.hold = true;
        st.chimeT = -1;
        if (kotodama) {
          st.holdAt = st.door;
          st.doorWant = st.door;
          st.frozen = true;
          await game.kotodama(
            myLeaves.map((d) => d.g),
            { pulse: myLeaves.filter((d) => d.x0 < 0).map((d) => d.g), focus: DOOR_SHOT, zoom: 1.45, word },
          );
          return;
        } // framed on the door, so the moment isn't off camera (QA round 1) // the camera stays on the door until the story pulls back
        st.holdAt = Math.max(0.45, st.door);
        st.doorWant = st.holdAt;
        sfx('no');
      },
      // everyone still in the car gets off, a second or so apart: up, to the nearest open door, out and along the
      // platform to the walkway, then gone. Resolves when only `except` (and Eric and Mio) are left.
      alight: async ({ except = [] } = {}) => {
        const skip = new Set(except);
        const leaving = Object.entries(people).filter(
          ([id, r]) => !skip.has(id) && r && r.hips && r.root.visible && r.root.position.z < LZ,
        );
        // each goes to the nearer door; people for the same door leave one after another with room between them
        const perDoor = { l: 0, r: 0 };
        const walks = leaving
          .map(([id, r]) => {
            const side = r.root.position.x < 0 ? 'l' : 'r';
            return [id, r, perDoor[side]++];
          })
          .map(([id, r, k]) =>
            (async () => {
              await game.wait(250 + k * 1500 + (r.root.position.x < 0 ? 0 : 400));
              if (r.seated) standUp(r);
              r.act = null;
              const dx = r.root.position.x < 0 ? -DOOR_X : DOOR_X;
              await walkPerson(
                r,
                [
                  ...route(nav, r.root.position, [dx, LZ - 0.4]),
                  [dx, LZ + 1.0],
                  [dx - 1.2, LZ + 1.45],
                  [WALK_X + 0.8, LZ + 1.5],
                  [WALK_X, LZ + 1.9],
                ],
                { speed: 1.35, blobM: r.blob },
              ); // along the platform clear of the sign posts
              r.root.visible = false;
              if (r.blob) r.blob.visible = false;
            })(),
          );
        await Promise.all(walks);
      },
      // the empty car pulls out and away; people on the platform (Eric, Mio, whoever got off) stay where they are
      depart: async () => {
        st.leaving = true;
        // let the doors finish shutting first: the leaves stop following st.door once the car moves, and a
        // full-height leaf left half open would ride off with it
        for (let i = 0; i < 30 && st.door > 0.01; i++) await game.wait(50);
        setDoors(0);
        const movers = departureMovers();
        const x0 = movers.map((o) => o.position.x),
          n0 = neighbours.map((n) => n.pivot.position.x),
          b0 = neighbours.map((n) => n.bellows.position.x);
        sfx('brake');
        st.departing = true;
        await game.tween(7, (k) => {
          const d = -34 * k * k; // a slow start, then away
          movers.forEach((o, i) => {
            o.position.x = x0[i] + d;
          });
          neighbours.forEach((n, i) => {
            n.pivot.position.x = n0[i] + d;
            n.bellows.position.x = b0[i] + d;
          });
        });
        for (const o of movers) if (!o.isLight) o.visible = false;
        for (const n of neighbours) {
          n.pivot.visible = false;
          n.bellows.visible = false;
        }
        st.departed = true;
      },
      wake: ({ who = 'kuroda' }) => {
        const r = people[who];
        if (!r || !r.hips) return;
        r.act = null;
        r.head.rotation.set(0.1, 0, 0);
      },
      bag: async ({ state }) => {
        const start = bagMotion?.state === state ? bagMotion.position : foodBag.position.toArray();
        bagMotion = { state, position: start };
        const p0 = foodBag.position.clone().fromArray(start);
        foodBag.position.copy(p0);
        bagWobble = false;
        foodBag.rotation.x = 0;
        // teeter: slides to the front edge of the free seat and wobbles there until it's caught or knocked off
        if (state === 'teeter') {
          sfx('clack');
          await game.tween(0.6, (k) => {
            foodBag.position.set(p0.x, SEAT_Y, p0.z + 0.2 * k);
            foodBag.rotation.z = -0.15 * k;
          });
          bagWobble = true;
          bagMotion = null;
          return;
        }
        if (state === 'slide') {
          sfx('clack');
          await game.tween(0.7, (k) => {
            foodBag.position.set(
              p0.x + 0.05 * k,
              SEAT_Y + 0.02 * Math.sin(k * Math.PI) - SEAT_Y * k * k,
              p0.z + 0.5 * k,
            );
            foodBag.rotation.z = -1.2 * k;
          });
        } else if (state === 'caught') {
          await game.tween(0.4, (k) => {
            foodBag.position.set(
              p0.x + (2.5 - p0.x) * k,
              p0.y + (SEAT_Y - p0.y) * k + 0.1 * Math.sin(k * Math.PI),
              p0.z + (-(LZ - 0.26) - p0.z) * k,
            );
            foodBag.rotation.z *= 1 - k;
          });
        } else if (state === 'dropped') {
          sfx('tap');
          await game.tween(0.3, (k) => {
            foodBag.position.y = p0.y * (1 - k);
            foodBag.rotation.z = -1.2 - 0.37 * k;
          });
        }
        bagMotion = null;
      },
      cup: ({ state }) => {
        cupSt.state = state;
        if (state === 'tip') {
          cupSt.want = 1;
          sfx('no');
        }
        if (state === 'safe') {
          cupSt.want = 0;
          cup.rotation.set(0, 0, 0);
          if (rei.root.visible) {
            cup.position.set(0.08, 0.14, 0.18);
            rei.torso.add(cup);
          } else {
            cup.position.set(2.32, SEAT_Y + 0.02, -(LZ - 0.3));
          }
        }
      },
      catTo: async ({ to }) => {
        const p = game.posOf(to);
        if (!p) return;
        await walkRig(game, kitty, p, { speed: 1.0 });
        kitty.position.y = 0;
      },
      phone: finds.hooks.phone,
      headphones: finds.hooks.headphones,
      shopBag: finds.hooks.shopBag,
      printout: finds.hooks.printout,
    },
    snapshotState() {
      return {
        arrived: st.arrived,
        departed: !!st.departed,
        door: st.doorWant,
        doors: {
          value: st.door,
          target: st.doorWant,
          slide: st.slide ? { ...st.slide } : null,
          hold: !!st.hold,
          holdAt: st.holdAt,
          frozen: !!st.frozen,
          chimeT: st.chimeT,
        },
        departure: { leaving: !!st.leaving, departing: !!st.departing, closedK: st.closedK },
        geometry: trainObjects.map(snapshotObject),
        neighbours: neighbours.map((n) => ({ pivot: snapshotObject(n.pivot), bellows: snapshotObject(n.bellows) })),
        station: snapshotObject(station),
        props: {
          folder: snapshotObject(folder),
          laptop: snapshotObject(laptop),
          kittyShadow: snapshotObject(kb),
          bags: bagObjs.map((bag) => ({ ...snapshotObject(bag), shadow: snapshotObject(bag.userData.blob) })),
        },
        motion: { mode: st.mode, v: st.v, dist: st.dist, stopAt: st.stopAt, stopX: st.stopX, decel: st.decel },
        player: snapshotPeople({ eric: game.player }),
        cup: { ...cupSt, ...snapshotObject(cup), withRei: cup.parent === rei.torso },
        people: Object.fromEntries(
          Object.entries(snapshotPeople(people)).map(([id, person]) => [
            id,
            {
              ...person,
              acting: !!people[id].act,
              blobPosition: people[id].blob?.position.toArray(),
            },
          ]),
        ),
        bagPosition: foodBag.position.toArray(),
        bagRotation: foodBag.rotation.toArray(),
        bagWobble,
        bagMotion: bagMotion ? structuredClone(bagMotion) : null,
        finds: finds.snapshot(),
      };
    },
    restoreState(saved) {
      const f = saved.flags || {},
        state = saved.world || {};
      if (state.motion) {
        Object.assign(st, state.motion);
        station.visible = st.mode === 'brake' || st.mode === 'approach';
      }
      if (state.arrived !== undefined) st.arrived = state.arrived;
      if (state.arrived ?? f.arrived) {
        station.visible = true;
        st.mode = 'stopped';
        st.v = 0;
        st.stopX = st.dist;
        st.arrived = true;
        station.position.x = 0;
        st.door = st.doorWant = state.door ?? 1;
        setDoors(st.door);
        if (st.door > 0.3) nav.unblock('doors');
      }
      if (state.bagPosition) foodBag.position.fromArray(state.bagPosition);
      if (state.bagRotation) foodBag.rotation.fromArray(state.bagRotation);
      bagWobble = !!state.bagWobble;
      bagMotion = state.bagMotion ? structuredClone(state.bagMotion) : null;
      if (state.cup) {
        Object.assign(cupSt, { state: state.cup.state, want: state.cup.want, k: state.cup.k });
        (state.cup.withRei ? rei.torso : car.root).add(cup);
        if (state.cup.visible !== undefined) cup.visible = state.cup.visible;
        cup.position.fromArray(state.cup.position);
        cup.rotation.fromArray(state.cup.rotation);
      }
      if (!saved.world && f.alighted) {
        for (const r of list)
          if (r !== kuroda) {
            r.root.visible = false;
            if (r.blob) r.blob.visible = false;
          }
        const mio = game.mioNpc;
        mio.setState('idle');
        mio.seated = false;
        mio.root.position.set(-2.2, 0, 2.25);
        kitty.position.set(-3, 0, 2.9);
        kb.position.set(-3, 0.004, 2.9);
      }
      if (state.geometry?.length === trainObjects.length) {
        // (a save from a build with other car parts restores through the branch below)
        trainObjects.forEach((object, i) => restoreObject(object, state.geometry[i]));
        neighbours.forEach((n, i) => {
          restoreObject(n.pivot, state.neighbours?.[i]?.pivot);
          restoreObject(n.bellows, state.neighbours?.[i]?.bellows);
        });
        st.departed = !!state.departed;
        Object.assign(st, state.departure || { leaving: false, departing: false });
        restoreObject(station, state.station);
      } else if (state.departed ?? f.held_doors) {
        const alreadyDeparted = st.departed;
        st.leaving = st.departing = st.departed = true;
        for (const obj of departureMovers()) {
          if (!alreadyDeparted) obj.position.x -= 34;
          if (!obj.isLight) obj.visible = false;
        }
        for (const n of neighbours) {
          if (!alreadyDeparted) {
            n.pivot.position.x -= 34;
            n.bellows.position.x -= 34;
          }
          n.pivot.visible = false;
          n.bellows.visible = false;
        }
      }
      if (state.doors) {
        Object.assign(st, {
          door: state.doors.value,
          doorWant: state.doors.target,
          slide: state.doors.slide ? { ...state.doors.slide } : null,
          hold: state.doors.hold,
          holdAt: state.doors.holdAt,
          frozen: state.doors.frozen,
          chimeT: state.doors.chimeT,
        });
        setDoors(st.door);
        nav.unblock('doors');
        if (st.door <= 0.3) nav.blockTagged('doors', -LX - 8, LX, LZ - 0.02, LZ + T + 0.06);
      }
      if (state.props) {
        restoreObject(folder, state.props.folder);
        restoreObject(laptop, state.props.laptop);
        restoreObject(kb, state.props.kittyShadow);
        bagObjs.forEach((bag, i) => {
          restoreObject(bag, state.props.bags?.[i]);
          restoreObject(bag.userData.blob, state.props.bags?.[i]?.shadow);
        });
      }
      restorePeople(people, state.people);
      finds.restore(state.finds);
      for (const [id, q] of Object.entries(state.people || {})) {
        const r = people[id];
        if (!r?.root) continue;
        if (!q.pose && !q.seated && r.hips) standUp(r);
        if (q.acting !== undefined) r.act = q.acting ? factoryActions[id] : null;
        r.setState?.(q.seated ? 'sit' : 'idle');
        r.seated = !!q.seated;
        r.root.visible = q.visible;
        r.root.position.fromArray(q.position);
        r.root.rotation.fromArray(q.rotation);
        if (r.blob) {
          r.blob.visible = q.visible;
          if (q.blobPosition) r.blob.position.fromArray(q.blobPosition);
          else if (r.blob.parent !== r.root) r.blob.position.set(q.position[0], 0.004, q.position[2]);
        }
      }
      if ((!saved.world && f.on_platform) || st.departed) {
        game.player.root.position.set(spots.platform[0], 0, spots.platform[1]);
        game.walker.sync?.();
        cam.snap?.(game.player.root.position);
      }
      if (saved.runner?.execution && state.player) {
        game.walker.stop();
        restorePeople({ eric: game.player }, state.player);
        game.walker.sync?.();
        game.walker.facing = game.player.root.rotation.y;
        cam.snap?.(game.player.root.position);
      }
    },
    onEnter: async () => {},
    leave: () => finds.dispose(), // the passengers' sounds and pictures stop with the place
    // Mio takes the laptop woman's seat, laptop on her knees
    placeMio(m) {
      rei.root.visible = false;
      rei.blob.visible = false;
      if (list.includes(rei)) list.splice(list.indexOf(rei), 1);
      m.root.visible = true;
      m.sitAt(2.1, SEAT_Y, -(LZ - 0.24) + 0.02, 0);
      m.seated = true;
      car.root.attach(laptop);
      laptop.position.set(2.1, SEAT_Y + (m.chibi ? 0.1 : 0.2), -(LZ - 0.24) + 0.3);
      laptop.rotation.set(0, 0, 0);
    },
    capState(s) {
      if (s.startsWith('dk')) {
        P.capState('stopped');
        st.door = st.doorWant = +s.slice(2);
        setDoors(st.door);
      } // QA: doors at k (0 shut .. 1 open)
      if (s === 'stopped') {
        station.visible = true;
        st.mode = 'stopped';
        st.v = 0;
        st.stopX = st.dist;
        st.arrived = true;
        st.door = 1;
        st.doorWant = 1;
        setDoors(1);
      }
      if (s === 'platform') {
        P.capState('stopped');
        game.player.root.position.set(DOOR_X, 0, LZ + 1.0);
      }
      if (s === 'sit') {
        const q = seats.seat_far_r;
        folder.visible = false;
        cup.visible = false;
        const m = game.player;
        m.seated = true;
        m.sitAt(q.x, SEAT_Y, q.z + 0.02, 0);
        game.walker.facing = 0;
      }
    },
    // leaving: out onto the platform if she isn't there yet, then along it to the covered walkway
    async tripOut(g, slot) {
      const mio = g.player;
      mio.scripted = true;
      if (mio.seated) await P.standPerson('eric');
      const p = mio.root.position;
      mio.setState('walk');
      if (p.z < LZ + 0.2) {
        const dx = Math.abs(p.x - DOOR_X) < Math.abs(p.x + DOOR_X) ? DOOR_X : -DOOR_X;
        await glide(g, mio.root, [dx, LZ - 0.35], 1.4);
        await glide(g, mio.root, [dx, LZ + 0.9], 1.4);
      }
      for (const id of withList(slot)) {
        const r = people[id] || (id === 'mio' ? game.mioNpc : null);
        if (!r) continue;
        // Mio (Meshy): out of the car if she's still in it, then beside Eric (a body to his left, a step behind), never on his line
        if (r.meshy) {
          (async () => {
            if (r.seated) await standOut(game, r, 0.5);
            r.root.visible = true;
            if (r.root.position.z < LZ) {
              await glide(game, r.root, [-DOOR_X + 0.3, LZ - 0.3], 1.4);
              await glide(game, r.root, [-DOOR_X + 0.3, LZ + 1.3], 1.4);
            } else await g.wait(350);
            await walkRig(game, r, [WALK_X + 1.4, LZ + 2.2], { speed: 1.45, route: false }); // steers round Eric
            r.setState('idle');
            r.setGait?.(null);
          })();
          continue;
        }
        if (!r.hips) continue;
        r.root.visible = true;
        if (r.blob) r.blob.visible = true;
        const go = () =>
          walkPerson(
            r,
            [
              [-DOOR_X + 0.3, LZ + 1.3],
              [WALK_X + 0.8, LZ + 1.7],
            ],
            { speed: 1.45, blobM: r.blob },
          );
        if (r.root.position.z < LZ) P.walkPerson(id, [-DOOR_X + 0.3, LZ - 0.3]).then(go);
        else go();
      }
      cam.closeOn([p.x, LZ + 1.0], 1.35);
      const follow = setInterval(() => {
        cam.close = { x: p.x, z: LZ + 1.0, zoom: 1.35 };
      }, 50);
      await glide(g, mio.root, [WALK_X + 1.0, LZ + 1.5], 1.45, true);
      clearInterval(follow);
      mio.setState('idle');
    },
  };
  function onStop() {
    st.arrived = true;
    flags[ENGINE_KEYS.arrived] = true;
    sfx('brake');
    P.hooks.doorsOpen();
    game.event(eventId('train', 'arrived'));
  }
  st.stopX = 1e6;
  P._st = st;
  P._setDoors = setDoors;
  P.kotodamaTargets = (name) => (name === 'doors' ? myLeaves.map((d) => d.g) : []);
  kitty.userData.tail.rotation.y = 0;
  // what update() moves every frame, so the draw-call pass batches under them before the first frame (js/perf/batch.js)
  P.perfMovers = [
    pivot,
    car.cab,
    station,
    island.root,
    ...neighbours.flatMap((n) => [n.pivot, n.bellows]),
    ...world.movers,
    ...car.nodders.map((n) => n.obj),
    ...list.map((p) => p.head),
    kitty.userData.head,
    kitty.userData.tail,
  ];
  return P;
}
// Mio's sitting pose on a bench: offsets from the seat top (tuned against screenshots)
const _q = new URLSearchParams(location.search);
export const MIO_SIT = { y: _q.has('sy') ? +_q.get('sy') : -0.36, dz: _q.has('sdz') ? +_q.get('sdz') : 0.1 };
