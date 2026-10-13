import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
export function referenceHands(game, P) {
  const hands = diningHands(game, P.space),
    contacts = [];
  let held = null;
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
    snapshot: () =>
      held
        ? {
            who: held.r === P.people.research_reader ? 'research_reader' : 'eric',
            target: P.space.worldToLocal(held.target.clone()).toArray(),
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
    },
    async touch(job, rig, target, id, { prop, end, hold = false, point = false } = {}) {
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
          held = s;
          return s;
        }
        await job.wait(game.wait(250));
      } finally {
        if (!hold || held !== s) hands.stop(s);
      }
    },
    release() {
      if (held) {
        held.prop = null;
        hands.stop(held);
        held = null;
      }
    },
  };
}
