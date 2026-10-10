import * as THREE from 'three';
import { artHands } from './art-hands.js';
import { walkRig } from '../../move.js';
import { ART_SEATS } from './art-props.js';

// Physical moves share the existing arm solver; only this scene's overlays are disposed.
export function artActions(game, P, props, action) {
  const hands = artHands(P.space);
  const held = new Map(),
    contacts = [];
  function contact(rig, item, target, phase) {
    const root = rig.model || rig.root;
    const hand =
      root.getObjectByName('RightHand') || root.getObjectByName('mixamorigRightHand') || rig.arms?.[1]?.userData.hand;
    if (!hand) return;
    const point = P.space.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
    contacts.push({
      item: item.name,
      phase,
      hand: point.toArray(),
      target,
      gap: point.distanceTo(new THREE.Vector3(...target)),
    });
  }
  const actor = (who) => (who === 'eric' ? game.player : P.people[who]);
  async function sit(who) {
    const rig = actor(who),
      seat = ART_SEATS[who];
    if (!P.nav.free(...seat.out, 0.2)) throw new Error('Art chair approach is blocked: ' + who);
    rig.root.visible = true;
    if (who === 'eric') {
      game.standUp?.();
      await action.wait(game.walkTo(...seat.out));
    } else {
      rig.seated = false;
      rig.setState?.('idle');
      await action.wait(walkRig(game, rig, seat.out));
    }
    rig.sitAt(seat.x, seat.top, seat.z, seat.ry);
    rig.seated = true;
    rig.seatOut = [...seat.out];
    if (who === 'eric') game.walker.sync();
  }
  async function move(who, item, to, { seconds = 0.7, carry = false, keepHeld = false } = {}) {
    const rig = actor(who),
      from = P.space.worldToLocal(item.getWorldPosition(new THREE.Vector3()));
    const previous = hands.owner(item);
    if (previous && previous !== rig) {
      hands.drop(previous);
      held.delete(previous);
    }
    // Targets are room-local. Held items retain their actual wrist contact throughout a move.
    const start = hands.hand(rig);
    await action.wait(action.tween(0.45, (k) => hands.reach(rig, start.clone().lerp(from, k).toArray())));
    if (carry) {
      contact(rig, item, from.toArray(), 'pickup');
      hands.hold(rig, item);
      hands.reach(rig, from.toArray());
    }
    await action.wait(
      action.tween(seconds, (k) => {
        const p = from.clone().lerp(new THREE.Vector3(...to), k * k * (3 - 2 * k));
        hands.reach(rig, p.toArray());
        hands.update();
      }),
    );
    if (carry) contact(rig, item, to, 'place');
    if (keepHeld) {
      held.set(rig, { who, item: item.name, target: [...to] });
      return;
    }
    held.delete(rig);
    hands.drop(rig);
    if (carry) {
      props.root.attach(item);
      item.position.set(...to);
    }
  }
  async function pointAt(who, item) {
    const rig = actor(who),
      from = hands.hand(rig),
      target = hands.point(item);
    const toward = target.clone().sub(from).normalize();
    const end = from.clone().addScaledVector(toward, 0.08);
    await action.wait(action.tween(0.6, (k) => hands.reach(rig, from.clone().lerp(end, k).toArray())));
    await action.wait(game.wait(350));
    hands.drop(rig);
  }
  async function draw(who, kind) {
    const rig = actor(who),
      index = who === 'mori' ? 0 : 1;
    const sheet = who === 'mori' ? props.mori : props.player,
      pencil = props.pencils[index];
    const home = pencil.position.clone();
    await move(who, pencil, [home.x, 0.51, home.z], { carry: true, keepHeld: true });
    pencil.rotation.set(0.3, 0.5, 0);
    const grip = [0, 0, -0.08];
    hands.hold(rig, pencil, grip);
    const tip = new THREE.Vector3(0, 0, 0.18).applyEuler(pencil.rotation);
    let maxTipGap = 0;
    await action.wait(
      action.tween(1.6, (k) => {
        const p = sheet.point(kind, k).sub(tip);
        hands.reach(rig, p.toArray());
        hands.update();
        sheet.draw(kind, k);
        const actual = P.space.worldToLocal(pencil.localToWorld(new THREE.Vector3(0, 0, 0.1)));
        maxTipGap = Math.max(maxTipGap, actual.distanceTo(sheet.point(kind, k)));
      }),
    );
    contacts.push({ item: pencil.name, phase: 'draw-tip', gap: maxTipGap });
    contact(rig, pencil, sheet.point(kind, 1).sub(tip).toArray(), 'draw');
    pencil.rotation.set(0, 0, 0);
    hands.hold(rig, pencil);
    await move(who, pencil, home.toArray(), { carry: true });
  }
  return {
    sit,
    pointAt,
    move,
    draw,
    hands,
    contacts,
    async pour() {
      const cup = props.cups[1],
        target = [cup.position.x, 0.63, cup.position.z - 0.3];
      await move('eric', props.pot, target, { carry: true, keepHeld: true });
      hands.reach(game.player, target);
      hands.hold(game.player, props.pot);
      let spoutGap = 0;
      await action.wait(
        action.tween(1.2, (k) => {
          hands.reach(game.player, target);
          hands.update();
          props.pot.rotation.x = 0.42 * Math.sin(k * Math.PI);
          props.fillCup(1, Math.max(0, Math.min(1, (k - 0.15) / 0.7)));
          const a = P.space.worldToLocal(props.spoutTip.getWorldPosition(new THREE.Vector3())),
            b = cup.position.clone().add(new THREE.Vector3(0, 0.045, 0));
          if (k > 0.15 && k < 0.85) spoutGap = Math.max(spoutGap, Math.hypot(a.x - b.x, a.z - b.z));
          props.stream.position.copy(a).add(b).multiplyScalar(0.5);
          props.stream.scale.y = a.distanceTo(b);
          props.stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.sub(b).normalize());
          props.stream.visible = k > 0.15 && k < 0.85;
        }),
      );
      contacts.push({ item: props.pot.name, phase: 'pour-spout', gap: spoutGap });
      props.stream.visible = false;
      props.pot.rotation.x = 0;
      await move('eric', props.pot, [0.15, 0.49, -2.99], { carry: true });
    },
    snapshot() {
      return [...held.values()];
    },
    restore(saved = []) {
      for (const h of saved) {
        const item = props.items.find((p) => p.name === h.item),
          rig = actor(h.who);
        if (!item || !rig) continue;
        hands.hold(rig, item);
        hands.reach(rig, h.target);
        held.set(rig, h);
      }
    },
    update() {
      hands.update();
    },
    dispose() {
      hands.dispose();
      held.clear();
      props.stream.visible = false;
    },
  };
}
