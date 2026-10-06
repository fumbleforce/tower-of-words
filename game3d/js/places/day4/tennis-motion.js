// Racket swings and a seated shoe adjustment, laid over each rig's current clip.
import * as THREE from 'three';
function turn(r, name, axis, angle) {
  const b = (r.model || r.root).getObjectByName(name) || (r.model || r.root).getObjectByName('mixamorig' + name);
  if (!b) return;
  const q = r.root.getWorldQuaternion(new THREE.Quaternion());
  const direction = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0).applyQuaternion(
    q,
  );
  b.parent.updateWorldMatrix(true, false);
  const parent = b.parent.getWorldQuaternion(new THREE.Quaternion());
  b.quaternion.premultiply(
    parent.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(direction, angle)).multiply(parent),
  );
  b.updateMatrixWorld(true);
}
export async function racketSwing(game, r, serve = false) {
  const yaw = r.root.rotation.y,
    arm = r.arms?.[1]?.rotation.clone();
  await game.tween(serve ? 1.5 : 0.55, (k) => {
    const b = Math.sin(k * Math.PI);
    r.stepNow?.();
    r.root.rotation.y = yaw + b * 0.5;
    if (r.meshy || r.model) {
      turn(r, 'RightArm', 'x', -(serve ? 2.7 : 1.2) * b);
      turn(r, 'RightArm', 'y', b * (k - 0.5));
      if (serve) turn(r, 'LeftArm', 'x', -2.3 * Math.sin(Math.min(1, k * 1.5) * Math.PI));
    } else if (arm) r.arms[1].rotation.x = arm.x - (serve ? 2.7 : 1.2) * b;
  });
  r.root.rotation.y = yaw;
  if (arm) r.arms[1].rotation.copy(arm);
}
export async function adjustShoe(game, r) {
  const torso = r.torso.rotation.clone(),
    arm = r.arms?.[1]?.rotation.clone();
  // Both hands loosen the lace, then one rubs behind the heel before she sits back.
  await game.tween(3.4, (k) => {
    r.stepNow?.();
    const bend = Math.sin(k * Math.PI) ** 0.45;
    const pull = Math.sin(k * Math.PI * 8) * 0.08 * bend;
    if (r.meshy || r.model) {
      turn(r, 'Spine', 'x', bend * 0.5);
      turn(r, 'Spine02', 'x', bend * 0.55);
      turn(r, 'Head', 'x', -bend * 0.4);
      turn(r, 'RightArm', 'x', -bend * 1.7 + pull);
      turn(r, 'RightForeArm', 'x', -bend * 0.35);
      turn(r, 'LeftArm', 'x', -bend * (k < 0.5 ? 1.7 : 0.6));
      turn(r, 'RightArm', 'y', k > 0.5 ? bend * 0.35 : 0);
    } else {
      r.torso.rotation.x = torso.x + bend * 0.7;
      r.arms[1].rotation.x = arm.x - bend * 1.0 + pull;
    }
  });
  r.torso.rotation.copy(torso);
  if (arm) r.arms[1].rotation.copy(arm);
}
