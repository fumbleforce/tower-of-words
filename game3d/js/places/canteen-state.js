import { snapshotPeople, restorePeople } from './saved-people.js';

// Dining chairs deliberately block navigation. A valid saved sitter belongs on the chair, not at the door.
export function canteenSave(game, nav, start, cam, seats) {
  return {
    snapshot: () => ({ player: snapshotPeople({ eric: game.player }) }),
    restore(saved) {
      const data = saved.world?.player;
      if (!data?.eric) return;
      const player = game.player;
      restorePeople({ eric: player }, data);
      const p = player.root.position;
      const seat = data.eric.seated && Object.values(seats).find((s) => Math.hypot(p.x - s.x, p.z - s.z) < 0.08);
      if (seat && nav.free(...seat.out)) {
        player.sitAt(seat.x, seat.top, seat.z, seat.ry);
        player.seated = true;
        player.seatOut = [...seat.out];
      } else {
        // A chair removed by a future layout change must never leave a sitting pose floating on free floor.
        player.seated = false;
        player.seatOut = null;
        player.setState('idle');
        p.y = 0;
        if (!nav.free(p.x, p.z)) p.set(start[0], 0, start[1]);
      }
      game.walker.sync();
      cam.snap(p);
    },
  };
}
