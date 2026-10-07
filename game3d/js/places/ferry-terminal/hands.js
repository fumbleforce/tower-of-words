import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
// A small adapter around the established real-wrist solver. Each owned move records its actual contact gap.
export function terminalHands(game, P) {
  const hands = diningHands(game, P.space),
    contacts = [];
  const point = (o) => P.space.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  const contact = (s, id) =>
    contacts.push({
      id,
      gap: hands.distance(s),
      hand: s.hand.getWorldPosition(new THREE.Vector3()).toArray(),
      target: s.target.toArray(),
    });
  async function reach(job, rig, to, { item = null, end = null, via = null, hold = 400, id = 'point' } = {}) {
    const s = hands.start(rig);
    try {
      await job.wait(hands.move(s, to));
      await job.wait(game.wait(180));
      contact(s, id);
      if (item) {
        P.space.attach(item);
        s.prop = item;
        s.offset = new THREE.Vector3();
      }
      if (via) {
        await job.wait(hands.move(s, via));
        await job.wait(game.wait(250));
        contact(s, id + '-lift');
      }
      if (end) await job.wait(hands.move(s, end));
      if (hold) await job.wait(game.wait(hold));
      if (item) {
        contact(s, id + '-end');
        s.prop = null;
        if (end) item.position.set(...end);
      }
    } finally {
      hands.stop(s);
    }
  }
  function hold(rig, item, target) {
    const s = hands.start(rig);
    P.space.attach(item);
    s.prop = item;
    s.offset = new THREE.Vector3();
    s.target.copy(P.space.localToWorld(new THREE.Vector3(...target)));
    return s;
  }
  return { ...hands, point, reach, hold, contact, contacts };
}
