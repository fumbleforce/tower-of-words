import { bodies, angDiff } from './shared.js';
import { isPassing, isHard, GIVE, awayFromHome } from './crowd.js';
import { startGaitCheck } from './gait-watch.js';

// ---------- the movement check (fast test) ----------
// startMoveCheck(game): samples every game step (it rides on the player's update) and records to window.__moveCheck:
//   overlap  two characters (not both seated) closer than their two radii (less 0.03) for more than 2.5 s, or deeper
//            than the soft lean (GIVE) for more than 0.4 s (pairs passing through each other in a tight spot are exempt)
//   in furniture  someone standing with their shoulders in a desk, a machine or a wall (nearer to it than FURN of
//            their radius) for more than 1.5 s; people still on the spot they started on (staff behind a counter) are
//            left out, and so are walkers on the way (a doorway is narrower than two bodies), glides (fixed
//            choreography) and the lift ride
//   spin     the player turning faster than 3 rad/s while standing still and not taking turning steps, for > 0.25 s;
//            or anyone else (not seated) turning more than 1.5 full turns one way, or 3 back and forth, within 3 s
//            (Jørgen, 2026-09-30: "Mio was spinning around 20 times in place before she continued the conversation")
// fast.mjs fails the build on any overlap or spin. The gait check (people stepping on the spot or sliding,
// gait-watch.js) runs alongside.
export function startMoveCheck(game) {
  const C = (window.__moveCheck = { overlaps: [], spins: [], steps: 0, notes: [] });
  startGaitCheck(game);
  const pl = game.player;
  if (!pl || pl._checked) return C;
  pl._checked = true;
  const orig = pl.update.bind(pl),
    near = new Map();
  let lastYaw = null,
    lastPos = null,
    spinT = 0;
  pl.update = (dt, ...a) => {
    orig(dt, ...a);
    if (!game.place || dt <= 0) return;
    C.steps++;
    // seated people count too, with their smaller radius (nobody should stand in a lap); two seated neighbours are fine.
    // Everyone visible counts, whatever they're parented to (the lift car, a chair)
    const list = bodies(game);
    const seen = new Set();
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i],
          B = list[j],
          d = Math.hypot(A.x - B.x, A.z - B.z);
        if (A.seated && B.seated) continue;
        // soft collision: a lean into someone standing is fine for a moment (2.5 s), deeper than the lean for 0.4 s is
        // an overlap; two people passing through each other in a tight spot are let through
        if (isPassing(A.root, B.root)) continue;
        const soft = !isHard(A) && !isHard(B),
          deep = d < (A.r + B.r) * (soft ? 1 - GIVE : 1) - 0.03;
        if (d >= A.r + B.r - 0.03) continue;
        const k = A.id + '|' + B.id;
        seen.add(k);
        const t = (near.get(k) || 0) + dt;
        near.set(k, t);
        const lim = deep ? 0.4 : 2.5;
        if (t > lim && t - dt <= lim && C.overlaps.length < 50) {
          const tag = (b) =>
            `${b.id} [${b.x.toFixed(2)}, ${b.z.toFixed(2)}]${b.rig._walk ? ' walking' : ''}${b.rig.scripted ? ' scripted' : ''}${b.rig.state ? ' ' + b.rig.state : ''}`;
          const last = (window.__test && window.__test.log && window.__test.log.slice(-1)[0]) || '';
          C.overlaps.push(
            `${game.place.name}: ${A.id} and ${B.id} ${d.toFixed(2)} apart at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}; ${tag(A)}; ${tag(B)}; last step: ${last}`,
          );
        }
      }
    for (const k of [...near.keys()]) if (!seen.has(k)) near.delete(k);
    furniture(game, C, dt, list);
    npcSpin(game, C, dt, list);
    const o = pl.root,
      w = game.walker;
    if (lastYaw !== null && !pl.seated && lastPos) {
      const dy = Math.abs(angDiff(o.rotation.y, lastYaw)) / dt,
        still = Math.hypot(o.position.x - lastPos[0], o.position.z - lastPos[1]) / dt < 0.05;
      spinT = dy > 3 && still && !(w && w.turning) ? spinT + dt : 0;
      if (spinT > 0.25 && spinT - dt <= 0.25 && C.spins.length < 50)
        C.spins.push(
          `${game.place.name}: Eric turning on the spot at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}`,
        );
    }
    lastYaw = o.rotation.y;
    lastPos = [o.position.x, o.position.z];
  };
  return C;
}

// how much each person (not Eric) has turned over the last SPIN_WINDOW game seconds: a spin is round and round one
// way (net), or a heading flipping back and forth for twice that (total)
const SPIN_WINDOW = 3,
  SPIN_MAX = 1.5 * 2 * Math.PI;
const spinOf = new Map();
function npcSpin(game, C, dt, list) {
  const now = game.t || 0,
    seen = new Set();
  for (const b of list) {
    if (b.seated || (game.player && b.root === game.player.root)) continue;
    seen.add(b.root);
    const yaw = b.root.rotation.y;
    let s = spinOf.get(b.root);
    if (!s) spinOf.set(b.root, (s = { yaw, turns: [], sum: 0, net: 0, flagged: false }));
    const d = angDiff(yaw, s.yaw);
    s.yaw = yaw;
    s.turns.push([now, d]);
    s.sum += Math.abs(d);
    s.net += d;
    while (s.turns.length && s.turns[0][0] < now - SPIN_WINDOW) {
      const [, o] = s.turns.shift();
      s.sum -= Math.abs(o);
      s.net -= o;
    }
    const bad = Math.abs(s.net) > SPIN_MAX || s.sum > 2 * SPIN_MAX;
    if (bad && !s.flagged && C.spins.length < 50) {
      s.flagged = true;
      const turns = (a) => (a / (2 * Math.PI)).toFixed(1);
      C.spins.push(
        `${game.place.name}: ${b.id} turned ${turns(s.sum)} full turns (net ${turns(s.net)}) within ${SPIN_WINDOW} s at [${b.x.toFixed(2)}, ${b.z.toFixed(2)}] t=${now.toFixed(1)}${game.busy ? ' (scene)' : ''}${b.rig._walk ? ' walking' : ''}`,
      );
    }
    if (!bad) s.flagged = false;
  }
  for (const k of [...spinOf.keys()]) if (!seen.has(k)) spinOf.delete(k);
}

const FURN = 0.7;
const furnT = new Map();
function furniture(game, C, dt, list) {
  const P = game.place,
    nav = P.nav;
  // (not during a lift ride, where the car's spots are set by the ride and the car stands in the lift's blocker)
  if (!nav || !nav.clearance || (window.__lift && window.__lift.ride && window.__lift.ride.on)) return;
  const seen = new Set();
  for (const b of list) {
    if (b.seated || b.id === 'tama' || b.rig._noAvoid || b.rig._walk || b.root.parent !== P.space) continue;
    if (b.x < nav.x0 || b.x > nav.x1 || b.z < nav.z0 || b.z > nav.z1) continue; // parked off the walk grid by a scene
    const w = game.walker;
    if (game.player && b.root === game.player.root && w && (w.moving || w.path)) continue;
    if (!awayFromHome(P, b)) continue;
    const c = nav.clearance(b.x, b.z);
    if (c >= b.r * FURN) continue;
    seen.add(b.id);
    const t = (furnT.get(b.id) || 0) + dt;
    furnT.set(b.id, t);
    if (t > 1.5 && t - dt <= 1.5 && C.overlaps.length < 50)
      C.overlaps.push(
        `${P.name}: ${b.id} in the furniture at [${b.x.toFixed(2)}, ${b.z.toFixed(2)}] (${c.toFixed(2)} from it) at t=${(game.t || 0).toFixed(1)}${game.busy ? ' (scene)' : ''}`,
      );
  }
  for (const k of [...furnT.keys()]) if (!seen.has(k)) furnT.delete(k);
}
