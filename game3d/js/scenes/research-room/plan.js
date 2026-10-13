import { roomNav } from '../rooms/shell.js';
import { front } from '../works/plan.js';
export const ISLAND_DOOR = front('n4').door;
export const ORIGIN = [-31, -103.45];
export const R = { x0: -3.95, x1: 4, z0: -3.35, z1: 3.35, h: 1.96, near: 0.2, t: 0.14 };
export const DOOR = { edge: [-4.17, 0], in: [-3.35, 0], out: [-3.6, 0] };
export const READER = { x: 0.1, z: -2.4, ry: 0, top: 0.3 };
export const SEATS = {
  research_table_seat: { x: 0.1, z: -0.97, ry: Math.PI, top: 0.3, out: [0.1, 0.22] },
  research_window_seat: { x: 1.91, z: -2.56, ry: Math.PI / 2, top: 0.3, out: [1.1, -2.56] },
  research_side_seat: { x: -1.05, z: -0.97, ry: Math.PI, top: 0.3, out: [-1.05, 0.22] },
  research_end_seat: { x: -2.13, z: -1.6, ry: Math.PI / 2, top: 0.3, out: [-2.9, -1.6] },
};
export const ARCHIVE = { back: R.x1 - 0.04, z: 2, w: 1, d: 1.65 };
export const INDEX = { x: -0.1, z: 1.85, w: 2.2, d: 0.85, top: 0.7, out: [-0.1, 0.9] };
export const SHELF = { weather: [3.12, 0.645, -0.92], copier: [3.12, 0.645, -0.22] };
export const TABLE_PAGES = {
  research_table_seat: [0.1, 0.635, -1.38],
  research_window_seat: [2.36, 0.635, -2.56],
  research_side_seat: [-1.05, 0.635, -1.38],
  research_end_seat: [-1.66, 0.635, -1.6],
};
export const SPOTS = { research_in: DOOR.in, research_reader: [-0.95, -2.48], research_shelf: [2.75, -0.57] };
export function researchNav() {
  const nav = roomNav(R, 0.08);
  for (const b of [
    [INDEX.x - INDEX.w / 2, INDEX.x + INDEX.w / 2, INDEX.z - INDEX.d / 2, INDEX.z + INDEX.d / 2],
    [ARCHIVE.back - ARCHIVE.w - 0.02, ARCHIVE.back + 0.03, ARCHIVE.z - 0.85, ARCHIVE.z + 0.85], // archive case
    [-3.34, -1.91, -3.33, -2.93], // back issues, tight to north wall
    [-1.85, 0.85, -2.03, -1.15], // reading table
    [2.07, 3.1, -3.3, -1.82], // quiet desk
    [3.18, R.x1, -2.85, 0.64], // shelves
    [-2.82, 0.45, 2.72, R.z1], // low return shelf
    [-0.2, 0.4, -2.71, -2.12], // reader chair
    [-0.2, 0.4, -1.26, -0.67],
    [1.61, 2.21, -2.85, -2.27],
    [-1.35, -0.75, -1.26, -0.67],
    [-2.43, -1.83, -1.9, -1.3],
  ])
    nav.block(...b);
  return nav;
}
