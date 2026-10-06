// Phone overview is an explicit player choice in camera-plan-1, not a reduced follow mode.
export function followAvailable({ width, height, coarse = false, pointerLock = true }) {
  return pointerLock && !coarse && width >= 700 && height >= 600 && width / height >= 0.8;
}

export function followAllowed(game, desktop) {
  return !!(
    desktop &&
    game.place &&
    game.player &&
    game.saveEnabled &&
    !game.busy &&
    !game.paused &&
    !game.mapOpen &&
    !game.saying &&
    !game.transition &&
    !game.player.scripted &&
    !game.place.cam?.close &&
    !game.place.cam?.releasing &&
    !game.ui.talking &&
    game.ui.menuClosed()
  );
}
