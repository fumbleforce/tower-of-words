// Low beds outside the fountain ring. Their long edges turn from the lane arms toward the canteen and the
// shop-back walk. The existing trees keep their positions; the ground cover joins the former separate clumps.
import * as THREE from 'three';
import { keyaki, sakura, maple, ginkgo, pine, cluster, grass, LEAF } from '../outdoor/planting.js';
import { FOOTPATH } from './plan.js';

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

// A mowing gap runs between the beds and the ring/verges. The south ends stop half a metre before the footpath;
// the east pockets stay west of the training centre's bike pad, cross walk and avenue tree pit. The south-east
// pocket meets the existing drift beside the shop (east-lane.js), which already reaches the southern tree pair.
const SOUTH = FOOTPATH[2] - 0.55;
const BEDS = [
  {
    edge: [
      [-20, -5],
      [-16.7, -5],
      [-13.4, -8.5],
      [-12.9, -11.8],
      [-14.3, -12.8],
      [-16.8, -12.6],
      [-18.6, -9.5],
    ],
    shrubs: [
      [-18.7, -6.1],
      [-16.9, -8.9],
      [-15.8, -10.1],
      [-14.5, -11.8],
    ],
  },
  {
    edge: [
      [8.4, -13.3],
      [11.6, -13.3],
      [12.4, -11],
      [12.5, -7.4],
      [11.4, -8.6],
      [9.1, -10.5],
    ],
    shrubs: [
      [9.8, -12.6],
      [11.8, -10.3],
      [12.2, -8.5],
    ],
  },
  {
    edge: [
      [-23.5, 5.5],
      [-20, 5.5],
      [-17.7, 7.2],
      [-15.1, 10],
      [-11, 12.1],
      [-10.4, SOUTH],
      [-14.6, SOUTH],
      [-18.3, 10.8],
      [-22.8, 9.4],
    ],
    shrubs: [
      [-22.2, 6.4],
      [-20.3, 8.6],
      [-18.4, 8.4],
      [-16.3, 10.4],
      [-14.4, 12.2],
      [-11.4, 12.7],
    ],
  },
  {
    edge: [
      [13.4, 4.8],
      [16, 4.8],
      [16.3, 7.4],
      [14.7, 8.95],
      [12.4, 8.95],
      [12.7, 7.4],
    ],
    shrubs: [
      [14.2, 5.2],
      [15.7, 7.3],
      [13.4, 8.3],
    ],
  },
];

function groundCover(p, edge) {
  // Cut each corner back once, so the mower has a continuous edge without a raised rim or a floating mound.
  const shape = new THREE.Shape();
  edge.forEach(([x, z], i) => {
    const next = edge[(i + 1) % edge.length];
    for (const t of [0.16, 0.84]) {
      const a = x + (next[0] - x) * t,
        b = z + (next[1] - z) * t;
      if (i === 0 && t === 0.16) shape.moveTo(a, -b);
      else shape.lineTo(a, -b);
    }
  });
  shape.closePath();
  const g = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.025, 0);
  p.geo(LEAF.cover, g, { cast: false });
}

export function* groveSteps(p) {
  for (const [i, { edge, shrubs }] of BEDS.entries()) {
    groundCover(p, edge);
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
