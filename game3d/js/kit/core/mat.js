// The material cache: one MeshStandardMaterial per colour and options, shared by everything that asks for the same
// pair. props.js re-exports it, so the interiors and the outdoor kit share one cache.
//   mat(color, opts)       the shared material (never change it: every user of that colour would change)
//   mat.own(color, opts)   a material of your own, for one the evening, a fade or a clip plane changes. Saying so
//                          by name keeps that reason visible instead of a comment beside a bare constructor.
import * as THREE from 'three';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, mat.own(color, opts));
  return mats.get(key);
}
mat.own = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0,
    ...opts,
  });
