import * as THREE from 'three';

// The table is low: the seated actor can bend slightly from the lower back as well as the elbow.
// This overlay owns only these joints, and is removed before the next mixer step.
export function artHands(space) {
  const actors = new Map();
  const point = (o) => space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  function actor(rig) {
    if (actors.has(rig)) return actors.get(rig);
    const model = rig.model || rig.root;
    const bone = (name) => model.getObjectByName(name) || model.getObjectByName('mixamorig' + name);
    const hand = bone('RightHand') || rig.arms?.[1]?.userData.hand;
    const chain = ['RightForeArm', 'RightArm', 'Spine01', 'Spine02'].map(bone).filter(Boolean);
    if (!chain.length && hand?.parent) chain.push(hand.parent);
    if (!hand || !chain.length) throw new Error('Art action requires a real hand');
    const original = rig.update,
      saved = new Map();
    const s = { rig, hand, chain, target: null, item: null, offset: new THREE.Vector3() };
    function undo() {
      for (const [b, q] of saved) b.quaternion.copy(q);
      saved.clear();
    }
    function apply() {
      if (s.target) {
        for (const b of chain) saved.set(b, b.quaternion.clone());
        const target = space.localToWorld(s.target.clone());
        for (let pass = 0; pass < 10; pass++)
          for (const b of chain) {
            b.updateWorldMatrix(true, true);
            const at = b.getWorldPosition(new THREE.Vector3());
            const a = hand.getWorldPosition(new THREE.Vector3()).sub(at).normalize();
            const z = target.clone().sub(at).normalize();
            const parent = b.parent.getWorldQuaternion(new THREE.Quaternion());
            b.quaternion.premultiply(
              parent.clone().invert().multiply(new THREE.Quaternion().setFromUnitVectors(a, z)).multiply(parent),
            );
            if (/Spine/.test(b.name)) {
              const base = saved.get(b),
                angle = base.angleTo(b.quaternion),
                limit = 0.24;
              if (angle > limit) b.quaternion.copy(base.clone().slerp(b.quaternion, limit / angle));
            }
            b.updateWorldMatrix(false, true);
          }
      }
      if (s.item) s.item.position.copy(point(hand)).sub(s.offset);
    }
    rig.update = function (...args) {
      undo();
      const result = original?.apply(this, args);
      apply();
      return result;
    };
    Object.assign(s, {
      undo,
      apply,
      dispose() {
        undo();
        rig.update = original;
      },
    });
    actors.set(rig, s);
    return s;
  }
  return {
    point,
    reach(rig, target) {
      const s = actor(rig);
      s.undo();
      s.target = new THREE.Vector3(...target);
      s.apply();
    },
    hand: (rig) => point(actor(rig).hand),
    hold(rig, item, grip = [0, 0, 0]) {
      const s = actor(rig);
      space.attach(item);
      s.item = item;
      s.offset.set(...grip).applyQuaternion(item.quaternion);
      s.undo();
      s.apply();
    },
    drop(rig) {
      const s = actors.get(rig);
      if (s) {
        s.item = null;
        s.target = null;
        s.undo();
      }
    },
    owner(item) {
      for (const [rig, s] of actors) if (s.item === item) return rig;
      return null;
    },
    update() {
      for (const s of actors.values()) {
        s.undo();
        s.apply();
      }
    },
    dispose() {
      for (const s of actors.values()) s.dispose();
      actors.clear();
    },
  };
}
