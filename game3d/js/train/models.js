// The monorail's Blender-built outside (tools/train/monorail.py, game3d/assets/train/monorail.glb): the car's skin
// and roof units, its navy skirt, the gangway bellows, a beam segment, a pillar and its foot. Each node is one mesh
// whose colours (stainless, navy, frames, panel lines, weathering) are in its vertex colours.
// loadMonorail() is awaited by the train place before it builds the car and the world; if the file can't be fetched
// (patchy signal), monorailParts() stays null and car.js and world.js build their older code-made outside instead.
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';

let parts = null,
  loading = null;

// one material per kind of surface; the colour is all in the vertices
const MATS = {
  car_skin: { roughness: 0.42, metalness: 0.18 },
  car_under: { roughness: 0.7, metalness: 0.05 },
  bellows: { roughness: 0.95, metalness: 0 },
  beam: { roughness: 0.95, metalness: 0 },
  pillar: { roughness: 0.95, metalness: 0 },
  foot: { roughness: 0.95, metalness: 0 },
};

// Geometry and a material per node name, from a parsed glTF scene.
export function partsFrom(scene) {
  const out = {};
  scene.traverse((o) => {
    if (!o.isMesh || !MATS[o.name]) return;
    const material = new THREE.MeshStandardMaterial({
      name: 'mono-' + o.name,
      vertexColors: true,
      ...MATS[o.name],
    });
    out[o.name] = { geometry: o.geometry, material };
  });
  return Object.keys(MATS).every((k) => out[k]) ? out : null;
}

export function loadMonorail() {
  return (loading ??= new GLTFLoader()
    .loadAsync(new URL('../../assets/train/monorail.glb', import.meta.url).href)
    .then((g) => {
      parts = partsFrom(g.scene);
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
