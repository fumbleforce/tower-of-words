import * as THREE from 'three';

// Gait (feel agent): the walk clip timed to the ground speed, so the feet move at the speed the body does.
// setGait(v, { run }): v is the ground speed in the rig's own units / s (null: off, the walk plays at update's speed
// argument). Hurrying is a brisk walk: the walk clip plays faster, up to BRISK times its own pace, and past that the
// stride lengthens. The run clip only comes in when the caller asks for it (`run: true`: a story walk that says so,
// and the player running Eric); then walk and run blend by speed between walkV and runV (Jørgen, 2026-09-30: Mio
// ran off the train where she should walk). Both play on one shared phase that advances with the distance covered:
// the cycle length is the blend of the two clips' strides. Measured on the clips (tools/feel stride probe): Eric
// walk 0.44 / run 1.1 units per s at time scale 1, run's left foot 0.03 of a cycle later; Mio 0.47 / 0.77, 0.04.
const BRISK = 2.2;
export function makeGait(actions, { walkV, runV, runOff = 0 }) {
  const W = actions.walk,
    R = actions.run,
    WD = W.getClip().duration,
    RD = R.getClip().duration;
  let v = null,
    run = false,
    phase = 0,
    runW = 0,
    runOn = false;
  return {
    set(x, opts) {
      v = x == null ? null : Math.max(0, x);
      run = !!opts?.run;
    },
    // call before mixer.update; `state` is the rig's current state
    step(dt, state, speedArg) {
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
