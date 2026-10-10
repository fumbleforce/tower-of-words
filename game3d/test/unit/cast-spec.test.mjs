// ?cast= and the tests' --cast (js/roles.js parseCast; docs/game/systems.md, Protagonists)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultCast, parseCast } from '../../js/roles.js';
import { mcArgs } from '../support/mc-args.mjs';

test('a cast spec: a set, role=person pairs, or both', () => {
  assert.deepEqual(parseCast('default'), defaultCast());
  const c = parseCast('default,sales=emi, team_lead=rei');
  assert.equal(c.set, 'default');
  assert.equal(c.roles.sales, 'emi');
  assert.equal(c.roles.team_lead, 'rei');
  assert.equal(c.roles.programmer, 'mio');
  assert.deepEqual(parseCast('sales=emi').roles, { ...defaultCast().roles, sales: 'emi' });
});
test('a fixed role, an unknown role or set, and two sets refuse', () => {
  assert.throws(() => parseCast('programmer=rei'), /fixed/);
  assert.throws(() => parseCast('nobody=rei'), /no role/);
  assert.throws(() => parseCast('nope'), /no cast set/);
  assert.throws(() => parseCast('default,default'), /more than one set/);
});
test('--mc and --cast come out of argv, env fills in, and the page query carries both', () => {
  const o = mcArgs(['390', '--mc', 'carina', '844', '--cast=sales=emi'], {});
  assert.deepEqual(o.rest, ['390', '844']);
  assert.equal(o.mc, 'carina');
  assert.equal(o.cast.roles.sales, 'emi');
  const q = new URLSearchParams(o.query.slice(1));
  assert.equal(q.get('mc'), 'carina');
  assert.equal(q.get('cast'), 'sales=emi');
  assert.equal(mcArgs([], { MC: 'eric' }).mc, 'eric');
  assert.equal(mcArgs([], {}).query, '');
  assert.throws(() => mcArgs(['--mc', 'nobody'], {}), /no such protagonist/);
});
