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
          p.y = 0;
          if (!place.nav.free(p.x, p.z)) p.set(place.start[0], 0, place.start[1]);
        }
      }
      game.walker.sync();
      place.cam.snap(p);
    },
  };
}
