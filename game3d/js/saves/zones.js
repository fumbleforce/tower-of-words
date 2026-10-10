// Explicit goal destinations belong to the current place and disappear with the goal.
export function snapshotGoalDestination(game) {
  const destination = game.goalDestination;
  if (!destination || !game.ui?.goalText || destination.place !== game.place?.name) return null;
  return { ...destination, at: Array.isArray(destination.at) ? [...destination.at] : destination.at };
}

export function restoreGoal(game, saved) {
  const destination = saved.goalDestination;
  game.hooks.goal({
    text: saved.ui?.goal || '',
    at: destination?.place === game.place.name ? destination.at : null,
  });
}

// Place-local state is captured together, after the lifecycle has reset entries for a new place.
export function snapshotPlace(game) {
  return {
    ...(game.place?.snapshotState ? { world: game.place.snapshotState() } : {}),
    ...(game.transition ? { transition: { ...game.transition } } : {}),
    goalDestination: snapshotGoalDestination(game),
    pendingStart: game.pendingStart || null,
    ...(game.snapshotZones ? { zones: game.snapshotZones() } : {}),
  };
}
