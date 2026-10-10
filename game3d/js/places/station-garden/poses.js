import * as THREE from 'three';
import { poolHandling } from '../day3/pool-handling.js';

// Solve the approved body's arm, then align the pole through the actual wrist and floor contact.
export function gardenPoses(P, worker, tools) {
  const hands = poolHandling(P.space, { codeArms: true });
  // the hands the broom and pan hang from: the approved body's own hand bones (the right one poolHandling reaches
  // with), or the code-built worker's
  const bone = (name) => worker.model?.getObjectByName(name);
  const wrist = bone('RightHand') || worker.arms[1].userData.hand,
    leftHand = bone('LeftHand') || worker.arms[0].userData.hand;
  const hand = new THREE.Vector3(),
    base = new THREE.Vector3(),
    axis = new THREE.Vector3(0, 1, 0);
  return {
    sweep(x, z, progress) {
      const bx = x + 0.13,
        bz = z + 0.66 - progress * 0.28;
      hands.reach(worker, [bx, 0.76, bz - 0.16]);
      P.space.worldToLocal(wrist.getWorldPosition(hand));
      base.set(bx, 0.022, bz);
      tools.broom.position.copy(base);
      tools.broom.quaternion.setFromUnitVectors(axis, hand.clone().sub(base).normalize());
      tools.pan.position.set(x + 0.13, 0, z + 0.3);
      tools.pan.rotation.y = Math.PI;
      return {
        hand: hand.toArray(),
        floor: base.toArray(),
        grip: hand.distanceTo(base),
      };
    },
    carry() {
      hands.drop(worker);
      P.space.worldToLocal(wrist.getWorldPosition(hand));
      tools.broom.rotation.set(0, 0, 0);
      tools.broom.position.copy(hand).add(new THREE.Vector3(0, -0.45, 0));
      P.space.worldToLocal(leftHand.getWorldPosition(hand));
      tools.pan.rotation.set(0, 0, 0);
      tools.pan.position.copy(hand).add(new THREE.Vector3(0, -0.5275, -0.14));
    },
    rest(parked = false) {
      hands.drop(worker);
      const p = worker.root.position;
      tools.park(parked ? undefined : [p.x + 0.45, p.z + 0.15]);
    },
    dispose() {
      hands.dispose();
    },
  };
}
