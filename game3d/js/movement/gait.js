import * as THREE from 'three';
import { walkPose } from '../train/people.js';

// Gait (feel agent): the walk clip timed to the ground speed, so the feet move at the speed the body does.
// setGait(v, { run }): v is the ground speed in the rig's own units / s (null: off, the walk plays at update's speed
// argument). Hurrying is a brisk walk: the walk clip plays faster, up to BRISK times its own pace, and past that the
// stride lengthens. The run clip only comes in when the caller asks for it (`run: true`: a story walk that says so,
// and the player running Eric); then walk and run blend by speed between walkV and runV (Jørgen, 2026-09-30: Mio
// ran off the train where she should walk). Both play on one shared phase that advances with the distance covered:
// the cycle length is the blend of the two clips' strides. Measured on the clips (tools/feel stride probe): Eric
// walk 0.44 / run 1.1 units per s at time scale 1, run's left foot 0.03 of a cycle later; Mio 0.47 / 0.77, 0.04.
// With `root` (meshyGait) the speed is the one the root really moves at, whatever set() was told: a scene that sets
// 'walk' and moves them, or forgets to stop the walk, still steps in time; and in 'walk' without moving for STILL s
// they stand (`idle`), so nobody steps on the spot.
export const BRISK = 2.6;
const STILL = 0.7; // longer than stepGait takes to stand them, so the two never take turns
export function makeGait(actions, { walkV, runV, runOff = 0 }, { root, idle } = {}) {
  const W = actions.walk,
    R = actions.run,
    WD = W.getClip().duration,
    RD = R.getClip().duration;
  let v = null,
    run = false,
    phase = 0,
    runW = 0,
    runOn = false,
    at = null,
    still = 0,
    stillT = 0;
  return {
    set(x, opts) {
      v = x == null ? null : Math.max(0, x);
      run = !!opts?.run;
    },
    // call before mixer.update; `state` is the rig's current state
    step(dt, state, speedArg) {
      if (root && dt > 0) {
        const p = root.position,
          d = at ? Math.hypot(p.x - at.x, p.z - at.z) : 0;
        (at ||= new THREE.Vector3()).copy(p);
        // a scene's jump is not a stride; and smoothed a little, as whoever moves them may do it once a frame
        // while the game takes several steps (a sped-up game)
        const vNow = d > 0.8 * (root.scale.x || 1) ? 0 : d / dt / (root.scale.x || 1);
        v = (v ?? vNow) + (vNow - (v ?? vNow)) * Math.min(1, dt / 0.15);
        // standing still for STILL s of game time and of real time (a sped-up game moves people once a frame, which
        // can be longer than that in game time)
        const now = performance.now() / 1000;
        if (state !== 'walk' || vNow > 0.02) [still, stillT] = [now, 0];
        else if ((stillT += dt) > STILL && now - still > STILL / 2.5 && idle) return void ((stillT = 0), idle());
      }
      if (state === 'walk' && v !== null) {
        const w = run ? THREE.MathUtils.smoothstep(v, walkV * 1.25, runV * 0.9) : 0;
        runW += (w - runW) * Math.min(1, dt * 6);
        if (runW < 0.001) runW = 0;
        const walkCyc = walkV * WD * Math.max(1, v / (walkV * BRISK));
        const cyc = (1 - runW) * walkCyc + runW * runV * RD;
        phase = (phase + (dt * v) / Math.max(1e-3, cyc)) % 1;
        if (!runOn && runW > 0) {
          R.reset();
          R.setEffectiveWeight(1);
          R.play();
          runOn = true;
        }
        W.timeScale = 0;
        R.timeScale = 0;
        W.time = phase * WD;
        R.time = ((phase + runOff) % 1) * RD;
        W.weight = 1 - runW;
        R.weight = runW;
        return;
      }
      W.timeScale = speedArg;
      W.weight = 1;
      if (runOn) {
        runOn = false;
        runW = 0;
        R.fadeOut(0.2);
      }
    },
  };
}

// The ground speed a clip's steps carry the body at, at time scale 1, in the root's units (the root unscaled, so a
// person's own build and height are in it): the planted foot (the lower one) moves back against the body at the speed
// the body goes, so it is the distance the lower foot travels over the cycle, over the time that took. `pin` keeps the
// hips where update() keeps them. Every bone is put back afterwards. Once per clip: copies of one person (the same clip
// on the same build) only differ in their height, `scale`.
const SEEN = new WeakMap();
export function measureStride(mixer, action, feet, root, pin, scale = 1) {
  const clip = action.getClip();
  if (SEEN.has(clip)) return SEEN.get(clip) && SEEN.get(clip) * scale;
  const D = clip.duration,
    N = 60,
    bones = [];
  root.traverse((o) => o.isBone && bones.push([o, o.position.clone(), o.quaternion.clone()]));
  mixer.stopAllAction();
  action.reset();
  action.setEffectiveWeight(1);
  action.timeScale = 0;
  action.play();
  const at = [];
  for (let i = 0; i <= N; i++) {
    action.time = (i / N) * D;
    mixer.update(0);
    pin?.();
    root.updateMatrixWorld(true);
    at.push(feet.map((f) => root.worldToLocal(f.getWorldPosition(new THREE.Vector3()))));
  }
  mixer.stopAllAction();
  for (const [o, p, q] of bones) (o.position.copy(p), o.quaternion.copy(q));
  let dist = 0,
    t = 0;
  for (let i = 1; i <= N; i++) {
    const lo = at[i][0].y < at[i][1].y ? 0 : 1;
    if (lo !== (at[i - 1][0].y < at[i - 1][1].y ? 0 : 1)) continue;
    dist += Math.hypot(at[i][lo].x - at[i - 1][lo].x, at[i][lo].z - at[i - 1][lo].z);
    t += D / N;
  }
  const v = t > D * 0.3 ? dist / t : null;
  SEEN.set(clip, v && v / scale);
  return v;
}

// A code-built person's (train/people.js) walk swing: how far the ground goes by per radian of walkPose's phase (or
// another pose's, stored under `key`), in the units of `space` (their root by default), measured the same way as
// measureStride, once per person.
export function codeStride(r, space = r.root, pose = walkPose, key = '_stride') {
  if (r[key]) return r[key] * (space === r.root ? 1 : r.root.scale.x);
  const feet = r.knees.map((k) => k.children[k.children.length - 1]),
    N = 48,
    at = [];
  for (let i = 0; i <= N; i++) {
    pose(r, (i / N) * 2 * Math.PI, 1);
    r.root.updateMatrixWorld(true);
    at.push(feet.map((f) => r.root.worldToLocal(f.getWorldPosition(new THREE.Vector3()))));
  }
  walkPose(r, 0, 0);
  let dist = 0,
    ph = 0;
  for (let i = 1; i <= N; i++) {
    const lo = at[i][0].y < at[i][1].y ? 0 : 1;
    if (lo !== (at[i - 1][0].y < at[i - 1][1].y ? 0 : 1)) continue;
    dist += Math.hypot(at[i][lo].x - at[i - 1][lo].x, at[i][lo].z - at[i - 1][lo].z);
    ph += (2 * Math.PI) / N;
  }
  r[key] = ph ? dist / ph : 0.13;
  return codeStride(r, space, pose, key);
}

// Walking or standing, from how far someone really moved this step (place units): the one place where the feet of
// everyone moved by code are timed (walkRig, walkPerson, the crowd, the commuters). They walk from ON body units / s
// and stand once under OFF for HOLD s, so a slow shuffle or a nudge doesn't flicker walk / idle / walk; turning on
// the spot is standing. A Meshy person's walk clip runs at the ground speed (makeGait); a code-built person's legs
// swing by the distance covered (codeStride). run: the run clip may come in (makeGait).
const ON = 0.12,
  OFF = 0.05,
  HOLD = 0.15;
// whether they walk (on), how much of the swing a code-built person shows (amt, eased), and the speed (v, body units / s)
export function walking(rig, dist, dt) {
  const v = dist / dt / (rig.root.scale.x || 1);
  const g = (rig._gait ||= { on: false, low: 0, ph: rig.ph || 0, amt: 0, v: 0, vs: v });
  // walking or not by the speed over the last moment (people held up move in fits and starts)
  g.vs += (v - g.vs) * Math.min(1, dt / 0.2);
  if (g.on) {
    g.low = g.vs < OFF ? g.low + dt : 0;
    if (g.low > HOLD) g.on = false;
  } else if (g.vs > ON) {
    g.on = true;
    g.low = 0;
  }
  g.v = v;
  g.amt += ((g.on ? 1 : 0) - g.amt) * Math.min(1, dt * 10);
  return g;
}
export function stepGait(rig, dist, dt, { run = false } = {}) {
  if (!rig?.root || dt <= 0 || rig.seated || rig.selfGait) return; // the cat steps herself (creatures/cat.js)
  const g = walking(rig, dist, dt),
    sc = rig.root.scale.x || 1;
  if (rig.setGait) {
    rig.setState(g.on ? 'walk' : 'idle');
    rig.setGait(g.on ? g.v : null, { run });
    return;
  }
  if (!rig.knees) return;
  if (!g.on && g.amt < 0.02) {
    if (g.amt > 0) walkPose(rig, 0, 0);
    g.amt = 0;
    return;
  }
  g.ph += dist / sc / codeStride(rig);
  walkPose(rig, g.ph, g.amt);
}

// standing: the walk off at once (the end of a walk)
export function stopGait(rig) {
  if (!rig || rig.selfGait) return;
  if (rig._gait) Object.assign(rig._gait, { on: false, low: 0, amt: 0 });
  if (rig.setGait) rig.setGait(null);
  if (rig.seated) return;
  if (rig.setState && [undefined, '', 'walk', 'run'].includes(rig.state)) rig.setState('idle');
  else if (!rig.setState && rig.knees) walkPose(rig, 0, 0);
}

// A Meshy person's gait (makeGait) at the walk and run speeds measured on their own feet, as built; `given` (the
// bake's estimate, Eric's by default) stands in where the feet can't be found. gait.strides: the speeds used.
function footBone(model, side) {
  let f = null;
  model.traverse((o) => {
    if (!f && o.isBone && new RegExp(side + '.*foot$', 'i').test(o.name.replace(/[^a-z]/gi, ''))) f = o;
  });
  return f;
}
export function meshyGait(actions, given, { mixer, model, root, hips, scale, setState }) {
  given ||= { walkV: 0.44, runV: 1.1, runOff: 0.03 };
  const rest = hips.position.clone(),
    pin = () => hips.position.set(rest.x, hips.position.y, rest.z); // the hips kept over the root (x, z)
  const feet = [footBone(model, 'left'), footBone(model, 'right')],
    ok = feet[0] && feet[1];
  const walkV = ok && measureStride(mixer, actions.walk, feet, root, pin, scale),
    runV = ok && measureStride(mixer, actions.run, feet, root, pin, scale);
  const strides = { walkV: walkV || given.walkV, runV: runV || given.runV, runOff: given.runOff };
  return Object.assign(makeGait(actions, strides, { root, idle: () => setState('idle') }), { strides, pin });
}

// mixer.clipAction for a clip that may come from JSON: AnimationClip.parse leaves it without a uuid, by which the
// mixer knows clips, so every such clip was taken for the first one (the chibis' idle, run, sit and gestures all
// played the walk: walking on the spot)
export const clipAction = (mixer, c) =>
  mixer.clipAction(Object.assign(c, { uuid: c.uuid || THREE.MathUtils.generateUUID() }));
export const clipActions = (mixer, clips) =>
  Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, clipAction(mixer, c)]));

// the fastest a Meshy person walks with their steps keeping up (place units / s; makeGait's BRISK times their walk)
export const paceCap = (rig) => (rig?.strides ? rig.strides.walkV * BRISK * (rig.root.scale.x || 1) : Infinity);

// Straight into a held frame (sitAt): every other clip stopped, this one at full weight and applied now. A seated
// model is shifted back for the seated hips at once, so a crossfade from standing showed the body that far forward,
// through the desk in front, until it ended, and for good in a still or a paused game (#240,
// game3d/tools/seat-check.mjs). before/after: the rig's bone restore and snapshot round its mixer step.
export function holdNow(mixer, action, others, before, after) {
  for (const a of others) if (a !== action) a.stop();
  action.stopFading().setEffectiveWeight(1);
  before();
  mixer.update(0);
  after();
}
