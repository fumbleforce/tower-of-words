// Place-local state is captured together, after the lifecycle has reset entries for a new place.
export function snapshotPlace(game) {
  return {
    ...(game.place?.snapshotState ? { world: game.place.snapshotState() } : {}),
    ...(game.transition ? { transition: { ...game.transition } } : {}),
    pendingStart: game.pendingStart || null,
    ...(game.snapshotZones ? { zones: game.snapshotZones() } : {}),
  };
}
