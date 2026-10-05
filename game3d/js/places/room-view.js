import * as THREE from 'three';
import { snapshotPeople, restorePeople } from './saved-people.js';

// The camera of a club interior (the gym's corner, the common room, the karaoke desk and booth;
// scenes/rooms/shell.js): looking in over the cut-down front wall. On a desktop the whole room in one still frame,
// its floor's four corners and the back wall's top in view; on a phone, where a whole room is too small to read,
// following Eric at a phone's distance, kept over the room.
//   roomView(cam, R, aspect)    R: the room (x0, x1, z0, z1, h)
export function roomView(cam, R, aspect) {
  const { x0, x1, z0, z1, h } = R;
  const mid = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2 + 0.2);
  if (aspect >= 1)
    cam.fit(
      aspect,
      [
        new THREE.Vector3(x0, 0, z1 + 0.2),
        new THREE.Vector3(x1, 0, z1 + 0.2),
        new THREE.Vector3(x0, h, z0),
        new THREE.Vector3(x1, h, z0),
      ],
      mid,
      { limX: 0.94, limY: 0.9 },
    );
  else {
    const span = Math.min(3.2, (x1 - x0) / 2),
      zs = [Math.min(z0 + 2.0, (z0 + z1) / 2), Math.max(z1 - 2.2, (z0 + z1) / 2)];
    cam.fit(
      aspect,
      [
        new THREE.Vector3(-span, 0, 0),
        new THREE.Vector3(span, 0, 0),
        new THREE.Vector3(0, 0, -2.6),
        new THREE.Vector3(0, 1.2, 2.2),
      ],
      new THREE.Vector3(0, 0, 0),
      { follow: true, clamp: [x0 + span - 0.6, x1 - span + 0.6, ...zs], lead: -0.6 },
    );
  }
}

// a room's save and restore: where Eric stands, back on free floor (or at `start`) if the room has changed since
export function roomSave(game, nav, start, cam) {
  return {
    snapshot: () => ({ player: snapshotPeople({ eric: game.player }) }),
    restore(saved) {
      if (!saved.world?.player) return;
      restorePeople({ eric: game.player }, saved.world.player);
      const p = game.player.root.position;
      if (!nav.free(p.x, p.z)) p.set(start[0], p.y, start[1]);
      game.walker.sync();
      cam.snap(game.player.root.position);
    },
  };
}
