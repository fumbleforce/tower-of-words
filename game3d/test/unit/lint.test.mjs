import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import { compareLint, diagnosticContext } from '../../../tools/check/lint.mjs';

const eslint = new ESLint();
const findings = async (source, file = 'game3d/js/lint-fixture.js') => {
  const [result] = await eslint.lintText(source, { filePath: file });
  return result.messages.map(message => ({ ...message, file,
    context: message.ruleId === 'no-unused-vars' ? diagnosticContext(source, message) : null }));
};
const baseline = entries => ({ owner: 'fixture', review: 'fixture', entries });

test('lint inventory survives whitespace and quote formatting, and detects new debt', async () => {
  const before = await findings("const unused='example';");
  const after = await findings('const unused = "example";\n');
  assert.equal(before.length, 1);
  assert.deepEqual(compareLint(after, baseline(before)), []);
  assert(compareLint(await findings("const unused='example';const second=1;"), baseline(before)).length > 0);
  assert.match(compareLint([], baseline(before))[0], /Remove resolved/);
  assert.equal(compareLint([...before, ...before], baseline(before)).length, 1);
  const body = "console.log('padding', 'before'); const debt = 1; console.log('padding', 'after');";
  const oldScope = await findings(`export function old() { ${body} }`);
  const newScope = await findings(`export function newlyAdded() { ${body} }`);
  assert(compareLint(newScope, baseline(oldScope)).length > 0, 'Debt must not move into a different function');
});

test('undefined names, parse failures and inline suppressions cannot be inventoried away', async () => {
  const undefinedName = await findings('missingFixture();');
  assert.equal(undefinedName[0].ruleId, 'no-undef');
  assert.throws(() => compareLint(undefinedName, baseline(undefinedName)), /Only existing unused/);
  assert(compareLint(await findings('const = broken;'), baseline([])).length > 0);
  const disabled = await findings('/* eslint-disable no-undef */\nmissingFixture();');
  assert(disabled.some(message => message.ruleId === 'no-undef'));
});

test('runtime browser modules do not inherit Node globals, capture tools have both contexts', async () => {
  assert((await findings('console.log(process.pid);')).some(message => message.ruleId === 'no-undef'));
  assert((await findings('process.exit(0);', 'game3d/js/lint-fixture.mjs')).some(message => message.ruleId === 'no-undef'));
  assert((await findings('process.exit(0);', 'game3d/test/support/behavior-trace.mjs')).some(message => message.ruleId === 'no-undef'));
  assert((await findings('missingFixture();', 'lint-fixture.js')).some(message => message.ruleId === 'no-undef'));
  assert.deepEqual(await findings('console.log(window.innerWidth);'), []);
  assert.deepEqual(await findings('console.log(process.pid); window.fixture = 1;', 'tools/check/behavior-trace.mjs'), []);
  assert((await findings('document.title = \"bad\";', 'tools/check/lint-fixture.mjs')).some(message => message.ruleId === 'no-undef'));
});
