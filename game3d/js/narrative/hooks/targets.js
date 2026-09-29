export const isPlayer = (id) => id === 'eric' || id === 'player';
export function createTargets(game) {
  function rigOf(id) {
    return isPlayer(id) ? null : game.place.people[id];
  }
  function posOf(to) {
    if (Array.isArray(to)) return to;
    const P = game.place;
    if (P.spots[to]) return P.spots[to];
    if (isPlayer(to)) return [game.player.root.position.x, game.player.root.position.z];
    if (P.people[to]) {
      const p = P.people[to].root.position;
      return [p.x, p.z];
    }
    if (P.things[to]) {
      const s = P.things[to].spot?.();
      if (s) return s;
    }
    console.warn('unknown spot', to);
    return null;
  }
  function whoRig(who) {
    return isPlayer(who) ? game.player : rigOf(who);
  }

  return { rigOf, posOf, whoRig, isPlayer };
}
