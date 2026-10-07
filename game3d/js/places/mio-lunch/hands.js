import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';

export function mioLunchHands(game, space) {
  const hands = diningHands(game, space),
    contacts = [];
  const point = (object, local = new THREE.Vector3()) => space.worldToLocal(object.localToWorld(local.clone()));
  function contact(arm, id) {
    contacts.push({
      id,
      gap: hands.distance(arm),
      hand: point(arm.hand).toArray(),
      target: space.worldToLocal(arm.target.clone()).toArray(),
    });
  }
  function grip(arm, prop, offset = [0, 0, 0]) {
    space.attach(prop);
    arm.prop = prop;
    arm.localGrip = new THREE.Vector3(...offset);
    arm.offset = arm.localGrip.clone().applyQuaternion(prop.quaternion).negate();
  }
  async function reach(job, rig, target, id, { torso = true, side = 'Right' } = {}) {
    const arm = hands.start(rig, side);
    arm.side = side;
    arm.torso = torso;
    if (!torso) {
      const chain = arm.chain
        .map((bone, i) => ({ bone, base: arm.base[i] }))
        .filter((entry) => !/Spine$/.test(entry.bone.name));
      arm.chain = chain.map((entry) => entry.bone);
      arm.base = chain.map((entry) => entry.base);
    }
    await job.wait(hands.move(arm, target));
    await job.wait(game.wait(250));
    contact(arm, id);
    await job.wait(game.wait(450));
    return arm;
  }
  function update() {
    for (const arm of hands.active.values())
      if (arm.carry) {
        const p = arm.r.root.position,
          yaw = arm.r.root.rotation.y;
        arm.target.copy(
          space.localToWorld(
            new THREE.Vector3(
              p.x + Math.sin(yaw) * 0.26 + Math.cos(yaw) * 0.16,
              p.y + 0.59,
              p.z + Math.cos(yaw) * 0.26 - Math.sin(yaw) * 0.16,
            ),
          ),
        );
        if (arm.prop) arm.prop.rotation.y = yaw;
      }
    for (const arm of hands.active.values())
      if (arm.prop && arm.localGrip) arm.offset.copy(arm.localGrip).applyQuaternion(arm.prop.quaternion).negate();
    hands.update();
  }
  return {
    ...hands,
    update,
    point,
    reach,
    grip,
    contact,
    contacts,
    freeTorso(arm) {
      const kept = arm.chain
        .map((bone, i) => ({ bone, base: arm.base[i] }))
        .filter(({ bone }) => !/Spine$/.test(bone.name));
      arm.chain = kept.map((v) => v.bone);
      arm.base = kept.map((v) => v.base);
      arm.torso = false;
    },
    async pass(job, giver, recipient, prop, center, id) {
      const side = giver.r.root.position.x > recipient.root.position.x ? 1 : -1;
      prop.rotation.set(0, 0, 0);
      grip(giver, prop, [side * 0.105, 0.015, 0]);
      await job.wait(hands.move(giver, [center[0] + side * 0.105, center[1] + 0.015, center[2]]));
      const edge = space.worldToLocal(prop.localToWorld(new THREE.Vector3(-side * 0.105, 0.015, 0)));
      const taker = await reach(job, recipient, edge.toArray(), id);
      for (const [arm, edge, suffix] of [
        [giver, side, 'giver'],
        [taker, -side, 'taker'],
      ]) {
        const at = space.worldToLocal(prop.localToWorld(new THREE.Vector3(edge * 0.105, 0.015, 0)));
        const hand = point(arm.hand);
        contacts.push({ id: id + '-' + suffix, gap: hand.distanceTo(at), hand: hand.toArray(), target: at.toArray() });
      }
      await job.wait(game.wait(450));
      giver.prop = null;
      grip(taker, prop, [-side * 0.105, 0.015, 0]);
      hands.stop(giver);
      return taker;
    },
    measure(id, from, to) {
      contacts.push({ id, gap: from.distanceTo(to), from: from.toArray(), to: to.toArray() });
    },
    snapshot(people, props) {
      return [...hands.active.values()].map((arm) => ({
        who: Object.keys(people).find((id) => people[id] === arm.r),
        item: Object.keys(props).find((id) => props[id] === arm.prop),
        target: space.worldToLocal(arm.target.clone()).toArray(),
        offset: arm.offset?.toArray(),
        localGrip: arm.localGrip?.toArray(),
        carry: !!arm.carry,
        torso: arm.torso !== false,
        side: arm.side || 'Right',
      }));
    },
    restore(saved, people, props) {
      hands.clear();
      for (const entry of saved || []) {
        const arm = hands.start(people[entry.who], entry.side || 'Right');
        arm.side = entry.side || 'Right';
        arm.torso = entry.torso !== false;
        if (!arm.torso) {
          const kept = arm.chain
            .map((bone, i) => ({ bone, base: arm.base[i] }))
            .filter(({ bone }) => !/Spine$/.test(bone.name));
          arm.chain = kept.map((v) => v.bone);
          arm.base = kept.map((v) => v.base);
        }
        arm.target.copy(space.localToWorld(new THREE.Vector3(...entry.target)));
        if (entry.item) grip(arm, props[entry.item], entry.localGrip || [0, 0, 0]);
        arm.offset = new THREE.Vector3(...(entry.offset || [0, 0, 0]));
        arm.carry = entry.carry;
      }
    },
  };
}
