// A discovered B2 fast route arrives on the landing, without starting a lift ride.
// The transition is saved by lifecycle.js, so Continue takes this same path.
export function fastLiftArrival(game, place) {
  const trip = game.transition;
  if (
    !trip?.fast ||
    !((trip.from === 'forecourt' && place.name === 'office') || (trip.from === 'office' && place.name === 'forecourt'))
  )
    return false;
  const at = place.name === 'office' ? place.spots.lift_out : place.liftSite.out;
  if (!at || !place.nav.free(...at)) throw Error('Fast travel needs a free lift landing');
  const player = game.player;
  player.root.position.set(at[0], place.floorY || 0, at[1]);
  player.root.rotation.y = 0;
  player.seated = false;
  player.seatOut = null;
  player.scripted = false;
  player.setState('idle');
  game.walker.facing = 0;
  game.walker.sync();
  game.liftFloor = place.name === 'office' ? 'B2' : '1';
  place.cam.release?.();
  place.cam.snap(player.root.position);
  return true;
}
