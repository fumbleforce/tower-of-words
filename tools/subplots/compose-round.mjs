// Where a compose.mjs render belongs. The round is the folder that holds recipes/ (a recipe kept anywhere else is its
// own round), and the dashboard names it repo-relative. A worktree's copy of the repo counts as the repo, the way
// tools/imagegen/agentlog.py's rel_path counts it.
import path from 'node:path';

export function roundOf(recipeFile) {
  const dir = path.dirname(path.resolve(recipeFile));
  return path.basename(dir) === 'recipes' ? path.dirname(dir) : dir;
}

export function repoRelative(p, repoRoot) {
  const abs = path.resolve(p).replace(/\/\.claude\/worktrees\/[^/]+(?=\/|$)/, '');
  const rel = path.relative(repoRoot, abs);
  if (path.isAbsolute(rel) || rel.split(path.sep)[0] === '..') return abs;
  return rel || '.';
}
