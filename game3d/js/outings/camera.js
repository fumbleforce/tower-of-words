import * as THREE from 'three';
import { ericNow } from '../cam.js';

// Phone overview after a coast stop: keep the pair below the goal card and above touch controls.
export function frameOutingPair(camera, dir, minimum, feet, body, probe = camera.clone()) {
  const [radius, height] = body;
  const center = feet[0].clone().add(feet[1]).multiplyScalar(0.5);
  center.y += height / 2;
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const target = new THREE.Vector3(),
    point = new THREE.Vector3();
  probe.copy(camera);
  const fits = (distance) => {
    target.copy(center).addScaledVector(up, 0.215 * distance * tangent);
    probe.position.copy(target).addScaledVector(dir, distance);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    for (const foot of feet)
      for (const y of [0, height])
        for (const [x, z] of [
          [radius, 0],
          [-radius, 0],
          [0, radius],
          [0, -radius],
        ]) {
          point.set(foot.x + x, foot.y + y, foot.z + z).project(probe);
          if (Math.abs(point.x) > 0.86 || point.y > 0.35 || point.y < -0.78) return false;
        }
    return true;
  };
  let low = minimum,
    high = minimum;
  while (!fits(high) && high < minimum * 8) high *= 1.4;
  for (let i = 0; i < 16; i++) {
    const middle = (low + high) / 2;
    if (fits(middle)) high = middle;
    else low = middle;
  }
  fits(high);
  return [target, high];
}

export function installOutingCamera(game, P, name = P.name) {
  if (name !== 'east_coast' || !P.cam || P.cam.outingOverview) return;
  const cam = P.cam,
    wanted = cam.wanted,
    probe = P.camera.clone();
  let standing = false;
  cam.outingOverview = true;
  cam.wanted = function (p) {
    const ordinary = wanted.call(this, p),
      rig = game.outing.actor.rig;
    if (
      P.camera.aspect >= 1 ||
      this.close ||
      (game.busy && !standing) ||
      game.transition ||
      !game.outing.controls('kenji') ||
      !rig.root.visible ||
      rig.root.parent !== P.space
    )
      return ordinary;
    const player = ericNow(P.space, p);
    if (!player) return ordinary;
    const companion = rig.root.getWorldPosition(new THREE.Vector3());
    if (companion.distanceTo(player[0]) > 6 * (P.charScale || 1)) return ordinary;
    // The protagonist's scaled envelope conservatively also encloses Kenji's smaller rig.
    return frameOutingPair(P.camera, this.dir, ordinary[1], [player[0], companion], player[1], probe);
  };
  // A seated close shot is invalid once the pair stands at opposite bench ends.
  // Reframe that single action before input returns; ordinary walking still eases.
  cam.outingStand = () => {
    if (
      P.camera.aspect >= 1 ||
      game.transition ||
      !game.outing.controls('kenji') ||
      (cam.close && cam.close.conversationShot?.who !== 'kenji')
    )
      return false;
    cam.release();
    standing = true;
    try {
      cam.snap(game.player.root.position);
    } finally {
      standing = false;
    }
    return true;
  };
}
