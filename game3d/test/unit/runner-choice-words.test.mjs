import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';
register(new URL('../support/save-loader.mjs', import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = {};
globalThis.fetch = async () => ({ ok: false });
const { Runner, flags } = await import('../../js/runner.js');
const { known, seen, WORDS } = await import('../../js/lang.js');
const mio = (await import('../../story/conversations/mio.js')).default;
async function play(story, node, { words = [], initial = {}, pick = 0 } = {}) {
  for (const key of Object.keys(flags)) delete flags[key];
  Object.assign(flags, initial);
  known.clear(); seen.clear();
  words.forEach(word => known.add(word));
  const menus = [];
  globalThis.__saveTestUI = { choose: (_who, _prompt, options) => { menus.push(options); return pick; }, say() {} };
  const place = { name: 'office', people: {}, hooks: {} };
  const game = { place, queue: [], wait: async () => {}, hooks: { cam() {}, face() {}, save() {} } };
  const runner = game.runner = new Runner(game);
  runner.use(place, story); await runner.run(node);
  assert.equal(runner.recoveryError, undefined);
  assert.equal(runner.frames.length, 0);
  return menus;
}
const story = { nodes: {
  start: [{ choice: [
    { text: '{yasumi}… <rest> & wait', if: 'know_yasumi', go: 'rest' },
    { text: 'Leave <quietly> & return later', go: 'leave' },
  ] }],
  rest: [{ set: 'picked_rest' }], leave: [{ set: 'picked_leave' }],
} };
test('unknown-word choice stays gated and filtering preserves original branch selection', async () => {
  const [options] = await play(story, 'start');
  assert.equal(options.length, 1);
  assert.equal(options[0].html, 'Leave &lt;quietly> &amp; return later');
  assert.equal(flags.picked_leave, true); assert.equal(flags.picked_rest, undefined);
  assert.deepEqual([...known], []); assert.deepEqual([...seen], []);
});
test('known reply renders existing word spans and escapes authored text without teaching', async () => {
  const [options] = await play(story, 'start', { words: ['yasumi'] });
  assert.equal(options.length, 2);
  assert.ok(options[0].html.includes(`<span class="jp" data-w="yasumi">${WORDS.yasumi.ja}</span>`));
  assert.ok(options[0].html.includes(`(${WORDS.yasumi.ro}, ${WORDS.yasumi.en})`));
  assert.ok(options[0].html.endsWith('… &lt;rest> &amp; wait'));
  assert.ok(!options[0].html.includes('{yasumi}'));
  assert.equal(flags.picked_rest, true); assert.equal(flags.picked_leave, undefined);
  assert.deepEqual([...known], ['yasumi']); assert.deepEqual([...seen], ['yasumi']);
});
test('actual remembered Mio menu renders its learned-word follow-up without changing knowledge', async () => {
  const [options] = await play(mio, 'chat_mio_understood', {
    words: ['yasumi'], initial: { day: 12, period_afternoon: true, chat_mio_home: true }, pick: 3,
  });
  const followup = options.find(option => option.html.includes('Was your mother telling'));
  assert.ok(followup.html.includes('data-w="yasumi"'));
  assert.ok(!followup.html.includes('{yasumi}'));
  assert.deepEqual([...known], ['yasumi']);
  assert.equal(flags.chat_mio_break_understood, undefined, 'opening/declining a choice does not award understanding');
});
