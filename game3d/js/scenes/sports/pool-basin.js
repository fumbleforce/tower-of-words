import * as THREE from 'three';
import { WATER } from './deck-plan.js';
import { pt } from './plan.js';

// The skyline supplies continuous land, paths and sea under the sports district.
// Open only the pool rectangle, keeping interpolated exterior surface attributes.
export function openPoolBasin(root) {
  const mesh = root.getObjectByName('skyline:ground');
  if (!mesh) return;
  root.updateWorldMatrix(true, true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(mesh.matrixWorld);
  const geometry = mesh.geometry,
    attrs = Object.entries(geometry.attributes);
  const [x0, z0] = pt([WATER[0], WATER[2]]),
    [x1, z1] = pt([WATER[1], WATER[3]]);
  const planes = [
    [0, x0, 1],
    [0, x1, -1],
    [2, z0, 1],
    [2, z1, -1],
  ];
  const output = Object.fromEntries(attrs.map(([name]) => [name, []]));
  const vertex = (i) => {
    const v = Object.fromEntries(
      attrs.map(([name, attr]) => [
        name,
        Array.from({ length: attr.itemSize }, (_, k) => attr.array[i * attr.itemSize + k]),
      ]),
    );
    v.at = new THREE.Vector3(...v.position).applyMatrix4(toRoot).toArray();
    return v;
  };
  const emit = (poly) => {
    for (let i = 1; i + 1 < poly.length; i++)
      for (const v of [poly[0], poly[i], poly[i + 1]]) for (const [name] of attrs) output[name].push(...v[name]);
  };
  const split = (poly, [axis, edge, sign]) => {
    const inside = [],
      outside = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const da = (a.at[axis] - edge) * sign,
        db = (b.at[axis] - edge) * sign;
      (da >= 0 ? inside : outside).push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        const v = Object.fromEntries(
          attrs.map(([name]) => [name, a[name].map((value, k) => value + t * (b[name][k] - value))]),
        );
        v.at = a.at.map((value, k) => value + t * (b.at[k] - value));
        inside.push(v);
        outside.push(v);
      }
    }
    return [inside, outside];
  };
  const indices = geometry.index?.array,
    count = indices?.length ?? geometry.attributes.position.count;
  const prefixes = {},
    groups = [];
  for (let i = 0; i < count; i += 3) {
    const start = output.position.length / 3;
    let poly = [0, 1, 2].map((k) => vertex(indices ? indices[i + k] : i + k));
    for (const plane of planes) {
      if (poly.length < 3) break;
      const [inside, outside] = split(poly, plane);
      emit(outside);
      poly = inside;
    }
    const group = geometry.groups.find((g) => i >= g.start && i < g.start + g.count);
    const added = output.position.length / 3 - start;
    if (group && added) {
      const last = groups.at(-1);
      if (last && last.materialIndex === group.materialIndex && last.start + last.count === start) last.count += added;
      else groups.push({ start, count: added, materialIndex: group.materialIndex });
    }
    for (const key of ['traversalSkipFaces', 'seaSurfaceFaces'])
      if (i / 3 + 1 === geometry.userData[key]) prefixes[key] = output.position.length / 9;
  }
  const opened = new THREE.BufferGeometry();
  for (const [name, attr] of attrs)
    opened.setAttribute(
      name,
      new THREE.BufferAttribute(new attr.array.constructor(output[name]), attr.itemSize, attr.normalized),
    );
  for (const g of groups) opened.addGroup(g.start, g.count, g.materialIndex);
  opened.userData = { ...geometry.userData };
  Object.assign(opened.userData, prefixes);
  opened.computeBoundingSphere();
  mesh.geometry = opened;
  geometry.dispose();
}
