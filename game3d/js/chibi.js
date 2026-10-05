// The Meshy chibis of the named cast (Review chibi-cast-meshy-1: Eric, Mio, Kuro; chibi-cast-meshy-2: the rest) as a
// switchable look. ?chibi=1 (or ?chibi=0) decides for one visit; otherwise Settings > Graphics > Chibi cast, from the
// next load. On by default (Jørgen, 2026-10-03); when on, they get these bodies everywhere they appear.
// Files in assets/characters/chibi-<id>/: model.glb and base.webp (tools/characters/chibi_game.py: about 20k
// triangles and a 1024 px texture baked from the full model; -lo: 8k; -far: 3k, for far away), and clips.json
// (tools/characters/chibi-bake.mjs: the game's walk, run, idle, sit, phone pose and Eric's gestures carried over
// onto Meshy's rig, the legs at 0.85 of the swing, half the walk's lean, and the gait speeds that go with them).
// The generic islanders (chibi-crowd.js, ids gen-<base>) also have mask.webp and regions.json (tools/characters/
// chibi_regions.py): where their hair, top and bottom are, so each copy can wear its own colours (chibiFrom's tint).
import * as THREE from 'three';
import { clone } from '../vendor/utils/SkeletonUtils.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { meshyFrom, loadMeshy, GESTURES } from './avatar.js';
import { MC } from './mc.js';
import { loadMio, CDIR, V } from './mio.js';
import { buildOf, shapeChibi } from './chibi-builds.js';
// settings.js needs a page; the unit tests import the cast in Node, where the look is off
const S = typeof addEventListener === 'function' ? await import('./settings.js') : null;

const flag = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('chibi') : null;
export const CHIBI_ON = flag != null ? flag !== '0' : !!S?.settings.chibi;
// standing heights, the same as the bodies they stand in for (the scenes scale them as they scale those)
const HEIGHT = { eric: 1.2, mio: 1.12, kuro: 1.12, mori: 1.09, kenji: 1.12, emi: 1.09, guard: 1.09, kuroda: 1.09 };
HEIGHT.aoi = HEIGHT.rei = 1.09;
// people in cast.js that take their chibi through cast3d.js
export const CHIBI_CAST = CHIBI_ON ? Object.keys(HEIGHT).filter((id) => id !== 'eric' && id !== 'mio') : [];

// Each person's build (head size, slimmer or rounder trunk, leg and arm length) is applied once to the loaded files,
// before any copy is made: chibi-builds.js.

// Mesh tiers by distance (a lighter mesh, with its own texture, once a person is small on screen): each tier is
// drawn while the person stands at least `px` CSS pixels tall, the last one below that. Desktop at quality 1 and up
// has all three; phones and quality 0 start at -lo. ?chibitier=hi|lo|far shows one tier everywhere, to compare.
const LOD = { '': 300, '-lo': 140, '-far': 0 };
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const ONE = { hi: '', lo: '-lo', far: '-far' }[Q.get('chibitier')];
function tiers() {
  if (ONE != null) return [ONE];
  const low = Q.has('q') ? +Q.get('q') === 0 : S.qualityTier() === 'low';
  return S.isPhone() || low ? ['-lo', '-far'] : ['', '-lo', '-far'];
}

// One set of files per person, loaded once; every place that has them gets its own copy of the skeleton, sharing the
// meshes, textures and clips (chibiFrom). The tiers' meshes go on the first tier's skeleton (the same rig, so the
// same bones), before the build reshapes them all at once.
const files = {};
export function chibiFiles(id) {
  if (files[id]) return files[id];
  const dir = CDIR + 'chibi-' + id + '/';
  const got = (r) => {
    if (!r.ok) throw new Error(`chibi ${id}: ${r.status}`);
    return r.json();
  };
  const gen = id.startsWith('gen-');
  const tier = (t, i) =>
    Promise.all([
      new GLTFLoader().loadAsync(dir + `model${t}.glb` + V()),
      new THREE.TextureLoader().loadAsync(dir + `base${t}.webp` + V()),
      gen && new THREE.TextureLoader().loadAsync(dir + `mask${t}.webp` + V()),
      gen && fetch(dir + `regions${t}.json` + V()).then(got),
    ])
      .then(([gltf, tex, mask, regions]) => {
        Object.assign(tex, { flipY: false, colorSpace: THREE.SRGBColorSpace });
        if (mask) Object.assign(mask, { flipY: false, colorSpace: THREE.NoColorSpace });
        return { t, scene: gltf.scene, tex, mask, regions };
      })
      // the lighter tiers are optional: without one, the tier before it stays at every distance
      .catch((e) => {
        if (!i) throw e;
        console.warn(`chibi ${id}${t}`, e);
        return null;
      });
  return (files[id] = Promise.all([fetch(dir + 'clips.json' + V()).then(got), ...tiers().map(tier)]).then(
    ([data, ...got]) => {
      const ts = got.filter(Boolean),
        scene = ts[0].scene;
      const meshes = (o) => {
        const l = [];
        o.traverse((x) => x.isSkinnedMesh && l.push(x));
        return l;
      };
      const [main] = meshes(scene),
        bone = Object.fromEntries(main.skeleton.bones.map((b) => [b.name, b]));
      for (const m of meshes(scene)) m.userData.tier = ts[0].t;
      for (const x of ts.slice(1))
        for (const m of meshes(x.scene)) {
          const sk = m.skeleton;
          m.bind(
            new THREE.Skeleton(
              sk.bones.map((b) => bone[b.name]),
              sk.boneInverses,
            ),
            m.bindMatrix,
          );
          m.userData.tier = x.t;
          main.parent.add(m);
        }
      const shaped = shapeChibi(scene, data.clips, buildOf(id));
      const gait = { ...data.gait, walkV: data.gait.walkV * shaped.stride, runV: data.gait.runV * shaped.stride };
      // the four motions parsed once; the phone pose and the gestures stay JSON, as meshyFrom takes them
      const clips = { ...data.clips };
      for (const n of ['walk', 'run', 'idle', 'sit']) clips[n] = THREE.AnimationClip.parse(data.clips[n]);
      const tier = Object.fromEntries(ts.map((x) => [x.t, x]));
      // heights measured once here (a skinned mesh's box skins every vertex): the whole figure's, for meshyFrom, and
      // the first tier's in its parent's units, for the LOD's size on screen
      scene.updateMatrixWorld(true);
      const all = new THREE.Box3().setFromObject(scene),
        one = new THREE.Box3().setFromObject(main);
      const size = all.max.y - all.min.y,
        tierH = (one.max.y - one.min.y) / (main.parent.getWorldScale(new THREE.Vector3()).y || 1);
      // each tier's box as it stands, in the model's space (boxRaycast)
      for (const m of meshes(scene)) tier[m.userData.tier].box = new THREE.Box3().setFromObject(m, true);
      return { id, gait, scene, tex: ts[0].tex, clips, mask: ts[0].mask, regions: ts[0].regions, tier, size, tierH };
    },
  ));
}

// The tiers as one LOD: three.js calls update(camera) as it draws the scene, before the shadow passes. A tier changes
// 10% past its threshold, so a person at the edge doesn't flicker. The sun's shadow always comes from the lightest
// tier (a silhouette the shadow map can't tell apart): that mesh stays on, on a layer only the shadow cameras draw,
// while a finer one is in view.
const SHADOW = 29, // (31 is perf/batch.js's merged-away layer, 2 the map's)
  lit = new WeakSet();
const _a = new THREE.Vector3(),
  _b = new THREE.Vector3();
function shadowLayer(o) {
  while (o.parent) o = o.parent;
  if (lit.has(o)) return;
  lit.add(o);
  o.traverse((l) => l.isLight && l.shadow && l.shadow.camera.layers.enable(SHADOW));
}
function tierLod(person, h) {
  const ms = [];
  person.model.traverse((o) => o.isSkinnedMesh && o.userData.tier != null && ms.push(o));
  if (new Set(ms.map((o) => o.userData.tier)).size < 2) return;
  const order = Object.keys(LOD);
  ms.sort((a, b) => order.indexOf(a.userData.tier) - order.indexOf(b.userData.tier));
  const lod = new THREE.LOD(),
    parent = ms[0].parent;
  parent.add(lod);
  // as levels too, so a copy (Object3D.clone, as train/screen-scenes.js makes) has the same children; the copy picks by
  // three.js's own distances, all 0 here, so it shows the lightest tier
  for (const m of ms) lod.addLevel(m, 0);
  const levels = [...new Set(ms.map((o) => o.userData.tier))],
    last = levels.length - 1,
    caster = ms.filter((m) => m.userData.tier === levels[last]);
  let cur = -1,
    shadow = null; // whether this person casts a sun shadow, read when first drawn (the scenes set it after building)
  const show = (i) => {
    cur = i;
    for (const m of ms) {
      const mine = m.userData.tier === levels[i];
      m.visible = mine || (shadow && caster.includes(m));
      m.castShadow = shadow && caster.includes(m);
      if (caster.includes(m)) m.layers.set(mine ? 0 : SHADOW);
    }
  };
  lod.update = (camera) => {
    if (shadow == null) {
      shadow = ms.some((m) => m.castShadow);
      if (shadow) shadowLayer(lod);
    }
    const k = lod.matrixWorld.elements,
      sy = Math.hypot(k[4], k[5], k[6]);
    _a.setFromMatrixPosition(camera.matrixWorld);
    _b.setFromMatrixPosition(lod.matrixWorld);
    const d = Math.max(0.01, _b.sub(_a).dot(camera.getWorldDirection(_a)));
    const view = camera.isPerspectiveCamera
      ? (2 * d * Math.tan((camera.fov * Math.PI) / 360)) / camera.zoom
      : (camera.top - camera.bottom) / camera.zoom;
    // the person's height on screen, foot to crown, so one seen from above (the train's camera) counts as small as it
    // looks; at least the width of their head and shoulders (about 0.45 of their height) square on
    const H = h * sy,
      flat = (H / view) * innerHeight;
    _a.setFromMatrixPosition(lod.matrixWorld).project(camera);
    _b.setFromMatrixPosition(lod.matrixWorld);
    _b.y += H;
    _b.project(camera);
    const tall = Math.hypot(((_b.x - _a.x) * innerWidth) / 2, ((_b.y - _a.y) * innerHeight) / 2);
    const px = (lod.userData.px = Math.max(tall, 0.45 * flat));
    let i = Math.max(cur, 0);
    while (i > 0 && px > LOD[levels[i - 1]] * 1.1) i--;
    while (i < last && px < LOD[levels[i]] * 0.9) i++;
    if (i !== cur) show(i);
  };
}

// A generic's colours: each region of its mask (hair, top, bottom) recoloured to a target, keeping each texel's shading
// against the region's mean brightness (regions.json), so folds and painted strands stay.
const TINT = `vec3 tm = texture2D( tMask, vMapUv ).rgb;
 float tl = dot( texel.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
 if ( tHair.w > 0.0 ) texel.rgb = mix( texel.rgb, tHair.rgb * clamp( tl / tHair.w, 0.55, 1.6 ), tm.r );
 if ( tTop.w > 0.0 ) texel.rgb = mix( texel.rgb, tTop.rgb * clamp( tl / tTop.w, 0.55, 1.6 ), tm.g );
 if ( tBot.w > 0.0 ) texel.rgb = mix( texel.rgb, tBot.rgb * clamp( tl / tBot.w, 0.55, 1.6 ), tm.b );
 diffuseColor *= texel;`;
const REGION = { hair: 'tHair', top: 'tTop', bottom: 'tBot' };
function tintUniforms(f, tint) {
  const u = { tMask: { value: f.mask } };
  for (const [k, n] of Object.entries(REGION)) {
    const hex = tint[k],
      r = f.regions[k];
    const c = hex && r ? new THREE.Color(hex) : null;
    u[n] = { value: c ? new THREE.Vector4(c.r, c.g, c.b, r.lum) : new THREE.Vector4(0, 0, 0, 0) };
  }
  return u;
}

// Rays (hover and taps on people, the finds' floor test) meet a chibi at the box of its mesh standing still: three's
// own test of a skinned mesh skins every vertex it checks, and first its bounding sphere over all of them, a stall
// of 50 to 150 ms per person on a phone. Only the tier in view is hit.
const _box = new THREE.Box3(),
  _hit = new THREE.Vector3();
function boxRaycast(raycaster, out) {
  const { box, model } = this.userData;
  if (!this.visible || !box) return;
  _box.copy(box).applyMatrix4(model.matrixWorld); // measured once for every copy (chibiFiles)
  if (!raycaster.ray.intersectBox(_box, _hit)) return;
  const distance = raycaster.ray.origin.distanceTo(_hit);
  if (distance < raycaster.near || distance > raycaster.far) return;
  out.push({ distance, point: _hit.clone(), object: this, face: null });
}

// a person from loaded files, at once. opt.height: another standing height; opt.tint: { hair, top, bottom } colours
// for a generic (null keeps a region as made)
export function chibiFrom(f, opt = {}) {
  const gait = { ...f.gait },
    c = f.clips;
  const scene = clone(f.scene);
  const parts = [{ scene, animations: [c.walk] }, { animations: [c.run] }, c.idle, { animations: [c.sit] }, f.tex];
  parts.push(c.phone || null, ...GESTURES.map((g) => c[g] || null));
  const m = meshyFrom('chibi-' + f.id, parts, { height: opt.height || HEIGHT[f.id], stride: gait, size: f.size });
  const tinted = f.mask && opt.tint;
  // The decimated surface folds over on itself in places, and culled back faces showed as specks of whatever is
  // behind. Both sides draw, lit by the full model's normals whichever side faces the camera.
  m.model.traverse((o) => {
    if (!o.isMesh) return;
    const t = f.tier[o.userData.tier] || f.tier[Object.keys(f.tier)[0]];
    const tint = tinted ? tintUniforms(t, opt.tint) : null;
    const mat = o.material,
      before = mat.onBeforeCompile;
    mat.map = t.tex;
    mat.side = THREE.DoubleSide;
    mat.onBeforeCompile = (sh, r) => {
      before.call(mat, sh, r);
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\n normal = normalize( vNormal );',
      );
      if (!tint) return;
      Object.assign(sh.uniforms, tint);
      sh.fragmentShader =
        'uniform sampler2D tMask;\nuniform vec4 tHair, tTop, tBot;\n' +
        sh.fragmentShader.replace('diffuseColor *= texel;', TINT);
    };
    // every chibi shares this function's text, which three.js would take for one program
    mat.customProgramCacheKey = () => (tint ? 'chibi-tint' : 'chibi');
    mat.userData.tint = tint;
    o.raycast = boxRaycast;
    Object.assign(o.userData, { person: true, box: t.box, model: scene });
  });
  tierLod(m, f.tierH);
  m.chibi = true;
  return m;
}
export const loadChibi = (id) => chibiFiles(id).then(chibiFrom);

const fallback = (load) => (e) => {
  console.warn('chibi failed, using the approved model', e);
  return load();
};
// the player's and Mio's bodies for main.js boot(); a chibi that fails to load falls back to the approved model.
// The player's is the protagonist's (data/mc/<id>.json model: assets/<id>/ and its chibi)
export const playerBody = () => {
  const m = MC.model,
    body = () => loadMeshy(m.id, { dir: new URL(`../assets/${m.id}/`, import.meta.url).href, height: m.height });
  return CHIBI_ON ? loadChibi(m.chibi).catch(fallback(body)) : body();
};
export const mioBody = () => {
  const mio = () => loadMio({ height: 1.12 });
  return CHIBI_ON ? loadChibi('mio').catch(fallback(mio)) : mio();
};
