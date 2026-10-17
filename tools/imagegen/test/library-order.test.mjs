// #694: pictures arrived in "semi random order". A live queue with Jørgen's renders and two agents' runs, played
// one finish at a time: the library order must never move a card it already shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import {newestPictureFirst} from '../../subplots/web/image-order.js';

// The image service's queue (server.py queue_order): Jørgen's own jobs first, then everyone's in the order they came.
function service() {
  let clock = 1000, n = 2800;
  const jobs = [];
  const queueOrder = () => [...jobs.filter(j => j.status === 'queued')].sort((a, b) => !!a.owner - !!b.owner);
  return {
    submit(run, count, owner) {
      for (let idx = 1; idx <= count; idx++) jobs.push({id: `${run}-${idx}`, run_id: run, idx, owner, status: 'queued', created: clock += 0.001});
    },
    start() { const j = queueOrder()[0]; if (j) j.status = 'running'; return j; },
    finish(j) { Object.assign(j, {status: 'done', n: ++n, at_epoch: clock += 30}); },
    jobs: () => { const pos = new Map(queueOrder().map((j, i) => [j.id, i + 1])); return jobs.map(j => ({...j, ...(pos.has(j.id) ? {queue_pos: pos.get(j.id)} : {})})); },
  };
}
const history = [{id: 'old-agent', n: 2790, at_epoch: 900, owner: 'claude-main/art', status: 'done'},
  {id: 'old-mine', n: 2791, at_epoch: 800, status: 'done'}];  // logged later than its own time says
const library = jobs => [...history, ...jobs].sort(newestPictureFirst).map(j => j.id);
// Cards shown in both views keep their relative order.
function assertNoReshuffle(before, after, step) {
  const kept = new Set(after);
  const a = before.filter(id => kept.has(id)), had = new Set(before), b = after.filter(id => had.has(id));
  assert.deepEqual(b, a, `cards moved at ${step}`);
}

test('mixed owners and runs: finishing renders and new submissions never reshuffle the cards on screen', () => {
  const s = service();
  s.submit('agentA', 3, 'claude-private/scene-art');
  s.submit('agentB', 2, 'claude-main/trailer');
  let view = library(s.jobs());
  assert.deepEqual(view.slice(0, 5), ['agentB-2', 'agentB-1', 'agentA-3', 'agentA-2', 'agentA-1']);
  let step = 0;
  for (let j = s.start(); j; j = s.start()) {
    step++;
    if (step === 2) s.submit('mine', 2);  // Jørgen jumps the agents' queue: his cards appear right above the running one
    const running = library(s.jobs());
    assertNoReshuffle(view, running, `start ${j.id}`);
    s.finish(j);
    view = library(s.jobs());
    assertNoReshuffle(running, view, `finish ${j.id}`);
    if (step === 2) assert.deepEqual(running.slice(0, 6), ['agentB-2', 'agentB-1', 'agentA-3', 'mine-2', 'mine-1', 'agentA-2']);
  }
  // Every picture finished: plain #n order, newest first, whoever made it.
  const done = [...history, ...s.jobs()].sort((a, b) => b.n - a.n).map(j => j.id);
  assert.deepEqual(view, done);
  assert.deepEqual(view.slice(0, 3), ['agentB-2', 'agentB-1', 'agentA-3']);
  assert.deepEqual(view.slice(-2), ['old-mine', 'old-agent']);
});
