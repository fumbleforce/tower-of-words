// game3d/build.json is generated (game3d/tools/stamp.py) and git-ignored. Anything that loads the game or reads the
// build id calls this first: it stamps when the file is missing, names another commit or lists other modules.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const game3d = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../game3d');

export function ensureBuild() {
  execFileSync('python3', [path.join(game3d, 'tools/stamp.py'), '--if-stale'], { stdio: 'ignore' });
  return JSON.parse(fs.readFileSync(path.join(game3d, 'build.json'), 'utf8'));
}
