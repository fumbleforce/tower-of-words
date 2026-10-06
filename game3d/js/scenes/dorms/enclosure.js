import { roomEnclosure } from '../rooms/enclosure.js';
import { X0, X1, BACK, NEAR, H, PART, LOW, T, BATH_X, DOORWAY, C } from './layout.js';

// Match the fronts that the overview fades, without changing their state or materials.
// Each ceiling applies only inside its own room; the outdoor corridor and roof stay open.
export function dormEnclosures(root, front, levels) {
  const add = (parent, x0, x1, source) => {
    const room = roomEnclosure(parent, { x0, x1, z0: BACK, z1: NEAR, h: H }, { color: C.wall });
    room.group.userData.followEnclosure.region = [x0, x1, BACK, NEAR];
    const copy = source.clone(true);
    copy.visible = true;
    room.add(copy);
    return room;
  };
  const own = add(root, X0, X1, front);
  own.wall('x', X0, X1, PART, LOW, 0.08, { holes: [[...DOORWAY, 0, 1]] });
  own.wall('z', PART + 0.05, NEAR, BATH_X, LOW, T);
  for (const entry of levels.fronts) {
    const parent = entry.group.parent,
      dx = parent.position.x;
    add(parent, entry.x0 - dx, entry.x1 - dx, entry.group);
  }
}
