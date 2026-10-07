// A temporary table reach adds a bounded waist lean; hand-held props follow the actual wrist.
import * as THREE from 'three';
const point = new THREE.Vector3(),
  origin = new THREE.Vector3(),
  end = new THREE.Vector3();
const from = new THREE.Vector3(),
  to = new THREE.Vector3(),
  delta = new THREE.Quaternion(),
  parent = new THREE.Quaternion();
function bone(rig, name) {
  const model = rig.model || rig.root;
  return model.getObjectByName(name) || model.getObjectByName('mixamorig' + name);
}
export function karaokeHands(root, { codeArms = false } = {}) {
  const actors = new Map(),
    sides = new Map();
  function actor(rig) {
    if (actors.has(rig)) return actors.get(rig);
    const side = sides.get(rig) || 'Right',
      index = side === 'Right' ? 1 : 0;
    const hand = bone(rig, side + 'Hand') || rig.arms?.[index]?.userData.hand || rig.arms?.[index];
    const chain = [bone(rig, side + 'ForeArm'), bone(rig, side + 'Arm'), bone(rig, 'Spine')].filter(Boolean);
    if (!chain.length && codeArms && rig.arms?.[index]?.userData.hand) chain.push(rig.arms[index]);
    const original = rig.update,
      saved = new Map();
    const state = { hand, chain, target: null, held: null, offset: 0 };
    const undo = () => {
      for (const [b, q] of saved) b.quaternion.copy(q);
      saved.clear();
    };
    const apply = () => {
      if (state.target && hand) {
        for (const b of chain) saved.set(b, b.quaternion.clone());
        root.localToWorld(point.copy(state.target));
        // The arm and bounded waist reach solve in world coordinates without altering the bind pose.
        for (let n = 0; n < 5; n++)
          for (const b of chain) {
            b.updateWorldMatrix(true, true);
            b.getWorldPosition(origin);
            hand.getWorldPosition(end);
            from.copy(end).sub(origin).normalize();
            to.copy(point).sub(origin).normalize();
            delta.setFromUnitVectors(from, to);
            b.parent.getWorldQuaternion(parent);
            delta.premultiply(parent.clone().invert()).multiply(parent);
            b.quaternion.premultiply(delta);
            if (/Spine$/.test(b.name)) {
              const base = saved.get(b),
                angle = base.angleTo(b.quaternion);
              if (angle > 0.75) b.quaternion.copy(base.clone().slerp(b.quaternion, 0.75 / angle));
            }
            b.updateWorldMatrix(false, true);
          }
      }
      if (state.held && hand) {
        hand.getWorldPosition(state.held.position);
        root.worldToLocal(state.held.position);
        state.held.position.y -= state.offset;
        state.held.rotation.set(0, rig.root.rotation.y, 0);
      }
    };
    rig.update = function (...args) {
      undo();
      const value = original?.apply(this, args);
      apply();
      return value;
    };
    Object.assign(state, {
      apply,
      undo,
      dispose() {
        undo();
        rig.update = original;
      },
    });
    actors.set(rig, state);
    return state;
  }
  return {
    side: (rig) => sides.get(rig) || 'Right',
    setSide(rig, side) {
      if ((sides.get(rig) || 'Right') === side) return;
      actors.get(rig)?.dispose();
      actors.delete(rig);
      sides.set(rig, side);
    },
    reach(rig, target) {
      const a = actor(rig);
      a.target = target ? new THREE.Vector3(...target) : null;
      a.undo();
      a.apply();
    },
    hold(rig, item, offset = 0) {
      const a = actor(rig);
      root.attach(item);
      item.visible = true;
      a.held = item;
      a.offset = offset;
      a.target = null;
      a.undo();
      a.apply();
    },
    drop(rig) {
      const a = actors.get(rig);
      if (a) {
        a.held = null;
        a.target = null;
        a.undo();
      }
    },
    update() {
      for (const a of actors.values()) if (!a.chain.length) a.apply();
    },
    owner(item) {
      for (const [rig, state] of actors) if (state.held === item) return rig;
      return null;
    },
    dispose() {
      for (const a of actors.values()) a.dispose();
      actors.clear();
      sides.clear();
    },
  };
}
