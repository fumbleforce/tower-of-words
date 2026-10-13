import * as THREE from 'three';
import { karaokeHands } from './karaoke-hands.js';
import { walkRig, faceRig } from '../../move.js';
import { BOOTH_SEATS } from './karaoke-props.js';

export function karaokeActions(game, P, props, action) {
  const hands = karaokeHands(P.space, { codeArms: true }),
    held = new Map(),
    contacts = [];
  const actor = (who) => (who === 'eric' ? game.player : P.people[who]);
  const local = (object) => P.space.worldToLocal(object.getWorldPosition(new THREE.Vector3()));
  const wrist = (rig) => {
    const model = rig.model || rig.root,
      side = hands.side(rig);
    const bone =
      model.getObjectByName(side + 'Hand') ||
      model.getObjectByName('mixamorig' + side + 'Hand') ||
      rig.arms?.[side === 'Right' ? 1 : 0]?.userData.hand;
    if (!bone) throw new Error('Karaoke action requires an actual ' + side.toLowerCase() + ' hand');
    return local(bone);
  };
  function stand(who) {
    const rig = actor(who);
    if (who === 'eric') game.standUp?.();
    else if (rig.seated) {
      const out = rig.seatOut || BOOTH_SEATS[who].out;
      rig.setState?.('idle');
      rig.seated = false;
      rig.root.position.set(out[0], 0, out[1]);
    }
  }
  async function walk(who, point, face, { carry = false } = {}) {
    stand(who);
    const rig = actor(who),
      start = rig.root.position.clone(),
      record = held.get(who);
    if (record && carry) hands.follow(rig);
    else if (record) {
      hands.reach(rig, null);
      held.get(who).target = null;
    }
    await action.wait(walkRig(game, rig, point, { avoid: false }));
    rig._noAvoid = true;
    if (record?.target && carry) {
      record.target = new THREE.Vector3(...record.target).add(rig.root.position).sub(start).toArray();
      hands.reach(rig, record.target);
    }
    if (who === 'eric') game.walker.sync();
    if (face) await action.wait(faceRig(game, rig, face));
  }
  async function sit(who) {
    const rig = actor(who),
      seat = BOOTH_SEATS[who];
    if (!P.nav.free(...seat.out, 0.16)) throw new Error('Karaoke seat approach is obstructed');
    if (rig.seated && Math.hypot(rig.root.position.x - seat.x, rig.root.position.z - seat.z) < 0.1) return;
    await walk(who, seat.out);
    rig.sitAt(seat.x, seat.top, seat.z, seat.ry);
    rig.seated = true;
    rig.seatOut = [...seat.out];
    if (who === 'eric') game.walker.sync();
  }
  async function reach(who, target, seconds = 0.6) {
    const rig = actor(who),
      from = wrist(rig),
      end = new THREE.Vector3(...target);
    await action.wait(
      action.tween(seconds, (k) => {
        hands.reach(
          rig,
          from
            .clone()
            .lerp(end, k * k * (3 - 2 * k))
            .toArray(),
        );
      }),
    );
  }
  async function pickup(who, item) {
    const rig = actor(who),
      target = local(item);
    const orientation = item.getWorldQuaternion(new THREE.Quaternion());
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
    axis.applyQuaternion(P.space.getWorldQuaternion(orientation).invert());
    hands.aim(rig, axis.toArray());
    await reach(who, target.toArray());
    contacts.push({
      who,
      action: 'pickup',
      item: item.name,
      gap: wrist(rig).distanceTo(target),
      hand: wrist(rig).toArray(),
      target: target.toArray(),
      root: rig.root.position.toArray(),
    });
    hands.hold(rig, item);
    hands.reach(rig, target.toArray());
    held.set(who, {
      item: item.name,
      target: target.toArray(),
      side: hands.side(rig),
    });
  }
  async function carry(who, target) {
    await reach(who, target);
    const record = held.get(who);
    if (record) record.target = [...target];
  }
  function drop(who, item) {
    hands.drop(actor(who));
    held.delete(who);
    props.root.attach(item);
  }
  let phase = null;
  async function pass(from, to) {
    if (from === to) return;
    // The giver and recipient meet in the clear floor south-east of the table.
    hands.setSide(actor(to), hands.side(actor(from)) === 'Right' ? 'Left' : 'Right');
    const giverOnLeft = hands.side(actor(from)) === 'Left';
    await walk(from, [giverOnLeft ? 0.45 : 1.07, -1], [0.76, -0.45]);
    await walk(to, [giverOnLeft ? 1.07 : 0.45, -0.8], [0.76, -0.45]);
    const a = actor(from),
      b = actor(to),
      target = new THREE.Vector3(0.76, 0.48, -0.85);
    // Quarter turns put the active hands inward without leaning heads together.
    hands.aim(b, [0, 1, 0]);
    await Promise.all([carry(from, target.toArray()), reach(to, target.toArray())]);
    phase = 'shared-grip';
    await action.wait(game.wait(650));
    const gap = wrist(a).distanceTo(wrist(b));
    contacts.push({
      who: to,
      action: 'handoff',
      item: props.microphone.name,
      gap,
      from: a.root.position.toArray(),
      to: b.root.position.toArray(),
      hands: [wrist(a).toArray(), wrist(b).toArray()],
    });
    phase = null;
    hands.drop(a);
    held.delete(from);
    hands.hold(b, props.microphone);
    hands.reach(b, target.toArray());
    held.set(to, {
      item: props.microphone.name,
      target: target.toArray(),
      side: hands.side(b),
    });
    await carry(to, [
      b.root.position.x + (hands.side(b) === 'Left' ? 0.12 : -0.12),
      target.y,
      b.root.position.z + 0.12,
    ]);
    await sit(from);
  }
  return {
    actor,
    face: (who, point) => action.wait(faceRig(game, actor(who), point)),
    wrist,
    walk,
    sit,
    reach,
    pickup,
    carry,
    drop,
    pass,
    contacts,
    get phase() {
      return phase;
    },
    update: hands.update,
    snapshot: () => Object.fromEntries(held),
    restore(saved = {}) {
      hands.dispose();
      held.clear();
      for (const [who, record] of Object.entries(saved)) {
        const item =
          record.item === props.receipt.name
            ? props.receipt
            : record.item === props.microphone.name
              ? props.microphone
              : null;
        if (!item || !actor(who)) continue;
        hands.setSide(actor(who), record.side || 'Right');
        hands.hold(actor(who), item);
        hands.reach(actor(who), record.target);
        held.set(who, structuredClone(record));
      }
    },
    dispose() {
      phase = null;
      hands.dispose();
      held.clear();
    },
  };
}
