// New walkers for the ambient crowd (crowd/index.js): which flow, which lane, where they set off (out of a door, or
// along a street from out of view), at what pace, alone or two together, and how often someone new sets off.
//
//   const L = launcher({ game, g, K, ends, routes, pool, inView, st })   st: { spec, counts, R }, the period's
//   L.launch(fresh, quiet)    a walker (or two); fresh: part way along (on entering); quiet: a scene is playing
//   L.cadence()               the mean gap between new walkers this period
import { laneOf, lineLength, pointAlong } from './paths.js';
import { standPose } from './motion.js';
import { planStop } from './stops.js';

// how fast each walks (place units a second, before the character scale): a range per kind of clothes and of walk
const PACE = {
  office: [1.0, 1.4],
  casual: [0.85, 1.25],
  elder: [0.7, 0.95],
  sport: [0.95, 1.3],
};
const SPEED = { jog: [2.0, 2.6], stroll: [0.65, 0.85] };
// mulberry32 (a small Park-Miller step followed small numbers with more small ones: launches came in clumps)

export function launcher({ game, g, K, ends, routes, pool, inView, st }) {
  const free = () => pool.filter((b) => b.state === 'off');
  // a walker (or two together) for one of the period's flows: from the start of its line (s = 0) or part way along
  // quiet: a scene is playing, so nobody steps out of a door; they only come in from a street's end out of view
  function launch(fresh, quiet = false) {
    const { spec, R } = st;
    const flows = (spec.flows || []).filter((f) => routes.get(f[0] + '>' + f[1]) && !(quiet && ends[f[0]].door));
    const tot = flows.reduce((a, f) => a + f[2], 0);
    for (let tries = 0; tries < 6 && flows.length; tries++) {
      let x = R() * tot,
        f = flows[0];
      for (const fl of flows)
        if ((x -= fl[2]) <= 0) {
          f = fl;
          break;
        }
      const [from, to, , kind = 'walk'] = f;
      const A = ends[from],
        B = ends[to],
        route = routes.get(from + '>' + to);
      const e = game.player.root.position;
      if (A.door && Math.hypot(e.x - A.door[0], e.z - A.door[1]) < 3.5 * K) continue; // not out of a door into him
      // each walker its own lane, right of the line by up to a metre and a half where the way is wide; a second one
      // beside them, further right, walking together
      // (the two within the same metre and a half: the people standing about keep off it)
      const two = kind !== 'jog' && R() < (spec.twos || 0) && free().length >= 2,
        off = (0.15 + R() * (two ? 0.35 : 0.95)) * K;
      const lanes = [laneOf(g, route, off), ...(two ? [laneOf(g, route, off + 0.6 * K)] : [])];
      // a new walker steps out of a door, or comes in along the street from further out than anyone can see (a
      // little further for some, so they don't all turn the corner in step)
      const back = (lane, d) => {
        const [ax, az] = lane[0],
          [bx, bz] = lane[1],
          l = Math.hypot(ax - bx, az - bz) || 1;
        return [ax + ((ax - bx) / l) * d, az + ((az - bz) / l) * d];
      };
      let lead = lanes.map(() => A.door || null);
      if (!fresh && !A.door) {
        const extra = R() * 4,
          d = [0, 3 + extra, 6 + extra, 9 + extra].find((d) => lanes.every((ln) => !inView(...back(ln, d + 0.5 * K))));
        if (d === undefined) continue;
        lead = lanes.map((ln, i) => (d || i ? back(ln, d + i * 0.4 * K) : null));
      }
      const L = lineLength(lanes[0]);
      const s0 = L * (0.08 + R() * 0.84);
      const placed = [];
      for (const [i, lane] of lanes.entries()) {
        const body = pickBody(kind === 'jog');
        if (!body) break;
        const line = [...(lead[i] ? [lead[i]] : []), ...lane, ...(B.door ? [B.door] : [])];
        if (!B.door) {
          // on past the street's end, out of the chunk, until out of view
          const [px, pz] = line[line.length - 2],
            [qx, qz] = line[line.length - 1],
            l = Math.hypot(qx - px, qz - pz) || 1;
          line.push([qx + ((qx - px) / l) * 5, qz + ((qz - pz) / l) * 5]);
        }
        let at = { x: line[0][0], z: line[0][1], leg: 1 };
        if (fresh) {
          at = pointAlong(lane, Math.max(0, s0 - i * 0.4 * K));
          at.leg += lead[i] ? 1 : 0;
          if (!clearOfAll(at.x, at.z, 3.5 * K, i ? 0.5 * K : 1.0 * K)) break;
        } else if (!(i && A.door) && !clearOfAll(at.x, at.z, 0, i ? 0.5 * K : 0.9 * K)) break; // nobody else there yet
        body.r.root.position.set(at.x, 0, at.z);
        placed.push({ body, line, at });
        body.state = 'walk'; // taken (pickBody skips it for the second)
      }
      if (placed.length < lanes.length) {
        for (const { body } of placed) body.state = 'off';
        continue;
      }
      const [lo, hi] = SPEED[kind] || PACE[placed[0].body.kind] || PACE.office;
      const pace = (lo + R() * (hi - lo)) * (placed.length > 1 ? 0.92 : 1) * K;
      for (const [i, { body, line, at }] of placed.entries()) {
        const r = body.r;
        standPose(r);
        r.root.position.set(at.x, 0, at.z);
        const [nx, nz] = line[at.leg];
        r.root.rotation.y = Math.atan2(nx - at.x, nz - at.z);
        // out of a door one after the other: the second a moment later
        const hold = !fresh && i && lead[i] === A.door ? 1.1 + R() * 0.6 : 0;
        r.root.visible = !hold;
        Object.assign(body, {
          hold,
          state: 'walk',
          line,
          i: at.leg,
          kind,
          offA: !!lead[i],
          offZ: true,
          toDoor: !!B.door,
          goal: B.at,
          tail: line.slice(-1), // the door, or the point past the street's end
          more: 0,
          best: Infinity,
          held: 0,
          legAt: -1,
          ghost: false,
          rejoins: 0,
          speed: pace,
          pace,
          ph: R() * 6,
          moved: 0,
          stopped: null,
          mate: i ? null : placed[1]?.body || null,
          lead: i ? placed[0].body : null,
        });
        planStop(body, R, spec.stop || 0, fresh ? L - s0 : L);
      }
      return placed.length;
    }
    return 0;
  }
  function pickBody(sport) {
    const { spec, R } = st;
    const f = free();
    const fit = f.filter((b) => (sport ? b.kind === 'sport' : b.kind !== 'sport' || R() < 0.25));
    const list = fit.length ? fit : sport ? [] : f;
    if (!list.length) return null;
    const w = list.map((b) => (spec.who[b.kind] || 0.3) + 0.05);
    let x = R() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((x -= w[i]) <= 0) return list[i];
    return list[list.length - 1];
  }
  function clearOfAll(x, z, fromEric, fromOthers) {
    const e = game.player.root.position;
    if (Math.hypot(e.x - x, e.z - z) < fromEric) return false;
    return pool.every(
      (b) => b.state === 'off' || Math.hypot(b.r.root.position.x - x, b.r.root.position.z - z) >= fromOthers,
    );
  }

  // the mean gap between new walkers: how long a walk through the place takes, over how many walk at once (a pair
  // sets off as one)
  function cadence() {
    const { spec, counts } = st;
    const flows = (spec.flows || []).filter((f) => routes.get(f[0] + '>' + f[1]));
    const tot = flows.reduce((a, f) => a + f[2], 0);
    if (!tot || !counts.walk) return Infinity;
    let T = 0;
    for (const [a, b, w, kind] of flows) {
      const [lo, hi] = SPEED[kind] || [1, 1.25];
      T += (w / tot) * ((lineLength(routes.get(a + '>' + b)) + 8 * K) / (((lo + hi) / 2) * K));
    }
    T += (spec.stop || 0) * 8;
    // (most leave a little before the end of their line, once out of view)
    return (0.85 * T * (1 + (spec.twos || 0))) / counts.walk;
  }
  return { launch, cadence };
}
