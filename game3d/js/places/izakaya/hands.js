import * as THREE from 'three';
// A short, table-height reach. The hand is solved against the real wrist; props follow that wrist.
// Every frame starts from saved joint rotations, so held poses never accumulate.
export function diningHands(game, space) {
  const active = new Map();
  function arm(r, side) {
    const bones = {};
    r.root.traverse((o) => {
      if (o.isBone)
        for (const n of [side + 'Hand', side + 'ForeArm', side + 'Arm', 'Spine'])
          if (o.name === n || o.name === 'mixamorig' + n) bones[n] = o;
    });
    const hand =
      bones[side + 'Hand'] ||
      r.rig?.arms?.[side === 'Right' ? 1 : 0]?.userData.hand ||
      r.arms?.[side === 'Right' ? 1 : 0]?.userData.hand;
    const chain = [bones[side + 'ForeArm'], bones[side + 'Arm'], bones.Spine].filter(Boolean);
    if (!chain.length && hand?.parent) chain.push(hand.parent);
    if (!hand || !chain.length) throw new Error('Dining action requires a real ' + side.toLowerCase() + ' hand');
    return { hand, chain };
  }
  function start(r, side = 'Right') {
    r.stepNow?.();
    r.root.updateWorldMatrix(true, true);
    const { hand, chain } = arm(r, side),
      state = {
        r,
        hand,
        chain,
        base: chain.map((b) => b.quaternion.clone()),
        target: hand.getWorldPosition(new THREE.Vector3()),
        prop: null,
      };
    active.set(r, state);
    return state;
  }
  function apply(s) {
    s.r.stepNow?.();
    s.chain.forEach((b, i) => b.quaternion.copy(s.base[i]));
    s.r.root.updateWorldMatrix(true, true);
    for (let pass = 0; pass < 6; pass++)
      for (const bone of s.chain) {
        const origin = bone.getWorldPosition(new THREE.Vector3()),
          end = s.hand.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),
          to = s.target.clone().sub(origin).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(end, to),
          parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.premultiply(parent.clone().invert().multiply(q).multiply(parent));
        if (/Spine$/.test(bone.name)) {
          const base = s.base[s.chain.indexOf(bone)],
            angle = base.angleTo(bone.quaternion);
          if (angle > 0.48) bone.quaternion.copy(base.clone().slerp(bone.quaternion, 0.48 / angle));
        }
        bone.updateWorldMatrix(false, true);
      }
    if (s.prop) {
      const at = s.hand.getWorldPosition(new THREE.Vector3());
      space.worldToLocal(at);
      s.prop.position.copy(at).add(s.offset || new THREE.Vector3());
    }
  }
  async function move(s, to, seconds = 0.55) {
    const from = s.target.clone(),
      end = space.localToWorld(new THREE.Vector3(...to));
    await game.tween(seconds, (k) => {
      if (active.get(s.r) === s) s.target.copy(from).lerp(end, k * k * (3 - 2 * k));
    });
  }
  function stop(s) {
    if (active.get(s.r) !== s) return;
    active.delete(s.r);
    s.chain.forEach((b, i) => b.quaternion.copy(s.base[i]));
  }
  return {
    distance: (s) => s.hand.getWorldPosition(new THREE.Vector3()).distanceTo(s.target),
    start,
    move,
    stop,
    update: () => active.forEach(apply),
    clear: () => {
      for (const s of active.values()) stop(s);
    },
    active,
  };
}
