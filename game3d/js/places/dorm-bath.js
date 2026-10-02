// The dorm courtyard's sento doorway (places/dorm-court.js). The public story leaves it with nothing to do.
import { SENTO } from '../scenes/dorm-court/plan.js';

export function dormBath() {
  const door = [SENTO.x0 + 0.95, SENTO.z]; // the lit doorway under the ゆ noren (scenes/dorm-court/frontages.js)
  const spot = [door[0], SENTO.z + 0.6]; // on the walk's leg to the door, a step short of the curtain
  return {
    spot,
    anchor: (v) => v.set(door[0], 1.55, door[1] + 0.1),
    face: () => door,
    update() {},
    leave() {},
  };
}
