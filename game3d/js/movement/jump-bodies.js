// Outfit slots retain their own model holders and animation methods. Keep one jump
// layer per body, restoring its same wrapper each time rather than wrapping wrappers.
import * as THREE from 'three';
import { installJumpPose } from './jump-pose.js';

export function installJumpBodies(player, shadow) {
  const root = player.root,
    cache = new WeakMap();
  let current = null,
    model = null;
  function sync() {
    const next = player.model || player.rig?.root || root;
    const changed = next !== model;
    if (!changed) return { ...current, changed: false };
    if (current) {
      current.pose.reset();
      current.hop.position.y = 0;
      current.hop.rotation.set(0, 0, 0);
      current.hop.scale.setScalar(1);
      current.hop.removeFromParent();
    }
    model = next;
    let entry = cache.get(model);
    if (!entry) {
      const hop = new THREE.Group();
      hop.name = 'jump';
      for (const child of [...root.children]) if (child !== shadow) hop.add(child);
      root.add(hop);
      entry = { hop, pose: installJumpPose(hop, player) };
      cache.set(model, entry);
    } else {
      // The outfit slot can restore its saved holder directly under the root.
      // Move that holder back inside the cached waist pivot; its local transform is unchanged.
      for (const child of [...root.children]) if (child !== shadow && child !== entry.hop) entry.pose.body.add(child);
      root.add(entry.hop);
      entry.pose.reset();
      entry.pose.activate();
    }
    current = entry;
    return { ...entry, changed: true };
  }
  return { sync };
}
