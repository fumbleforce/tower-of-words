import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Resolve existing symlink ancestors too, so a candidate output cannot alias game assets.
function canonicalDirectory(directory) {
  let current = path.resolve(directory);
  const missing = [];
  while (!fs.existsSync(current)) {
    missing.unshift(path.basename(current));
    current = path.dirname(current);
  }
  return path.join(fs.realpathSync(current), ...missing);
}

export function idleExportOptions(env = process.env, args = process.argv.slice(2)) {
  const onlyExtra = env.IDLE_ONLY_EXTRA === '1';
  const retargetArms = env.IDLE_REST_ARMS === '1';
  if (retargetArms && !onlyExtra) throw Error('IDLE_REST_ARMS is candidate-only');
  if (onlyExtra && !args.length) throw Error('IDLE_ONLY_EXTRA requires explicit character IDs');
  if (onlyExtra && !env.IDLE_OUTPUT) throw Error('IDLE_ONLY_EXTRA requires an isolated IDLE_OUTPUT directory');
  if (onlyExtra && args.some((id) => ['eric', 'mio'].includes(id)))
    throw Error('Candidate exports require aliases, such as swim-eric; eric and mio are reserved built-in IDs');
  if (onlyExtra) {
    const output = canonicalDirectory(env.IDLE_OUTPUT);
    const gameAssets = canonicalDirectory(fileURLToPath(new URL('../../game3d/assets/', import.meta.url)));
    const relative = path.relative(gameAssets, output);
    if (relative === '' || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)))
      throw Error('Candidate IDLE_OUTPUT must be isolated outside game3d/assets');
  }
  return {
    output: env.IDLE_OUTPUT
      ? pathToFileURL(path.resolve(env.IDLE_OUTPUT) + path.sep)
      : new URL('../../game3d/assets/characters/', import.meta.url),
    onlyExtra,
    retargetArms,
    extraIds: args.length ? args : ['mori'],
  };
}
