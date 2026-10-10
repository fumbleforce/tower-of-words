import * as THREE from 'three';
import { isPlayer } from '../../mc.js';
// Conversation eyelines for the approved rigs. A head turn never rotates seated legs away from the chair.
export function dinnerLooks(game, people) {
  const states = new Map();
  let listener = 'mio';
  function state(r) {
    if (states.has(r)) return states.get(r);
    let head = null;
    r.root.traverse((o) => {
      if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
    });
    if (!head) return null;
    const s = { head, base: head.quaternion.clone(), wrote: null, yaw: 0 };
    states.set(r, s);
    return s;
  }
  function clear() {
    for (const s of states.values()) {
      if (s.wrote && s.head.quaternion.angleTo(s.wrote) < 1e-5) s.head.quaternion.copy(s.base);
    }
    states.clear();
  }
  function update(dt) {
    const all = { ...people, eric: game.player },
      speaker = isPlayer(game.talkingTo) ? 'eric' : game.talkingTo;
    if (people[speaker]?.root.visible) listener = speaker;
    for (const [id, r] of Object.entries(all)) {
      if (!r.root.visible || !r.seated) continue;
      const target = all[id === speaker ? (id === 'eric' ? listener : 'eric') : speaker || listener];
      if (!target || target === r) continue;
      r.stepNow?.();
      const s = state(r);
      if (!s) continue;
      if (!s.wrote || s.head.quaternion.angleTo(s.wrote) > 1e-5) s.base.copy(s.head.quaternion);
      const p = r.root.position,
        t = target.root.position;
      const angle = Math.atan2(t.x - p.x, t.z - p.z) - r.root.rotation.y;
      const yaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.8, 0.8);
      s.yaw += (yaw - s.yaw) * Math.min(1, dt * 5);
      s.head.quaternion.copy(s.base);
      const parent = s.head.parent.getWorldQuaternion(new THREE.Quaternion());
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.yaw);
      s.head.quaternion.premultiply(parent.clone().invert().multiply(turn).multiply(parent));
      s.wrote = s.head.quaternion.clone();
    }
  }
  return { update, clear };
}
