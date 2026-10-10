// The material cache: one MeshStandardMaterial per colour and options, shared by everything that asks for the same
// pair. props.js re-exports it, so the interiors and the outdoor kit share one cache.
//   mat(color, opts)       the shared material (never change it: every user of that colour would change)
//   mat.own(color, opts)   a material of your own, for one the evening, a fade or a clip plane changes. Saying so
//                          by name keeps that reason visible instead of a comment beside a bare constructor.
//   opts.finish            'brushed', 'painted' or 'glass': metal and glass that reflect the sky (kit/materials/metal.js),
//                          with envK and horizon beside it; plain data, so it keys the cache like any other option
import * as THREE from 'three';
import { FINISH_KEYS, finishLook, applyFinish } from '../materials/metal.js';

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, mat.own(color, opts));
  return mats.get(key);
}
mat.own = (color, opts = {}) => {
  if (!opts.finish)
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0,
      ...opts,
    });
  const look = { ...opts };
  for (const k of FINISH_KEYS) delete look[k];
  if (look.userData) look.userData = { ...look.userData }; // the finish notes itself there; not in the caller's object
  const m = new THREE.MeshStandardMaterial({ color, ...finishLook(opts.finish), ...look });
  return applyFinish(m, opts);
};
