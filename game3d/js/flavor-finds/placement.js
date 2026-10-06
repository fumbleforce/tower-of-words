// Named nooks are standing positions. The objects use the adjacent existing surface or fixture.
import { benchNear } from '../places/day3/seats.js';
import { NOOKS as ALLEYS } from '../scenes/shotengai/plan.js';
import { TABLE } from '../scenes/sports/deck-plan.js';
import { SEAT_BAY } from '../scenes/plaza/east-plan.js';
import { pt } from '../scenes/sports/plan.js';
export function placement(P, f) {
  const at = [...P.spots[f.at]];
  const result = { at, x: at[0], z: at[1], y: 0.5, yaw: 0 };
  const bench = () => {
    const b = benchNear(P, at);
    if (!b) throw new Error(`No bench for ${f.id}`);
    return b;
  };
  if (f.id === 'umbrella_drain') Object.assign(result, { x: at[0] + 1, z: at[1] - 0.55, y: 0.48 });
  if (f.id === 'crate_count') {
    const n = ALLEYS.find((n) => n.id === f.at),
      u = -n.len / 2 + 1.15;
    Object.assign(result, { x: at[0] - u, z: at[1] - n.back + 0.19, y: 0.94, shotYaw: 0, shotElev: 1.15 });
  }
  if (f.id === 'slipper_pair') Object.assign(result, { x: at[0] - 0.44, z: -0.54, y: 0.3, yaw: Math.PI / 2 });
  if (f.id === 'pool_key_tag') {
    const p = pt(TABLE);
    Object.assign(result, { x: p[0], z: p[1], y: 0.51, shotYaw: -0.9 });
  }
  if (['bench_letter', 'cafe_cup', 'training_lunch'].includes(f.id)) {
    const b = bench();
    Object.assign(result, { x: b.x, z: b.z, y: b.top + 0.008, yaw: b.ry });
    if (f.id === 'cafe_cup') Object.assign(result, { shotYaw: Math.PI / 2, shotElev: 1.2 });
    if (f.id === 'training_lunch') Object.assign(result, { x: SEAT_BAY[0] + 0.83, z: SEAT_BAY[2] + 0.45, y: 0.012 });
  }
  if (f.id === 'ball_tube') Object.assign(result, { x: at[0] - 0.75, z: at[1] - 0.65, y: 0.65 });
  if (f.id === 'catalogue_tabs') {
    const b = P.seats.karaoke_bench;
    Object.assign(result, { x: b.x, z: b.z, y: b.top + 0.015, yaw: b.ry });
  }
  if (f.id === 'book_return') Object.assign(result, { x: -3.84, z: -1.0, y: 0.925, yaw: Math.PI / 2 });
  if (f.id === 'fridge_saucer') Object.assign(result, { x: 0.87, z: -4.41, y: 1.065 });
  if (f.id === 'telescope_coin')
    Object.assign(result, { x: at[0] + 0.96, z: at[1] - 0.55, y: 0.98, yaw: -Math.PI / 2 });
  result.at = [result.x + Math.sin(result.yaw) * 0.95, result.z + Math.cos(result.yaw) * 0.95];
  return result;
}
