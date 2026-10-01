// Isolated VRM sample preview for #171. No production character is replaced.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '../../vendor/vrm/three-vrm.module.min.js';
import { loadRelaxedIdle } from '../relaxed-idle.js';
import { V } from '../mio.js';

const MIO = new URL('../../assets/mio/', import.meta.url).href;
const SAMPLE = new URL('../../../art/parts/vrm-prototype/', import.meta.url);

// Meshy/Mixamo bone -> VRM humanoid bone, with the child each bone points at (for the rest-direction match)
const MAP = {
  Hips: ['hips', 'Spine'],
  Spine: ['spine', 'Spine1'],
  Spine1: ['chest', 'Spine2'],
  Spine2: ['upperChest', 'Neck'],
  Neck: ['neck', 'Head'],
  Head: ['head', null],
};
for (const s of ['Left', 'Right']) {
  const v = s.toLowerCase();
  Object.assign(MAP, {
    [s + 'Shoulder']: [v + 'Shoulder', s + 'Arm'],
    [s + 'Arm']: [v + 'UpperArm', s + 'ForeArm'],
    [s + 'ForeArm']: [v + 'LowerArm', s + 'Hand'],
    [s + 'Hand']: [v + 'Hand', null],
    [s + 'UpLeg']: [v + 'UpperLeg', s + 'Leg'],
    [s + 'Leg']: [v + 'LowerLeg', s + 'Foot'],
    [s + 'Foot']: [v + 'Foot', s + 'ToeBase'],
    [s + 'ToeBase']: [v + 'Toes', null],
  });
}

const _q = new THREE.Quaternion();
const worldQ = (o, root) => {
  const q = o.getWorldQuaternion(new THREE.Quaternion());
  return q.premultiply(root.getWorldQuaternion(_q).invert());
};
const worldP = (o, root) => root.worldToLocal(o.getWorldPosition(new THREE.Vector3()));

// Sample `clips` on the source rig and rebuild them as tracks on the VRM's normalized bones. For each bone the
// target's world rotation is W(t) * R^-1 * S: the source's change from its rest, applied after S, the swing that
// turns the VRM's rest bone direction onto the source's (so an A-pose source still fits the VRM's T-pose).
function retarget(src, vrm, clips, fps = 30) {
  src.updateMatrixWorld(true);
  const bone = (n) => src.getObjectByName('mixamorig' + n);
  const hum = vrm.humanoid;
  const tgt = (n) => hum.getNormalizedBoneNode(n);
  const scene = vrm.scene;
  scene.updateMatrixWorld(true);
  const S = {},
    R = {};
  for (const [sn, [tn, child]] of Object.entries(MAP)) {
    const b = bone(sn),
      t = tgt(tn);
    if (!b || !t) continue;
    R[sn] = worldQ(b, src);
    const cb = child && bone(child),
      ct = child && tgt(MAP[child][0]);
    if (cb && ct) {
      const ds = worldP(cb, src).sub(worldP(b, src)).normalize();
      const dt = worldP(ct, scene).sub(worldP(t, scene)).normalize();
      S[sn] = new THREE.Quaternion().setFromUnitVectors(dt, ds);
    }
  }
  // leaves (head, hands, toes) keep their parent's swing
  for (const [sn, [, child]] of Object.entries(MAP)) if (!child && R[sn]) S[sn] = null;
  const parentOf = (sn) => {
    for (const [p, [, c]] of Object.entries(MAP)) if (c === sn) return p;
    return sn.endsWith('Shoulder') ? 'Spine2' : sn.endsWith('UpLeg') ? 'Hips' : null;
  };
  for (const sn of Object.keys(MAP)) if (S[sn] === null) S[sn] = S[parentOf(sn)] || new THREE.Quaternion();
  const hipsS = bone('Hips'),
    hipsT = tgt('hips');
  const srcHipY = worldP(hipsS, src).y,
    tgtHipY = worldP(hipsT, scene).y,
    k = tgtHipY / srcHipY,
    hipRest = hipsT.position.clone();
  const mixer = new THREE.AnimationMixer(src);
  const out = {};
  for (const [name, clip] of Object.entries(clips)) {
    const n = Math.max(2, Math.round(clip.duration * fps) + 1),
      times = new Float32Array(n);
    const qv = {},
      hp = new Float32Array(n * 3);
    for (const sn of Object.keys(R)) qv[sn] = new Float32Array(n * 4);
    mixer.stopAllAction();
    const act = mixer.clipAction(clip);
    act.reset().play();
    const W = {};
    for (let i = 0; i < n; i++) {
      const t = (clip.duration * i) / (n - 1);
      times[i] = t;
      mixer.setTime(t);
      src.updateMatrixWorld(true);
      for (const sn of Object.keys(R)) W[sn] = worldQ(bone(sn), src).multiply(R[sn].clone().invert()).multiply(S[sn]);
      for (const sn of Object.keys(R)) {
        const p = parentOf(sn);
        const local = p && W[p] ? W[p].clone().invert().multiply(W[sn]) : W[sn];
        local.toArray(qv[sn], i * 4);
      }
      const y = worldP(hipsS, src).y;
      hp[i * 3] = hipRest.x;
      hp[i * 3 + 1] = hipRest.y + (y - srcHipY) * k;
      hp[i * 3 + 2] = hipRest.z;
    }
    act.stop();
    const tracks = Object.keys(R).map(
      (sn) => new THREE.QuaternionKeyframeTrack(tgt(MAP[sn][0]).name + '.quaternion', times, qv[sn]),
    );
    tracks.push(new THREE.VectorKeyframeTrack(hipsT.name + '.position', times, hp));
    out[name] = new THREE.AnimationClip(name, clip.duration, tracks);
  }
  mixer.stopAllAction();
  return out;
}

// Black glasses: two rounded frames, a bridge and the arms back to the ears, on the head bone in front of the eyes.
function glasses(vrm) {
  let eyes = null;
  vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat())
      if (/EyeWhite/.test(m.name || '')) {
        o.geometry.computeBoundingBox();
        eyes = o.geometry.boundingBox.clone();
      }
  });
  const head = vrm.humanoid.getRawBoneNode('head');
  if (!eyes || !head) return null;
  const mat = new THREE.MeshBasicMaterial({ color: '#141414' });
  const g = new THREE.Group();
  const cx = (eyes.max.x - eyes.min.x) / 4,
    cy = (eyes.max.y + eyes.min.y) / 2 + 0.004,
    z = eyes.max.z + 0.016;
  const w = 0.043,
    h = 0.03,
    r = 0.009,
    t = 0.0032;
  const rr = (s, x, y, ww, hh, rad) => {
    s.moveTo(x - ww / 2 + rad, y - hh / 2);
    s.lineTo(x + ww / 2 - rad, y - hh / 2);
    s.quadraticCurveTo(x + ww / 2, y - hh / 2, x + ww / 2, y - hh / 2 + rad);
    s.lineTo(x + ww / 2, y + hh / 2 - rad);
    s.quadraticCurveTo(x + ww / 2, y + hh / 2, x + ww / 2 - rad, y + hh / 2);
    s.lineTo(x - ww / 2 + rad, y + hh / 2);
    s.quadraticCurveTo(x - ww / 2, y + hh / 2, x - ww / 2, y + hh / 2 - rad);
    s.lineTo(x - ww / 2, y - hh / 2 + rad);
    s.quadraticCurveTo(x - ww / 2, y - hh / 2, x - ww / 2 + rad, y - hh / 2);
    return s;
  };
  for (const sx of [-1, 1]) {
    const shape = rr(new THREE.Shape(), 0, 0, w, h, r);
    shape.holes.push(rr(new THREE.Path(), 0, 0, w - 2 * t, h - 2 * t, r - t));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.003,
      bevelEnabled: false,
      curveSegments: 3,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(sx * (cx + 0.003), cy, z - 0.002 * Math.abs(sx));
    m.rotation.y = sx * 0.12;
    g.add(m);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(t, t, 0.1), mat);
    arm.position.set(sx * (cx + w / 2 + 0.006), cy + h / 2 - 0.006, z - 0.052);
    arm.rotation.y = sx * 0.12;
    g.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(2 * cx - w + 0.012, t, t), mat);
  bridge.position.set(0, cy + 0.006, z + 0.001);
  g.add(bridge);
  // the group is built in the model's rest space; parent it to the head keeping that placement
  vrm.scene.updateMatrixWorld(true);
  const inv = head.matrixWorld.clone().invert().multiply(vrm.scene.matrixWorld);
  g.applyMatrix4(inv);
  head.add(g);
  return g;
}

export async function loadVrmMio({ height = 1.12, flat = false, original = false } = {}) {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const load = (url) => loader.loadAsync(url + V());
  const [gltf, walk, run, idle] = await Promise.all([
    load(new URL(original ? 'base.vrm' : 'recolour.vrm', SAMPLE).href),
    load(MIO + 'walk.glb'),
    load(MIO + 'run.glb'),
    loadRelaxedIdle('mio', V()),
  ]);
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  const model = vrm.scene;
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
    if (!flat) return;
    for (const material of [object.material].flat()) {
      if (!/HAIR|CLOTH|Body_00/.test(material.name || '')) continue;
      material.flatShading = true;
      if ('shadingToonyFactor' in material) material.shadingToonyFactor = 1;
      material.needsUpdate = true;
    }
  });
  const eyewear = original ? null : glasses(vrm);
  const clips = retarget(walk.scene, vrm, {
    walk: walk.animations[0],
    run: run.animations[0],
    idle,
  });
  const root = new THREE.Group();
  root.add(model);
  const box = new THREE.Box3().setFromObject(model, true);
  root.scale.setScalar(height / (box.max.y - box.min.y));
  root.position.y = -box.min.y * root.scale.y;
  const mixer = new THREE.AnimationMixer(model);
  const actions = Object.fromEntries(Object.entries(clips).map(([name, clip]) => [name, mixer.clipAction(clip)]));
  let current = '';
  function setState(name) {
    if (!(name in actions)) throw new Error('Unsupported preview animation: ' + name);
    if (name === current) return;
    mixer.stopAllAction();
    actions[name].reset().play();
    current = name;
  }
  const head = vrm.humanoid.getNormalizedBoneNode('head');
  const animatedHead = head.quaternion.clone();
  let headPitch = 0;
  function setHeadPitch(degrees) {
    headPitch = THREE.MathUtils.degToRad(degrees);
  }
  function update(dt) {
    // Restore the animation result before applying the offset, including while paused.
    head.quaternion.copy(animatedHead);
    mixer.update(dt);
    animatedHead.copy(head.quaternion);
    head.rotateX(headPitch);
    vrm.update(dt);
  }
  setState('idle');
  update(0);
  // Place spring bones after the first animated pose, before their simulation starts.
  vrm.springBoneManager?.reset();
  return { root, model, mixer, vrm, setState, update, eyewear, setHeadPitch };
}
