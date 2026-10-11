// A new public scene from a template (create.mjs): added to its place's file with the smallest change.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prepareCreate, storyFile } from '../create.mjs';
import { run } from '../source.mjs';

const text = `export default {
  on: { 'talk:mailboxes': 'mail', 'talk:mio': { if: 'met_mio', node: 'chat' } },
  nodes: {
    mail: ['> Letters.'],
    chat: [{ say: 'mio', emo: 'warm', text: 'Hi.' }],
  },
};
`;
function project(t, file = 'game3d/story/day3/dorm_court.js', source = text) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'create-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), source);
  return root;
}

test('the story file of a day and place', () => {
  assert.equal(storyFile(1, 'office'), 'game3d/story/office.js');
  assert.equal(storyFile(3, 'dorm_court'), 'game3d/story/day3/dorm_court.js');
  assert.equal(storyFile('later', 'plaza'), 'game3d/story/ongoing/plaza.js');
});

test('a conversation: the scene and its two parts at the end of nodes, its way in added, the rest untouched', t => {
  const root = project(t);
  const p = prepareCreate(root, { day: 3, place: 'dorm_court', template: 'conversation', title: 'Mio at the mailboxes', event: 'talk:kenji', who: 'kenji', name: 'Kenji' });
  assert.equal(p.id, 'public:game3d/story/day3/dorm_court.js#mio_at_the_mailboxes');
  assert.ok(p.changed.startsWith(`export default {
  on: { 'talk:mailboxes': 'mail', 'talk:mio': { if: 'met_mio', node: 'chat' }, 'talk:kenji': 'mio_at_the_mailboxes' },
  nodes: {
    mail: ['> Letters.'],
    chat: [{ say: 'mio', emo: 'warm', text: 'Hi.' }],
    mio_at_the_mailboxes: [
      { say: 'kenji', emo: 'casual', overheard: true, text: '（ここに日本語のセリフ）' },`), p.changed);
  fs.writeFileSync(path.join(root, 'game3d/story/day3/dorm_court.js'), p.changed);
  const read = run(root, { action: 'read', id: p.id });
  assert.deepEqual(read.entries, [{ event: 'talk:kenji', condition: '', once: false }]);
  assert.deepEqual(read.steps[2].choice.map(o => o.go), ['mio_at_the_mailboxes_a', 'mio_at_the_mailboxes_b']);
  assert.ok(run(root, { action: 'read', id: 'public:game3d/story/day3/dorm_court.js#mio_at_the_mailboxes_b' }).steps.length);
});

test('a way in that is already used plays the new scene the first time, before what was there', t => {
  const root = project(t);
  const p = prepareCreate(root, { day: 3, place: 'dorm_court', template: 'look', title: 'Mail', event: 'talk:mailboxes' });
  assert.equal(p.node, 'mail_2', 'a name in use gets a number');
  assert.match(p.changed, /'talk:mailboxes': \[\{ node: 'mail_2', once: true \}, 'mail'\]/);
});

test('refused: no story file for the day, routes built in code', t => {
  const root = project(t);
  assert.throws(() => prepareCreate(root, { day: 4, place: 'dorm_court', template: 'look', title: 'x', event: 'talk:mailboxes' }), /no story file/);
  const coded = project(t, 'game3d/story/day3/plaza.js', "const more = {};\nexport default { on: more, nodes: { a: [] } };\n");
  assert.throws(() => prepareCreate(coded, { day: 3, place: 'plaza', template: 'look', title: 'x', event: 'talk:fountain' }), /in code/);
});
