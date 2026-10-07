import * as THREE from 'three';
import { walkRig, faceRig } from '../../move.js';
import { poolHandling } from '../day3/pool-handling.js';
import { WINTER_SPOTS as S } from './winter-props.js';

export function winterActions(game, P, props, action, phase = () => {}) {
  const hands = poolHandling(P.space, { codeArms: true }),
    held = new Map();
  const actor = (id) => (id === 'eric' ? game.player : P.people[id]);
  const point = (obj) => P.space.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
  function hold(id, item, target) {
    const rig = actor(id),
      previous = hands.owner(item);
    if (previous) {
      hands.drop(previous);
      held.delete(previous);
    }
    if (item === props.paper) props.paperGrip(id);
    hands.hold(rig, item);
    if (target) hands.reach(rig, target);
    held.set(rig, { id, item: item.name, target });
    props.alignPaper();
  }
  function drop(id) {
    const rig = actor(id);
    hands.drop(rig);
    held.delete(rig);
  }
  async function walk(id, to, face) {
    const rig = actor(id);
    rig.root.visible = true;
    const carried = held.get(rig);
    if (carried) {
      hands.reach(rig, null);
      carried.target = null;
    }
    if (rig.seated) {
      const p = rig.root.position,
        yaw = rig.root.rotation.y,
        out = rig.seatOut || [p.x + Math.sin(yaw) * 0.6, p.z + Math.cos(yaw) * 0.6];
      if (!P.nav.free(...out, 0.2)) throw new Error('Winter bench exit blocked');
      rig.seated = false;
      rig.setState('idle');
      rig.root.position.set(out[0], 0, out[1]);
    }
    if (id === 'eric') await action.wait(game.walkTo(...to));
    else await action.wait(walkRig(game, rig, to));
    if (face) await action.wait(faceRig(game, rig, face));
    if (id === 'eric') game.walker.sync();
  }
  function ready(id) {
    const r = actor(id),
      yaw = r.root.rotation.y,
      p = r.root.position,
      target = [p.x + Math.sin(yaw) * 0.27, 0.67, p.z + Math.cos(yaw) * 0.27];
    const racket = props.rackets[id];
    racket.body.rotation.x = Math.PI / 3;
    hold(id, racket.root, target);
    return target;
  }
  async function strike(id) {
    const r = props.rackets[id],
      target = ready(id);
    props.shuttle.visible = true;
    await action.wait(
      action.tween(0.25, (k) => {
        r.body.rotation.z = 0.25 * Math.sin(k * Math.PI);
        hands.reach(actor(id), [target[0], target[1] + 0.08 * Math.sin(k * Math.PI), target[2]]);
        props.shuttle.position.copy(point(r.contact));
      }),
    );
    r.body.rotation.z = 0;
    return point(r.contact);
  }
  async function flight(from, to) {
    const a = await strike(from);
    ready(to);
    const b = point(props.rackets[to].contact);
    phase(from === to ? 'tap' : 'flight');
    await action.wait(
      action.tween(1.1, (k) => {
        const t = k * k * (3 - 2 * k),
          p = a.clone().lerp(b, t);
        p.y += 0.65 * 4 * t * (1 - t);
        props.shuttle.position.copy(p);
        const velocity = b.clone().sub(a);
        velocity.y += 0.65 * 4 * (1 - 2 * t);
        props.shuttle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), velocity.normalize());
      }),
    );
    props.shuttle.position.copy(b);
  }
  return {
    walk,
    ready,
    hold,
    drop,
    point,
    emiHasSheet: () => hands.owner(props.paper) === actor('emi'),
    async sheetBack() {
      if (hands.owner(props.paper) !== actor('emi')) return;
      await walk('attendant', S.attendant, S.emi);
      await walk('emi', S.emi, S.attendant);
      const target = [(S.attendant[0] + S.emi[0]) / 2, 0.68, S.emi[1]];
      hold('emi', props.paper, target);
      phase('sheet-handoff');
      await action.wait(game.wait(700));
      const receiving = point(props.paperGrips.attendant).toArray();
      hands.reach(actor('attendant'), receiving);
      phase('sheet-contact');
      await action.wait(game.wait(850));
      hold('attendant', props.paper, receiving);
      phase('sheet-held');
      await action.wait(game.wait(700));
      await walk('attendant', S.sheetOut, [S.sheet[0], S.sheet[2]]);
      hands.reach(actor('attendant'), S.sheet);
      await action.wait(game.wait(300));
      drop('attendant');
      props.root.attach(props.paper);
      props.paperGrip(null);
      props.paper.position.set(...S.sheet);
      props.paper.rotation.x = -Math.PI / 2;
    },
    async demonstrate() {
      ready('kuro');
      await flight('kuro', 'kuro');
      await flight('kuro', 'kuro');
      props.shuttle.visible = false;
    },
    async rally(partner, rounds = 1) {
      ready('kuro');
      ready(partner);
      for (let i = 0; i < rounds; i++) {
        await flight('kuro', partner);
        await flight(partner, 'kuro');
      }
      props.shuttle.visible = false;
    },
    snapshot: () => [...held.values()],
    restore(saved = []) {
      for (const h of saved) {
        const item = props.items.find((p) => p.name === h.item);
        if (item && actor(h.id)) hold(h.id, item, h.target);
      }
    },
    update() {
      hands.update();
      props.alignPaper();
    },
    dispose() {
      hands.dispose();
      held.clear();
    },
  };
}
