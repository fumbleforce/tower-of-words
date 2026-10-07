import * as THREE from 'three';
import { grocery } from '../../scenes/konbini/products.js';
import { bread } from '../../scenes/bakery/models.js';
import { mat } from '../../props.js';
import { ITEMS } from '../../gameplay/items.js';
import { signBoard } from '../../scenes/plaza-buildings.js';
import { terminalFoodState } from './food-state.js';
import { flags } from '../../narrative/state.js';
import { sim, save } from '../../sim.js';
const BREAD = new Set(['curry_bread', 'butter_roll']);
function model(id) {
  if (BREAD.has(id)) return bread(id);
  if (['milk', 'riceball', 'tea', 'coffee'].includes(id)) return grocery(id, { opened: true });
  const g = new THREE.Group(),
    color = id === 'melon' ? '#7b9d6a' : '#bdab69';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.19, 12), mat(color));
  body.position.y = 0.095;
  g.add(body);
  for (const y of [0.007, 0.185]) {
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12), mat('#b8c5c8'));
    lid.position.y = y;
    g.add(lid);
  }
  const tag = signBoard(id === 'melon' ? 'メロン' : 'コーン', ITEMS[id].name, 0.105, 0.055, color);
  tag.position.set(0, 0.1, 0.061);
  g.add(tag);
  return g;
}
export function terminalFood(game, P, hands, frame) {
  const state = terminalFoodState(sim, flags);
  let object = null;
  const commit = () => {
    state.sync();
    game.ui.refreshBag(sim);
    save(game);
  };
  function clear() {
    if (object) {
      object.removeFromParent();
      object = null;
    }
  }
  return {
    state,
    clear,
    prepare(id) {
      const result = state.prepare(id);
      commit();
      return result;
    },
    sync: () => state.sync(),
    async consume(job) {
      if (!state.pending()) return true;
      if (!game.player.seated) throw Error('Food requires a terminal seat');
      const id = flags.ferry_food_item,
        drink = !BREAD.has(id) && id !== 'riceball',
        rig = game.player;
      clear();
      object = model(id);
      object.name = 'terminal-food-' + id;
      object.userData.noBatch = true;
      P.space.add(object);
      const p = rig.root.position,
        yaw = rig.root.rotation.y;
      frame('food');
      await job.wait(game.wait(650));
      const owned = object,
        arm = hands.start(rig),
        forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      object.rotation.set(0, yaw, 0);
      const hand = hands.point(arm.hand);
      object.position.copy(hand).addScaledVector(forward, 0.025);
      object.position.y -= 0.06;
      const grip = new THREE.Vector3(0, 0.07, 0);
      arm.prop = object;
      arm.offset = grip.clone().negate();
      try {
        // Head-relative mouth placement follows both approved protagonist rigs and their seated poses.
        let head = rig.headK || rig.head;
        rig.root.traverse((o) => {
          if (o.isBone && /^(mixamorig)?Head$/.test(o.name)) head = o;
        });
        const mouth = head ? hands.point(head) : new THREE.Vector3(p.x, 0.97, p.z);
        mouth.addScaledVector(forward, 0.21);
        mouth.y -= 0.035;
        const tilt = drink ? -1.05 : -0.2;
        object.rotation.x = tilt;
        const lipLocal = new THREE.Vector3(0, drink ? 0.19 : 0.13, drink ? 0 : 0.055);
        if (id === 'milk') {
          // Use the actual opened carton's spout edge, including its local hinge and carton scale.
          const spout = object.children[4];
          spout.geometry.computeBoundingBox();
          lipLocal.set(0, spout.geometry.boundingBox.max.y, 0).applyEuler(spout.rotation).add(spout.position);
        }
        const lip = lipLocal.clone().multiply(object.scale).applyEuler(object.rotation);
        const target = mouth.clone().sub(lip).add(grip);
        phase('food-lift');
        await job.wait(hands.move(arm, target.toArray(), 0.65));
        // The bounded reach may move the spine/head. Follow that settled mouth instead of its old position.
        for (let i = 0; i < 4; i++) {
          await job.wait(game.wait(90));
          const settledMouth = hands.point(head).addScaledVector(forward, 0.21);
          settledMouth.y -= 0.035;
          await job.wait(hands.move(arm, settledMouth.sub(lip).add(grip).toArray(), 0.12));
        }
        phase('food-contact');
        await job.wait(game.wait(650));
        hands.contact(arm, 'food-wrist-' + id);
        const actualMouth = hands.point(head).addScaledVector(forward, 0.21);
        actualMouth.y -= 0.035;
        const actualLip = P.space.worldToLocal(owned.localToWorld(lipLocal.clone()));
        hands.contacts.push({
          id: 'food-lip-' + id,
          gap: actualLip.distanceTo(actualMouth),
          lip: actualLip.toArray(),
          mouth: actualMouth.toArray(),
        });
        phase('food-lower');
        await job.wait(hands.move(arm, [p.x + forward.x * 0.3, 0.63, p.z + forward.z * 0.3], 0.6));
        // Only the completed visible action changes inventory; Continue replay sees the consumed receipt.
        state.consume();
        commit();
        clear();
        return true;
      } finally {
        hands.stop(arm);
        if (!job.live() && object === owned) clear();
      }
    },
  };
  function phase(value) {
    P.terminalFoodPhase = value;
  }
}
