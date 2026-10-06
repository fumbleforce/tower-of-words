// Ordinary swimming-club equipment shared by the pool choreography.
import * as THREE from 'three';
import { rbox } from '../../props.js';
export function poolProps(root) {
  // the club's bags (three, the blue one Emi's), the equipment list, the floats being packed, two towels, the goggles
  const bag = (c) => rbox(0.34, 0.24, 0.2, c, { r: 0.05 });
  const bags = new THREE.Group();
  [
    ['#2f6fb0', 0],
    ['#5b6470', 0.38],
    ['#8a4b3a', 0.76],
  ].forEach(([c, dx]) => {
    const b = new THREE.Group();
    b.name = `pool:bag:${bags.children.length}`;
    b.add(bag(c));
    for (const x of [-0.07, 0.07]) b.add(rbox(0.025, 0.1, 0.025, '#252d35', { x, y: 0.17 }));
    b.add(rbox(0.16, 0.025, 0.025, '#252d35', { y: 0.22 }));
    b.position.x = dx;
    bags.add(b);
  });
  const list = rbox(0.21, 0.01, 0.29, '#f5f3ec', { r: 0.002 });
  list.name = 'pool:list';
  const floats = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const f = rbox(0.42, 0.06, 0.3, ['#f0c33a', '#3a8fd0', '#e45a4a'][i % 3], {
      r: 0.02,
    });
    f.position.set((i % 2) * 0.05, i * 0.065, 0);
    floats.add(f);
  }
  const towels = [rbox(0.5, 0.03, 0.3, '#e9eef2', { r: 0.01 }), rbox(0.5, 0.03, 0.3, '#f2c9c4', { r: 0.01 })];
  const goggles = new THREE.Group();
  goggles.add(rbox(0.16, 0.05, 0.03, '#2b8fd6', { r: 0.015 }), rbox(0.2, 0.012, 0.012, '#1d2329', { y: 0.02 }));
  for (const o of [bags, list, floats, ...towels, goggles]) {
    o.visible = false;
    o.userData.noBatch = true;
    root.add(o);
  }
  return { bags, bagItems: [...bags.children], list, floats, towels, goggles };
}

// Store world-relative prop transforms even when a carried bag has left its original group.
export function poolEquipmentSave(root, props) {
  return {
    snapshot: () =>
      props.map((o) => ({
        visible: o.visible && (o.parent === root || o.parent.visible),
        position: root.worldToLocal(o.getWorldPosition(new THREE.Vector3())).toArray(),
        rotation: o.rotation.toArray(),
      })),
    restore(saved) {
      saved?.forEach((data, i) => {
        const o = props[i];
        if (!o) return;
        root.add(o);
        o.visible = data.visible;
        o.position.fromArray(data.position);
        o.rotation.fromArray(data.rotation);
      });
    },
  };
}
