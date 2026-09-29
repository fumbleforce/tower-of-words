import assert from 'node:assert/strict';
import { test } from 'node:test';
import { perfWarnings, perfSummary, baselineFrom } from '../support/perf-report.mjs';

const report = (calls, medianMs, gl = 'gpu', quality = 0) => ({
  layout: 'desktop', viewport: [1366, 860], gl, quality,
  places: { office: { frames: 900, medianMs, p99Ms: 30, worstMs: 90, samples: 90, calls, callsMax: calls, tris: 400000, trisMax: 400000 } },
});

test('a baseline taken from a run gives no warnings for that run', () => {
  const r = report(1000, 16.7);
  assert.deepEqual(perfWarnings(r, baselineFrom(r, {}, 'b1')), []);
});
test('warns only past the tolerance, and names the number', () => {
  const budgets = baselineFrom(report(1000, 16.7), {}, 'b1');
  assert.deepEqual(perfWarnings(report(1190, 16.7), budgets), []);
  const w = perfWarnings(report(1300, 16.7), budgets);
  assert.equal(w.length, 1);
  assert.match(w[0], /office draw calls 1300 is 30% over the baseline 1000/);
});
test('frame times compare only with the same GL; calls compare always', () => {
  const budgets = baselineFrom(report(1000, 16.7, 'gpu'), {}, 'b1');
  assert.deepEqual(perfWarnings(report(1000, 400, 'software'), budgets), []);
  assert.equal(perfWarnings(report(1000, 40, 'gpu'), budgets).length, 1);
});
test('a different quality tier is not compared', () => {
  const budgets = baselineFrom(report(1000, 16.7), {}, 'b1');
  const w = perfWarnings(report(5000, 16.7, 'gpu', 2), budgets);
  assert.equal(w.length, 1);
  assert.match(w[0], /not compared/);
});
test('summary line lists every place', () => {
  assert.match(perfSummary(report(1000, 16.7)), /office 16\.7\/90 ms, 1000 calls, 400k tris/);
  assert.match(perfSummary(null), /no numbers/);
});
