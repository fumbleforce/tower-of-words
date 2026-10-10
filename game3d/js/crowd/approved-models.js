// Native bodies selected in crowd-pilot-5 (the office pair A and B; only B's reported pale fringe patch is corrected)
// and crowd-everyday-2 (casual-1, older-1, service-1). The original meshes, weights and motion are shared; each actor
// owns its skeleton and materials. The everyday bodies carry a region mask, so each copy can wear its own colours.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { clone } from '../../vendor/utils/SkeletonUtils.js';
import { meshyFrom } from '../avatar.js';
import { meshyPerson } from '../cast3d.js';
import { loadSkin } from '../perf/skin-tex.js';
import { tintUniforms, shadeTint } from './tint.js';

const MODELS = {
  a: { height: 1.09 },
  b: { height: 1.06 },
  'casual-1': { height: 1.06, tint: true },
  'older-1': { height: 1.09, tint: true },
  'service-1': { height: 1.09, tint: true },
};
const files = new Map(),
  loading = new Map();
// the office workers still ask by number: even is A, odd is B
const keyOf = (key) => (typeof key === 'number' ? ['a', 'b'][Math.abs(key % 2)] : key);

export function prepareApprovedCrowd(keys = ['a', 'b']) {
  return Promise.all(
    [...new Set(keys.map(keyOf))].map((key) => {
      if (!MODELS[key]) throw new Error(`Unselected crowd model: ${key}`);
      if (!loading.has(key)) loading.set(key, load(key));
      return loading.get(key);
    }),
  );
}

async function load(key) {
  const dir = new URL(`../../assets/characters/crowd-${key}/`, import.meta.url).href;
  const loader = new GLTFLoader();
  const json = async (name) => {
    const response = await fetch(dir + name);
    if (!response.ok) throw Error(`Crowd ${key}/${name}: ${response.status}`);
    return response.json();
  };
  try {
    const parts = await Promise.all([
      loader.loadAsync(dir + 'walk.glb'),
      loader.loadAsync(dir + 'run.glb'),
      json('idle.json').then((value) => THREE.AnimationClip.parse(value)),
      loader.loadAsync(dir + 'sit.glb'),
      // seen small: the 512 copy on a phone (perf/skin-tex.js); the everyday bodies, only ever in the background, also
      // take the 1024 copy on desktop, so a place with the whole crowd stays inside its texture budget
      loadSkin(dir + 'base.webp', { small: true, desktop: MODELS[key].tint ? 1024 : null }),
      MODELS[key].tint && new THREE.TextureLoader().loadAsync(dir + 'mask.webp'),
      MODELS[key].tint && json('regions.json'),
    ]);
    if (parts[5]) Object.assign(parts[5], { flipY: false, colorSpace: THREE.NoColorSpace });
    parts.size = new THREE.Box3().setFromObject(parts[0].scene).getSize(new THREE.Vector3()).y;
    files.set(key, parts);
  } catch (error) {
    // Keep the existing fallback visible if any required asset fails to load.
    console.warn('Approved crowd', key, error);
  }
}

export function approvedCrowd(key, opt = {}) {
  key = keyOf(key);
  const parts = files.get(key);
  if (!parts) return null;
  const [walk, run, idle, sit, texture, mask, regions] = parts;
  const model = clone(walk.scene);
  // meshyFrom replaces/disposes materials; don't dispose the cached source's material.
  model.traverse((o) => {
    if (o.isMesh) o.material = o.material.clone();
  });
  const rig = meshyPerson(
    meshyFrom(`crowd-${key}`, [{ ...walk, scene: model }, run, idle, sit, texture, null], {
      height: opt.height || MODELS[key].height,
      size: parts.size,
    }),
  );
  if (mask && opt.tint) {
    const uniforms = tintUniforms({ mask, regions }, opt.tint);
    model.traverse((mesh) => {
      if (!mesh.isMesh) return;
      const mat = mesh.material,
        before = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer) => {
        before.call(mat, shader, renderer);
        shadeTint(shader, uniforms);
      };
      mat.customProgramCacheKey = () => 'approved-crowd-tint';
      mat.userData.tint = uniforms;
    });
  }
  rig.approvedCrowd = key;
  rig.hairHex = opt.tint?.hair || regions?.hair?.hex;
  return rig;
}
