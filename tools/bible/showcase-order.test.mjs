import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { orderShowcase } from '../../bible/showcase-order.js';

test('precise activity wins day ties, offsets compare by instant, feedback is ignored', () => {
  const entries = [
    { id: 'bakery', date: '2026-10-07', feedback: { sent: '2026-10-08T23:00:00Z' } },
    { id: 'pool', date: '2026-10-07' },
    { id: 'older', date: '2026-10-01', updated: '2026-10-07T12:00:00+02:00' },
  ];
  assert.deepEqual(orderShowcase(entries, { bakery: '2026-10-07T02:00:00Z', pool: '2026-10-07T11:00:00Z' }).map(e => e.id), ['pool', 'older', 'bakery']);
  assert.deepEqual(entries.map(e => e.id), ['bakery', 'pool', 'older']);
});

test('missing or invalid times fall back to date then stable id', () => {
  const entries = [{ id: 'z', date: '2026-10-07', updated: 'bad' }, { id: 'a', date: '2026-10-07' }, { id: 'older', date: '2026-10-06' }];
  assert.deepEqual(orderShowcase(entries, { z: 'invalid' }).map(e => e.id), ['a', 'z', 'older']);
});

test('date-only UTC midnight never overrides precise overnight Oslo activity', () => {
  const entries = ['desktop-camera', 'map-fidelity', 'room-life', 'shopfronts']
    .map(id => ({ id, date: '2026-10-07' }));
  const dates = {
    'desktop-camera': '2026-10-07T00:56:07+02:00',
    'map-fidelity': '2026-10-07T01:04:37+02:00',
    'room-life': '2026-10-07T00:46:00+02:00',
    'shopfronts': '2026-10-07T01:22:29+02:00',
  };
  assert.deepEqual(orderShowcase(entries, dates).map(e => e.id),
    ['shopfronts', 'map-fidelity', 'desktop-camera', 'room-life']);
  assert.equal(orderShowcase(entries, dates)[0].activity, Date.parse(dates.shopfronts));
});

test('real entry history puts pool before bakery without dropping entries', () => {
  const root = new URL('../../', import.meta.url);
  const dates = JSON.parse(fs.readFileSync(new URL('bible/showcase-dates.json', root)));
  const entries = fs.readdirSync(new URL('showcase/', root)).flatMap(id => {
    const file = new URL(`showcase/${id}/entry.json`, root);
    return fs.existsSync(file) ? [{ id, ...JSON.parse(fs.readFileSync(file)) }] : [];
  });
  const sorted = orderShowcase(entries, dates).map(e => e.id);
  assert.equal(sorted.length, entries.length);
  assert.ok(sorted.indexOf('pool-swimwear-20261007') < sorted.indexOf('bakery-interior-1'));
});
