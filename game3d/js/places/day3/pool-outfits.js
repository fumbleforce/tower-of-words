// Selected Review pool-swimwear-1 appearances, loaded only by the public pool.
import * as THREE from 'three';
import { GLTFLoader } from '../../../vendor/loaders/GLTFLoader.js';
import { clone } from '../../../vendor/utils/SkeletonUtils.js';
import { meshyFrom } from '../../avatar.js';
import { meshyPerson } from '../../cast3d.js';
import { MC } from '../../mc.js';
import { poolOutfitGround } from './pool-outfit-ground.js';
import { loadSkin } from '../../perf/skin-tex.js';
import { poolOutfitSlot } from './pool-outfit-slot.js';
const HEIGHTS = { eric: 1.2, carina: 1.12, emi: 1.09, kuro: 1.12 };
const pending = new Map();
function load(id) {
  if (!pending.has(id)) {
    const dir = new URL(`../../../assets/characters/swimwear-${id}/`, import.meta.url).href;
    const gltf = new GLTFLoader();
    const clip = async (name) => {
      const response = await fetch(dir + name + '.json');
      if (!response.ok) throw Error(`Pool ${id} ${name}: ${response.status}`);
      return THREE.AnimationClip.parse(await response.json());
    };
    pending.set(
      id,
      Promise.all([
        gltf.loadAsync(dir + 'walk.glb'),
        gltf.loadAsync(dir + 'run.glb'),
        clip('idle'),
        clip('sit').then((c) => ({ animations: [c] })),
        loadSkin(dir + 'base.webp'),
      ])
        .then((parts) => {
          parts.size = new THREE.Box3().setFromObject(parts[0].scene).getSize(new THREE.Vector3()).y;
          return parts;
        })
        .catch((error) => {
          pending.delete(id);
          throw error;
        }),
    );
  }
  return pending.get(id);
}
export async function poolOutfits(game, cast) {
  const people = {
    eric: game.player,
    emi: cast.people.emi,
    kuro: cast.people.kuro,
  };
  const slots = {},
    grounding = {};
  try {
    const files = await Promise.all(Object.keys(people).map((id) => load(id === 'eric' ? MC.id : id)));
    Object.entries(people).forEach(([id, actor], i) => {
      const bodyId = id === 'eric' ? MC.id : id,
        parts = files[i],
        [walk, ...rest] = parts;
      slots[id] = poolOutfitSlot(
        actor,
        (root) => {
          const model = clone(walk.scene);
          model.traverse((o) => {
            if (o.isMesh) o.material = o.material.clone();
          });
          const body = meshyFrom(`swimwear-${bodyId}`, [{ ...walk, scene: model }, ...rest, null], {
            height: HEIGHTS[bodyId],
            size: parts.size,
            root,
          });
          if (bodyId === 'eric' || bodyId === 'carina') grounding[id] = poolOutfitGround(body);
          return body;
        },
        id === 'eric' ? null : meshyPerson,
      );
    });
  } catch (error) {
    for (const slot of Object.values(slots)) slot.dispose();
    // The existing pool remains available if the optional body download fails.
    console.warn('Pool outfits unavailable', error);
    for (const id of Object.keys(slots)) delete slots[id];
  }
  return {
    set(id, on) {
      grounding[id]?.clear();
      slots[id]?.set(on);
    },
    active: (id) => !!slots[id]?.active,
    snapshot: () => Object.fromEntries(Object.entries(slots).map(([id, slot]) => [id, slot.active])),
    release() {
      for (const ground of Object.values(grounding)) ground.clear();
      for (const slot of Object.values(slots)) slot.set(false);
    },
    dispose() {
      for (const ground of Object.values(grounding)) ground.clear();
      for (const slot of Object.values(slots)) slot.dispose();
    },
  };
}
