import * as THREE from 'three';

// Baked relaxed-3 motion, with native cast stance adapted to each body's rest frames.
export async function loadRelaxedIdle(rig, version = '') {
  const url = new URL(`../assets/characters/relaxed-idle-${rig}.json`, import.meta.url);
  const response = await fetch(url.href + version);
  if (!response.ok) throw new Error(`Approved idle: ${response.status} ${url.pathname}`);
  return THREE.AnimationClip.parse(await response.json());
}
