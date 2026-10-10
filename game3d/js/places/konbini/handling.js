import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
export function shopHands(game, P) {
  const hands = diningHands(game, P.space),
    contacts = [];
  let carry = null;
  async function walk(job, to, facing) {
    game.standUp?.();
    await job.wait(game.walkTo(...to));
    const p = game.player.root.position;
    if (Math.hypot(p.x - to[0], p.z - to[1]) > 0.28) throw Error('Konbini approach is blocked');
    game.walker.facing = facing;
    game.player.root.rotation.y = facing;
  }
  const sample = (arm, action) =>
    contacts.push({
      action,
      gap: hands.distance(arm),
      target: arm.target.toArray(),
      hand: arm.hand.getWorldPosition(new THREE.Vector3()).toArray(),
    });
  async function move(
    job,
    actor,
    object,
    to,
    { via = null, facing = 0, grip = 0.025, steady = false, hold = 0, tilt = 0, localGrip = null } = {},
  ) {
    async function clerkStep(z) {
      if (actor === game.player) return;
      const from = actor.root.position.z,
        to = Math.max(-1.97, Math.min(-0.94, z - 0.1));
      actor.setState?.('walk');
      await job.wait(
        game.tween(0.3, (k) => {
          if (job.live()) actor.root.position.z = from + (to - from) * k;
        }),
      );
      actor.setState?.('idle');
    }
    const initial = P.space.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
    await clerkStep(initial.z);
    const torso = actor === game.player ? null : actor.torso,
      torsoTilt = torso?.rotation.x;
    if (torso) torso.rotation.x = 0.44;
    const arm = hands.start(actor);
    if (steady) {
      const i = arm.chain.findIndex((b) => /Spine$/.test(b.name));
      if (i >= 0) {
        arm.chain.splice(i, 1);
        arm.base.splice(i, 1);
      }
    }
    try {
      const at = P.space.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
      const offsetAt = (angle) =>
        new THREE.Vector3(...localGrip).multiply(object.scale).applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
      const offset = localGrip
        ? offsetAt(object.rotation.x)
        : Array.isArray(grip)
          ? new THREE.Vector3(...grip)
          : new THREE.Vector3(0, grip, 0);
      at.add(offset);
      await job.wait(hands.move(arm, at.toArray()));
      sample(arm, object.name + '-take');
      P.space.attach(object);
      arm.prop = object;
      arm.offset = offset.clone().negate();
      if (via) {
        carry = arm;
        await walk(job, via, facing);
        carry = null;
      }
      await clerkStep(to[2]);
      const fromTilt = object.rotation.x;
      await job.wait(
        Promise.all([
          hands.move(arm, new THREE.Vector3(...to).add(localGrip ? offsetAt(tilt) : offset).toArray()),
          game.tween(0.55, (k) => {
            if (job.live()) {
              object.rotation.x = fromTilt + (tilt - fromTilt) * k;
              if (localGrip) arm.offset.copy(offsetAt(object.rotation.x)).negate();
            }
          }),
        ]),
      );
      sample(arm, object.name + '-place');
      if (hold) await job.wait(game.wait(hold));
      arm.prop = null;
      object.position.set(...to);
    } finally {
      if (carry === arm) carry = null;
      hands.stop(arm);
      if (torso && job.live()) torso.rotation.x = torsoTilt;
    }
  }
  // The hand travels with the sliding handle while the customer steps alongside it.
  async function slide(job, pane, open, side) {
    const home = -0.54 + side * 0.68,
      from = pane.position.x,
      to = home + (open ? -side * 1.34 : 0),
      handle = -side * 0.57;
    await walk(job, [from + handle, -3.12], Math.PI);
    const arm = hands.start(game.player);
    try {
      await job.wait(hands.move(arm, [from + handle, 0.9, -3.285]));
      sample(arm, 'fridge-handle');
      const walking = game.walkTo(to + handle, -3.12);
      await job.wait(
        game.tween(1, (k) => {
          if (job.live()) {
            pane.position.x = from + (to - from) * k;
            arm.target.copy(P.space.localToWorld(new THREE.Vector3(pane.position.x + handle, 0.9, -3.285)));
          }
        }),
      );
      await job.wait(walking);
      await job.wait(game.wait(180));
      sample(arm, 'fridge-slide');
    } finally {
      hands.stop(arm);
    }
  }
  return {
    walk,
    move,
    slide,
    contacts,
    clear() {
      carry = null;
      hands.clear();
    },
    update() {
      if (carry) {
        const p = game.player.root.position,
          a = game.player.root.rotation.y;
        carry.target.copy(
          P.space.localToWorld(new THREE.Vector3(p.x + Math.sin(a) * 0.28, 0.91, p.z + Math.cos(a) * 0.28)),
        );
      }
      hands.update();
    },
  };
}
