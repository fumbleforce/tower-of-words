import test from 'node:test';
import assert from 'node:assert/strict';
import {newestPictureFirst} from '../web/image-order.js';

const ids = rows => rows.sort(newestPictureFirst).map(r => r.id);

test('pictures from different batches interleave by their own completion times', () => {
  assert.deepEqual(ids([
    {id: 'a1', at: '2026-10-11T10:00:00Z'},
    {id: 'a2', at: '2026-10-11T10:02:00Z'},
    {id: 'b1', at: '2026-10-11T10:01:00Z'},
  ]), ['a2', 'b1', 'a1']);
});

test('same-second pictures use permanent render numbers, newest first', () => {
  assert.deepEqual(ids([1, 3, 2].map(n => ({id: String(n), n, at: '2026-10-11T10:00:00Z'}))), ['3', '2', '1']);
  assert.deepEqual(ids([2, 10, 1].map(idx => ({id: `batch-${idx}`, idx}))), ['batch-10', 'batch-2', 'batch-1']);
});

test('queue timestamps fall between completed pictures instead of floating to the top', () => {
  assert.deepEqual(ids([
    {id: 'older queued', created: 10},
    {id: 'old done', at_epoch: 5},
    {id: 'new done', at_epoch: 20, created: 1},
    {id: 'unknown'},
  ]), ['new done', 'older queued', 'old done', 'unknown']);
  assert.deepEqual(ids([{id: 'completed', at_epoch: 100.9, n: 2}, {id: 'queued', created: 100.5}]), ['completed', 'queued']);
});

test('timestamps compare as instants, with server time preferred over local text', () => {
  assert.deepEqual(ids([
    {id: 'earlier', at: '2026-10-11T12:00:00+02:00'},
    {id: 'later', at: '2026-10-11T10:01:00Z'},
  ]), ['later', 'earlier']);
  assert.deepEqual(ids([{id: 'a', at_epoch: 20, at: '2000-01-01'}, {id: 'b', at_epoch: 10, at: '2026-01-01'}]), ['a', 'b']);
});
