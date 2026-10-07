import * as THREE from 'three';
import { LUNCH_SEATS as SEATS, LUNCH_TOP } from './plan.js';

export async function markMioChecklist(game, job, props, hands) {
  const held = hands.active.get(game.player);
  if (!held || held.prop !== props.sheet) throw new Error('Mio checklist is not in the player’s hand');
  held.carry = false;
  held.localGrip.set(0, 0, 0);
  await job.wait(hands.move(held, [SEATS.eric.x, LUNCH_TOP + 0.07, SEATS.eric.z + 0.17]));
  await job.wait(game.wait(250));
  hands.contact(held, 'checklist-support');
  held.prop = null;
  hands.stop(held);
  props.root.attach(props.sheet);
  props.sheet.position.set(SEATS.eric.x, LUNCH_TOP + 0.07, SEATS.eric.z + 0.17);
  props.sheet.rotation.set(0, 0, 0);
  const target = hands.point(props.mark);
  const arm = await hands.reach(job, game.player, hands.point(props.pencil).toArray(), 'pencil-grip');
  hands.grip(arm, props.pencil);
  props.pencil.rotation.set(-0.65, 0, 0);
  const tipOffset = hands.point(props.pencilTip).sub(hands.point(props.pencil));
  await job.wait(hands.move(arm, target.clone().sub(tipOffset).toArray()));
  await job.wait(game.wait(550));
  hands.contact(arm, 'check-mark-hand');
  hands.measure('pencil-tip-mark', hands.point(props.pencilTip), target);
  await job.wait(game.wait(700));
  props.mark.visible = true;
  const clip = hands.point(props.sheet).add(new THREE.Vector3(0, 0.03, -0.1));
  await job.wait(hands.move(arm, clip.toArray()));
  hands.contact(arm, 'pencil-clip');
  await job.wait(game.wait(350));
  arm.prop = null;
  hands.stop(arm);
  props.sheet.attach(props.pencil);
  props.pencil.position.set(0, 0.03, -0.1);
  props.pencil.rotation.set(0, Math.PI / 2, 0);
}
