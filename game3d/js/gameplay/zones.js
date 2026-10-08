// A consumed entry waits until the player leaves. Pending entries keep waiting through scenes and conditions.
export function stepZones(game, consumed) {
  const p = game.player.root.position;
  for (const [zone, inside] of Object.entries(game.place.zones || {})) {
    const occupied = inside(p.x, p.z);
    if (occupied && !consumed.has(zone) && !game.busy && game.runner.has('zone:' + zone)) {
      consumed.add(zone);
      game.runner.trigger('zone:' + zone);
    } else if (!occupied) consumed.delete(zone);
  }
}

export function suppressArrivalZones(game, consumed) {
  const p = game.player.root.position;
  for (const [zone, inside] of Object.entries(game.place.zones || {})) if (inside(p.x, p.z)) consumed.add(zone);
}

export function snapshotZones(game, consumed) {
  return { place: game.place.name, consumed: [...consumed] };
}

export function restoreZones(game, consumed, saved, { legacy = true } = {}) {
  consumed.clear();
  if (saved.place !== game.place.name || saved.pendingStart || saved.transition || saved.ended) return;
  const zones = game.place.zones || {};
  if (Object.hasOwn(saved, 'zones')) {
    if (saved.zones?.place !== game.place.name || !Array.isArray(saved.zones.consumed)) return;
    for (const zone of saved.zones.consumed)
      if (typeof zone === 'string' && Object.hasOwn(zones, zone)) consumed.add(zone);
    return;
  }
  // Older idle forecourt saves have no entry history. Only the exact authored lift landing implies arrival;
  // scenes, queued triggers and every other occupied zone retain their pending behavior.
  if (
    !legacy ||
    !Number.isSafeInteger(saved.day) ||
    saved.day <= 1 ||
    saved.place !== 'forecourt' ||
    saved.runner?.execution ||
    saved.runner?.queued?.length
  )
    return;
  const player = saved.world?.player?.eric,
    out = game.place.liftSite?.out,
    p = game.player.root.position;
  if (!player?.position || player.seated || player.walk || !out || !zones.lift_front?.(p.x, p.z)) return;
  const [x, , z] = player.position;
  if (Math.hypot(x - out[0], z - out[1]) < 1e-6 && Math.hypot(p.x - out[0], p.z - out[1]) < 1e-6)
    consumed.add('lift_front');
}
