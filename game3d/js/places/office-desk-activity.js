// A seated desk worker reads the monitor, types briefly, and notices someone approaching.
// Upper-body offsets follow the mixer; its next update restores the clip pose.
import * as THREE from 'three';

export function deskActivity(game) {
  let rig = null,
    bones = {},
    weight = 0,
    gaze = 0;
  const body = new THREE.Quaternion(),
    parent = new THREE.Quaternion();
  const turn = new THREE.Quaternion(),
    axis = new THREE.Vector3();
  function rotate(bone, direction, angle) {
    if (!bone || !angle) return;
    axis.set(direction === 'x' ? 1 : 0, direction === 'y' ? 1 : 0, 0).applyQuaternion(body);
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(parent);
    turn.setFromAxisAngle(axis, angle);
    turn.premultiply(parent.clone().invert()).multiply(parent);
    bone.quaternion.premultiply(turn);
    bone.updateMatrixWorld(true);
  }
  return (person, dt, t, active) => {
    if (person !== rig) {
      rig = person;
      bones = {};
      weight = gaze = 0;
      rig?.model.traverse((bone) => {
        if (bone.isBone) bones[bone.name.replace(/^mixamorig/, '')] = bone;
      });
    }
    if (!rig?.root.visible || !rig.seated || rig._walk || rig.state !== 'sit') {
      weight = gaze = 0;
      return;
    }
    const working = active && !game.busy;
    weight += ((working ? 1 : 0) - weight) * Math.min(1, dt * 6);
    if (weight < 0.001) return;
    const p = game.player.root.position,
      here = rig.root.position;
    const near = Math.hypot(p.x - here.x, p.z - here.z) < 2.2;
    const delta = Math.atan2(p.x - here.x, p.z - here.z) - rig.root.rotation.y;
    const yaw = Math.atan2(Math.sin(delta), Math.cos(delta));
    gaze += ((working && near ? Math.max(-0.7, Math.min(0.7, yaw)) : 0) - gaze) * Math.min(1, dt * 4);
    rig.root.getWorldQuaternion(body);
    rotate(bones.Head, 'y', gaze * weight);
    rotate(bones.Head, 'x', (-0.06 + Math.sin(t * 0.7) * 0.015) * weight);
    // Three seconds of small alternating keystrokes, then a pause to read.
    const typing = !near && t % 5 < 3 ? 1 : 0;
    for (const [side, phase] of [
      ['Left', 0],
      ['Right', Math.PI],
    ]) {
      rotate(bones[side + 'Arm'], 'x', -0.75 * weight);
      rotate(bones[side + 'ForeArm'], 'x', (-0.55 + Math.sin(t * 8 + phase) * 0.04 * typing) * weight);
      rotate(bones[side + 'Hand'], 'x', Math.sin(t * 8 + phase) * 0.035 * typing * weight);
    }
  };
}
