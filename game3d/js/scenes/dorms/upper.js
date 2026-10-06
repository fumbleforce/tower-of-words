// 3F, the floor over Eric's (docs/game/places.md, Eric's dorm building): the same corridor, stairs and flats as 2F,
// a storey higher. Its six flats are cut open like 2F's, lived in differently: 303 with a desk lamp on, 305 home
// with the TV on, the rest out and dark. At the west end the laundry (shared.js), on the landing a drinks machine
// where 2F has the store. Its doors are the court's 3F doors: 303's and 305's kitchen
// windows lit (dorm-court/block.js), and what people leave outside them.
import { X0, X1, NEAR, T, PITCH, RETURN, SHARED_K, STOREY } from './layout.js';
import { shell, party, home, out, edge, veils } from './neighbours.js';
import { cutFlats, facade, corridor, doorPlates, corridorLights } from './building.js';
import { neighbourDoor, DOOR_C } from './doors.js';
import { stairs } from './stairs.js';
import { below } from './below.js';
import { laundry } from './shared.js';

const DOORS = {
  2: { at: ['boots'] },
  1: { at: ['cans'] },
  0: { lit: true, at: ['chime'] },
  '-1': { lit: true, at: ['umbrella'] },
  '-2': {},
  '-3': { at: ['pot'] },
};

// kit and root are the floor's own (placed at its x by the caller); nav takes the floor's own coordinates
export function upperFloor(kit, root, nav) {
  const zf = NEAR + T;
  for (const k of [-3, -2, -1, 0, 1, 2]) {
    shell(kit, k * PITCH);
    party(kit, X1 + T / 2 + k * PITCH);
  }
  party(kit, X0 - T / 2 - 3 * PITCH);
  edge(kit, root, 0, true);
  home(kit, root, -PITCH);
  out(kit, PITCH);
  edge(kit, root, 2 * PITCH, false);
  out(kit, -2 * PITCH);
  edge(kit, root, -3 * PITCH, false);
  veils(root, [
    [0.28, [0, -PITCH]],
    [0.55, [PITCH, 2 * PITCH, -2 * PITCH, -3 * PITCH]],
  ]);
  const s1 = SHARED_K * PITCH + X1 + T;
  cutFlats(kit, [[X1 + T + 2 * PITCH, RETURN]]);
  facade(kit, [[s1, RETURN]]);
  corridor(kit);
  const ks = Object.keys(DOORS).map(Number);
  for (const k of ks) neighbourDoor(kit, DOOR_C + k * PITCH, zf, DOORS[k]);
  doorPlates(root, 3, ks);
  corridorLights(kit, root, ks);
  const room = laundry(kit, root, nav);
  const light = stairs(kit, root, { label: '3F', back: 'drinks' });
  below(root, { drop: STOREY });
  return { room, light };
}
