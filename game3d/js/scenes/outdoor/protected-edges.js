// Visible northern service boundaries, in island coordinates. Building ends overlap their actual walls.
import { BUILDINGS } from '../island-layout.js';

const building = (id) => BUILDINGS.find((b) => b.id === id).rect;
const gym = building('gym'),
  pavilion = building('pool_hall');
const plant = building('nw_old'),
  factory = building('factory'),
  research = building('n4');
const sportsCorner = [54.2, -91.7];
const chimneyCorner = [plant[2], -119.1];
const worksCorner = [factory[2] - 0.05, -111];
const researchCorner = [research[0] + 0.05, worksCorner[1]];

export const PROTECTED_EDGES = {
  sports: [
    [[pavilion[0] + 0.05, sportsCorner[1]], sportsCorner],
    [sportsCorner, [sportsCorner[0], gym[1] + 0.05]],
  ],
  works: [
    [[factory[0] + 0.05, chimneyCorner[1]], chimneyCorner],
    [chimneyCorner, [chimneyCorner[0], plant[1] + 0.05]],
    [[worksCorner[0], factory[3] - 0.05], worksCorner],
    [worksCorner, researchCorner],
    [researchCorner, [researchCorner[0], research[1] + 0.05]],
  ],
};

// The planning footprint contains the fence's lower sheet and posts; physical movement uses the drawn mesh.
export const edgeBlocks = (edges) =>
  edges.map(([a, b]) => [
    Math.min(a[0], b[0]) - 0.06,
    Math.max(a[0], b[0]) + 0.06,
    Math.min(a[1], b[1]) - 0.06,
    Math.max(a[1], b[1]) + 0.06,
  ]);
