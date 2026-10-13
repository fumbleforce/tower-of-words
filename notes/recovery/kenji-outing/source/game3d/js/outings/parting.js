import { walkRig, glide } from '../move.js';
import { cancelSavedWalk } from '../places/saved-people.js';
import { stopGait } from '../movement/gait.js';

// Reuse the place's real departure lane and edge, or return to a visible local activity.
export function outingParting(game, actor, { read = () => null, write = () => {} } = {}) {
  let owned = null;
  const cancel = () => {
    if (owned && owned.rig.root.userData.walkTok === owned.token) {
      cancelSavedWalk(owned.rig);
      stopGait(owned.rig);
    }
    owned = null;
  };
  async function walk(valid) {
    cancel();
    if (actor.current() !== game.place) return true;
    const P = game.place,
      rig = actor.rig,
      home = actor.home();
    let plan = read();
    if (plan?.place !== P.name) {
      const lane = home?.visible
        ? home.approach || home.seatOut || [home.position[0], home.position[2]]
        : P.outingExit?.lane;
      if (!lane) return false;
      plan = { place: P.name, lane: [...lane], edge: home?.visible ? null : [...P.outingExit.edge], phase: 'lane' };
      write(plan);
    }
    const { lane } = plan;
    const arrived = (q) =>
      Math.hypot(rig.root.position.x - q[0], rig.root.position.z - q[1]) < 0.35 * (P.charScale || 1);
    const pending = plan.phase === 'lane' ? walkRig(game, rig, lane) : Promise.resolve();
    const job = (owned = { rig, token: rig.root.userData.walkTok });
    await pending;
    if (owned !== job || !valid() || game.place !== P || (plan.phase === 'lane' && !arrived(lane))) return false;
    if (plan.edge) {
      write({ ...plan, phase: 'edge' });
      const last = glide(game, rig.root, plan.edge, 1.1);
      job.token = rig.root.userData.walkTok;
      await last;
      if (owned !== job || !valid() || game.place !== P || !arrived(plan.edge)) return false;
    }
    if (owned === job) owned = null;
    return true;
  }
  return { walk, cancel };
}
