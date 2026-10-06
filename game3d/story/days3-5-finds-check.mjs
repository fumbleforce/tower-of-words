import assert from 'node:assert/strict';
import { FINDS, NODES } from './days3-5-finds.js';
import { PLACE_DETAILS } from '../js/narrative/contracts.js';
import { compileCondition } from '../js/narrative/conditions.js';
const ids = new Set();
for (const f of FINDS) {
  assert(!ids.has(f.id)); ids.add(f.id);
  assert(PLACE_DETAILS[f.place].spots.includes(f.at), `${f.id}: unknown nook ${f.at}`);
  assert(f.from >= 3 && f.from <= 5 && (!f.until || f.until >= f.from));
  assert(!f.if || !compileCondition(f.if).error);
  const steps = NODES[f.node]; assert(steps);
  assert(steps[0].if === 'flavor_' + f.id + '_seen');
  assert(steps.some(s => s.set === 'flavor_' + f.id + '_seen'));
  assert(!steps.some(s => ['find', 'period', 'ticket', 'bond', 'bondStep'].includes(s.do)));
  assert.equal(steps.filter(s => s.do === 'flavorFind' && s.state === 'putBack').length, 1);
}
console.log(`${ids.size} flavor finds: stable nooks, persistence and no album/clock/reward changes.`);
