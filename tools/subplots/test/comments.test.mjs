// Comments on beats (comments.mjs): where they are kept, and the request, reply and done cycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scene-comments-'));
process.env.SUBPLOTS_ROOT = root;
process.env.SUBPLOTS_STATE = path.join(root, 'state');
const { run, openCounts } = await import('../comments.mjs');
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

test('public comments sit with the drafts, private ones under island/private', () => {
  const pub = run({ action: 'add', id: 'public:game3d/story/office.js#welcome', text: 'Shorter.', beat: { key: 'k1', path: [1], text: 'mio: Hello' } }).comment;
  const priv = run({ action: 'add', id: 'local:days:bath:start', text: 'More steam.', beat: { key: 'k2', path: [0], text: 'Steam.' } }).comment;
  assert.match(fs.readFileSync(path.join(root, 'state/comments.json'), 'utf8'), /Shorter/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'state/comments.json'), 'utf8'), /More steam/);
  assert.match(fs.readFileSync(path.join(root, 'island/private/rewards/docs/scene-comments.json'), 'utf8'), /More steam/);
  assert.deepEqual(openCounts(), { 'public:game3d/story/office.js#welcome': 1, 'local:days:bath:start': 1 });
  run({ action: 'reply', comment: pub.id, text: 'Done.', by: 'claude' });
  run({ action: 'done', comment: pub.id });
  const [after] = run({ action: 'list', ids: ['public:game3d/story/office.js#welcome'] }).comments;
  assert.equal(after.status, 'done');
  assert.deepEqual(after.replies.map(r => [r.by, r.text]), [['claude', 'Done.']]);
  assert.equal(run({ action: 'list', ids: ['local:days:bath:start'] }).comments[0].id, priv.id);
  assert.throws(() => run({ action: 'add', id: 'public:x.js#a', text: ' ' }), /some words/);
});
