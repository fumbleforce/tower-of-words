// Player bodies, animation and physical seat placement. Shared by cast and crowd Meshy loaders.
import * as THREE from 'three';
import { CHARACTER_SCALE } from './character-scale.js';

// ---------- Eric and the cast from Jørgen's Meshy models ----------
// Matte: the file's emissive, specular and roughness settings are dropped, and only the base colour texture is
// used with a Lambert material (as for Mio). Colour tweak only: the texture is pulled a little toward the muted
// palette (slightly less saturated, a touch cooler). The mesh, face and body are untouched.
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { meshyGait, clipAction, clipActions, holdNow } from './movement/gait.js';
import { calmSitTime, V as ver, poseLayer, addPhone, API_PHONE_BONES, CDIR } from './held-pose.js';
import { loadRelaxedIdle } from './relaxed-idle.js';
import { seatUnderside, sitRootY } from './movement/sit-height.js';
import { solveSeatLegs } from './movement/sit-legs.js';
import { loadSkin } from './perf/skin-tex.js';
import { MC } from './mc.js';
const EDIR = new URL('../assets/eric/', import.meta.url).href;
export const loadEric = (o = {}) => loadMeshy('eric', { dir: EDIR, height: 1.2, ...o });
// The player's and Mio's bodies for main.js boot(). The player's is the protagonist's (data/mc/<id>.json model:
// assets/<dir or id>/); Mio's is Review mio-meshy-2's.
export const playerBody = () => {
  const m = MC.model;
  return loadMeshy(m.id, {
    dir: new URL(`../assets/${m.dir || m.id + '/'}`, import.meta.url).href,
    height: m.height,
    extra: m.extra !== false,
  });
};
export const mioBody = () => loadMeshy('mio2', { dir: CDIR + 'mio2/', height: 1.12, extra: 'phone' });
// one-shot gesture clips from Meshy's library (bow, wave, shrug, nod), retargeted onto each rig as JSON
export const GESTURES = ['bow', 'wave', 'shrug', 'nod'];
const json = (u) =>
  fetch(u + ver())
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
// Meshy API characters (Eric and the cast in assets/characters/<id>/):
// walk, run, idle, sit clips, the base colour texture, optional phone and gestures.
export async function loadMeshy(id, { height = 1.2, dir, stride, extra = true } = {}) {
  return meshyFrom(id, await meshyFiles(id, { dir, extra }), { height, stride });
}
// Its files in meshyFrom's order (cast3d.js keeps them and makes a copy of the person for each place that has them).
export async function meshyFiles(id, { dir = CDIR + id + '/', extra = true } = {}) {
  const loader = new GLTFLoader();
  const load = (u) => new Promise((ok, no) => loader.load(u, ok, undefined, no));
  return Promise.all([
    load(dir + 'walk.glb' + ver()),
    load(dir + 'run.glb' + ver()),
    loadRelaxedIdle(id, ver()),
    load(dir + 'sit.glb' + ver()),
    loadSkin(dir + 'base.webp' + ver()),
    ...['phone', ...GESTURES].map((f) => (extra === true || extra === f) && json(CDIR + id + '/' + f + '.json')),
  ]);
}
// The person, at once, from files already loaded in loadMeshy's order (cast3d.js makes several from one set).
export function meshyFrom(id, [walk, run, idle, sitG, tex, phone, ...gj], { height = 1.2, stride, size, root } = {}) {
  height *= CHARACTER_SCALE;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  const model = walk.scene;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    const m = new THREE.MeshLambertMaterial({ map: tex });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <map_fragment>',
        `
#ifdef USE_MAP
 vec4 texel = texture2D( map, vMapUv );
 float l = dot(texel.rgb, vec3(0.2126, 0.7152, 0.0722));
 texel.rgb = mix(vec3(l), texel.rgb, 0.82) * vec3(0.97, 0.985, 1.02);
 diffuseColor *= texel;
#endif`,
      );
    };
    o.material.dispose();
    o.material = m;
  });
  const H = size || new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y; // size: measured once by the caller
  root ??= new THREE.Group();
  const holder = new THREE.Group();
  holder.scale.setScalar(height / H);
  holder.add(model);
  root.add(holder);
  const mixer = new THREE.AnimationMixer(model);
  const actions = clipActions(mixer, {
    walk: walk.animations[0],
    run: run.animations[0],
    idle,
    sit: sitG.animations[0],
  });
  let hips = null;
  model.traverse((o) => {
    if (!hips && o.isBone && /hips/i.test(o.name)) hips = o;
  });
  const gait = meshyGait(actions, stride, { mixer, model, root, hips, scale: holder.scale.x, setState });
  const pose = { bow: 0 };
  let spine = null,
    spine2 = null;
  model.traverse((o) => {
    if (o.isBone && /spine$/i.test(o.name.replace(/[^a-z0-9]/gi, ''))) spine = o;
    if (o.isBone && /spine0?1$/i.test(o.name.replace(/[^a-z0-9]/gi, ''))) spine2 = o;
  });
  const SIT_T = calmSitTime(model, mixer, actions.sit);
  const layers = poseLayer(model);
  const ph = addPhone({ model, root, height, layers, json: phone, bones: API_PHONE_BONES });
  const gact = {};
  GESTURES.forEach((g, i) => {
    if (gj[i]) {
      const c = clipAction(mixer, THREE.AnimationClip.parse(gj[i]));
      c.setLoop(THREE.LoopOnce, 1);
      c.clampWhenFinished = true;
      gact[g] = c;
    }
  });
  let gesturing = null;
  const sitState = { legs: null }; // where a seated body's legs go (movement/sit-legs.js), set by sitAt
  let cur = null,
    curName = '',
    bt = 0,
    breath = 0;
  function setState(name) {
    if (name === curName || !actions[name]) return;
    // seated, the model shifts back so the root stands over the hips (sitAt and train/people.js sit() both use it)
    if (sitHip) {
      if (name === 'sit') holder.position.set(-sitHip.x, 0, -sitHip.z);
      else holder.position.set(0, 0, 0);
    }
    if (gesturing) {
      gesturing.a.fadeOut(0.2);
      gesturing.ok(true);
      gesturing = null;
    }
    const a = actions[name];
    a.reset();
    a.setEffectiveWeight(1);
    if (name === 'sit') {
      a.time = SIT_T;
      a.timeScale = 0;
    }
    a.fadeIn(cur ? 0.25 : 0).play();
    if (cur && cur !== a) cur.fadeOut(0.25);
    cur = a;
    curName = name;
  }
  // held frames: three.js skips writing unchanged bones, so extras (breath, bow) are undone before each mixer step
  const bones = [];
  model.traverse((o) => {
    if (o.isBone) bones.push([o, o.position.clone(), o.quaternion.clone()]);
  });
  const snapBones = () => {
    for (const b of bones) {
      b[1].copy(b[0].position);
      b[2].copy(b[0].quaternion);
    }
  };
  const restoreBones = () => {
    for (const b of bones) {
      b[0].position.copy(b[1]);
      b[0].quaternion.copy(b[2]);
    }
  };
  // play a gesture clip once over the current state, then fade back; resolves when it's done
  function gesture(kind) {
    const g = gact[kind];
    if (!g || curName === 'sit' || curName === 'walk') return Promise.resolve(false);
    if (gesturing) {
      gesturing.a.fadeOut(0.15);
      gesturing.ok(true);
    }
    g.reset();
    g.setEffectiveWeight(1);
    g.fadeIn(0.25).play();
    if (cur) cur.fadeOut(0.25);
    return new Promise((ok) => {
      gesturing = { a: g, ok, out: false };
    });
  }
  function update(dt, speed = 1) {
    gait.step(dt, curName, speed);
    restoreBones();
    mixer.update(dt);
    bt += dt;
    if (gesturing && !gesturing.out && gesturing.a.time >= gesturing.a.getClip().duration - 0.35) {
      gesturing.out = true;
      gesturing.a.fadeOut(0.35);
      if (cur) {
        cur.reset();
        cur.timeScale = curName === 'sit' ? 0 : 1;
        if (curName === 'sit') cur.time = SIT_T;
        cur.fadeIn(0.35).play();
      }
      const g = gesturing;
      setTimeout(() => {
        if (gesturing === g) gesturing = null;
        g.ok(true);
      }, 380);
    }
    snapBones();
    if (curName !== 'sit') gait.pin();
    if (curName === 'sit') {
      breath = Math.sin(bt * 2.0) * 0.004;
      hips.position.y += breath;
    }
    if (pose.bow) {
      spine.rotateX(pose.bow * 0.6);
      spine2 && spine2.rotateX(pose.bow * 0.4);
    }
    if (curName === 'sit' && sitState.legs) solveSeatLegs({ model, root }, sitState.legs);
    layers.step(dt);
    ph.place();
  }
  // where the hips sit in the chair clip, in the root's space
  let sitHip = null;
  setState('sit');
  for (let i = 0; i < 30; i++) update(1 / 30);
  root.updateMatrixWorld(true);
  sitHip = new THREE.Vector3();
  hips.getWorldPosition(sitHip);
  root.worldToLocal(sitHip);
  const sitUnder = seatUnderside(id + ':' + holder.scale.x, model, root, sitHip);
  mixer.stopAllAction();
  cur = null;
  curName = '';
  setState('idle');
  snapBones();
  update(0);
  const a = {
    id,
    root,
    model,
    mixer,
    update,
    sitHip,
    pose,
    layers,
    phone: ph.hook,
    placePhone: ph.place,
    gesture,
    gestures: Object.keys(gact),
    seated: false,
    scripted: false,
    meshy: true,
    setState,
    setGait: gait.set,
    strides: gait.strides,
    get state() {
      return curName;
    },
    // seated on the seat top at (x, z), facing ry, straight into the seated frame (gait.js holdNow)
    sitAt(x, seatTop, z, ry, legs = null) {
      root.position.set(x, sitRootY(seatTop, sitUnder, root.scale.x), z);
      root.rotation.y = ry;
      setState('sit');
      holdNow(mixer, cur, [...Object.values(actions), ...Object.values(gact)], restoreBones, snapBones);
      sitState.legs = legs;
      if (legs) solveSeatLegs({ model, root }, legs);
    },
    // {ahead, height}: the legs go where movement/sit-legs.js puts them while seated; null leaves the clip's legs
    get seatLegs() {
      return sitState.legs;
    },
    set seatLegs(v) {
      sitState.legs = v;
    },
  };
  return a;
}
