import { wall } from '../props.js';
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
