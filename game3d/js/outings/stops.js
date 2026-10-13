import { flags } from '../narrative/state.js';
import { save } from '../sim.js';
import { snapshotPeople } from '../places/saved-people.js';
import { walkRig, freeNear, bodies, faceRig } from '../move.js';
import { clearOf } from '../movement/navigation.js';
import { cancelSavedWalk } from '../places/saved-people.js';
import { stopGait } from '../movement/gait.js';
import { freeOutingSeats, sitOutingPair } from './seating.js';
import { beginStop, cancelStop, completeStop } from './model.js';

// Failed/cancelled movement leaves an unfinished stop available to retry.
export function outingStops(game, control) {
  const { actor, state, stage, setStage, write } = control;
  const walks = new Map();
  let playerHold = null;
  const releasePlayer = (hold) => {
    if (!hold || playerHold !== hold) return;
    playerHold = null;
    // A later scene may have taken scripted ownership while our walk was cancelled.
    if (hold.player.scripted !== hold) return;
    hold.player.scripted = false;
    if (game.player === hold.player && game.place === hold.place && game.walker === hold.walker) {
      hold.walker.sync();
      if (hold.face) hold.walker.faceTo(...hold.face);
    }
  };
  const walk = async (rig, to) => {
    const pending = walkRig(game, rig, to);
    const token = rig.root.userData.walkTok;
    walks.set(rig, token);
    try {
      await pending;
    } finally {
      if (walks.get(rig) === token) walks.delete(rig);
    }
  };
  const stop = async function (which) {
    const P = game.place,
      scale = P.charScale || 1;
    if (state().status !== 'active') return false;
    if (which === 'coast' ? P.name !== 'east_coast' : P.name !== 'shotengai') return false;
    if (which === 'arcade' && (game.player.scripted || game.player._walk || game.walker.path?.scripted)) return false;
    const repeatStop = state().stops.includes(which) && !state().pending;
    const next = beginStop(state(), which);
    if (next.pending !== which && !repeatStop) return false;
    write(next);
    const token = control.begin(),
      valid = () => control.valid(token) && game.place === P;
    let hold = null,
      succeeded = false;
    const arrived = (rig, to) => Math.hypot(rig.root.position.x - to[0], rig.root.position.z - to[1]) < 0.3 * scale;
    const destination = (rig, desired) => {
      const others = bodies(game).filter((b) => b.root !== rig.root);
      const q = freeNear(P.nav, others, ...desired, 0.3 * scale);
      return P.nav.free(...q, P.nav.R) && clearOf(others, ...q, 0.3 * scale) ? q : null;
    };
    try {
      if (which === 'drink') {
        const door = P.things.store.spot();
        const to = destination(actor.rig, [door[0] - 0.9 * scale, door[1] + 0.7 * scale]);
        if (!to) return false;
        await walk(actor.rig, to);
        if (!valid() || !arrived(actor.rig, to)) return false;
        setStage({
          waiting: true,
          place: P.name,
          people: snapshotPeople({ kenji: actor.rig }),
          order: flags.konbini_order_id || 0,
        });
        succeeded = true;
        return true;
      }
      if (which === 'arcade') {
        const frontage = P.things.game_centre,
          step = frontage.spot(),
          face = frontage.face(),
          dx = step[0] - face[0],
          dz = step[1] - face[1],
          length = Math.hypot(dx, dz);
        if (length < 0.01) return false;
        const gap = (0.8 * scale) / length;
        // Look from the aisle, clear of the door's projecting awning and sign.
        const to = destination(game.player, [step[0] + dx * gap, step[1] + dz * gap]);
        if (!to) return false;
        game.standUp?.();
        game.walker.stop();
        // Keep autonomous give-way movement out of both routed placements.
        // The truthy owner also lets cancellation preserve a newer scene's hold.
        hold = playerHold = { player: game.player, walker: game.walker, place: P };
        game.player.scripted = hold;
        await walk(game.player, to);
        if (!valid() || !arrived(game.player, to)) return false;
        const beside = destination(actor.rig, [to[0] + dz * gap, to[1] - dx * gap]);
        if (!beside) return false;
        await walk(actor.rig, beside);
        const paired = () =>
          valid() && game.player.scripted === hold && arrived(game.player, to) && arrived(actor.rig, beside);
        if (!paired()) return false;
        await Promise.all([game.player, actor.rig].map((rig) => faceRig(game, rig, frontage.face())));
        if (!paired()) return false;
        hold.face = frontage.face();
      } else if (which === 'coast') {
        const seats = stage().seats || freeOutingSeats(game, actor.rig);
        if (!seats) return false;
        setStage({ place: P.name, seats });
        save(game);
        if (!(await sitOutingPair(game, actor.rig, seats, valid))) return false;
      } else return false;
      if (!valid()) return false;
      write(completeStop(state(), which));
      succeeded = true;
      return true;
    } finally {
      releasePlayer(hold);
      if (valid()) {
        if (!succeeded) {
          write(cancelStop(state()));
          setStage({});
        }
        control.end();
      }
    }
  };
  stop.cancel = () => {
    releasePlayer(playerHold);
    for (const [rig, token] of walks)
      if (rig.root.userData.walkTok === token) {
        cancelSavedWalk(rig);
        stopGait(rig);
      }
    walks.clear();
  };
  return stop;
}
