import * as THREE from 'three';
import { poolHandling } from '../day3/pool-handling.js';
import { walkRig } from '../../move.js';
import { ART_SEATS } from './art-props.js';

// Physical moves share the existing arm solver; only this scene's overlays are disposed.
export function artActions(game, P, props, action) {
  const hands = poolHandling(P.space, { codeArms: true });
  const held = new Map();
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
    hands.reach(rig, from.toArray());
    if (carry) {
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
  async function draw(who, kind) {
    const rig = actor(who),
      index = who === 'mori' ? 0 : 1,
      sheet = who === 'mori' ? props.mori : props.player;
    const pencil = props.pencils[index],
      p = sheet.mesh.position;
    hands.reach(rig, [p.x - 0.13, 0.44, p.z - 0.07]);
    hands.hold(rig, pencil);
    await action.wait(
      action.tween(1.6, (k) => {
        hands.reach(rig, [p.x - 0.13 + k * 0.26, 0.435, p.z - 0.07 + k * 0.12]);
        hands.update();
        sheet.draw(kind, k);
      }),
    );
    hands.drop(rig);
    props.root.attach(pencil);
    pencil.position.set(p.x + 0.19, 0.425, p.z);
    pencil.rotation.set(0, 0, 0);
  }
  return {
    sit,
    move,
    draw,
    hands,
    async pour() {
      const cup = props.cups[1],
        target = [cup.position.x - 0.25, 0.68, cup.position.z];
      await move('eric', props.pot, target, { carry: true, keepHeld: true });
      hands.reach(game.player, target);
      hands.hold(game.player, props.pot);
      await action.wait(
        action.tween(1.2, (k) => {
          hands.reach(game.player, target);
          hands.update();
          props.pot.rotation.z = -0.5 * Math.sin(k * Math.PI);
          const a = P.space.worldToLocal(props.spoutTip.getWorldPosition(new THREE.Vector3())),
            b = cup.position.clone().add(new THREE.Vector3(0, 0.045, 0));
          props.stream.position.copy(a).add(b).multiplyScalar(0.5);
          props.stream.scale.y = a.distanceTo(b);
          props.stream.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.sub(b).normalize());
          props.stream.visible = k > 0.15 && k < 0.85;
        }),
      );
      props.stream.visible = false;
      held.delete(game.player);
      hands.drop(game.player);
      props.root.attach(props.pot);
      props.pot.position.set(0.68, 0.49, -2.55);
      props.pot.rotation.set(0, 0, 0);
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
