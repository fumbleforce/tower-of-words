// The welcome is inside the izakaya. Only Kenji waits outside its actual door; Mori's body also
// remains registered here because later-day shopping schedules adopt it through day3Place.
import { dayCast } from './day-cast.js';
import { flags } from '../narrative/state.js';
import { sim } from '../sim.js';
export function shotengaiParty(game, { w, K }) {
  const cast = dayCast(game, { root: w.root, K, ids: ['mori', 'kenji'] });
  const door = w.doors.find((d) => d.id === 'izakaya'),
    wait = [door.step[0] - 0.15, door.step[1] - 0.9];
  // Retain IDs that older checkpoints can reference, but there is no outdoor party marker or food.
  const seats = {
    party_seat: { x: wait[0], z: wait[1], top: 0, ry: 0, out: door.step },
    party_mori: { x: wait[0], z: wait[1], top: 0, ry: 0, out: door.step },
  };
  const spots = { party_group: door.step, party_kenji: wait, party_mio: door.step };
  const arrange = () => {
    if (sim.day !== 2) return;
    cast.hideAll();
    game.mioNpc.root.visible = false;
    if (flags.d2_shift_done && !flags.d2_met_kenji && !flags.d2_party_done) cast.put('kenji', wait, door.step);
  };
  return {
    people: cast.people,
    seats,
    spots,
    anchor: (v) => v.set(wait[0], 0.8, wait[1]),
    thing: (id) =>
      id === 'party_seat' ? { enabled: () => false, spot: () => door.step, face: () => door.local } : cast.thing(id),
    hooks: {
      partySetup: arrange,
      partyFood: () => {
        throw new Error('The department dinner is inside the izakaya');
      },
    },
    install(P) {
      const update = P.update,
        onDay = P.onDay,
        restore = P.restoreState;
      P.update = function (...args) {
        update?.apply(this, args);
        cast.update(args[0]);
      };
      P.onDay = function (...args) {
        onDay?.apply(this, args);
        arrange();
      };
      P.restoreState = function (...args) {
        restore?.apply(this, args);
        arrange();
      };
    },
  };
}
