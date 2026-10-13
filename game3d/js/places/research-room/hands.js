import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
export function referenceHands(game, P) {
  const hands = diningHands(game, P.space),
    contacts = [];
  let held = null;
  function pointHand(s) {
    if (!s.pointAt || hands.active.get(s.r) !== s) return;
    const y = P.space
        .localToWorld(new THREE.Vector3(...s.pointAt))
        .sub(s.hand.getWorldPosition(new THREE.Vector3()))
        .normalize(),
      x = new THREE.Vector3(0, 1, 0).addScaledVector(y, -y.y).normalize(),
      rotation = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(x, y, new THREE.Vector3().crossVectors(x, y)),
      );
    s.hand.quaternion
      .copy(s.handBase)
      .slerp(s.hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation), s.pointK ?? 1);
    s.hand.updateWorldMatrix(false, true);
  }
  function sample(s, id) {
    contacts.push({
      id,
      gap: hands.distance(s),
      hand: s.hand.getWorldPosition(new THREE.Vector3()).toArray(),
      target: s.target.toArray(),
    });
  }
  return {
    ...hands,
    contacts,
    update() {
      hands.update();
      if (held) pointHand(held);
    },
    snapshot: () =>
      held
        ? {
            who: held.r === P.people.research_reader ? 'research_reader' : 'eric',
            target: P.space.worldToLocal(held.target.clone()).toArray(),
            ...(held.pointAt ? { pointAt: [...held.pointAt], pointBase: held.handBase.toArray() } : {}),
          }
        : null,
    restore(saved) {
      this.release();
      if (!saved?.target?.every(Number.isFinite) || saved.target.length !== 3) return;
      const rig =
        saved.who === 'research_reader' ? P.people.research_reader : saved.who === 'eric' ? game.player : null;
      if (!rig) return;
      held = hands.start(rig);
      held.target.copy(P.space.localToWorld(new THREE.Vector3(...saved.target)));
      if (saved.pointAt?.length === 3 && saved.pointAt.every(Number.isFinite)) {
        held.pointAt = [...saved.pointAt];
        held.handBase = held.hand.quaternion.clone();
        if (saved.pointBase?.length === 4 && saved.pointBase.every(Number.isFinite))
          held.handBase.fromArray(saved.pointBase);
      }
    },
    async touch(job, rig, target, id, { prop, end, hold = false, point = false, facePoint = false } = {}) {
      if (hold) this.release();
      const s = hands.start(rig);
      if (point) {
        // Point toward a distant object; the wrist itself stays within this rig's arm reach.
        const elbow = s.chain[0].getWorldPosition(new THREE.Vector3()),
          shoulder = s.chain[1].getWorldPosition(new THREE.Vector3()),
          reach = elbow.distanceTo(shoulder) + elbow.distanceTo(s.hand.getWorldPosition(new THREE.Vector3())),
          aim = P.space.localToWorld(new THREE.Vector3(...target));
        target = P.space
          .worldToLocal(
            shoulder.add(
              aim
                .sub(shoulder)
                .normalize()
                .multiplyScalar(reach * 0.82),
            ),
          )
          .toArray();
      }
      try {
        await job.wait(hands.move(s, target));
        await job.wait(game.wait(160));
        sample(s, id);
        if (hands.distance(s) > 0.065)
          throw new Error(`Research gesture is outside reach: ${id} (${hands.distance(s).toFixed(3)}m)`);
        if (prop) {
          P.space.attach(prop);
          s.prop = prop;
          s.offset = new THREE.Vector3(0, -0.025, 0);
        }
        if (end) {
          await job.wait(hands.move(s, end));
          sample(s, id + '-end');
        }
        if (hold) {
          if (facePoint) {
            s.pointAt = [...facePoint];
            s.handBase = s.hand.quaternion.clone();
          }
          held = s;
          if (s.pointAt) {
            s.pointK = 0;
            await job.wait(
              game.tween(0.25, (k) => {
                if (job.live() && held === s && hands.active.get(s.r) === s) s.pointK = k;
              }),
            );
          }
          pointHand(s);
          return s;
        }
        await job.wait(game.wait(250));
      } finally {
        if (!hold || held !== s) hands.stop(s);
      }
    },
    release() {
      if (held) {
        if (held.handBase && hands.active.get(held.r) === held) held.hand.quaternion.copy(held.handBase);
        held.prop = null;
        hands.stop(held);
        held = null;
      }
    },
  };
}
