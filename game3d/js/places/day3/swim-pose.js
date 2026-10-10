// Keep the face above the water using the actual rig's head anchor. A local overlay supplies gentle sculling
// and a forward breaststroke posture; it is removed before each mixer update and whenever the actor gets out.
import * as THREE from 'three';
const WATER_Y = 0.09;
const _q = new THREE.Quaternion(),
  _parent = new THREE.Quaternion(),
  _axis = new THREE.Vector3(),
  _point = new THREE.Vector3();

// The walking controller is paused in water; turn the scripted swimmer itself toward the speaker.
export async function faceSwimmer(game, action, target) {
  const player = game.player,
    from = player.root.rotation.y,
    p = player.root.position;
  const angle = Math.atan2(target.x - p.x, target.z - p.z);
  const delta = Math.atan2(Math.sin(angle - from), Math.cos(angle - from));
  await action.wait(
    action.tween(Math.max(0.35, Math.abs(delta) / 2.4), (t) => {
      player.root.rotation.y = from + delta * t;
    }),
  );
  game.walker.facing = player.root.rotation.y;
}

function rotate(root, bone, axis, angle) {
  if (!bone || !angle) return;
  root.getWorldQuaternion(_q);
  _axis.set(...axis).applyQuaternion(_q);
  bone.parent.getWorldQuaternion(_parent);
  _q.setFromAxisAngle(_axis, angle).premultiply(_parent.clone().invert()).multiply(_parent);
  bone.quaternion.premultiply(_q);
  bone.updateWorldMatrix(false, true);
}
export function swimmerPose(rig) {
  const bones = {};
  (rig.model || rig.root).traverse((o) => {
    if (!o.isBone) return;
    const name = o.name.replace(/^mixamorig:?/, '');
    if (['Head', 'Neck', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'].includes(name)) bones[name] = o;
  });
  const head = bones.Head || rig.head,
    root = rig.root,
    originals = new Map();
  const originalUpdate = rig.update;
  let mode = null,
    time = 0,
    rootX = 0,
    previousAvoid,
    immersion = 1;
  function undo() {
    if (!mode && !originals.size) return;
    for (const [bone, q] of originals) bone.quaternion.copy(q);
    originals.clear();
    root.rotation.x = rootX;
  }
  function apply() {
    if (!mode) return;
    for (const bone of Object.values(bones)) originals.set(bone, bone.quaternion.clone());
    const swimming = mode === 'swim';
    root.rotation.x = rootX + (swimming ? 0.72 : 0);
    root.updateWorldMatrix(true, true);
    const sweep = Math.sin(time * (swimming ? 3.3 : 2.2));
    rotate(root, bones.LeftArm, [0, 0, 1], 0.36 + sweep * 0.12);
    rotate(root, bones.RightArm, [0, 0, 1], -0.36 - sweep * 0.12);
    rotate(root, bones.LeftArm, [1, 0, 0], swimming ? -0.65 : -0.35);
    rotate(root, bones.RightArm, [1, 0, 0], swimming ? -0.65 : -0.35);
    rotate(root, bones.LeftForeArm, [1, 0, 0], -0.45);
    rotate(root, bones.RightForeArm, [1, 0, 0], -0.45);
    rotate(root, bones.Head, [1, 0, 0], swimming ? -0.65 : 0);
    root.updateWorldMatrix(true, true);
    if (head) {
      head.getWorldPosition(_point);
      root.parent?.worldToLocal(_point);
      root.position.y = (root.position.y + WATER_Y + 0.26 + Math.sin(time * 2) * 0.012 - _point.y) * immersion;
      root.updateWorldMatrix(true, true);
    }
  }
  rig.update = function (dt, ...args) {
    undo();
    const result = originalUpdate?.call(this, dt, ...args);
    time += dt || 0;
    apply();
    return result;
  };
  return {
    enter(next = 'tread', depth = 1) {
      immersion = depth;
      if (!mode) {
        rootX = root.rotation.x;
        previousAvoid = rig._noAvoid;
      }
      mode = next;
      rig.swimming = true;
      rig._noAvoid = true; // fixed water choreography must not be pushed onto the deck's walk grid
      rig.seated = false;
      rig.setState?.('idle');
      undo();
      apply();
    },
    setDepth(depth) {
      immersion = depth;
      this.refresh();
    },
    refresh() {
      undo();
      apply();
    },
    leave() {
      if (mode) rig._noAvoid = previousAvoid;
      undo();
      mode = null;
      rig.swimming = false;
      root.position.y = 0;
    },
    get active() {
      return !!mode;
    },
    get mode() {
      return mode;
    },
    dispose() {
      this.leave();
      rig.update = originalUpdate;
    },
  };
}
