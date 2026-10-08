import * as THREE from 'three';
import { keyaki, cluster, LEAF } from '../outdoor/planting.js';
import { quarterBeds } from '../campus/quarter-grounds.js';
import { SOUTH_QUARTER_BEDS, JUNCTION_TREE, JUNCTION_SHRUB } from './quarter-planting-plan.js';

// northSteps owns this in both campus and forecourt; the distant office band uses island coordinates.
export function southQuarterGrounds(parts, offset = [0, 0]) {
  quarterBeds(parts, SOUTH_QUARTER_BEDS, offset);
  const [, x, z, size, seed] = JUNCTION_TREE;
  avenueTree(parts, x + offset[0], z + offset[1], size, seed);
  const shrub = JUNCTION_SHRUB;
  const island = { geo: (color, g, options) => parts.geo(color, g.translate(offset[0], 0, offset[1]), options) };
  cluster(island, shrub.x, shrub.z, shrub);
}

// Trees are separate from the verge so opening a crossing cannot renumber their seeded crowns.
export function avenueTree(parts, x, z, size, seed) {
  keyaki(parts, x, z, size, seed);
  parts.geo(LEAF.mulch, new THREE.CylinderGeometry(0.55, 0.6, 0.03, 12).translate(x, 0, z), {
    cast: false,
    surf: 'soil',
  });
}
