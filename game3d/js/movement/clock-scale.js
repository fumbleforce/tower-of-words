// The sixfold hurry button belongs to a scripted wait. A trip can return controls without passing through
// game.beat's finally block, so clear the multiplier before the first free movement frame as well.
export function movementClockScale(game, base, hurry) {
  if (game.hurry && !game.busy) game.setHurry(false);
  return base * (game.busy && game.hurry ? hurry : 1);
}

// A new walker can accept input after its entry walk while the crossfade still holds busy=true. Hurry remains
// available to scripted travel, but must never multiply player-controlled movement in that window.
export function playerMovementDt(game, dt, hurry) {
  return game.hurry && !game.player.scripted && !game.walker.path?.scripted ? dt / hurry : dt;
}
