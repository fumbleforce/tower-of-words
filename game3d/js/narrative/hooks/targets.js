export const isPlayer = (id) => id === 'eric' || id === 'player';
export function createTargets(game) {
  function rigOf(id) {
    // `extras`: background people a place lets the story look at and gesture with, but not walk (lobby.js)
    return isPlayer(id) ? null : game.place.people[id] || game.place.extras?.[id];
  }
  function posOf(to) {
    if (Array.isArray(to)) return to;
    const P = game.place;
    if (P.spots[to]) return P.spots[to];
    if (isPlayer(to)) return [game.player.root.position.x, game.player.root.position.z];
    if (P.people[to] || P.extras?.[to]) {
      const p = (P.people[to] || P.extras[to]).root.position;
      return [p.x, p.z];
    }
    if (P.things[to]) {
      const s = P.things[to].spot?.();
      if (s) return s;
    }
    console.warn('unknown spot', to);
    return null;
  }
  // where to look or point at: like posOf, but a seat is the seat itself and a thing is the thing (its face point),
  // not the floor spot Eric walks to for it
  function aimOf(to) {
    const P = game.place;
    const s = typeof to === 'string' && P.seats?.[to];
    if (s) return [s.x, s.z];
    const f = typeof to === 'string' && !P.spots[to] && !P.people[to] && P.things?.[to]?.face?.();
    return f || posOf(to);
  }
  function whoRig(who) {
    return isPlayer(who) ? game.player : rigOf(who);
  }

  return { rigOf, posOf, aimOf, whoRig, isPlayer };
}
