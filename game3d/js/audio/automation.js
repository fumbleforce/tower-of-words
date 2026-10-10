// Gain automation that can't throw. Chromium refuses a setValueCurveAtTime that overlaps any other event on the same
// AudioParam ("setValueCurveAtTime(...) overlaps ..."), and clamps a start time in the past to currentTime, so a
// timer that fires late can push a fade in onto the fade out scheduled for the same copy (#273: the 9 s lift bed
// threw after a timer ran about 4 s late). These work out times that never overlap, fall back to plain ramps if the
// browser still refuses, and report false instead of throwing. Used by ambience.js; pure, no imports (unit-tested).

let warned = 0;
function warn(what, e) {
  if (warned++ < 5) console.warn(`audio: ${what} skipped:`, e && e.message ? e.message : e);
}

// an equal-power fade, 64 points
export function equalPower(up, n = 64) {
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    a[i] = up ? Math.sin((x * Math.PI) / 2) : Math.cos((x * Math.PI) / 2);
  }
  return a;
}

// When one copy of a looping bed plays: it starts at `at` (never in the past: a late timer starts it now), plays
// the file from `offset` to its end, fades in over `fade` s (unless it is the first copy) and out over its last
// `fade` s. The fades are at most half the copy each, so they can only touch, never overlap.
export function copyTimes({ now, at, dur, offset = 0, xf }) {
  const start = Math.max(at, now + 0.02),
    len = dur - offset;
  if (!(len > 0.1)) return null;
  const fade = Math.min(xf, len / 2),
    end = start + len;
  // max(): with fade = len / 2, end - fade can round to a hair before start + fade, which already counts as overlap
  return { at: start, end, fade, outAt: Math.max(end - fade, start + fade) };
}

// Schedule one copy's fades on its own gain (param). Returns the times, or null when nothing could be scheduled.
export function scheduleCopy(param, { now, at, dur, offset = 0, xf, fadeIn }) {
  const t = copyTimes({ now, at, dur, offset, xf });
  if (!t) return null;
  try {
    if (fadeIn) {
      param.setValueAtTime(0, t.at);
      param.setValueCurveAtTime(equalPower(true), t.at, t.fade);
    } else param.setValueAtTime(1, t.at);
    param.setValueCurveAtTime(equalPower(false), t.outAt, t.fade);
    return t;
  } catch (e) {
    warn('bed fade curve', e);
  }
  // the browser still refused: drop what was set and use ramps, which can't overlap
  try {
    param.cancelScheduledValues(0);
    param.setValueAtTime(fadeIn ? 0 : 1, t.at);
    if (fadeIn) param.linearRampToValueAtTime(1, t.at + t.fade);
    param.setValueAtTime(1, t.outAt);
    param.linearRampToValueAtTime(0, t.end);
    return t;
  } catch (e) {
    warn('bed fade ramp', e);
    return null;
  }
}

// Hold the param where it is now and ramp to v over secs. Earlier ramps and dips from now on are dropped.
export function rampTo(param, now, v, secs) {
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(v, now + secs);
    return true;
  } catch (e) {
    warn('ramp', e);
    return false;
  }
}

// A dip: down to level over a s, held, back to `back` over r s.
export function dipTo(param, now, level, a, hold, r, back) {
  const low = Math.min(back, level);
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(low, now + a);
    param.setValueAtTime(low, now + a + hold);
    param.linearRampToValueAtTime(back, now + a + hold + r);
    return true;
  } catch (e) {
    warn('dip', e);
    return false;
  }
}

// Run fn and log instead of throwing: audio must never stop the frame loop or a caller's own work.
export function guard(what, fn) {
  try {
    return fn();
  } catch (e) {
    warn(what, e);
    return undefined;
  }
}
