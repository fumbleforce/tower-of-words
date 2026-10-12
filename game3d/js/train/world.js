// Everything outside the train: the sea far below, the monorail beam and the pillars that pass under it.
// The train stands still in the world and the world moves past it (sea texture scroll, pillars).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { monorailParts, TRAIN_SKY } from './models.js';
import { seaMaterial, SEA_PILLARS } from '../scenes/outdoor/sea.js';

export const SEA_Y = -17; // sea level, far below the car floor (y = 0)
export const BEAM_TOP = -0.16; // top of the straddle beam: the car rides low on it, its skirt down either side (#359)
export const SPEED = 9; // world units per second
export const PILLAR_GAP = 19; // distance between pillars
export const BEAM2_Z = -7.5; // the parallel line for trains going the other way
const NP = SEA_PILLARS; // pillars kept alive around the train

// Direction the sea shader throws shadows along (toward the sun). It is steeper than the key light
// so the pillar and train shadows land on the water that the camera can actually see.
export const SEA_SHADOW_DIR = new THREE.Vector3(-0.36, 1.0, 0.62).normalize();

export function buildWorld(scene, { sunDir }) {
  const root = new THREE.Group();
  scene.add(root);
  scene.userData.reflection = TRAIN_SKY; // what the car's steel and glass reflect out here (kit/materials/env.js)

  const lin = (h) => new THREE.Color(h);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420, 1, 1),
    seaMaterial({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uSeaY: { value: SEA_Y },
      uBeamY: { value: BEAM_TOP },
      uCarHalfZ: { value: 1.3 },
      uBeam2Z: { value: BEAM2_Z },
      uBlur: { value: 0.14 },
      uBand: { value: 5.2 },
      uPillarTop: { value: BEAM_TOP - 0.6 },
      uQuality: { value: 1 },
      uShadowDir: { value: SEA_SHADOW_DIR.clone() },
      uSunDir: { value: sunDir.clone() },
      uCamPos: { value: new THREE.Vector3() },
      uPillarX: { value: new Array(NP).fill(0) },
      uDeep: { value: lin('#0c4478') },
      uMid: { value: lin('#17639c') },
      uShallow: { value: lin('#4796c4') },
      uFoam: { value: lin('#f2f9ff') },
      uShadow: { value: lin('#3a5f9a') },
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_Y;
  sea.userData.noAO = true;
  root.add(sea);

  // The Blender-built beam segments, pillars and feet (models.js), when they loaded; else the older code-made ones
  const M = monorailParts();
  // Concrete beam: one long rounded box. Joint plates slide along it to show speed.
  const concrete = new THREE.MeshStandardMaterial({ color: '#8b939e', roughness: 0.92 });
  const concreteDark = new THREE.MeshStandardMaterial({ color: '#737c88', roughness: 0.95 });
  const beam = new THREE.Mesh(new RoundedBoxGeometry(160, 0.9, 0.62, 3, 0.1), concrete);
  beam.position.set(0, BEAM_TOP - 0.45, 0);
  beam.receiveShadow = true;
  // the parallel guideway for trains going the other way, further off
  const beam2 = beam.clone();
  beam2.position.z = BEAM2_Z;
  if (!M) root.add(beam, beam2);
  // Blender beam: 9.5 m segments, each with its joint at its start, that slide along under the train (update) and
  // stop at the line's end (placeEnd); one instanced mesh per line
  const SEG = 9.5,
    NSEG = 12;
  const segs = M
    ? [0, BEAM2_Z].map((z) => {
        const im = new THREE.InstancedMesh(M.beam.geometry, M.beam.material, NSEG);
        im.receiveShadow = true;
        im.frustumCulled = false;
        im.userData.noBatch = true; // moves every frame: never merged (js/perf/batch.js)
        im.userData.z = z;
        root.add(im);
        return im;
      })
    : [];
  const _m = new THREE.Matrix4(),
    _p = new THREE.Vector3(),
    _q = new THREE.Quaternion(),
    _s = new THREE.Vector3();
  function placeSegs(scroll) {
    const span = SEG * NSEG;
    for (const im of segs) {
      for (let i = 0; i < NSEG; i++) {
        const x0 = ((((i * SEG - scroll) % span) + span) % span) - span / 2;
        const k = Math.max(0, Math.min(1, (end - x0) / SEG));
        _p.set(x0, BEAM_TOP, im.userData.z);
        _s.set(Math.max(k, 1e-4), k > 0 ? 1 : 1e-4, 1);
        im.setMatrixAt(i, _m.compose(_p, _q, _s));
      }
      im.instanceMatrix.needsUpdate = true;
    }
  }

  // where the line ends (setRide): the beams stop at a buffer block; past it no pillars or joints
  let end = Infinity;
  const plateMat = new THREE.MeshStandardMaterial({ color: '#c9ccd0' });
  const buffers = [0, BEAM2_Z].map((z) => {
    const b = new THREE.Group();
    const block = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.15, 0.9, 2, 0.08), concreteDark);
    block.position.y = BEAM_TOP - 0.3;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.7), plateMat);
    plate.position.set(-0.37, BEAM_TOP - 0.1, 0);
    b.add(block, plate);
    b.position.set(0, 0, z);
    b.visible = false;
    root.add(b);
    return b;
  });
  function placeEnd() {
    const open = !(end < 80);
    for (const bm of [beam, beam2]) {
      bm.scale.x = open ? 1 : Math.max(0.001, (end + 80) / 160);
      bm.position.x = open ? 0 : (end - 80) / 2;
    }
    for (const b of buffers) {
      b.visible = !open;
      b.position.x = end + 0.35;
    }
  }

  const joints = new THREE.Group();
  if (!M) root.add(joints);
  const jointGeo = new THREE.BoxGeometry(0.05, 0.92, 0.64);
  const JN = 16,
    JGAP = 9.5;
  for (let i = 0; i < JN; i++) {
    const j = new THREE.Mesh(jointGeo, concreteDark);
    j.position.set(0, BEAM_TOP - 0.45, 0);
    j.userData.noBatch = true; // slides by every frame (update()): never merged (js/perf/batch.js)
    joints.add(j);
  }

  // Pillars: a tapered column with a hammerhead cap under the beam, and a foot where it stands in the sea. The feet
  // ride on their own group (feet), which follows the sea's level on the run in (setRide): the column runs on down
  // under the water, and the sea's foam collar always rings a foot.
  const pillars = [],
    feet = [];
  const colH = BEAM_TOP - 0.9 - 0.45 - (SEA_Y - 1);
  // Blender pillar: column, collar, hammerhead and bearings in one mesh, in the world's heights; its foot apart
  const mono = (name) => {
    const m = new THREE.Mesh(M[name].geometry, M[name].material);
    m.name = name;
    return m;
  };
  const colGeo = new THREE.CylinderGeometry(0.36, 0.46, colH, 10, 1);
  const capGeo = new RoundedBoxGeometry(1.1, 0.5, 1.5, 3, 0.12);
  const footGeo = new THREE.CylinderGeometry(0.72, 0.8, 0.8, 12, 1);
  for (let i = 0; i < NP; i++) {
    const g = new THREE.Group(),
      base = new THREE.Group();
    const col = M ? mono('pillar') : new THREE.Mesh(colGeo, concrete);
    if (!M) col.position.y = SEA_Y - 1 + colH / 2;
    const cap = new THREE.Mesh(capGeo, concrete);
    cap.position.y = BEAM_TOP - 0.9 - 0.2;
    const foot = M ? mono('foot') : new THREE.Mesh(footGeo, concreteDark);
    foot.position.y = SEA_Y + 0.1;
    for (const m of M ? [col, foot] : [col, cap, foot]) {
      m.castShadow = false;
      m.receiveShadow = false;
      const c2 = m.clone();
      c2.position.z = BEAM2_Z;
      (m === foot ? base : g).add(m, c2);
    }
    g.add(base);
    feet.push(base);
    root.add(g);
    pillars.push(g);
  }

  const u = sea.material.uniforms;
  const span = PILLAR_GAP * NP;
  function update(t, camera) {
    const scroll = t * SPEED;
    u.uTime.value = t;
    u.uScroll.value = scroll;
    u.uCamPos.value.copy(camera.position);
    for (let i = 0; i < NP; i++) {
      // pillar world x, wrapping around the train
      let x = i * PILLAR_GAP - (scroll % span);
      x = (((x % span) + span) % span) - span / 2 + 4;
      pillars[i].position.x = x;
      pillars[i].visible = x < end - 0.8;
      u.uPillarX.value[i] = x;
    }
    if (M) placeSegs(scroll);
    const jspan = JGAP * JN;
    joints.children.forEach((j, idx) => {
      const i = idx;
      let x = i * JGAP - (scroll % jspan);
      j.position.x = (((x % jspan) + jspan) % jspan) - jspan / 2;
      j.visible = j.position.x < end;
    });
  }

  // How close the nearest pillar is to passing under the middle of the car (0..1), for light flicker.
  function pillarNear() {
    let m = 0;
    for (const p of pillars) m = Math.max(m, 1 - Math.min(1, Math.abs(p.position.x + 1.5) / 1.2));
    return m;
  }

  return {
    root,
    sea,
    update,
    movers: [...pillars, ...feet, ...buffers], // for the draw-call pass (place.perfMovers)
    // the run in to the station (train/island.js): the sea's level under the car, and where the line ends ahead
    // (Infinity: on over the bay)
    setRide(seaY, lineEnd) {
      sea.position.y = seaY;
      u.uSeaY.value = seaY;
      for (const f of feet) f.position.y = seaY - SEA_Y;
      u.uBand.value = (5.2 * (0.4 - seaY)) / (0.4 - SEA_Y);
      if (lineEnd !== end) {
        end = lineEnd;
        placeEnd();
      }
    },
    pillarNear,
    setQuality: (q) => {
      u.uQuality.value = q ? 1 : 0.6;
    },
  };
}
