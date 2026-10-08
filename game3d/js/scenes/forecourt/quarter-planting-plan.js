// Island coordinates for the quarter street's southern beds and the cross-street opening.
import { roundCorners } from '../campus/quarter-plan.js';
export const QUARTER_OPENING = [3, 6];
export const JUNCTION_TREE = ['keyaki', 0.65, -23.1, 1.08, 68];
export const JUNCTION_SHRUB = {
  x: 8.4,
  z: -26.8,
  n: 4,
  r: 0.38,
  spread: 0.55,
  seed: 82,
};
export const SOUTH_QUARTER_BEDS = [
  {
    id: 'quarter-south-west',
    seed: 964,
    cover: {
      radius: 0.18,
      variation: 0.14,
      spacing: 0.48,
      drifts: [
        [1.25, -27.2, 1.15, 0.7],
        [0.1, -25.6, 0.95, 0.85],
        [1.8, -24, 0.6, 0.8],
        [-0.45, -21.4, 0.65, 0.75],
        [1.75, -20.5, 0.65, 0.7],
      ],
    },
    grassCount: 9,
    poly: [
      [-0.65, -27.95],
      [2.65, -27.95],
      [2.65, -19.5],
      [-0.8, -19.5],
      [-1.25, -21.9],
      [-0.9, -24.8],
    ],
    masses: [
      [0.6, -27, 0.42, 2.1],
      [0.1, -25.1, 0.62, 1.55],
      [1.65, -21.7, 0.36, 2.4],
    ],
    grasses: [
      [2.05, -26.8, 0.6],
      [1.65, -24.2, 0.55],
      [-0.4, -22, 0.65],
      [1.8, -20.3, 0.5],
    ],
    gaps: [
      [0.65, -23.1, 0.65],
      [0.25, -20.2, 0.65],
      [2.85, -25, 0.55],
    ],
  },
  {
    id: 'quarter-junction',
    seed: 963,
    cover: {
      radius: 0.18,
      variation: 0.14,
      spacing: 0.48,
      drifts: [
        [8.35, -28.8, 1.2, 0.65],
        [7.15, -27.2, 0.65, 0.85],
        [8.65, -25.3, 0.8, 0.75],
        [7.1, -22.7, 0.6, 0.9],
        [8.95, -21, 0.5, 0.65],
      ],
    },
    grassCount: 9,
    poly: [
      [6.35, -29.65],
      [9.9, -29.65],
      [9.25, -27.9],
      [9.8, -25.7],
      [9.7, -22.3],
      [9.15, -19.5],
      [6.35, -19.5],
    ],
    masses: [
      [8.6, -28.8, 0.4, 1.8],
      [8.6, -25.5, 0.6, 1.6],
      [7.1, -22, 0.36, 2.4],
    ],
    grasses: [
      [7.2, -29.1, 0.55],
      [7.4, -27.5, 0.6],
      [6.95, -25.6, 0.5],
      [9.05, -21.65, 0.65],
    ],
    gaps: [
      [8.4, -26.8, 0.7],
      [7, -24.3, 0.65],
      [8.65, -23.4, 0.4],
      [8.25, -20.2, 0.65],
    ],
  },
].map((bed) => ({ ...bed, poly: roundCorners(bed.poly) }));
