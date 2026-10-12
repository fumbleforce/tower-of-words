// The sixfold hurry button belongs to a scripted wait. A trip can return controls without passing through
// game.beat's finally block, so clear the multiplier before the first free movement frame as well.
export function movementClockScale(game, base, hurry) {
  if (game.hurry && !game.busy) game.setHurry(false);
  return base * (game.busy && game.hurry ? hurry : 1);
}
