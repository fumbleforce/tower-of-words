import { wall, rbox } from '../props.js';
import { roomEnclosure } from './rooms/enclosure.js';

// All B2 partitions use the exact existing wall calls and door openings, including Emi's office.
export function officeWalls(root, bounds) {
  const enclosure = roomEnclosure(root, { ...bounds, h: 2.4 }, { color: '#6b7180', ceiling: '#bbc1c7' });
  return (axis, a, b, c, h, t, options = {}) => {
    root.add(wall(axis, a, b, c, h, t, options));
    // Full-height openings in the old north partition are open passages, not low doorways.
    const holes = (options.holes || []).map(([lo, hi, bottom, height]) => [
      lo,
      hi,
      bottom,
      height >= h && h >= 1.4 ? 2.4 : height,
    ]);
    enclosure.wall(axis, a, b, c, h, t, { ...options, holes }, 1.3);
  };
}

// The office-scale player capsule is 1.416m tall; both aperture and frame must clear it.
export const OFFICE_DOOR_HEIGHT = 1.5;
export function officeEntryFrame(root, z, thickness, material) {
  for (const x of [-0.8, 0.3])
    root.add(rbox(0.08, OFFICE_DOOR_HEIGHT, thickness + 0.04, null, { x, z, m: material, r: 0.01 }));
  root.add(
    rbox(1.18, 0.08, thickness + 0.04, null, {
      x: -0.25,
      y: OFFICE_DOOR_HEIGHT - 0.04,
      z,
      m: material,
      r: 0.01,
    }),
  );
}
