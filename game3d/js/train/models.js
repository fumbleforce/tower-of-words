// The monorail's Blender-built outside (tools/train/monorail.py, game3d/assets/train/monorail.glb): the car's skin
// and roof units, its navy skirt, the gangway bellows, a beam segment, a pillar and its foot. Each node is one mesh
// whose flat colours (stainless, navy, frames, panel lines) are in its vertex colours.
// The car skin is brushed stainless (#356), the kit's brushed finish (kit/materials/metal.js): its wear (grime, drips,
// rust streaks, edge wear, ambient occlusion and a brushed grain) is a baked texture, monorail-wear.webp
// (tools/train/monorail_wear.py), and it and the skirt reflect the sky of the place they are in (kit/materials/env.js;
// in the train place, TRAIN_SKY below).
// loadMonorail() is awaited by the train place before it builds the car and the world; if the model can't be fetched
// (patchy signal), monorailParts() stays null and car.js and world.js build their older code-made outside instead.
// Without the texture the skin is plain brushed metal.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { skyEnv } from '../kit/materials/env.js';
import { FINISH, applyFinish, wornMetal } from '../kit/materials/metal.js';

let parts = null,
  loading = null;

// one material per kind of surface; the colour is all in the vertices. The skin is the kit's brushed steel (the
// finish was made from it); the skirt is duller and reflects less.
const MATS = {
  car_skin: { finish: 'brushed' },
  car_under: { finish: 'brushed', roughness: 0.5, metalness: 0.2, envK: 0.7 },
  bellows: { roughness: 0.95, metalness: 0 },
  beam: { roughness: 0.95, metalness: 0 },
  pillar: { roughness: 0.95, metalness: 0 },
  foot: { roughness: 0.95, metalness: 0 },
};

// What the car's steel reflects in the train place (train/world.js gives its scene this reflection): sky above, a
// warm band at the horizon with the low sun's glow toward the sun (SUN_DIR, which places/train.js also lights the
// place with), the sea below.
export const SUN_DIR = new THREE.Vector3(-0.45, 0.62, -0.75).normalize();
export const TRAIN_SKY = {
  stops: [
    [0, '#5f8db6'],
    [0.32, '#93b2cb'],
    [0.44, '#bfc8cf'],
    [0.485, '#e3cdb0'],
    [0.5, '#e8c39a'],
    [0.515, '#9fb2bb'],
    [0.62, '#5d8296'],
    [1, '#24485a'],
  ],
  glow: [
    [0, 'rgba(255,232,196,0.85)'],
    [0.35, 'rgba(255,214,160,0.4)'],
    [1, 'rgba(255,200,140,0)'],
  ],
  glowR: 22,
  sun: SUN_DIR.toArray(),
};
// the shared reflection, for the car's doors and glass
export { skyEnv };

// Geometry and a material per node name, from a parsed glTF scene, with the skin's wear texture if it loaded.
export function partsFrom(scene, wear = null) {
  const out = {};
  scene.traverse((o) => {
    if (!o.isMesh || !MATS[o.name]) return;
    const { finish, envK, ...look } = MATS[o.name];
    const material = new THREE.MeshStandardMaterial({
      name: 'mono-' + o.name,
      vertexColors: true,
      ...(finish && { roughness: FINISH[finish].roughness, metalness: FINISH[finish].metalness }),
      ...look,
    });
    if (finish) applyFinish(material, { finish, envK });
    if (o.name === 'car_skin') wornMetal(material, o.geometry.attributes.uv ? wear : null);
    out[o.name] = { geometry: o.geometry, material };
  });
  return Object.keys(MATS).every((k) => out[k]) ? out : null;
}

function loadWear() {
  return new THREE.TextureLoader()
    .loadAsync(new URL('../../assets/train/monorail-wear.webp', import.meta.url).href)
    .then((t) => {
      t.flipY = false; // glTF UVs
      t.colorSpace = THREE.NoColorSpace; // data, not colour
      t.anisotropy = 4;
      return t;
    })
    .catch((e) => (console.warn('monorail-wear.webp', e), null));
}

export function loadMonorail() {
  return (loading ??= Promise.all([
    new GLTFLoader().loadAsync(new URL('../../assets/train/monorail.glb', import.meta.url).href),
    loadWear(),
  ])
    .then(([g, wear]) => {
      parts = partsFrom(g.scene, wear);
      if (!parts) console.warn('monorail.glb: missing nodes');
    })
    .catch((e) => console.warn('monorail.glb', e)));
}

// Set directly (the unit tests parse the file themselves).
export function setMonorail(p) {
  parts = p;
}

export const monorailParts = () => parts;

// A mesh of one node, sharing its geometry and material.
export function monorailMesh(name, { cast = false, recv = true } = {}) {
  const p = parts?.[name];
  if (!p) return null;
  const m = new THREE.Mesh(p.geometry, p.material);
  m.name = name;
  m.castShadow = cast;
  m.receiveShadow = recv;
  return m;
}
