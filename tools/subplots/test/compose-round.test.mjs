import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {roundOf, repoRelative} from '../compose-round.mjs';

test('the round is the folder above recipes/; a recipe kept elsewhere is its own round', () => {
  assert.equal(roundOf('/r/island/private/rewards/skimpy/aoi-3/round-2/recipes/shot.json'), '/r/island/private/rewards/skimpy/aoi-3/round-2');
  assert.equal(roundOf('/r/round-2/shot.recipe.json'), '/r/round-2');
  assert.equal(roundOf('shot.json'), process.cwd());
});

test('the round is named repo-relative; a worktree copy of the repo counts as the repo', () => {
  assert.equal(repoRelative('/r/.claude/worktrees/agent-x/island/private/rewards/skimpy/aoi-3/round-2', '/r'),
    'island/private/rewards/skimpy/aoi-3/round-2');
  assert.equal(repoRelative('/r/island/x', '/r'), 'island/x');
  assert.equal(repoRelative('/r', '/r'), '.');
  assert.equal(repoRelative('/elsewhere/round', '/r'), '/elsewhere/round');
  assert.equal(repoRelative(path.join('/r', '..', 'sibling'), '/r'), '/sibling');
});
