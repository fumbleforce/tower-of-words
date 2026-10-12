// Lawn groves frame the fountain approaches without isolated groundcover patches.
import { keyaki, sakura, maple, ginkgo, pine, cluster, grass, LEAF } from '../outdoor/planting.js';

const TREES = { k: keyaki, s: sakura, m: maple, g: ginkgo, p: pine };
const GROVES = [
  [
    -16.8,
    -7.6,
    [
      ['k', -0.9, 0.2, 1.2],
      ['g', 1, -0.5, 1.05],
      ['m', 0.2, 1, 0.9],
    ],
  ],
  [
    -15.2,
    -11,
    [
      ['s', 0, 0, 1],
      ['p', 1, 0.5, 0.85],
    ],
  ],
  [
    -21.5,
    7.6,
    [
      ['s', 0, 0, 1.1],
      ['m', 1.3, 0.5, 0.9],
    ],
  ],
  [
    10.2,
    -11.5,
    [
      ['k', -0.9, 0, 1.2],
      ['g', 1, 0.6, 1],
      ['s', 0.3, -1, 1],
    ],
  ],
  [
    14.6,
    6.6,
    [
      ['g', -0.6, 0, 1.1],
      ['m', 0.9, 0.4, 0.95],
      ['k', 0.3, -0.8, 1.1],
    ],
  ],
  [
    -12.5,
    12.8,
    [
      ['m', -0.9, 0, 0.9],
      ['s', 0.9, 0.1, 0.95],
    ],
  ],
  [
    12.5,
    12.8,
    [
      ['s', -0.9, 0, 0.95],
      ['m', 0.9, 0.1, 0.9],
    ],
  ],
];

// Small shrub drifts grow directly in the shared lawn beneath the grove.
const BEDS = [
  [
    [-18.7, -6.1],
    [-16.9, -8.9],
    [-15.8, -10.1],
    [-14.5, -11.8],
  ],
  [
    [9.8, -12.6],
    [11.8, -10.3],
    [12.2, -8.5],
  ],
  [
    [-22.2, 6.4],
    [-20.3, 8.6],
    [-18.4, 8.4],
    [-16.3, 10.4],
    [-14.4, 12.2],
    [-11.4, 12.7],
  ],
  [
    [14.2, 5.2],
    [15.7, 7.3],
    [13.4, 8.3],
  ],
];

export function* groveSteps(p) {
  for (const [i, shrubs] of BEDS.entries()) {
    for (const [j, [x, z]] of shrubs.entries()) {
      cluster(p, x, z, {
        n: 3,
        r: 0.26 + (j % 3) * 0.04,
        spread: 0.3,
        seed: i * 13 + j,
        tones: [LEAF.deep, LEAF.mid, LEAF.fresh],
        y: 0,
      });
      if (j % 2 === 0) grass(p, x + 0.35, z + 0.25, { h: 0.3, seed: i * 13 + j });
      if (j % 2 || j === shrubs.length - 1) yield;
    }
  }
  for (const [gi, [x, z, trees]] of GROVES.entries()) {
    for (const [i, [kind, dx, dz, size]] of trees.entries()) {
      TREES[kind](p, x + dx, z + dz, size, gi * 7 + i);
      yield;
    }
  }
}
