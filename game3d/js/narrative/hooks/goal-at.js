import { travelOf } from '../../gameplay/pin-kinds.js';
// The goal hook's `at` ({ do: 'goal', text: 'Sit by the lunchbox.', at: 'seat_far_r' }): the goal's teal pin over
// that place, until the next goal replaces it or the place changes. Nothing is drawn on the floor (Jørgen,
// docs/game/controls-and-ui.md, Markers): the pin is the mark, as for any goal. A thing or person with its own pin
// just becomes the goal; a seat, spot or [x, z] gets a pin of its own, and tapping it walks Eric there (the floor in
// front of a seat, where he steps to sit: the train's free_seat zone takes it from there).
// A thing with `goalElse: <id>` hands the goal to that other thing while it can't be used itself (his flat's door
// while he's on another floor of the dorm: the stairs back down, places/dorms.js).
export function goalAt(game, posOf) {
  let pin = null,
    forced = null,
    stand = null;
  const clear = () => {
    if (pin) {
      pin.el.remove();
      const i = game.markers.list.indexOf(pin);
      if (i >= 0) game.markers.list.splice(i, 1);
    }
    if (forced) forced.goal = forced.goal0;
    if (stand) stand.goal = stand.goal0;
    pin = forced = stand = null;
  };
  return (at) => {
    clear();
    const P = game.place;
    if (!at || !P) return;
    const own = typeof at === 'string' && game.markers.list.find((m) => m.id === at);
    if (own) {
      own.goal0 = own.goal;
      own.goal = () => true;
      forced = own;
      const other = own.goalElse && game.markers.list.find((m) => m.id === own.goalElse);
      if (other) {
        const was = (other.goal0 = other.goal);
        other.goal = () => !own.enabled() || was();
        stand = other;
      }
      return;
    }
    const s = typeof at === 'string' ? P.seats?.[at] : null;
    const p = s ? s.out || [s.x, s.z + (s.ry ? -0.55 : 0.55)] : posOf(at);
    if (!p) return;
    const y = (P.floorY || 0) + (s ? (s.top || 0.3) + 0.35 : 0.5);
    pin = game.markers.add({
      id: 'goal_at',
      kind: 'thing small',
      label: s ? 'Free seat' : 'Here',
      verb: 'Walk to',
      // a spot to walk to: its own symbol and tooltip (gameplay/pin-kinds.js)
      travel: travelOf(null, 'goal_at', { verb: 'Walk to', tip: s ? 'Walk to the free seat' : 'Walk here' }),
      anchor: (v) => P.space.localToWorld(v.set(s ? s.x : p[0], y, s ? s.z : p[1])),
      spot: () => p,
      enabled: () => game.place === P,
      goal: () => true,
      act: () => {},
    });
  };
}
