import { alignBeds } from '../outdoor/bed-layout.js';
import { WALKS as I_WALKS_LOCAL, NS, pt } from './plan.js';

// Island coordinates: a shared source for the sports place, neighboring bands and map.
// Existing avenue and grove trees remain in grounds.js with their original seeds.
// The two gardens planned as free shapes on the lawn (the turn's, and r3's south of its walk) are laid as strips
// along the walk they border (outdoor/bed-layout.js; GUIDE: no blob-shaped beds); the rest are strips already,
// along the gym's and r3's walls.
const beds = [
  {
    id: 'sports-turn',
    seed: 1101,
    poly: [
      [59.65, -54.85],
      [62.1, -54.85],
      [63.8, -53.9],
      [65.5, -54.85],
      [67.32, -53.5],
      [67.32, -49.85],
      [62.5, -49.85],
      [60.1, -50.5],
    ],
    masses: [
      [60.8, -52.6, 0.62],
      [62.9, -51.4, 0.62],
      [65.45, -52.1, 0.7],
      [66.5, -50.6, 0.48],
      [63.9, -53.25, 0.55],
    ],
    grasses: [
      [60.2, -53.5],
      [62.4, -50.7],
      [65.7, -53.6],
      [66.6, -51.8],
    ],
    gaps: [
      [62.0, -53.16, 0.3],
      [65.45, -52.8, 0.3],
    ],
  },
  {
    id: 'north-street-office-south',
    seed: 1102,
    poly: [
      [71.12, -41.12],
      [77.95, -41.12],
      [78.4, -38.6],
      [76.15, -37.5],
      [75.7, -36.2],
      [75.25, -34.0],
      [71.12, -34.0],
    ],
    masses: [
      [72.3, -39.9, 0.65],
      [76.7, -39.5, 0.68],
      [74.6, -37.5, 0.73],
      [72.3, -35.2, 0.62],
      [72.1, -37.7, 0.64],
      [74.7, -39.8, 0.67],
      [74.1, -35.35, 0.56],
    ],
    grasses: [
      [71.7, -37.5],
      [74.7, -40.4],
      [77.6, -38.5],
      [73.8, -35.4],
    ],
    gaps: [],
  },
  {
    id: 'north-street-office-north',
    seed: 1103,
    poly: [
      [71.12, -46.14],
      [77.95, -46.14],
      [77.95, -45.08],
      [71.12, -45.08],
    ],
    masses: [],
    grasses: [
      [72, -45.6],
      [74.5, -45.6],
      [77, -45.6],
    ],
    gaps: [],
    cover: { radius: 0.25, variation: 0.07, spacing: 0.4 },
  },
  ...[
    [37.7, 44.45],
    [49.65, 56.4],
  ].map(([a, b], i) => ({
    id: `gym-foundation-${i}`,
    seed: 1104 + i,
    poly: [
      [a, -50.67],
      [b, -50.67],
      [b, -49.73],
      [a, -49.73],
    ],
    masses: [],
    grasses: [
      [a + 0.7, -50.2],
      [b - 0.7, -50.2],
    ],
    gaps: [[i ? 50.8 : 43.3, -49.75, 0.34]],
    cover: { radius: 0.22, variation: 0.055, spacing: 0.32 },
  })),
];
// the walks in the island frame (plan.js WALKS is in the chunk's), and the whole north street (walked on south of
// here in the east lane)
const [ox, oz] = pt([0, 0]);
const WALKS = [...I_WALKS_LOCAL.map(([x0, x1, z0, z1]) => [x0 - ox, x1 - ox, z0 - oz, z1 - oz]), NS];
const FREE = ['sports-turn', 'north-street-office-south'];
const COVER = { radius: 0.34, variation: 0.15, spacing: 0.5 };
export const ARRIVAL_GARDENS = [
  ...alignBeds(
    beds.filter((b) => FREE.includes(b.id)),
    WALKS,
  ).map((b) => ({ ...b, cover: COVER })),
  ...beds.filter((b) => !FREE.includes(b.id)).map((b) => ({ ...b, cover: b.cover || COVER })),
];
