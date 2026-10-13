import { benchSeats, before } from '../places/day3/seats.js';
import { bodies, BODY } from '../movement/shared.js';
import { walkRig } from '../movement/scripted.js';
import { benchSit, standPose } from '../crowd/motion.js';
import { cancelSavedWalk } from '../places/saved-people.js';
import { stopGait } from '../movement/gait.js';

const active = new WeakMap();
const near = (a, b, tolerance) => Math.hypot(a[0] - b[0], a[1] - b[1]) <= tolerance;
const yawDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function usableSeats(game, companion, seats) {
  if (!Array.isArray(seats) || seats.length !== 2) return false;
  const P = game.place,
    scale = P.charScale || 1,
    built = benchSeats(P),
    others = bodies(game).filter((b) => b.root !== game.player.root && b.root !== companion.root);
  const [a, b] = seats;
  if (!a || !b) return false;
  const separation = Math.hypot(a.x - b.x, a.z - b.z);
  if (
    separation <= 2 * BODY * scale ||
    separation > 1.8 * scale ||
    Math.abs(yawDifference(a.ry, b.ry)) > 0.05 ||
    Math.abs(a.top - b.top) > 0.03 ||
    Math.abs((a.x - b.x) * Math.sin(a.ry) + (a.z - b.z) * Math.cos(a.ry)) > 0.06 * scale
  )
    return false;
  return seats.every((s) => {
    // Continue coordinates must still refer to actual seats in this place.
    if (
      !built.some(
        (b) =>
          near([b.x, b.z], [s.x, s.z], 0.005) &&
          Math.abs(b.top - s.top) < 0.005 &&
          Math.abs(yawDifference(b.ry, s.ry)) < 0.005,
      )
    )
      return false;
    return others.every((b) => Math.hypot(s.x - b.x, s.z - b.z) > b.r + 0.3 * scale);
  });
}

function seatApproaches(game, companion, seats) {
  const P = game.place,
    scale = P.charScale || 1,
    rigs = [game.player, companion],
    others = bodies(game).filter((b) => !rigs.some((r) => r.root === b.root)),
    mid = [(seats[0].x + seats[1].x) / 2, (seats[0].z + seats[1].z) / 2];
  const candidates = seats.map((s, i) => {
    const right = [Math.cos(s.ry), -Math.sin(s.ry)],
      side = Math.sign((s.x - mid[0]) * right[0] + (s.z - mid[1]) * right[1]),
      p = rigs[i].root.position;
    // Coastal walls can close the floor in front of a bench. Its outer ends remain usable.
    return [
      before(s, 0.85 * scale),
      ...[0.5, 0.65, 0.85].map((d) => [s.x + right[0] * side * d * scale, s.z + right[1] * side * d * scale]),
      before(s, 1.4 * scale),
    ].filter((q) => {
      if (!P.nav.free(...q, P.nav.R) || others.some((b) => Math.hypot(q[0] - b.x, q[1] - b.z) <= b.r + 0.24 * scale))
        return false;
      const path = P.nav.path(p.x, p.z, ...q);
      return path?.length && near(path.at(-1), q, 0.25 * scale);
    });
  });
  for (const a of candidates[0]) for (const b of candidates[1]) if (!near(a, b, 0.5 * scale)) return [a, b];
  return null;
}

export function freeOutingSeats(game, companion) {
  const P = game.place,
    origin = P.spots.terrace_bench || P.start,
    seats = benchSeats(P).sort(
      (a, b) => Math.hypot(a.x - origin[0], a.z - origin[1]) - Math.hypot(b.x - origin[0], b.z - origin[1]),
    );
  for (let i = 0; i < seats.length; i++)
    for (let j = i + 1; j < seats.length; j++) {
      const pair = [seats[i], seats[j]];
      if (usableSeats(game, companion, pair) && seatApproaches(game, companion, pair)) return pair;
    }
  return null;
}

export function cancelOutingSeats(game) {
  const job = active.get(game);
  if (!job) return;
  active.delete(game);
  for (const { rig, token } of job.walks) {
    if (rig.root.userData.walkTok !== token) continue;
    cancelSavedWalk(rig);
    rig.root.userData.walkVel = null;
    rig._noAvoid = false;
    stopGait(rig);
  }
}

export async function sitOutingPair(game, companion, seats, valid, { walk = walkRig } = {}) {
  cancelOutingSeats(game);
  if (!valid() || !usableSeats(game, companion, seats)) return false;
  const P = game.place,
    scale = P.charScale || 1,
    rigs = [game.player, companion];
  game.standUp?.();
  if (companion.seated) {
    const out = companion.seatOut;
    standPose(companion);
    if (out) companion.root.position.set(out[0], P.floorY || 0, out[1]);
    companion.seatOut = null;
  }
  if (rigs.some((r) => r.root.parent !== P.space)) return false;
  const approaches = seatApproaches(game, companion, seats);
  if (!approaches) return false;
  const job = { walks: [] };
  active.set(game, job);
  try {
    await Promise.all(
      rigs.map((rig, i) => {
        const promise = walk(game, rig, approaches[i], { speed: 1.25 * scale, route: true, avoid: true });
        job.walks.push({ rig, token: rig.root.userData.walkTok });
        return promise;
      }),
    );
    if (active.get(game) !== job || !valid() || game.place !== P) return false;
    if (job.walks.some(({ rig, token }) => rig.root.userData.walkTok !== token)) return false;
    if (rigs.some((r, i) => !near([r.root.position.x, r.root.position.z], approaches[i], 0.25 * scale))) return false;
    if (!usableSeats(game, companion, seats)) return false;
    rigs.forEach((r, i) => {
      const s = seats[i];
      benchSit(r, s.x, s.z, s.ry, s.top);
      r.seatOut = [...approaches[i]];
    });
    game.walker.sync();
    active.delete(game);
    return rigs.every((r) => r.seated);
  } finally {
    if (active.get(game) === job) cancelOutingSeats(game);
  }
}
