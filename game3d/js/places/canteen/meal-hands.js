import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
import { CHARACTER_SCALE } from '../../character-scale.js';

// The second hand follows the opposite tray handle after the first arm has settled.
// It does not update the mixer or spine again and cannot undo the first arm's pose.
export function mealHands(game, P) {
  const right = diningHands(game, P.space),
    left = diningHands(game, P.space),
    contacts = [];
  let carried = null;
  const point = (o) => P.space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  function stopCarry() {
    if (!carried) return;
    right.stop(carried.a);
    left.stop(carried.b);
    carried = null;
  }
  function carry(rig, tray) {
    stopCarry();
    const a = right.start(rig),
      b = left.start({ ...rig, stepNow: () => {} }, 'Left');
    for (let i = b.chain.length - 1; i >= 0; i--)
      if (/Spine$/.test(b.chain[i].name)) {
        b.chain.splice(i, 1);
        b.base.splice(i, 1);
      }
    P.space.attach(tray.root);
    const shoulder = a.chain.find((bone) => /RightArm$/.test(bone.name)) || a.chain[0];
    const positive = rig.root.worldToLocal(shoulder.getWorldPosition(new THREE.Vector3())).x > 0;
    const grips = (positive ? [...tray.grips].reverse() : tray.grips).map((grip) => grip.clone());
    const rigidArm = a.chain.length === 1;
    if (rigidArm) for (const grip of grips) grip.z = -0.19;
    carried = { rig, tray, a, b, grips, rigidArm };
    update();
  }
  function update() {
    for (const arm of right.active.values()) arm.follow?.();
    if (carried) {
      const { rig, tray, a, b, grips, rigidArm } = carried,
        yaw = rig.root.rotation.y,
        forward = rigidArm ? 0.52 : 0.28 * CHARACTER_SCALE;
      const centre = rig.root.position
        .clone()
        .add(new THREE.Vector3(Math.sin(yaw) * forward, 0.72, Math.cos(yaw) * forward));
      // Meshy arms carry at the selected body height; the worker has a separate rigid-arm pose.
      centre.y = rigidArm ? 0.72 : 0.72 * CHARACTER_SCALE;
      tray.root.rotation.set(0, yaw, 0);
      const grip = grips[0].clone().applyEuler(tray.root.rotation);
      a.target.copy(P.space.localToWorld(centre.clone().add(grip)));
      right.update();
      tray.root.position.copy(point(a.hand)).sub(grip);
      tray.root.updateWorldMatrix(true, true);
      b.target.copy(tray.root.localToWorld(grips[1].clone()));
      left.update();
    } else right.update();
  }
  async function reach(job, rig, target, { item, grip = [0, 0, 0], end, hold = 250, id = 'reach' } = {}) {
    const s = right.start(rig);
    try {
      await job.wait(right.move(s, target));
      await job.wait(game.wait(180));
      contacts.push({
        id,
        gap: right.distance(s),
        hand: point(s.hand).toArray(),
        target,
        pose: { at: rig.root.position.toArray(), yaw: rig.root.rotation.y, scale: rig.root.scale.x },
      });
      if (item) {
        P.space.attach(item);
        s.prop = item;
        s.offset = new THREE.Vector3(...grip).negate();
      }
      if (end) await job.wait(right.move(s, end));
      P.canteenPhase = id + '-contact';
      if (hold) await job.wait(game.wait(hold));
      if (item) {
        contacts.push({ id: id + '-end', gap: right.distance(s), hand: point(s.hand).toArray(), target: end });
        s.prop = null;
        if (end) item.position.set(...end).sub(new THREE.Vector3(...grip));
      }
    } finally {
      right.stop(s);
    }
  }
  return {
    ...right,
    point,
    reach,
    carry,
    stopCarry,
    contacts,
    update,
    async pointAt(job, rig, target, id = 'point') {
      const arm = right.start(rig);
      try {
        for (let i = arm.chain.length - 1; i >= 0; i--)
          if (/Spine$/.test(arm.chain[i].name)) {
            arm.chain[i].quaternion.copy(arm.base[i]);
            arm.chain.splice(i, 1);
            arm.base.splice(i, 1);
          }
        const shoulder = arm.chain.at(-1),
          origin = shoulder.getWorldPosition(new THREE.Vector3());
        const chain = [arm.hand, ...arm.chain],
          length = chain
            .slice(1)
            .reduce(
              (sum, b, i) =>
                sum +
                b.getWorldPosition(new THREE.Vector3()).distanceTo(chain[i].getWorldPosition(new THREE.Vector3())),
              0,
            );
        const aim = P.space
          .localToWorld(new THREE.Vector3(...target))
          .sub(origin)
          .normalize();
        const at = P.space.worldToLocal(origin.clone().addScaledVector(aim, length * 0.98));
        await job.wait(right.move(arm, at.toArray()));
        P.canteenPhase = id + '-point';
        await job.wait(game.wait(600));
        const actual = arm.hand
          .getWorldPosition(new THREE.Vector3())
          .sub(shoulder.getWorldPosition(new THREE.Vector3()))
          .normalize();
        contacts.push({ id, kind: 'point', aimDot: actual.dot(aim) });
      } finally {
        right.stop(arm);
      }
    },
    rigidCarryGrip(rig) {
      return carried?.rig === rig && carried.rigidArm
        ? carried.grips[0].clone().applyEuler(carried.tray.root.rotation)
        : null;
    },
    carryContacts() {
      if (!carried) return [];
      const { a, b, tray, grips } = carried;
      return [a, b].map((s, i) => ({
        id: `carry-${i}`,
        gap: s.hand.getWorldPosition(new THREE.Vector3()).distanceTo(tray.root.localToWorld(grips[i].clone())),
        hand: point(s.hand).toArray(),
        target: P.space.worldToLocal(tray.root.localToWorld(grips[i].clone())).toArray(),
      }));
    },
    clear() {
      stopCarry();
      right.clear();
      left.clear();
    },
  };
}
