// The gait check (Jørgen, 2026-10-03: "Why are all the animations wrong, people walk on the spot, and slide when they
// move"). startGaitCheck(game) watches everyone in view and records to window.__gaitCheck:
//   on the spot  the feet stepping (moving against the body) while the body stays where it is
//   slide        the body moving faster or slower than its steps carry it: the planted foot (the lower one) moves
//                against the body at the ground speed when the walk is in time, so the ratio of the two is the slide
//                (1 in time; under SLIDE_LO the feet outrun the ground, over SLIDE_HI they lag; no steps at all: glide)
// Each over a window of WIN game seconds; an episode is recorded when it lasts BAD windows in a row, with how long it
// lasted. Everything is in the person's own body units, so the same numbers hold for every place and size.
// game3d/tools/gait-check.mjs (real time) fails on any episode, reports(); the fast test (sped up 8 times) on those
// of 4 windows or more, reports(4). Free walking and synchronous procedural walks are sampled after every simulation step;
// independently animated cast retain their drawn-frame clock. Mixing those clocks mistakes stale poses for sliding.
import * as THREE from 'three';
import { bodies } from './shared.js';

const WIN = 0.6,
  BAD = 2,
  STILL = 0.06, // body units / s: standing
  STEPPING = 0.14, // feet moving against the body faster than this (units / s): stepping
  MOVING = 0.2, // the body moving faster than this: walking, so the steps should keep up
  SLIDE_LO = 0.6,
  SLIDE_HI = 1.6,
  SAT = 1.2; // game s after sitting before they count

const _v = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(),
  _f = new THREE.Frustum(),
  _m = new THREE.Matrix4(),
  _sp = new THREE.Sphere();

const footCache = new WeakMap();

// the two feet (a Meshy rig's foot bones, a code-built person's shoes); null if it has none
function feetOf(r) {
  const c = r.rig?.knees ? r.rig : r;
  const body = r.feet?.length === 2 ? r.feet : r.model || c.knees;
  const cached = footCache.get(r);
  if (cached && cached.body === body) return cached.feet;
  let f = null;
  if (r.feet?.length === 2)
    f = r.feet; // the cat's front paws (creatures/cat.js)
  else if (r.model) {
    const bones = [];
    r.model.traverse((o) => {
      if (o.isBone && /(left|right).*foot$/i.test(o.name.replace(/[^a-z]/gi, ''))) bones.push(o);
    });
    if (bones.length === 2) f = bones;
  } else {
    if (c.knees?.length === 2) f = c.knees.map((k) => k.children[k.children.length - 1]);
  }
  // Clothing can replace the skeleton while keeping the actor and movement root.
  footCache.set(r, { body, feet: f });
  return (r._gaitFeet = f);
}

// where each foot is against the body: in the body's own frame (turning in place moves nothing), in body units
function feetRel(r, feet) {
  r.root.updateWorldMatrix(true, false);
  r.root.getWorldQuaternion(_q).invert();
  r.root.getWorldScale(_s);
  const u = _s.x || 1,
    root = r.root.getWorldPosition(new THREE.Vector3());
  return feet.map((b) => {
    b.updateWorldMatrix(true, false);
    const p = b.getWorldPosition(_v).sub(root);
    const y = p.y / u;
    p.applyQuaternion(_q).divideScalar(u);
    return [p.x, p.z, y];
  });
}

export function startGaitCheck(game) {
  if (window.__gaitCheck) return window.__gaitCheck;
  const C = (window.__gaitCheck = { episodes: [], win: WIN, samples: 0, windows: 0, people: {} });
  // as lines, with how long each lasted
  C.reports = (min = BAD) =>
    C.episodes.filter((e) => e.windows >= min).map((e) => `${e.line} for ${(e.windows * WIN).toFixed(1)} s`);
  const track = new Map();
  C.sample = (clock = 'step') => {
    const P = game.place,
      t = game.t || 0;
    if (!P || !P.space || !P.camera || game.paused) return void track.clear();
    const cam = P.camera;
    _m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _f.setFromProjectionMatrix(_m);
    const list = bodies(game).map((b) => [b.id, b.rig, b.seated]);
    (P.ambient?.pool || []).forEach((b, i) => {
      if (b.state !== 'off' && b.r.root.visible)
        list.push(['amb' + i + (b.r.base ? '-' + b.r.base : ''), b.r, !!b.r.seated]);
    });
    const seen = new Set();
    for (const [id, r, seated] of list) {
      if (!r?.root?.parent || seen.has(r)) continue;
      // Flight has no planted foot. Reset on either clock so landing cannot bridge the hop.
      if (r.air === true) {
        track.delete(r);
        continue;
      }
      // walkPerson's callback moves and poses procedural rigs within main.step.
      // setGait schedules a separate pose update; walkRig and Meshy keep the drawn clock.
      const proceduralStep = typeof r._walk === 'function' && r.knees && !r.selfGait && !r.meshy && !r.setGait;
      const cadence = proceduralStep || (r === game.player && !r.scripted && !r._walk) ? 'step' : 'drawn';
      if (cadence !== clock) {
        seen.add(r);
        continue;
      }
      // Swimming uses an arm-driven water pose, not planted feet. Deleting its old window below
      // makes the next dry step start a fresh measurement; pair collisions remain checked.
      if (r.swimming) continue;
      // sitting, and getting up or down (the legs swing between the poses): not walking
      if (seated || r.state === 'sit') r._gwSat = t;
      if (t - (r._gwSat ?? -9) < SAT) continue;
      const feet = feetOf(r);
      if (!feet) continue;
      // in view: the middle of the body well inside the frame (the crowd's chibis are only drawn, and so only
      // animated, while their own sphere is in view)
      r.root.getWorldPosition(_v);
      r.root.getWorldScale(_s);
      const u = _s.x || 1;
      if (!_f.intersectsSphere(_sp.set(_v.setY(_v.y + 0.5 * u), -0.2 * u))) continue;
      // where they stand on whatever carries them (the train's car moves through the world with everyone in it; the
      // cat rides Eric's chair), in body units
      const k0 = r.root.parent.getWorldScale(_s).x || 1,
        at = [(r.root.position.x * k0) / u, (r.root.position.z * k0) / u];
      seen.add(r);
      const rel = feetRel(r, feet);
      let k = track.get(r);
      // Samples are parent-local. Entering a new carrier or place starts a new
      // measurement frame; neither its coordinate offset nor a new skeleton is a stride.
      if (!k || k.parent !== r.root.parent || k.space !== P.space || k.clock !== clock || k.feet !== feet) {
        track.set(
          r,
          (k = {
            id,
            clock,
            feet,
            t,
            parent: r.root.parent,
            space: P.space,
            at,
            rel,
            w: { t: 0, n: 0, root: 0, anim: 0, rootS: 0, footS: 0 },
            bad: 0,
            ep: null,
          }),
        );
        continue;
      }
      const dt = t - k.t;
      if (dt <= 0) continue;
      k.t = t;
      const w = k.w,
        dRoot = Math.hypot(at[0] - k.at[0], at[1] - k.at[1]);
      // the lower foot, if it was the lower one at the last sample too: the planted one
      const lo = rel[0][2] < rel[1][2] ? 0 : 1,
        loWas = k.rel[0][2] < k.rel[1][2] ? 0 : 1;
      const dFoot = (i) => Math.hypot(rel[i][0] - k.rel[i][0], rel[i][1] - k.rel[i][1]);
      w.t += dt;
      w.n++;
      w.root += dRoot;
      w.anim += (dFoot(0) + dFoot(1)) / 2;
      if (lo === loWas) {
        w.rootS += dRoot;
        w.footS += dFoot(lo);
      }
      k.at = at;
      k.rel = rel;
      C.samples++;
      if (w.t < WIN) continue;
      // a window done: what was it
      C.windows++;
      const vRoot = w.root / w.t,
        vAnim = w.anim / w.t,
        ratio = w.footS > 1e-4 ? w.rootS / w.footS : Infinity;
      let kind = '';
      if (vRoot < STILL && vAnim > STEPPING) kind = 'on the spot';
      else if (vRoot > MOVING && w.rootS > 0) {
        // Only the drawn clock can skip substeps; main.step is bounded to 0.05 s.
        const loose = clock === 'drawn' && w.t / w.n > 0.05 ? 2.5 : 1;
        kind = ratio > SLIDE_HI * loose ? 'slide' : ratio < SLIDE_LO / loose ? 'slide (feet too fast)' : '';
      }
      const ps = (C.people[id] ||= {
        windows: 0,
        bad: 0,
        walking: 0,
        ratio: [],
      });
      ps.windows++;
      if (vRoot > MOVING) {
        ps.walking++;
        if (Number.isFinite(ratio)) ps.ratio.push(+ratio.toFixed(2));
      }
      if (kind) ps.bad++;
      k.bad = kind ? k.bad + 1 : 0;
      if (kind && k.bad >= BAD) {
        // one episode while it lasts: how long (windows) and what it looked like when it started
        if (k.ep?.kind === kind) k.ep.windows = k.bad;
        else if (C.episodes.length < 80)
          C.episodes.push(
            (k.ep = {
              kind,
              windows: k.bad,
              line: `${P.name}: ${id} ${kind} at t=${t.toFixed(1)}${game.busy ? ' (scene)' : ''}: body ${vRoot.toFixed(2)}/s, steps ${vAnim.toFixed(2)}/s, ratio ${Number.isFinite(ratio) ? ratio.toFixed(2) : 'no steps'}, state ${r.state || (r.meshy ? '?' : 'code')}${r._walk ? ' walking' : ''}${r._gait ? ` gait ${r._gait.on ? 'on' : 'off'} ${r._gait.amt.toFixed(2)}` : ''}`,
            }),
          );
      } else if (!kind) k.ep = null;
      k.w = { t: 0, n: 0, root: 0, anim: 0, rootS: 0, footS: 0 };
    }
    for (const r of [...track.keys()]) if (!seen.has(r)) track.delete(r);
  };
  const drawn = () => {
    requestAnimationFrame(drawn);
    C.sample('drawn');
  };
  requestAnimationFrame(drawn);
  return C;
}
