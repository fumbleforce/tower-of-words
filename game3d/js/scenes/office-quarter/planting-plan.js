// Existing office grounds belts, shared by the 3D planting builder and the island map.
import { OFFICE_PATHS } from '../island-offices.js';
const [, north, , south] = OFFICE_PATHS.find((p) => p.id === 'office_street').rect;
export const OFFICE_BELTS = [
  [[-26.9, -24.6, -67, north - 2.2], ['keyaki', 'sakura'], 101],
  [[-15.8, -10.8, -71, north - 2.2], ['sakura', 'maple', 'keyaki'], 103],
  [[1.0, 5.3, -70, north - 5.6], ['ginkgo', 'keyaki'], 105], // short of the smoking corner (plan.js NOOKS)
  [[-40, -28.5, -74, -63], ['pine', 'keyaki', 'maple'], 107],
  [[-9.5, 14.2, -77, -65], ['keyaki', 'sakura', 'pine'], 109],
  [[-23.5, -16.8, -80, -71.5], ['maple', 'sakura'], 111],
  [[-39.5, -22, south + 3.6, south + 6.6], ['keyaki', 'sakura', 'maple'], 113],
  [[-16.5, -8.4, south + 3.6, south + 10], ['ginkgo', 'keyaki'], 115],
  [[7.5, 30.5, south + 3.6, south + 6.6], ['sakura', 'keyaki', 'maple'], 117],
  [[-3.6, -0.4, -44, -36.5], ['maple', 'sakura'], 119],
];
