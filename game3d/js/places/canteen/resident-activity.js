import * as THREE from 'three';
import { diningHands } from '../izakaya/hands.js';
// Small table tasks pause before a conversation takes ownership of the same real arm.
export function dinerActivity(game, P, props) {
  const hands = diningHands(game, P.space),
    busy = new Set();
  const rows = [
    { id: 'canteen_shirt', prop: props.shirt.spoon, offset: 4 },
    { id: 'canteen_cardigan', prop: props.cardigan.spoon, offset: 11 },
    { id: 'canteen_polo', prop: props.wrapper, offset: 16 },
  ];
  for (const row of rows)
    Object.assign(row, {
      parent: row.prop.parent,
      position: row.prop.position.clone(),
      rotation: row.prop.rotation.clone(),
      arm: null,
    });
  let time = 0;
  function rest(row) {
    if (!row.arm) return;
    hands.stop(row.arm);
    row.arm = null;
    row.parent.add(row.prop);
    row.prop.position.copy(row.position);
    row.prop.rotation.copy(row.rotation);
  }
  return {
    busy: (id) => busy.has(id),
    update(dt, suspended) {
      if (suspended) {
        rows.forEach(rest);
        return;
      }
      time += dt;
      busy.clear();
      for (const row of rows) {
        const phase = (time + row.offset) % 20,
          r = P.people[row.id];
        if (phase > 2 || !r.root.visible) {
          rest(row);
          continue;
        }
        busy.add(row.id);
        if (!row.arm) {
          row.arm = hands.start(r);
          P.space.attach(row.prop);
          row.arm.prop = row.prop;
          row.arm.offset = new THREE.Vector3(0, -0.016, 0);
        }
        const home = row.parent.localToWorld(row.position.clone());
        P.space.worldToLocal(home);
        home.x += Math.sin(phase * 3) * 0.035;
        home.y += 0.04;
        row.arm.target.copy(P.space.localToWorld(home));
      }
      hands.update();
    },
    stop() {
      busy.clear();
      rows.forEach(rest);
      hands.clear();
    },
  };
}
