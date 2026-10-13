import { snapshotPeople, restorePeople } from '../places/saved-people.js';
import { OUTING_PLACES } from './catalog.js';

// Bench coordinates deliberately sit inside furniture's walking obstacle. The native place's
// walking-position repair must not replace the actual seated pose with its entrance spawn.
export function restoreOutingPlayer(game, saved) {
  const capsule = saved.world?.outing;
  if (capsule?.place !== game.place.name || !capsule.player?.seated) return;
  restorePeople({ player: game.player }, { player: capsule.player });
  game.walker.sync();
}

export function attachOutingPlace(game, P, name) {
  const outing = game.outing;
  if (!OUTING_PLACES.has(name) && name !== 'konbini') return;
  if (OUTING_PLACES.has(name)) outing.actor.attach(P);
  const update = P.update,
    snapshot = P.snapshotState,
    restore = P.restoreState;
  P.update = function (...args) {
    update?.apply(this, args);
    outing.update(P);
  };
  P.snapshotState = function () {
    const world = snapshot?.call(this) || {};
    const controlled = outing.controls('kenji');
    const pausedSeat = outing.state().status === 'paused' && game.player.seated;
    if (P === game.place && (controlled || pausedSeat))
      world.outing = {
        place: name,
        ...(controlled ? { people: snapshotPeople({ kenji: outing.actor.rig }), home: outing.actor.home() } : {}),
        ...(game.player.seated ? { player: snapshotPeople({ player: game.player }).player } : {}),
      };
    return world;
  };
  P.restoreState = function (saved) {
    restore?.call(this, saved);
    if (saved.world?.outing?.place === name && outing.state().status === 'active') {
      outing.actor.activate(P);
      outing.actor.restoreHome(saved.world.outing.home);
      restorePeople({ kenji: outing.actor.rig }, saved.world.outing.people);
    }
    restoreOutingPlayer(game, saved);
  };
  const wrap = (fn, arriving) =>
    typeof fn !== 'function'
      ? fn
      : async function (...args) {
          if (!outing.accompanies(name)) return fn.apply(this, args);
          return outing.trip(() => fn.apply(this, args), arriving);
        };
  P.tripIn = wrap(P.tripIn, true);
  P.tripOut = wrap(P.tripOut, false);
  for (const key of ['tripInFrom', 'tripOutTo'])
    if (P[key])
      P[key] = Object.fromEntries(Object.entries(P[key]).map(([to, fn]) => [to, wrap(fn, key === 'tripInFrom')]));
}
