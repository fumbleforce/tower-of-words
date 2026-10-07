import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { parseSource } from '../../../tools/lib/source-data.mjs';
import PEOPLE from '../../story/people.js';

const source = readFileSync(new URL('../../js/gameplay/interactions.js', import.meta.url), 'utf8');
let talk;
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && node.id.name === 'talk') talk = source.slice(node.start, node.end);
  for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
}
visit(parseSource(source));
test('actual Talk keeps an unnamed later cast member out of People until the authored introduction', () => {
  assert.ok(talk);
  for (const id of ['kuro', 'aoi', 'rei']) {
    const met = new Set(), flags = {}, fired = [];
    const game = { place: { people: { [id]: {} } }, runner: { trigger: key => { fired.push(key); return true; } } };
    const action = Function('game', 'meet', 'ui', 'sim', 'flags', 'isPerson', `return (${talk})`)(game, (_game, who) => met.add(who), { refreshPeople() {} }, { people: PEOPLE, met }, flags, () => true);
    action({ id }); assert.equal(met.has(id), false); assert.deepEqual(fired, ['talk:' + id]);
    flags[PEOPLE[id].introduction] = true;
    action({ id }); assert.equal(met.has(id), true);
  }
});
