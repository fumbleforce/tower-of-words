import * as THREE from 'three';
import { poolHandling } from './day3/pool-handling.js';
// Own only this interaction's arm overlay and paper anchor; the approved rig/animation remains untouched.
export function printHands(game, P, output) {
  const rig = game.player,
    hands = poolHandling(P.space, { codeArms: true }),
    holder = new THREE.Group();
  const model = rig.model || rig.root;
  const wrist =
    model.getObjectByName('RightHand') ||
    model.getObjectByName('mixamorigRightHand') ||
    rig.arms?.[1]?.userData.hand ||
    rig.arms?.[1];
  const point = () => P.space.worldToLocal(wrist.getWorldPosition(new THREE.Vector3()));
  const originalParent = output.parent,
    originalPosition = output.position.clone(),
    originalRotation = output.quaternion.clone();
  P.space.add(holder);
  return {
    ready: !!wrist,
    point,
    reach: (target) => hands.reach(rig, target),
    rest: () => hands.drop(rig),
    pick(edge) {
      holder.position.fromArray(edge);
      holder.rotation.y = rig.root.rotation.y;
      holder.updateWorldMatrix(true, true);
      holder.attach(output);
      hands.hold(rig, holder);
    },
    dispose() {
      hands.drop(rig);
      hands.dispose();
      originalParent.attach(output);
      output.position.copy(originalPosition);
      output.quaternion.copy(originalRotation);
      holder.removeFromParent();
    },
  };
}
