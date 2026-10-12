// A visual layer over the player's mixer: gather the legs, reach, then absorb the landing.
// Its own waist-height pivot turns the third jump without moving the physical hop/root.
import * as THREE from 'three';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const JOINTS =
  /^(Hips|Spine\d*|LeftUpLeg|RightUpLeg|LeftLeg|RightLeg|LeftFoot|RightFoot|LeftArm|RightArm|LeftForeArm|RightForeArm)$/;

export function installJumpPose(hop, player) {
  const pivot = new THREE.Group(),
    body = new THREE.Group();
  pivot.name = 'jump-somersault';
  body.name = 'jump-body';
  const model = player.model || hop;
  const joints = new Map(),
    bind = new Map(),
    previous = new Map();
  model.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.skeleton.bones.forEach((bone, i) => bind.set(bone, o.skeleton.boneInverses[i].clone().invert()));
  });
  model.traverse((bone) => {
    const name = bone.name.replace(/^mixamorig:?/i, '');
    if (!bone.isBone || !JOINTS.test(name)) return;
    const matrix = bind.has(bone.parent) ? bind.get(bone)?.clone() : null;
    if (matrix) matrix.premultiply(bind.get(bone.parent).clone().invert());
    const neutral = matrix ? new THREE.Quaternion().setFromRotationMatrix(matrix) : bone.quaternion.clone();
    joints.set(name, { bone, neutral });
  });
  // Actual hips position gives each protagonist their own centre of rotation.
  hop.updateWorldMatrix(true, true);
  const centre = new THREE.Vector3(0, 0.7, 0);
  const hips = joints.get('Hips')?.bone;
  if (hips) hop.worldToLocal(hips.getWorldPosition(centre));
  for (const child of [...hop.children]) body.add(child);
  pivot.position.y = centre.y;
  body.position.y = -centre.y;
  pivot.add(body);
  hop.add(pivot);

  let active = false,
    airborne = false,
    wasAirborne = false,
    flip = false;
  let elapsed = 0,
    landing = 1,
    ratio = 1,
    progress = 0;
  const axis = new THREE.Vector3(),
    frame = new THREE.Quaternion(),
    parent = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  function undo() {
    for (const [bone, q] of previous) bone.quaternion.copy(q);
    previous.clear();
  }
  function turn(name, x, z = 0) {
    const bone = joints.get(name)?.bone;
    if (!bone) return;
    for (const [vector, angle] of [
      [[1, 0, 0], x],
      [[0, 0, 1], z],
    ]) {
      if (!angle) continue;
      // The character's body frame, independent of its facing and current somersault.
      body.getWorldQuaternion(frame);
      axis.set(...vector).applyQuaternion(frame);
      bone.parent.getWorldQuaternion(parent);
      rotation.setFromAxisAngle(axis, angle);
      rotation.premultiply(parent.clone().invert()).multiply(parent);
      bone.quaternion.premultiply(rotation);
      bone.updateWorldMatrix(false, true);
    }
  }
  const origin = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    target = new THREE.Vector3();
  function aim(name, childName, vector, weight) {
    const bone = joints.get(name)?.bone;
    const child = bone?.getObjectByName(childName) || [...(bone?.children || [])].find((o) => o.isBone);
    if (!bone || !child) return;
    bone.getWorldPosition(origin);
    child.getWorldPosition(direction).sub(origin).normalize();
    body.getWorldQuaternion(frame);
    target
      .set(...vector)
      .normalize()
      .applyQuaternion(frame);
    rotation.setFromUnitVectors(direction, target);
    rotation.slerp(new THREE.Quaternion(), 1 - weight);
    bone.parent.getWorldQuaternion(parent);
    rotation.premultiply(parent.clone().invert()).multiply(parent);
    bone.quaternion.premultiply(rotation);
    bone.updateWorldMatrix(false, true);
  }
  function apply() {
    if (!active) return;
    const weight = airborne ? smooth(0, 0.07, elapsed) : 1 - smooth(0.08, 0.2, landing);
    if (!weight) return;
    for (const { bone, neutral } of joints.values()) {
      previous.set(bone, bone.quaternion.clone());
      bone.quaternion.slerp(neutral, weight);
    }
    body.updateWorldMatrix(true, true);
    const tuck = airborne ? (flip ? Math.sin(progress * Math.PI) : smooth(0.75, 0.05, ratio)) : 0;
    const extend = airborne ? smooth(-0.35, -1.1, ratio) : 1;
    const bend = airborne ? (0.55 + tuck * 1.05) * (1 - extend * 0.8) : 0.6 * (1 - landing / 0.2);
    for (const side of ['Left', 'Right']) {
      const sign = side === 'Left' ? 1 : -1;
      aim(side + 'UpLeg', side + 'Leg', [sign * 0.07, -Math.cos(bend), Math.sin(bend)], weight);
      aim(side + 'Leg', side + 'Foot', [sign * 0.03, -Math.cos(bend * 0.8), -Math.sin(bend * 0.8)], weight);
      turn(side + 'Foot', -bend * 0.3 * weight);
      aim(
        side + 'Arm',
        side + 'ForeArm',
        [sign * 0.32, airborne ? -0.7 + tuck * 0.65 : -1, airborne ? 0.7 : 0.2],
        weight,
      );
      aim(side + 'ForeArm', side + 'Hand', [sign * 0.12, airborne ? -0.05 : -0.8, 0.8], weight);
    }
    turn('Spine', (airborne ? 0.1 + tuck * 0.32 : 0.15) * weight);
  }
  const originalUpdate = player.update;
  const update = function (...args) {
    undo();
    const result = originalUpdate.apply(this, args);
    apply();
    return result;
  };
  player.update = update;
  function reset() {
    undo();
    active = airborne = wasAirborne = flip = false;
    elapsed = progress = 0;
    landing = 1;
    pivot.rotation.x = 0;
  }
  return {
    begin(count) {
      undo();
      active = airborne = wasAirborne = true;
      elapsed = progress = 0;
      landing = 1;
      flip = count === 3;
      pivot.rotation.x = 0;
    },
    update({ airborne: air, velocityRatio = 0, dt = 0 }) {
      if (!active) return;
      airborne = air;
      ratio = velocityRatio;
      elapsed += dt;
      if (air) {
        // A monotone full revolution across ascent and descent, finishing before foot contact.
        progress = Math.max(progress, smooth(0.03, 0.48, elapsed));
        pivot.rotation.x = flip ? Math.PI * 2 * progress : 0;
      } else {
        if (wasAirborne) landing = 0;
        landing += dt;
        pivot.rotation.x = 0; // 2pi is the same orientation; never unwind backwards on landing.
        if (landing >= 0.2) reset();
      }
      wasAirborne = air;
    },
    reset,
    activate() {
      player.update = update;
    },
    body,
    pivot,
    get active() {
      return active;
    },
  };
}
