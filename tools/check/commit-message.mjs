import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { stagedSnapshot } from '../lib/staged-tree.mjs';

export function checkFactsTrailer(message, snapshot) {
  const facts = message.split(/\r?\n/).filter(line => line.startsWith('Facts:'));
  assert.equal(facts.length, 1, 'Commit message needs exactly one Facts: none or Facts: docs/game/<file> line');
  if (facts[0] === 'Facts: none') return;
  assert(/^Facts: docs\/game\/[^\s]+\.md$/.test(facts[0]), 'Invalid Facts trailer');
  const file = facts[0].slice('Facts: '.length);
  assert(!file.split('/').some(part => ['.', '..', 'private'].includes(part)), 'Invalid Facts path');
  assert(snapshot.changes.some(change => change.file === file && change.status !== 'D'
    && ['100644', '100755'].includes(change.mode)), 'Facts file must be retained in this staged change');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    assert(process.argv[2], 'Expected commit-message filename');
    checkFactsTrailer(fs.readFileSync(process.argv[2], 'utf8'), stagedSnapshot(process.cwd()));
  } catch (error) { console.error(`commit-msg: ${error.message}`); process.exitCode = 1; }
}
