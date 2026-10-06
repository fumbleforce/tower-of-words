import * as THREE from 'three';
import { Kit } from '../../scenes/dorms/kit.js';
import { SEATS, TABLE } from '../../scenes/izakaya/plan.js';
const model = (fn) => {
  const k = new Kit(),
    g = new THREE.Group();
  g.userData.noBatch = true;
  fn(k);
  k.flush(g);
  return g;
};
export const skewer = () =>
  model((k) => {
    k.box('#c69d62', 0.22, 0.012, 0.014, 0, 0.017, 0, { surf: 'laminate' });
    for (const x of [-0.064, 0, 0.064]) {
      k.box('#ac643a', 0.05, 0.048, 0.056, x, 0.025, 0, { r: 0.012 });
      k.box('#4f7449', 0.02, 0.032, 0.055, x + 0.028, 0.026, 0);
    }
  });
export const vegetables = () =>
  model((k) => {
    for (const [x, z, c] of [
      [-0.045, 0, '#dc8d43'],
      [0.04, 0, '#618545'],
      [0, 0.04, '#bf644a'],
    ])
      k.box(c, 0.07, 0.045, 0.055, x, 0.015, z, { r: 0.016 });
  });
export const cup = () => {
  const g = model((k) => k.cyl('#e8e5d8', 0.046, 0.037, 0.105, 0, 0, 0, { surf: 'ceramic' }));
  const liquid = model((k) => k.cyl('#60776a', 0.039, 0.039, 0.003, 0, 0.106, 0));
  liquid.traverse((o) => {
    if (o.material) o.material = o.material.clone();
  });
  g.add(liquid);
  g.liquid = liquid;
  return g;
};
export function dinnerModels(root) {
  const group = new THREE.Group();
  root.add(group);
  group.userData.noBatch = true;
  const k = new Kit(),
    settings = {},
    cups = {},
    plates = {};
  for (const [id, s] of Object.entries(SEATS)) {
    const who = id === 'party_seat' ? 'eric' : id.slice(6),
      f = new THREE.Vector3(Math.sin(s.ry), 0, Math.cos(s.ry)),
      right = new THREE.Vector3(-Math.cos(s.ry), 0, Math.sin(s.ry));
    const p = new THREE.Vector3(s.x, TABLE.top, s.z).addScaledVector(f, 0.27);
    settings[who] = { p, f, right };
    k.cyl('#ece5d6', 0.1, 0.095, 0.018, p.x, TABLE.top, p.z, { surf: 'ceramic' });
    const rice = p.clone().addScaledVector(right, -0.19).addScaledVector(f, 0.02);
    k.cyl('#536f69', 0.072, 0.045, 0.065, rice.x, TABLE.top, rice.z, { surf: 'ceramic' });
    k.cyl('#f4eddd', 0.062, 0.052, 0.032, rice.x, TABLE.top + 0.055, rice.z);
    for (const dx of [-0.012, 0.012])
      k.box(
        '#534334',
        0.008,
        0.009,
        0.21,
        p.x + right.x * (0.15 + dx),
        TABLE.top + 0.007,
        p.z + right.z * (0.15 + dx),
        { ry: s.ry, surf: 'laminate' },
      );
    const c = cup();
    c.position.copy(p).addScaledVector(right, 0.2).addScaledVector(f, -0.01);
    group.add(c);
    cups[who] = c;
    const plate = new THREE.Group();
    plate.position.copy(p).add(new THREE.Vector3(0, 0.025, 0));
    group.add(plate);
    plates[who] = plate;
  }
  const platters = {};
  for (const [type, x] of [
    ['yakitori', -0.24],
    ['vegetables', -0.08],
  ]) {
    const g = model((k) => k.box('#425d5c', 0.39, 0.028, 0.24, 0, 0, 0, { r: 0.02, surf: 'ceramic' }));
    g.position.set(x, TABLE.top, type === 'vegetables' ? -1.72 : -2.08);
    group.add(g);
    for (let i = 0; i < 3; i++) {
      const o = type === 'yakitori' ? skewer() : vegetables();
      o.position.set(0, 0.03, (i - 1) * 0.065);
      g.add(o);
    }
    platters[type] = g;
  }
  k.cyl('#ded7c5', 0.075, 0.055, 0.035, 0, TABLE.top, -2.05, { surf: 'ceramic' });
  for (const z of [-2.08, -2.04, -2.0]) k.box('#89a265', 0.045, 0.018, 0.025, 0, TABLE.top + 0.035, z, { r: 0.008 });
  const pickles = model((k) => {
    k.cyl('#e6ddc9', 0.06, 0.047, 0.03, 0, 0, 0, { surf: 'ceramic' });
    for (const x of [-0.025, 0, 0.025]) k.cyl('#89a265', 0.016, 0.016, 0.008, x, 0.032, 0);
  });
  pickles.position.set(0.58, TABLE.top, -1.66);
  group.add(pickles);
  const boxes = model((k) => {
    k.box('#c9b18b', 0.24, 0.012, 0.18, 0, 0, 0, { surf: 'card' });
    for (const x of [-0.115, 0.115]) k.box('#c9b18b', 0.01, 0.07, 0.18, x, 0.035, 0);
    for (const z of [-0.085, 0.085]) k.box('#c9b18b', 0.24, 0.07, 0.01, 0, 0.035, z);
  });
  boxes.position.set(-0.1, TABLE.top, -2.52);
  group.add(boxes);
  const lid = model((k) => k.box('#b69b76', 0.25, 0.014, 0.19, 0, 0, 0, { r: 0.006, surf: 'card' }));
  lid.position.set(-0.3, TABLE.top, -2.55);
  group.add(lid);
  // A carry bag beside Emi is present from arrival, ready for the final takeaway box.
  k.box('#bca889', 0.23, 0.24, 0.1, 0.82, 0.12, -3.03, { surf: 'card' });
  for (const x of [0.75, 0.89]) k.box('#8d775b', 0.012, 0.08, 0.012, x, 0.275, -3.03);
  k.box('#8d775b', 0.15, 0.012, 0.012, 0.82, 0.31, -3.03);
  k.flush(group);
  return { group, settings, cups, plates, platters, pickles, boxes, lid };
}
