// Layered planting for the Works street only, using the existing outdoor kit's palette and tree structure.
import * as THREE from 'three';
import { TREES, LEAF, mound, grass } from '../outdoor/planting.js';
import { Parts, rng } from '../outdoor/parts.js';
import { EAST_TREES, EAST_SOIL, EAST_GROUPS, WEST_BEDS, clearOfServices } from './verge-plan.js';

import { broadLeaf, leafMass, fitFoliage } from './verge-foliage.js';

const TONES = [LEAF.deep, LEAF.mid, LEAF.fresh, LEAF.light];

function soil(p, points) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
  g.rotateX(-Math.PI / 2).translate(0, 0.006, 0);
  p.geo(LEAF.mulch, g, { cast: false, surf: 'soil' });
}

function within(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i],
      [bx, bz] = polygon[j];
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}

// A low evergreen mat joins the bushes. Open rings expose mulch at the existing trunks;
// small raised leaf fans give the ground scale without individual high-cost shrub meshes.
function cover(p, points, roots = []) {
  const box = new THREE.Box2().setFromPoints(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const center = box.getCenter(new THREE.Vector2());
  const inset = points.map(([x, z]) => [x + Math.sign(center.x - x) * 0.09, z + Math.sign(center.y - z) * 0.09]);
  const shape = new THREE.Shape(inset.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const [, x, z, , seed] of roots) {
    const hole = new THREE.Path();
    for (let i = 0; i < 10; i++) {
      const angle = (-i * Math.PI) / 5;
      const radius = 0.3 + (1 + Math.sin(i * 2.2 + seed)) * 0.085;
      const point = [x + Math.cos(angle) * radius, -z + Math.sin(angle) * radius];
      if (i) hole.lineTo(...point);
      else hole.moveTo(...point);
    }
    hole.closePath();
    shape.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: false, curveSegments: 6 });
  g.rotateX(-Math.PI / 2).translate(0, 0.04, 0);
  p.geo(LEAF.cover, g, { cast: false, surf: 'foliage' });
  let k = 0;
  for (let z = box.min.y + 0.3; z < box.max.y - 0.2; z += 0.26)
    for (let x = box.min.x + 0.25; x < box.max.x - 0.2; x += 0.29, k++) {
      const px = x + Math.sin(k * 1.9) * 0.055,
        pz = z + Math.cos(k * 2.3) * 0.065;
      const nearGroup =
        !roots.length ||
        EAST_GROUPS.some(
          (gz) =>
            Math.hypot((px + 44.2) / 1.05, (pz - gz - 0.5) / 1.7) < 1 ||
            Math.hypot((px + 41.8) / 0.9, (pz - gz - 1.2) / 1.3) < 1,
        );
      const nearRoot = roots.some(([, tx, tz]) => Math.hypot(px - tx, pz - tz) < 0.85);
      if ((!nearGroup && !nearRoot) || roots.some(([, tx, tz]) => Math.hypot(px - tx, pz - tz) < 0.38)) continue;
      if (
        [0, 1, 2, 3, 4, 5, 6, 7].some(
          (i) => !within(px + Math.cos((i * Math.PI) / 4) * 0.23, pz + Math.sin((i * Math.PI) / 4) * 0.23, inset),
        )
      )
        continue;
      const at = new THREE.Vector3(px, 0.099 + (k % 3) * 0.009, pz);
      const tone = new THREE.Color(LEAF.cover).lerp(new THREE.Color(TONES[k % 4]), 0.48);
      p.geo(tone, broadLeaf(at, k * 2.4, 0.39, 0.28, 0.022), { cast: false, surf: 'foliage' });
    }
}

// The species' street-style tree (diorama/planting.js ISLAND_PLANTING): its trunk, a crown round each limb's end and its
// root bed, leaves laid over once the place is built (diorama/vegetation.js).
function fullTree(p, [kind, x, z, scale, seed]) {
  TREES[kind](p, x, z, scale, seed);
}

function rootLeaves(p, [, x, z, , seed]) {
  for (let i = 0; i < 16; i++) {
    const angle = seed + (i * Math.PI * 2) / 16,
      radius = 0.37 + Math.sin(i * 2.2 + seed) * 0.04;
    const at = new THREE.Vector3(x + Math.cos(angle) * radius, 0.106 + (i % 3) * 0.007, z + Math.sin(angle) * radius);
    p.geo(TONES[(seed + i) % 4], broadLeaf(at, angle + Math.PI / 2, 0.28, 0.22, 0.025), {
      cast: false,
      surf: 'foliage',
    });
  }
}

// Overlapping lobes form continuous bushes, with low leading edges and taller masses behind.
function bush(p, x, z, radius, seed, height = 0.68) {
  const foliage = {
    geo(color, geometry, options) {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox.clone(),
        center = bounds.getCenter(new THREE.Vector3()),
        size = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      const parts = fitFoliage(leafMass(color, center, size, seed + Math.round(center.z * 19), 16), bounds);
      geometry.dispose();
      for (const part of parts) p.geo(part.color, part.geometry, options);
    },
  };
  const q = rng(seed);
  for (let i = 0; i < 4; i++) {
    const angle = i * 2.4 + seed;
    const d = i ? radius * 0.43 : 0;
    const r = radius * (i ? 0.43 + q() * 0.1 : 0.68);
    mound(foliage, x + Math.cos(angle) * d, z + Math.sin(angle) * d, r, TONES[(i + seed) % 4], {
      y: 0.055,
      squash: Math.min(0.7, height / (r * 1.72)),
      turn: angle,
    });
  }
}

export function* vergeSteps(p, treeRoot = null) {
  soil(p, EAST_SOIL);
  cover(p, EAST_SOIL, EAST_TREES);
  for (const [i, z] of EAST_GROUPS.entries()) {
    // The low road-facing fringe joins the deeper bushes; trunk pockets keep bark visible.
    for (const [j, [x, dz, radius]] of [
      [-45.0, 0, 0.54],
      [-44.5, -0.7, 0.75],
      [-44.4, 0.65, 0.7],
      [-41.8, -0.35, 0.88],
      [-41.65, 0.85, 0.67],
      [-42.0, 1.65, 0.54],
    ].entries())
      bush(p, x, z + dz, radius, 610 + i * 9 + j, x < -44.7 ? 0.28 : 0.7);
    for (let j = 0; j < 3; j++)
      grass(p, -43.85 + j * 0.32, z + 1.35 - j * 0.24, { h: 0.24 + j * 0.035, seed: 670 + i * 3 + j });
    yield;
  }
  // Cells intentionally discard shadows; these eight foreground trees instead use ordinary Parts.
  // Build once in the existing island frame. Parts owns the merged source geometry disposal.
  const trees = treeRoot ? new Parts() : p;
  for (const tree of EAST_TREES) {
    fullTree(trees, tree);
    rootLeaves(p, tree);
    yield;
  }
  if (treeRoot) trees.build(treeRoot);
  for (const [i, [x0, x1, z0, z1]] of WEST_BEDS.entries()) {
    const start = z0;
    const outline = [
      [x0 + 0.14, start],
      [x1 - 0.14, start],
      [x1, start + 0.4],
      [x1 - 0.13, (start + z1) / 2],
      [x1 - 0.1, z1],
      [x0 + 0.1, z1],
      [x0 + 0.12, (start + z1) / 2],
      [x0, start + 0.5],
    ];
    soil(p, outline);
    cover(p, outline);
    for (const [group, fraction, count] of [
      [0, 0.15, 3],
      [1, 0.58, 4],
    ]) {
      for (let j = 0; j < count; j++) {
        const z = start + (z1 - start) * fraction + j * 0.33;
        const x = (x0 + x1) / 2 + Math.sin(j * 1.8 + group * 2) * 0.13;
        if (z < z1 - 0.45 && clearOfServices(x, z, 0.42))
          bush(p, x, z, 0.4 + (j % 2) * 0.02, 710 + i * 13 + j, 0.23 + ((j + group) % 3) * 0.045);
      }
    }
    yield;
  }
}
