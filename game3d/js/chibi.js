// The Meshy chibis of the named cast (Review chibi-cast-meshy-1: Eric, Mio, Kuro; chibi-cast-meshy-2: the rest) as a
// switchable look. ?chibi=1 (or ?chibi=0) decides for one visit; otherwise Settings > Graphics > Chibi cast, from the
// next load. When on, they get these bodies everywhere they appear; the approved models stay the default.
// Files in assets/characters/chibi-<id>/: model.glb and base.webp (tools/characters/chibi_game.py: about 20k
// triangles and a 1024 px texture baked from the full model; -lo: 8k, for phones), and clips.json
// (tools/characters/chibi-bake.mjs: the game's walk, run, idle, sit, phone pose and Eric's gestures carried over
// onto Meshy's rig, the legs at 0.55 of the swing, half the walk's lean, and the gait speeds that go with them).
// The generic islanders (chibi-crowd.js, ids gen-<base>) also have mask.webp and regions.json (tools/characters/
// chibi_regions.py): where their hair, top and bottom are, so each copy can wear its own colours (chibiFrom's tint).
import * as THREE from 'three';
import { clone } from '../vendor/utils/SkeletonUtils.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { meshyFrom, loadEric, GESTURES } from './avatar.js';
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

// One set of files per person, loaded once; every place that has them gets its own copy of the skeleton, sharing the
// mesh, texture and clips (chibiFrom).
const files = {};
export function chibiFiles(id) {
  if (files[id]) return files[id];
  const dir = CDIR + 'chibi-' + id + '/';
  const lo = S.isPhone() || S.qualityTier() === 'low' ? '-lo' : '';
  const got = (r) => {
    if (!r.ok) throw new Error(`chibi ${id}: ${r.status}`);
    return r.json();
  };
  const gen = id.startsWith('gen-');
  return (files[id] = Promise.all([
    fetch(dir + 'clips.json' + V()).then(got),
    new GLTFLoader().loadAsync(dir + `model${lo}.glb` + V()),
    new THREE.TextureLoader().loadAsync(dir + `base${lo}.webp` + V()),
    gen && new THREE.TextureLoader().loadAsync(dir + `mask${lo}.webp` + V()),
    gen && fetch(dir + `regions${lo}.json` + V()).then(got),
  ]).then(([data, gltf, tex, mask, regions]) => {
    const shaped = shapeChibi(gltf.scene, data.clips, buildOf(id));
    const gait = { ...data.gait, walkV: data.gait.walkV * shaped.stride, runV: data.gait.runV * shaped.stride };
    // the four motions parsed once; the phone pose and the gestures stay JSON, as meshyFrom takes them
    const clips = { ...data.clips };
    for (const n of ['walk', 'run', 'idle', 'sit']) clips[n] = THREE.AnimationClip.parse(data.clips[n]);
    if (mask) Object.assign(mask, { flipY: false, colorSpace: THREE.NoColorSpace });
    return { id, gait, scene: gltf.scene, tex, clips, mask, regions };
  }));
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

// a person from loaded files, at once. opt.height: another standing height; opt.tint: { hair, top, bottom } colours
// for a generic (null keeps a region as made)
export function chibiFrom(f, opt = {}) {
  const gait = { ...f.gait },
    c = f.clips;
  const scene = clone(f.scene);
  const parts = [{ scene, animations: [c.walk] }, { animations: [c.run] }, c.idle, { animations: [c.sit] }, f.tex];
  parts.push(c.phone || null, ...GESTURES.map((g) => c[g] || null));
  const m = meshyFrom('chibi-' + f.id, parts, { height: opt.height || HEIGHT[f.id], stride: gait });
  const tint = f.mask && opt.tint ? tintUniforms(f, opt.tint) : null;
  // The decimated surface folds over on itself in places, and culled back faces showed as specks of whatever is
  // behind. Both sides draw, lit by the full model's normals whichever side faces the camera.
  m.model.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material,
      before = mat.onBeforeCompile;
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
  });
  m.chibi = true;
  return m;
}
export const loadChibi = (id) => chibiFiles(id).then(chibiFrom);

const fallback = (load) => (e) => {
  console.warn('chibi failed, using the approved model', e);
  return load();
};
// the player's and Mio's bodies for main.js boot(); a chibi that fails to load falls back to the approved model
export const ericBody = () => (CHIBI_ON ? loadChibi('eric').catch(fallback(loadEric)) : loadEric());
export const mioBody = () => {
  const mio = () => loadMio({ height: 1.12 });
  return CHIBI_ON ? loadChibi('mio').catch(fallback(mio)) : mio();
};

// Settings > Graphics: the switch, under Surface detail. Added the first time Settings is built (menu.js is at its
// size ceiling, as for the private-mode row in settings.js).
function ensureRow() {
  const surf = document.querySelector('#settings .sw[data-key="surfaces"]')?.closest('.row');
  if (!surf || document.querySelector('#settings [data-key="chibi"]')) return;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML =
    '<span class="lbl" id="l-chibi">Chibi cast<small>Eric, Mio and the people they meet as chibi figures, from the next time the game loads</small></span>' +
    '<button type="button" class="sw" role="switch" data-key="chibi" aria-labelledby="l-chibi"><i></i></button>';
  surf.after(row);
  const sw = row.querySelector('.sw');
  const paint = () => sw.setAttribute('aria-checked', S.settings.chibi ? 'true' : 'false');
  paint();
  sw.onclick = () => {
    S.setSetting('chibi', !S.settings.chibi);
    paint();
  };
}
if (S) new MutationObserver(ensureRow).observe(document.documentElement, { childList: true, subtree: true });
