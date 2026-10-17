import test from 'node:test';
import assert from 'node:assert/strict';
import {newestPictureFirst} from '../web/image-order.js';

const ids = rows => rows.sort(newestPictureFirst).map(r => r.id);

test('finished pictures go by their #n, newest first, even when a recorded time disagrees', () => {
  assert.deepEqual(ids([
    {id: 'a1', n: 1, at: '2026-10-11T10:00:00Z'},
    {id: 'a2', n: 3, at: '2026-10-11T10:02:00Z'},
    {id: 'b1', n: 2, at: '2026-10-11T10:01:00Z'},
    {id: 'logged late', n: 4, at: '2026-10-11T09:00:00Z'},
  ]), ['logged late', 'a2', 'b1', 'a1']);
});

test('pictures without a number follow the numbered ones by time, then batch position', () => {
  assert.deepEqual(ids([
    {id: 'numbered', n: 1, at_epoch: 5},
    {id: 'later', at: '2026-10-11T10:01:00Z'},
    {id: 'earlier', at: '2026-10-11T12:00:00+02:00'},
  ]), ['numbered', 'later', 'earlier']);
  assert.deepEqual(ids([2, 10, 1].map(idx => ({id: `batch-${idx}`, idx}))), ['batch-10', 'batch-2', 'batch-1']);
});

test('waiting renders sit above finished pictures, last to run on top, the running one lowest', () => {
  assert.deepEqual(ids([
    {id: 'done', n: 9, at_epoch: 100},
    {id: 'next', status: 'queued', queue_pos: 1, created: 50},
    {id: 'running', status: 'running', created: 60},
    {id: 'last', status: 'queued', queue_pos: 2, created: 40},
  ]), ['last', 'next', 'running', 'done']);
});

test('without queue positions, waiting renders go by submission time', () => {
  assert.deepEqual(ids([{id: 'first', status: 'queued', created: 1}, {id: 'second', status: 'queued', created: 2}]), ['second', 'first']);
});
