import * as THREE from 'three';
// One real volume travels on the hand; only the completed placement changes its saved location.
export function bookTransfer(game, P, w, hands, camera) {
  const localHand = (s) => P.space.worldToLocal(s.hand.getWorldPosition(new THREE.Vector3()));
  return {
    async take(job, prop, id, side = 'Right') {
      const at = prop.position.clone();
      camera.focus([at.x, at.z], { distance: 2, height: 0.65, yaw: -0.7, elev: 0.45 });
      const s = hands.start(game.player, side);
      try {
        const near = game.player.root.position.clone().sub(at).setY(0).normalize().multiplyScalar(0.17).add(at);
        await job.wait(hands.move(s, [near.x, at.y + 0.06, near.z]));
        await job.wait(game.wait(180));
        const gap = hands.distance(s);
        hands.contacts.push({ id: 'take-' + id, gap, hand: localHand(s).toArray(), at: at.toArray() });
        if (gap > 0.065) throw new Error('Book pickup is outside hand reach: ' + gap);
        s.hand.attach(prop);
        await job.wait(game.wait(180));
      } finally {
        hands.stop(s);
        camera.release();
      }
    },
    async place(job, prop, at, id, yaw = 0, side = 'Right') {
      const s = hands.start(game.player, side);
      P.space.attach(prop);
      s.prop = prop;
      const startRotation = prop.quaternion.clone(),
        endRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const gripStart = prop.worldToLocal(s.hand.getWorldPosition(new THREE.Vector3()));
      const toward = game.player.root.position
        .clone()
        .sub(new THREE.Vector3(...at))
        .setY(0)
        .normalize()
        .multiplyScalar(0.17);
      const gripEnd = toward.clone().setY(0.06).applyQuaternion(endRotation.clone().invert());
      const target = new THREE.Vector3(...at).add(toward.setY(0.06));
      s.offset = prop.position.clone().sub(localHand(s));
      camera.focus([at[0], at[2]], { distance: 2, height: 0.65, yaw: -0.6, elev: 0.45 });
      try {
        await job.wait(
          Promise.all([
            hands.move(s, target.toArray(), 0.65),
            game.tween(0.65, (t) => {
              if (hands.active.get(game.player) !== s) return;
              prop.quaternion.copy(startRotation).slerp(endRotation, t);
              // A small regrip stays on the cover while the wrist turns the volume flat.
              s.offset.copy(gripStart).lerp(gripEnd, t).applyQuaternion(prop.quaternion).negate();
            }),
          ]),
        );
        await job.wait(game.wait(220));
        const gap = hands.distance(s);
        hands.contacts.push({ id: 'place-' + id, gap, target: target.toArray(), hand: localHand(s).toArray(), at });
        if (gap > 0.065) throw new Error('Book placement is outside hand reach: ' + gap);
      } finally {
        s.prop = null;
        hands.stop(s);
        camera.release();
      }
    },
  };
}
