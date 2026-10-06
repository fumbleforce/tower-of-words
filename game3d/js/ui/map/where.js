// Where Eric and the goal are on the island map: the place's own frame turned into the island's
// (scenes/island-layout.js toIsland, CHUNKS).
import * as THREE from 'three';
import { CHUNKS, toIsland } from '../../scenes/island-layout.js';

const v = new THREE.Vector3();
// { x, z, a }: his island point and his heading (radians, the screen angle with north up and x to the right)
export function ericAt(game) {
  const name = game?.place?.name,
    p = game?.player?.root?.position;
  if (!name || !p || !CHUNKS[name]) return null;
  const [x, z] = toIsland(name, p.x, p.z);
  const f = game.walker?.facing ?? game.player.root.rotation.y;
  const [ax, az] = toIsland(name, p.x + Math.sin(f), p.z + Math.cos(f));
  return { x, z, a: Math.atan2(az - z, ax - x) };
}

// the current goal's island point: the place's goal marker (the same one the goal arrow points at), or null
export function goalAt(game) {
  const name = game?.place?.name;
  if (!name || !CHUNKS[name] || !game.markers) return null;
  for (const m of game.markers.list) {
    let on = false;
    try {
      on = m.enabled() && m.goal?.();
    } catch {
      on = false;
    }
    if (!on) continue;
    m.anchor(v);
    return toIsland(name, v.x, v.z);
  }
  return null;
}
