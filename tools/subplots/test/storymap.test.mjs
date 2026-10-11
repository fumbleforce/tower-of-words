// The story map's public half (storymap.mjs): day and place from the file, ways in, routes out.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { storyMap, fileWhere } from '../storymap.mjs';

function project(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storymap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}

test('a file says the day and place: day 1 at the top, day folders, later days, any-day talk menus', () => {
  const places = ['office', 'gate'];
  assert.deepEqual(fileWhere('game3d/story/office.js', places), { day: 1, place: 'office', area: 'office' });
  assert.deepEqual(fileWhere('game3d/story/day3/gate.js', places), { day: 3, place: 'gate', area: 'gate' });
  assert.deepEqual(fileWhere('game3d/story/ongoing/office.js', places), { day: 'later', place: 'office', area: 'office' });
  assert.deepEqual(fileWhere('game3d/story/conversations/mio.js', places), { day: 'any', place: null, area: 'conversations/mio' });
  assert.equal(fileWhere('game3d/story/placeholder/office.js', places), null);
});

test('ways in, routes out and code-built triggers', t => {
  const root = project(t, {
    'game3d/js/places/definitions.js': "export const PLACE_NAMES = { gate: 'Station security', office: 'IT support, B2' };\nexport const STORY_FILES = ['gate', 'office', 'transitions'];\n",
    'game3d/story/office.js': `export default {
  start: 'arrive',
  on: { 'talk:mio': [{ if: "period == 'lunch'", node: 'lunch', once: true }, 'chat'], 'zone:door': 'leave' },
  nodes: {
    arrive: ['> In.', { choice: [{ text: 'Sit', go: 'sit' }, { text: 'Wait' }] }],
    sit: ['mio: Hi.', { if: 'x', then: [{ call: 'aside' }] }],
    aside: [], lunch: [], chat: [],
    leave: [{ do: 'trip', to: 'gate' }],
  },
};`,
    'game3d/story/day2/gate.js': "const shared = { on: { 'talk:guard': 'hello' } };\nexport default { on: { ...shared.on, 'talk:board': 'board' }, nodes: { hello: [], board: [{ do: 'next' }] } };",
    'game3d/story/placeholder/office.js': "export default { nodes: { arrive: [] } };",
  });
  const map = storyMap(root);
  assert.deepEqual(map.places.map(p => p.id), ['gate', 'office']);
  const at = node => map.scenes.find(s => s.node === node);
  assert.equal(map.scenes.filter(s => s.file.includes('placeholder')).length, 0, 'placeholders are left off');
  assert.deepEqual(at('arrive').entries, [{ event: 'start', condition: '', once: false }]);
  assert.deepEqual(at('arrive').routes, [{ kind: 'choice', to: 'sit', label: 'Sit' }]);
  assert.deepEqual(at('sit').routes, [{ kind: 'call', to: 'aside' }]);
  assert.deepEqual(at('lunch').entries, [{ event: 'talk:mio', condition: "period == 'lunch'", once: true }]);
  assert.deepEqual(at('chat').entries, [{ event: 'talk:mio', condition: '', once: false }]);
  assert.deepEqual(at('leave').routes, [{ kind: 'trip', to: 'gate' }]);
  assert.equal(at('lunch').day, 1);
  assert.equal(at('board').day, 2);
  assert.deepEqual(at('board').entries, [{ event: 'talk:board', condition: '', once: false }]);
  assert.equal(at('board').partial, true, 'triggers spread in from code are flagged');
  assert.deepEqual(at('board').routes, [{ kind: 'next', to: '' }]);
});
