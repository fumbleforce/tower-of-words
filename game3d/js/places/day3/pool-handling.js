// The sheet and individual bags stay on real hands while their owner walks.
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
export function poolHandling(root, { codeArms = false } = {}) {
  const actors = new Map();
  function actor(rig) {
    if (actors.has(rig)) return actors.get(rig);
    const hand = bone(rig, 'RightHand') || rig.arms?.[1]?.userData.hand || rig.arms?.[1];
    const chain = [bone(rig, 'RightForeArm'), bone(rig, 'RightArm')].filter(Boolean);
    if (!chain.length && codeArms && rig.arms?.[1]?.userData.hand) chain.push(rig.arms[1]);
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
        // Two small joints, solved in world coordinates; no changes to the mesh or bind pose.
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
    release(rig) {
      actors.get(rig)?.dispose();
      actors.delete(rig);
    },
    dispose() {
      for (const a of actors.values()) a.dispose();
      actors.clear();
    },
  };
}
