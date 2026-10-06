import * as THREE from 'three';
import { flags } from '../../narrative/state.js';
import { sim } from '../../sim.js';
import { sfx } from '../../sfx.js';
import { anchor, board, moveProp, inHand, frame } from './props.js';

export function labelRepair(game, P) {
  const at = anchor(P, 'label_printer');
  const panel = board(
    P,
    ['NAME: Nakamura Engineering', 'Current: 38 mm narrow', 'Saved: 62 mm full name', 'Stock: 38 mm / 62 mm'],
    { w: 0.7, h: 0.42 },
  );
  panel.position.copy(at).add({ x: 0.38, y: 0.05, z: 0 });
  panel.rotation.x = -Math.PI / 3;
  const narrow = board(P, ['Nakamura Eng…'], { w: 0.3, h: 0.08 });
  narrow.position.copy(at).add({ x: -0.25, y: -0.12, z: 0.15 });
  narrow.rotation.x = -Math.PI / 2;
  const wide = board(P, ['Nakamura Engineering'], { w: 0.48, h: 0.08 });
  wide.position.copy(at).add({ x: 0, y: -0.15, z: 0.16 });
  wide.rotation.x = -Math.PI / 2;
  const selected = board(P, ['62 mm selected', 'Matching stock: 62 mm'], {
    w: 0.45,
    h: 0.16,
    color: '#b9e6dc',
  });
  selected.position.copy(panel.position).add({ x: 0, y: 0.025, z: 0.15 });
  selected.rotation.copy(panel.rotation);
  let holding = false;
  const raised = new Map();
  function restore() {
    holding = false;
    for (const [bone, base] of raised) bone.quaternion.copy(base);
    raised.clear();
    wide.position.copy(at).add({ x: 0, y: -0.15, z: 0.3 });
    wide.rotation.set(-Math.PI / 2, 0, 0);
    wide.visible = selected.visible = !!flags.d5_label_done;
    narrow.visible = !flags.d5_label_done;
  }
  restore();
  async function hook({ state }) {
    if (!['morning', 'afternoon'].includes(sim.period) || !P.people.kuro?.root.visible)
      throw new Error('Reception verification requires Kuro');
    if (state === 'show') {
      await game.walkTo(...P.things.label_printer.spot());
      restore();
      frame(game, 'kuro');
      await game.wait(400);
      frame(game, 'label_printer');
    } else if (state === 'format') {
      selected.visible = true;
      sfx('tap');
      await game.wait(350);
    } else if (state === 'print') {
      sfx('copier');
      wide.visible = true;
      wide.position.copy(at).add({ x: 0, y: -0.15, z: 0.04 });
      await moveProp(game, wide, [at.x, at.y - 0.15, at.z + 0.3], 1.2);
    } else if (state === 'check') {
      holding = true;
      update();
      frame(game, 'kuro');
      await game.wait(1000);
    } else throw new Error(`Unknown label repair state: ${state}`);
  }
  // Keep the checked label above the high counter, following Kuro's raised hand.
  function update() {
    if (!holding || !wide.visible) return;
    const r = P.people.kuro;
    if (r.meshy) {
      r.stepNow?.();
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(r.root.getWorldQuaternion(new THREE.Quaternion()));
      for (const [name, angle] of [
        ['RightArm', -1.8],
        ['RightForeArm', -0.8],
      ]) {
        const bone =
          (r.model || r.root).getObjectByName(name) || (r.model || r.root).getObjectByName('mixamorig' + name);
        if (!bone) continue;
        if (!raised.has(bone)) raised.set(bone, bone.quaternion.clone());
        bone.quaternion.copy(raised.get(bone));
        const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        bone.quaternion.premultiply(
          parent.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(axis, angle)).multiply(parent),
        );
        bone.updateMatrixWorld(true);
      }
    } else if (r.arms) r.arms[1].rotation.set(-1.35, 0, 0.45);
    inHand(P, wide, 'kuro', { height: 1.05 });
    wide.position.x += Math.cos(r.root.rotation.y) * 0.24;
    wide.position.z -= Math.sin(r.root.rotation.y) * 0.24;
    wide.rotation.set(0, r.root.rotation.y, 0);
  }
  return {
    hook,
    restore,
    update,
    snapshot: () => ({ holding }),
    load: (state) => {
      holding = !!state.holding;
    },
  };
}
