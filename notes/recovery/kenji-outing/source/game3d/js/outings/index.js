import { flags } from '../narrative/state.js';
import { flagKeys } from '../narrative/engine-flags.js';
import { sim, save } from '../sim.js';
import { isWeekend } from '../places/ongoing/calendar.js';
import { restorePeople } from '../places/saved-people.js';
import { walkRig, freeNear, bodies } from '../move.js';
import { clubs } from '../clubs/index.js';
import { outingParting } from './parting.js';
import { outingStops } from './stops.js';
import { OUTING_PLACES } from './catalog.js';
import { outingActor } from './actor.js';
import { createOutingFollower } from './follow.js';
import { attachOutingPlace, restoreOutingPlayer } from './attachment.js';
import { cancelOutingSeats } from './seating.js';
import { standPose } from '../crowd/motion.js';
import * as model from './model.js';

const KEYS = flagKeys('game3d/js/outings/index.js');
export function installOuting(game, { refreshMarkers = () => {} } = {}) {
  if (game.outing) return;
  const actor = outingActor(game);
  const parting = outingParting(game, actor, {
    read: () => stage().parting,
    write: (value) => {
      setStage({ ...stage(), parting: value });
      save(game);
    },
  });
  let tripMode = false,
    action = false,
    epoch = 0;
  const state = () => model.readOuting(flags[KEYS.outing_kenji]);
  const stage = () => flags[KEYS.outing_stage] || {};
  const syncPresentation = () => {
    if (!flags[KEYS.outing_kenji]) return;
    const active = state().status === 'active';
    flags[KEYS.outing_waiting] = active && !!stage().waiting;
    flags[KEYS.outing_seated] = active && !!game.player.seated && !!actor.rig.seated;
  };
  const goal = (text = '') => {
    if (text || game.ui?.sideText === flags[KEYS.outing_goal]) game.ui?.sideGoal(text);
    flags[KEYS.outing_goal] = text;
  };
  const setStage = (value) => {
    flags[KEYS.outing_stage] = value;
    syncPresentation();
  };
  const write = (value) => {
    flags[KEYS.outing_kenji] = value;
    flags[KEYS.outing_active] = value.status === 'active';
    flags[KEYS.outing_paused] = value.status === 'paused';
    flags[KEYS.outing_callback] = value.callback || '';
    flags[KEYS.outing_done_arcade] = value.stops.includes('arcade');
    flags[KEYS.outing_done_drink] = value.stops.includes('drink');
    flags[KEYS.outing_done_coast] = value.stops.includes('coast');
    if (value.status !== 'active') goal();
    syncPresentation();
    return value;
  };
  const follower = createOutingFollower(game, {
    person: actor.rig,
    enabled: () => api.accompanies(game.place?.name),
    allowBusy: () => tripMode,
    blocked: () => action || !!stage().waiting || !!stage().parting || (!tripMode && !!game.transition),
  });
  function context() {
    const resident = actor.current() === game.place ? actor.rig : actor.resident(game.place);
    return {
      day: sim.day,
      period: sim.period,
      weekend: isWeekend(sim.day),
      met: sim.met.has('kenji'),
      visible: !!resident?.root.visible,
      available:
        OUTING_PLACES.has(game.place?.name) &&
        !clubs
          .ids()
          .some(
            (id) =>
              clubs.members(id, game.cast).includes('kenji') && clubs.meetingOn(id, sim.day)?.period === sim.period,
          ),
    };
  }
  function besidePlayer() {
    const P = game.place,
      p = game.player.root.position,
      r = actor.rig;
    const scale = P.charScale || 1,
      angle = game.player.root.rotation.y;
    const near = freeNear(
      P.nav,
      bodies(game).filter((b) => b.root !== r.root),
      p.x - Math.sin(angle) * 1.2 * scale,
      p.z - Math.cos(angle) * 1.2 * scale,
      0.3 * scale,
    );
    r.root.position.set(near[0], P.floorY || 0, near[1]);
    r.root.rotation.y = angle;
    r.seated = false;
    r.seatOut = null;
    standPose(r);
  }
  function cancelActions() {
    epoch++;
    action = false;
    follower.pause();
    stop.cancel();
    parting.cancel();
    cancelOutingSeats(game);
  }
  function release() {
    cancelActions();
    actor.release();
    if (game.place) refreshMarkers(game.place);
  }
  function pause() {
    write(model.pauseOuting(state()));
    release();
    save(game);
  }
  const stop = outingStops(game, {
    actor,
    state,
    stage,
    setStage,
    write,
    begin() {
      const token = ++epoch;
      follower.pause();
      action = true;
      return token;
    },
    valid: (token) => token === epoch && state().status === 'active',
    end() {
      action = false;
      save(game);
    },
  });
  const api = (game.outing = {
    actor,
    state,
    goal,
    controls: (who) =>
      who === 'kenji' && actor.current() === game.place && (state().status === 'active' || !!game.transition),
    accompanies: (name) => state().status === 'active' && OUTING_PLACES.has(name),
    invite() {
      const next = model.inviteOuting(state(), context());
      if (next.status !== 'active' || state().status === 'active') return false;
      write(next);
      setStage({});
      actor.activate(game.place);
      refreshMarkers(game.place);
      save(game);
      return true;
    },
    resume() {
      const next = model.resumeOuting(state(), context());
      if (next.status !== 'active') return false;
      write(model.cancelStop(next));
      setStage({});
      actor.activate(game.place);
      refreshMarkers(game.place);
      save(game);
      return true;
    },
    pause,
    async finish() {
      const pendingParting = stage().parting;
      api.keepWalking();
      if (pendingParting) setStage({ parting: pendingParting });
      const token = ++epoch;
      action = true;
      const valid = () => token === epoch;
      const departed = await parting.walk(valid);
      if (!valid()) return false;
      action = false;
      if (!departed) return false;
      write(model.finishOuting(state()));
      setStage({});
      release();
      save(game);
    },
    stop,
    keepWalking() {
      cancelActions();
      game.standUp?.();
      const r = actor.rig;
      if (r.seated) {
        r.seated = false;
        r.root.position.y = game.place.floorY || 0;
        if (r.seatOut) {
          r.root.position.x = r.seatOut[0];
          r.root.position.z = r.seatOut[1];
        }
        r.seatOut = null;
        standPose(r);
      }
      write(model.cancelStop(state()));
      setStage({});
      save(game);
    },
    syncClock() {
      const s = state();
      if (s.status === 'active' && (s.day !== sim.day || s.period !== sim.period)) pause();
    },
    enter(P, { resuming = false } = {}) {
      api.syncClock();
      if (!api.accompanies(P.name)) {
        follower.pause();
        actor.release();
        return;
      }
      actor.activate(P);
      if (stage().waiting && P.name === 'shotengai') restorePeople({ kenji: actor.rig }, stage().people);
      else if (!resuming) besidePlayer();
    },
    async beforeTravel({ from, to, arriving }) {
      api.syncClock();
      if (state().status !== 'active') return;
      if (to === 'konbini' && from === 'shotengai') {
        if (!stage().waiting) {
          api.keepWalking();
          if (!(await stop('drink'))) pause();
        }
        return;
      }
      if (!OUTING_PLACES.has(to)) {
        write(model.pauseOuting(state()));
        cancelActions();
        // Keep him in the departure frame; entry to the next place releases his rig.
        save(game);
        return;
      }
      if (!arriving && !stage().waiting) api.keepWalking();
    },
    async afterTravel() {
      if (!api.accompanies(game.place.name)) return;
      if (stage().waiting && game.place.name === 'shotengai') {
        if (stage().collected) write(model.completeStop(state(), 'drink'));
        else write(model.cancelStop(state()));
        setStage({});
      }
      follower.pause();
      save(game);
    },
    async trip(move, arriving) {
      if (stage().waiting) return move();
      tripMode = true;
      follower.pause();
      try {
        const promise = move();
        if (arriving) besidePlayer();
        await promise;
        const p = game.player.root.position,
          r = actor.rig;
        if (Math.hypot(p.x - r.root.position.x, p.z - r.root.position.z) > 1.5 * (game.place.charScale || 1)) {
          follower.pause();
          const q = freeNear(
            game.place.nav,
            bodies(game).filter((b) => b.root !== r.root),
            p.x,
            p.z,
            0.45,
          );
          await walkRig(game, r, q, { speed: 1.4 });
        }
      } finally {
        tripMode = false;
        follower.pause();
      }
    },
    async restored(saved) {
      api.syncClock();
      if (flags[KEYS.outing_kenji]) write(state());
      const leaving = saved.transition && state().status === 'paused' && saved.world?.outing?.place === game.place.name;
      if (!api.accompanies(game.place.name) && !leaving) {
        release();
        restoreOutingPlayer(game, saved);
        return;
      }
      actor.activate(game.place);
      if (saved.world?.outing?.place === game.place.name) {
        actor.restoreHome?.(saved.world.outing.home);
        restorePeople({ kenji: actor.rig }, saved.world.outing.people);
      } else if (stage().waiting) restorePeople({ kenji: actor.rig }, stage().people);
      else besidePlayer();
      restoreOutingPlayer(game, saved);
      follower.pause();
      refreshMarkers(game.place);
      if (stage().parting && state().status === 'active') await api.finish();
    },
    update(P) {
      if (game.place !== P) return;
      api.syncClock();
      syncPresentation();
      const wait = stage();
      if (
        state().status === 'active' &&
        wait.waiting &&
        P.name === 'konbini' &&
        !wait.collected &&
        flags.konbini_phase === 'complete' &&
        flags.konbini_order_id > wait.order &&
        flags.konbini_paid_id === flags.konbini_order_id &&
        flags.konbini_basket?.some((item) => ['milk', 'tea', 'coffee'].includes(item))
      )
        setStage({ ...wait, collected: true });
      if (!api.accompanies(P.name)) return;
      actor.update();
      follower.update();
    },
  });
  game.hooks.outing = async ({ state: command, text }) => {
    flags[KEYS.outing_action_complete] = false;
    if (!['arcade', 'drink', 'coast', 'invite', 'resume', 'pause', 'finish', 'keepWalking', 'goal'].includes(command))
      throw Error(`Unknown outing action: ${command}`);
    const result = ['arcade', 'drink', 'coast'].includes(command) ? await api.stop(command) : await api[command](text);
    flags[KEYS.outing_action_complete] = result !== false;
    save(game);
  };
}
export const attachOuting = (game, P, name) => attachOutingPlace(game, P, name);
