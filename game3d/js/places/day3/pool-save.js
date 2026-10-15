import { snapshotPeople, restorePeople } from '../saved-people.js';

// Water and benches are deliberately outside the walking grid; restore their physical pose before navigation.
export function poolSave(game, place, club) {
  return {
    snapshot: () => ({
      player: snapshotPeople({ eric: game.player }),
      people: snapshotPeople(place.people || {}),
      swim: club.snapshot(),
    }),
    restore(saved) {
      if (!saved.world?.player?.eric) return;
      club.restoreOutfits?.(saved.world.swim);
      const player = game.player;
      restorePeople({ eric: player }, saved.world.player);
      restorePeople(place.people || {}, saved.world.people);
      club.restore(saved.world.swim);
      const p = player.root.position;
      if (!club.playerInWater()) {
        const wasSeated = player.seated;
        const seat = player.seated && Object.values(place.seats).find((s) => Math.hypot(p.x - s.x, p.z - s.z) < 0.08);
        player.scripted = false;
        if (seat && place.nav.free(...seat.out)) {
          player.sitAt(seat.x, seat.top, seat.z, seat.ry);
          player.seated = true;
          player.seatOut = [...seat.out];
        } else {
          player.seated = false;
          player.seatOut = null;
          player.setState('idle');
          const savedY = p.y;
          p.y = 0;
          // Near a locker the planner's padded proxy can reject real clear floor.
          // Use the same supported capsule check as Continue, only inside this pavilion.
          const b = place.changing?.bounds;
          const physical =
            !wasSeated &&
            Number.isFinite(savedY) &&
            savedY >= (place.floorY ?? 0) &&
            b &&
            p.x >= b[0] &&
            p.x <= b[1] &&
            p.z >= b[2] &&
            p.z <= b[3] &&
            place.nav.clearance(p.x, p.z) > 0 &&
            !place.nav.free(p.x, p.z) &&
            game.jump?.restoreSurface({ x: p.x, z: p.z, y: savedY });
          if (!place.nav.free(p.x, p.z) && !physical) p.set(place.start[0], 0, place.start[1]);
        }
      }
      game.walker.sync();
      place.cam.snap(p);
    },
  };
}
