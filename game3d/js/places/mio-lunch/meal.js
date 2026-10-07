import * as THREE from 'three';

export async function eatMioBento(game, job, mio, props, hands) {
  mio.update?.(0);
  mio.stepNow?.();
  let head = null;
  mio.root.traverse((o) => {
    if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
  });
  if (!head) throw new Error('Mio lunch needs her real head anchor');
  // Native face-surface pick at the lower lip, in this approved head bone's coordinates.
  const mouth = hands.point(head, new THREE.Vector3(0, 0.055, 0.47)),
    yaw = mio.root.rotation.y;
  const bowl = hands.point(props.rice, new THREE.Vector3(0, 0.008, 0));
  const arm = await hands.reach(job, mio, props.restingGrip().toArray(), 'chopsticks-pickup', {
    torso: false,
    side: 'Left',
  });
  hands.grip(arm, props.sticks, [0, 0, -0.02]);
  props.sticks.rotation.set(0, yaw + Math.PI / 2 + 0.2, 0);
  const tipOffset = props.bite.position.clone().sub(arm.localGrip).applyQuaternion(props.sticks.quaternion);
  await job.wait(hands.move(arm, bowl.clone().sub(tipOffset).toArray()));
  hands.measure('rice-pickup', hands.point(props.bite), bowl);
  props.bite.visible = true;
  await job.wait(hands.move(arm, mouth.clone().sub(tipOffset).toArray()));
  await job.wait(game.wait(550));
  hands.contact(arm, 'bite-hand');
  hands.measure('bite-mouth', hands.point(props.bite), mouth);
  await job.wait(game.wait(700));
  props.bite.visible = false;
  props.sticks.rotation.set(0, 0.2, 0);
  await job.wait(hands.move(arm, props.restingGrip().toArray()));
  hands.contact(arm, 'chopsticks-return');
  await job.wait(game.wait(450));
  hands.stop(arm);
  props.restChopsticks();
  await job.wait(game.wait(850));
}
