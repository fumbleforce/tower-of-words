import test from 'node:test';
import assert from 'node:assert/strict';
import { plain, setProblems, setUnvoiced, notesFor, unplaced } from '../web/checks.js';

test('story-check findings in plain words, on the beat they concern', () => {
  const p = plain('room: choice goes to missing node lobby');
  assert.equal(p.node, 'room');
  assert.match(p.text, /doesn't exist \(“lobby”\)/);
  assert.equal(p.match({ choice: [{ text: 'Go', go: 'lobby' }] }), true);
  assert.equal(p.match('mio: hi'), false);
  setProblems('s1', ['welcome: unknown speaker zed', 'welcome: something new']);
  assert.deepEqual(notesFor('s1', 'welcome', 'zed: Hello'), [{ kind: 'problem', text: 'Nobody called “zed” is in the cast. Pick the speaker again.' }]);
  assert.deepEqual(notesFor('s1', 'other', 'zed: Hello'), []);
  assert.deepEqual(unplaced('s1', 'welcome', ['zed: Hello']), ['something new']);
});

test('lines with no voice clip after a save', () => {
  setUnvoiced('s2', [{ speaker: 'mio', text: 'New words.' }]);
  assert.equal(notesFor('s2', 'a', 'mio: New words.')[0].kind, 'voice');
  assert.deepEqual(notesFor('s2', 'a', 'eric: New words.'), []);
  assert.deepEqual(notesFor('s2', 'a', 'mio: Old words.'), []);
});
