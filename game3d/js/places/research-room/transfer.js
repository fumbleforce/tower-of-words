import * as THREE from 'three';
import { paperGrips } from './paper-grip.js';
// A rendered palm supports the near edge; the same edge stays attached during the walk.
export function bookTransfer(game, P, w, hands, camera) {
  const grips = paperGrips(P.space, hands);
  let placing = null,
    releasing = null;
  const localHand = (s) => P.space.worldToLocal(s.hand.getWorldPosition(new THREE.Vector3()));
  const edgeFor = (id, toward) => {
    const x = id === 'owned-copy' ? 0.12 : 0.2,
      z = id === 'owned-copy' ? 0.125 : 0.22,
      y = id === 'owned-copy' ? 0 : 0.02;
    if (id === 'owned-copy') return new THREE.Vector3(Math.sign(toward.x) * x, y, Math.sign(toward.z) * z);
    return Math.abs(toward.x / x) > Math.abs(toward.z / z)
      ? new THREE.Vector3(Math.sign(toward.x) * x, y, 0)
      : new THREE.Vector3(0, y, Math.sign(toward.z) * z);
  };
  function start(side, at) {
    const toward = at.clone().sub(game.player.root.position).setY(0).normalize();
    return grips.start(hands.start(game.player, side), toward.toArray(), { orientHand: false });
  }
  async function contact(job, s, at, id, seconds = 0.55) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const wrist = attempt
        ? localHand(s)
            .add(at.clone().sub(grips.contact(s)).multiplyScalar(0.5))
            .toArray()
        : grips.wrist(s, at.toArray());
      await job.wait(hands.move(s, wrist, attempt ? 0.16 : seconds));
      await job.wait(game.wait(80));
      if (grips.contact(s).distanceTo(at) < 0.008) break;
    }
    const gap = grips.contact(s).distanceTo(at);
    hands.contacts.push({
      id,
      gap,
      surface: grips.contact(s).toArray(),
      target: at.toArray(),
      wrist: localHand(s).toArray(),
      wristTarget: P.space.worldToLocal(s.target.clone()).toArray(),
      wristGap: hands.distance(s),
    });
    if (gap > 0.025) throw new Error(`Book palm contact is outside reach: ${id} (${gap.toFixed(3)}m)`);
  }
  function carryRotation(edge) {
    const normal = new THREE.Vector3(1, 0, 0),
      down = new THREE.Vector3(0, 1, 0),
      across = new THREE.Vector3(0, 0, 1);
    const x = edge.x ? down.multiplyScalar(-Math.sign(edge.x)) : across.multiplyScalar(-Math.sign(edge.z));
    const z = new THREE.Vector3().crossVectors(x, normal);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, normal, z));
  }
  return {
    update() {
      if (releasing?.job.live()) {
        const { s, from, k } = releasing;
        s.r.stepNow?.();
        s.chain.forEach((bone, i) => {
          const animated = bone.quaternion.clone();
          bone.quaternion.copy(from[i]).slerp(animated, k);
        });
        s.r.root.updateWorldMatrix(true, true);
      }
      if (!placing?.job.live()) return;
      const { prop, s, edge } = placing;
      prop.position.copy(grips.contact(s)).sub(edge.clone().applyQuaternion(prop.quaternion));
    },
    clear() {
      placing = null;
      releasing = null;
    },
    async take(job, prop, id, side = 'Right') {
      const at = prop.position.clone(),
        toward = prop.worldToLocal(game.player.root.getWorldPosition(new THREE.Vector3())),
        edge = edgeFor(id, toward),
        target = P.space.worldToLocal(prop.localToWorld(edge.clone())),
        s = start(side, at);
      let release;
      camera.focus([at.x, at.z], { distance: 2, height: 0.65, yaw: -0.7, elev: 0.45 });
      try {
        await contact(job, s, target, 'take-' + id);
        s.hand.attach(prop);
        const from = prop.quaternion.clone(),
          to = carryRotation(edge),
          heldEdge = edge.clone().multiply(prop.scale),
          oldEdge = heldEdge.clone().applyQuaternion(from).add(prop.position),
          palm = s.hand.worldToLocal(P.space.localToWorld(grips.contact(s)));
        // Let the current idle animation take over gradually; restoring the pre-reach
        // chain at a matching wrist position can still rotate an attached book.
        release = { s, from: s.chain.map((bone) => bone.quaternion.clone()), k: 0, job };
        releasing = release;
        hands.active.delete(s.r);
        await job.wait(
          game.tween(0.45, (t) => {
            if (!job.live() || releasing !== release) return;
            release.k = t;
            prop.quaternion.copy(from).slerp(to, t);
            prop.position.copy(oldEdge).lerp(palm, t).sub(heldEdge.clone().applyQuaternion(prop.quaternion));
          }),
        );
        await job.wait(game.wait(120));
      } finally {
        if (releasing === release) releasing = null;
        grips.stop(s);
        camera.release();
      }
    },
    async place(job, prop, at, id, yaw = 0, side = 'Right') {
      const target = new THREE.Vector3(...at),
        s = start(side, target),
        endRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      P.space.attach(prop);
      const from = prop.quaternion.clone(),
        gripStart = prop.worldToLocal(P.space.localToWorld(grips.contact(s))),
        edge = edgeFor(id, game.player.root.position.clone().sub(target).applyQuaternion(endRotation.clone().invert())),
        end = edge.clone().applyQuaternion(endRotation).add(target);
      const placement = { prop, s, edge: gripStart.clone(), job };
      placing = placement;
      camera.focus([at[0], at[2]], { distance: 2, height: 0.65, yaw: -0.6, elev: 0.45 });
      try {
        await job.wait(
          Promise.all([
            hands.move(s, grips.wrist(s, end.toArray()), 0.65),
            game.tween(0.65, (t) => {
              if (!job.live() || placing !== placement) return;
              prop.quaternion.copy(from).slerp(endRotation, t);
              placement.edge.copy(gripStart).lerp(edge, t);
            }),
          ]),
        );
        await contact(job, s, end, 'place-' + id, 0.16);
        await job.wait(game.wait(120));
      } finally {
        if (placing === placement) placing = null;
        grips.stop(s);
        camera.release();
      }
    },
  };
}
