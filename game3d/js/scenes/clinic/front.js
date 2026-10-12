import { faceAt } from '../outdoor/block.js';
import { hoursPlate, departmentsStrip, crossBox } from './signs.js';

// The clinic's front on the east lane (block_e1; plaza/east-lane.js builds it with the other blocks' fronts): a green
// cross in a white box on the wall east of the canopy, the hours on a plate and the departments on the glass either
// side of the door, a roof cross for the map. k: the block (plaza/east-plan.js BLOCKS), F and u its door's face and
// place on it (outdoor/block.js), ry the face's turn, board the name board on the canopy (signs.js clinicBoard).
// Returns what lights up after dark (the cross and the board).
export function clinicFront(root, q, k, F, u, ry, board) {
  // t along the face from the door, out from the wall, y up
  const put = (obj, t, out, y) => {
    const [x, z] = faceAt(F, u + t, out);
    obj.position.set(x, y, z);
    obj.rotation.y = ry;
    root.add(obj);
  };
  const cross = crossBox(0, 0, 0, 0.62, 0);
  put(cross.group, 2.3, 0.05, 2.72);
  put(hoursPlate(0.46, 0.57), -1.35, 0.04, 1.32);
  put(departmentsStrip(1.0, 0.18), 1.6, 0.04, 1.62);
  // the roof cross, flat on the roof's west end
  const top = k.row.storeys * k.row.floorH + 0.02,
    rx = k.rect[0] + 1.6,
    rz = (k.rect[2] + k.rect[3]) / 2;
  q.box('#d9dcdf', 1.38, 0.1, 1.38, rx, top, rz, { cast: false });
  q.box('#5d8a6c', 1.06, 0.12, 0.31, rx, top, rz, { cast: false });
  q.box('#5d8a6c', 0.31, 0.12, 1.06, rx, top, rz, { cast: false });
  return [
    { mat: cross.material, night: { emissive: '#7fd39a', emissiveIntensity: 1.1 } },
    { mat: board.material, night: { emissiveIntensity: 1.3 } },
  ];
}
