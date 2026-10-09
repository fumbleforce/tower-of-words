// Review crowd-pilot-5: a-image and b-image selected by Jørgen. Only B's reported
// pale fringe patch is corrected; native meshes, weights and motion remain intact.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { clone } from '../../vendor/utils/SkeletonUtils.js';
import { meshyFrom } from '../avatar.js';
import { meshyPerson } from '../cast3d.js';
import { loadSkin } from '../perf/skin-tex.js';

const HEIGHTS = [1.09, 1.06];
const files = [];
let loading;
export function prepareApprovedCrowd() {
  return (loading ??= Promise.all(
    ['a', 'b'].map(async (key, i) => {
      const dir = new URL(`../../assets/characters/crowd-${key}/`, import.meta.url).href;
      const loader = new GLTFLoader();
      try {
        const parts = await Promise.all([
          loader.loadAsync(dir + 'walk.glb'),
          loader.loadAsync(dir + 'run.glb'),
          fetch(dir + 'idle.json').then(async (r) => {
            if (!r.ok) throw Error(`Crowd idle ${r.status}`);
            return THREE.AnimationClip.parse(await r.json());
          }),
          loader.loadAsync(dir + 'sit.glb'),
          loadSkin(dir + 'base.webp', { small: true }),
        ]);
        parts.size = new THREE.Box3().setFromObject(parts[0].scene).getSize(new THREE.Vector3()).y;
        files[i] = parts;
      } catch (error) {
        // The existing procedural worker remains visible if a download fails.
        console.warn('Approved crowd', key, error);
      }
    }),
  ));
}

export function approvedCrowd(i) {
  const index = Math.abs(i % 2),
    parts = files[index];
  if (!parts) return null;
  const [walk, ...rest] = parts;
  const model = clone(walk.scene);
  // meshyFrom replaces/disposes materials; don't dispose the cached source's material.
  model.traverse((o) => {
    if (o.isMesh) o.material = o.material.clone();
  });
  const rig = meshyPerson(
    meshyFrom(`crowd-${index ? 'b' : 'a'}`, [{ ...walk, scene: model }, ...rest, null], {
      height: HEIGHTS[index],
      size: parts.size,
    }),
  );
  rig.approvedCrowd = index ? 'b' : 'a';
  return rig;
}
