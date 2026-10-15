// Optional sitting uses the same measured pose as story scenes. Furniture advertises its seat surface before batching.
import { seatInventory, seatExit, seatOccupied, seatVisible, refreshSeat } from './seat-inventory.js';
import { addInteractOptions } from './interact-menu.js';
import { save } from '../sim.js';
import { characterHead, CHARACTER_SCALE } from '../character-scale.js';

export function attachSeating(game, place) {
  const seats = seatInventory(place);
  const authored = new Set(Object.keys(place.things));
  const seatFor = (id) => seats.get(id) || (place.name === 'office' && id === 'my_chair' ? seats.get('my_seat') : null);
  const sittingOn = (s) =>
    game.player.seated && Math.hypot(game.player.root.position.x - s.x, game.player.root.position.z - s.z) < 0.18;
  const current = () => {
    const saved = game.player.freeSeat;
    const seat = saved?.place === place.name && seats.get(saved.id);
    return seat && sittingOn(seat) ? saved : null;
  };
  const reserved = (s) => {
    const bagSeat = place.seats?.ferry_window_seat;
    return (
      place.name === 'ferry_terminal' &&
      bagSeat &&
      !place.things.ferry_window_seat.enabled() &&
      Math.hypot(s.x - bagSeat.x, s.z - bagSeat.z) < 0.6
    );
  };
  const available = (s) => !!refreshSeat(place, s) && seatVisible(s) && !reserved(s) && !seatOccupied(game, place, s);
  const reachable = (s) => available(s) && !!seatExit(place, s);
  // The train's bags and deliberately staged seats retain their existing story actions.
  const protectedSeat = (s) => place.name === 'train' && (s.bag != null || s.props || s.id === 'seat_mio');
  const sit = (id, { restoring = false } = {}) => {
    const s = seats.get(id);
    if (!s || protectedSeat(s) || !available(s)) return false;
    const out = seatExit(place, s);
    if (!out) return false;
    const p = game.player;
    if (!restoring && Math.hypot(p.root.position.x - out[0], p.root.position.z - out[1]) > 1.3) return false;
    game.jump?.reset?.();
    game.walker?.stop();
    p.sitAt(s.x, s.top, s.z, s.ry || 0);
    p.seated = true;
    p.seatOut = out;
    p.freeSeat = { place: place.name, id, out, floor: s.floor };
    game.walker.facing = s.ry || 0;
    game.walker.sync?.();
    if (!restoring) save(game);
    return true;
  };
  const stand = ({ persist = true, saved = current() } = {}) => {
    if (!saved) return false;
    const seat = seats.get(saved.id);
    const out = (seat && seatExit(place, seat)) || saved.out;
    const p = game.player;
    game.jump?.reset?.();
    p.seated = false;
    p.freeSeat = null;
    p.seatOut = null;
    p.setState('idle');
    p.root.position.set(out[0], saved.floor, out[1]);
    game.jump?.restoreSurface?.({ x: out[0], z: out[1], y: saved.floor });
    game.walker.sync?.();
    if (persist) save(game);
    return true;
  };
  place.seating = {
    seats,
    seatFor,
    sit,
    stand,
    available,
    reachable,
    sittingAt: (id) => !!seatFor(id) && sittingOn(seatFor(id)),
  };
  place.seats ||= {};
  for (const [id, s] of seats) {
    if (protectedSeat(s)) continue;
    s.out ||= seatExit(place, s);
    place.seats[id] ||= { x: s.x, z: s.z, top: s.top, ry: s.ry, out: s.out };
    const own = place.things[id];
    const originalAnchor = own?.anchor;
    const anchor = (v) => {
      if (!sittingOn(s) && originalAnchor) return originalAnchor(v);
      if (sittingOn(s)) {
        if (place.characterAnchor) return place.characterAnchor(game.player, v);
        (characterHead(game.player) || game.player.root).getWorldPosition(v);
        v.y += 0.24 * CHARACTER_SCALE * game.player.root.scale.y;
        return v;
      }
      return place.space.localToWorld(v.set(s.x, s.top + 0.25, s.z));
    };
    if (own) {
      own.anchor = anchor;
      own.pinText = () => (sittingOn(s) ? 'Seated' : '');
      continue;
    }
    place.things[id] = {
      label: s.label || 'Chair',
      kind: 'thing',
      verb: 'Sit',
      pin: 'near',
      seatAction: true,
      pinText: (near) => (sittingOn(s) ? 'Stand up' : near ? 'Sit' : ''),
      anchor,
      spot: () => seatExit(place, s),
      face: () => [s.x, s.z],
      fixedSpot: true,
      pickBox: { w: 0.5, h: 0.55, bottom: s.top - 0.1 },
      enabled: () =>
        (!game.player.seated || sittingOn(s)) &&
        reachable(s) &&
        !(place.name === 'office' && id === 'my_seat' && place.things.my_chair?.enabled()),
    };
  }
  addInteractOptions((item, active) => {
    if (active !== game || game.place !== place) return null;
    const s = seatFor(item.id);
    if (!s || protectedSeat(s) || !reachable(s)) return null;
    // The generic target already has Sit as its sole action. Only the seated state needs a different verb.
    if (sittingOn(s))
      return {
        label: 'Stand up',
        run: () => {
          game.player.freeSeat = {
            place: place.name,
            id: s.id,
            out: game.player.seatOut || seatExit(place, s),
            floor: s.floor,
          };
          stand();
        },
      };
    if (authored.has(s.id) && /Sit/i.test(place.things[s.id].verb || '')) return null;
    return { label: 'Sit down', run: () => sit(s.id) };
  });
  const snapshot = place.snapshotState?.bind(place);
  place.snapshotState = () => ({ ...snapshot?.(), freeSeat: current() && { ...current() } });
  const restore = place.restoreState?.bind(place);
  place.restoreState = (saved) => {
    restore?.(saved);
    const sitting = saved.world?.freeSeat;
    if (!sitting || sitting.place !== place.name) return;
    if (!sit(sitting.id, { restoring: true })) {
      stand({ persist: false, saved: sitting });
    }
  };
}
