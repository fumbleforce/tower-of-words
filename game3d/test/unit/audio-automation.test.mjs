// #273: ambience gain automation against a fake AudioParam that clamps past times to currentTime and throws on
// overlapping curves exactly like Chromium's AudioParamTimeline (checked natively: "setValueCurveAtTime(..., 26.992,
// 3) overlaps setValueCurveAtTime(..., 24.992, 3)" for the 9 s lift bed when the next copy's timer fired 4 s late).
import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleCopy, rampTo, dipTo, guard } from '../../js/audio/automation.js';

class FakeParam {
  constructor(clock) {
    this.clock = clock;
    this.events = [];
    this.value = 1;
  }
  add(type, time, duration = 0) {
    if (!Number.isFinite(time) || time < 0) throw new RangeError(`Time must be a finite non-negative number: ${time}`);
    if (type === 'curve' && !(duration > 0)) throw new RangeError('duration must be positive');
    const t = Math.max(time, this.clock.now);
    for (const e of this.events) {
      if (type === 'curve') {
        const end = t + duration;
        if (e.type === 'curve') {
          const eEnd = e.time + e.duration;
          if ((e.time >= t && e.time < end) || (eEnd > t && eEnd < end))
            throw new Error(`setValueCurveAtTime(..., ${t}, ${duration}) overlaps setValueCurveAtTime(..., ${e.time})`);
        } else if (e.time > t && e.time < end) throw new Error(`setValueCurveAtTime overlaps ${e.type}(${e.time})`);
      }
      if (e.type === 'curve' && t >= e.time && t < e.time + e.duration)
        throw new Error(`${type}(${t}) overlaps setValueCurveAtTime(..., ${e.time}, ${e.duration})`);
    }
    this.events.push({ type, time: t, duration });
  }
  setValueAtTime(v, t) {
    this.add('value', t);
  }
  linearRampToValueAtTime(v, t) {
    this.add('ramp', t);
  }
  setTargetAtTime(v, t) {
    this.add('target', t);
  }
  setValueCurveAtTime(c, t, d) {
    this.add('curve', t, d);
  }
  cancelScheduledValues(t) {
    this.events = this.events.filter((e) => e.time < t && !(e.type === 'curve' && e.time + e.duration > t));
  }
}

test('the fake throws on the old schedule (late timer on the lift bed)', () => {
  const clock = { now: 25 };
  const p = new FakeParam(clock);
  const at = 21, end = at + 9; // next copy's start, already 4 s behind
  assert.throws(() => {
    p.setValueAtTime(0, at);
    p.setValueCurveAtTime([0, 1], at, 3);
    p.setValueCurveAtTime([1, 0], end - 3, 3);
  }, /overlaps/);
});

test('bed copies never throw, however late their timers fire', () => {
  for (const dur of [9, 26.5, 27, 4, 1]) {
    for (const late of [0, 0.5, 2, 4, 6, 12, 25, 60]) {
      const clock = { now: 0.1 };
      let at = 0.15, first = true;
      for (let copy = 0; copy < 8; copy++) {
        const p = new FakeParam(clock);
        const offset = first ? Math.max(0, dur - 7) * 0.9 : 0;
        const t = scheduleCopy(p, { now: clock.now, at, dur, offset, xf: 3, fadeIn: !first });
        assert.ok(t, `dur ${dur} late ${late} copy ${copy}`);
        assert.ok(t.at >= clock.now && t.outAt >= t.at && t.end > t.outAt);
        assert.equal(p.events.filter((e) => e.type === 'curve').length, first ? 1 : 2);
        first = false;
        at = t.outAt;
        clock.now = Math.max(clock.now, at - 1) + late; // the timer fires 1 s ahead, plus however late it is
      }
    }
  }
});

test('a curve the browser still refuses falls back to ramps, not a throw', () => {
  const clock = { now: 5 };
  const p = new FakeParam(clock);
  p.setValueCurveAtTime = () => {
    throw new Error('setValueCurveAtTime overlaps');
  };
  const t = scheduleCopy(p, { now: 5, at: 6, dur: 9, xf: 3, fadeIn: true });
  assert.ok(t);
  assert.ok(p.events.some((e) => e.type === 'ramp'));
});

test('overlapping ducks and dips on the duck stage never throw', () => {
  const clock = { now: 0 };
  const p = new FakeParam(clock);
  const steps = [];
  for (let i = 0; i < 200; i++) steps.push([i % 3, (i * 0.137) % 0.9]);
  for (const [kind, dt] of steps) {
    clock.now += dt;
    if (kind === 0) assert.ok(dipTo(p, clock.now, 0.25, 0.08, 1.4, 1.2, 0.55));
    else assert.ok(rampTo(p, clock.now, kind === 1 ? 0.55 : 1, kind === 1 ? 0.15 : 0.6));
  }
  // even a param that has a curve on it (as the bed gains do) only gets cancelled and re-ramped
  p.cancelScheduledValues(0);
  p.setValueCurveAtTime([1, 0], clock.now + 0.01, 3);
  assert.ok(rampTo(p, clock.now + 0.5, 1, 0.3));
  assert.ok(dipTo(p, clock.now + 0.6, 0.25, 0.08, 1.4, 1.2, 1));
});

test('a param that throws on everything is reported, never thrown', () => {
  const bad = new Proxy({ value: 1 }, {
    get: (o, k) => (k === 'value' ? 1 : () => {
      throw new Error('nope');
    }),
  });
  assert.equal(rampTo(bad, 1, 0.5, 0.2), false);
  assert.equal(dipTo(bad, 1, 0.25, 0.08, 1.4, 1.2, 1), false);
  assert.equal(scheduleCopy(bad, { now: 1, at: 1, dur: 9, xf: 3, fadeIn: true }), null);
  assert.equal(guard('x', () => {
    throw new Error('boom');
  }), undefined);
});
