import { roomEnclosure } from './rooms/enclosure.js';

export const STATION_ENTRY_HEIGHT = 1.75;

// Same boundary and height as the station's existing sun-shadow shell.
export function stationEnclosure(root, X, Z, cut) {
  const room = roomEnclosure(root, { x0: -X, x1: X, z0: -Z, z1: Z, h: 3.4 });
  room.group.userData.followEnclosure.region = [-X, X, -Z, Z];
  room.group.userData.followEnclosure.exterior = true;
  room.wall('x', -X - 0.15, X + 0.15, -Z - 0.08, cut, 0.16);
  for (const side of [-1, 1]) {
    room.wall('z', -Z, Z - 0.9, side * (X + 0.08), cut, 0.16);
    room.wall('z', Z - 0.9, Z + 0.14, side * (X + 0.08), 0, 0.16);
    room.wall('x', side < 0 ? -X - 0.15 : 2.4, side < 0 ? -2.4 : X + 0.15, Z + 0.06, 0.5, 0.16);
  }
  // The opening fits the standing cast; the glass frame and its open centre share this height.
  room.wall('x', -2.4, 2.4, Z + 0.06, STATION_ENTRY_HEIGHT + 0.08, 0.16);
}
