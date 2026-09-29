// Parse every active JavaScript source without importing it or running side effects.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const excluded = new Set(['node_modules', 'vendor', '__pycache__', '.git']);
function sources(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) return [];
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sources(filename) : /\.(?:js|mjs|cjs)$/.test(entry.name) ? [filename] : [];
  });
}
const listOnly = process.argv.includes('--list');
const files = process.argv.length > 2 && !listOnly
  ? process.argv.slice(2).map(filename => path.resolve(filename))
  : [...['game3d', 'tools', 'bible'].flatMap(folder => sources(path.join(root, folder))),
     ...fs.readdirSync(root).filter(name => /\.(?:js|mjs|cjs)$/.test(name)).map(name => path.join(root, name))];
if (listOnly) { console.log(JSON.stringify(files.map(file => path.relative(root, file)).sort())); process.exit(0); }
let failures = 0;
for (const filename of files.sort()) {
  const browserModule = /^(game3d\/js|game3d\/story)\//.test(path.relative(root, filename)) && filename.endsWith('.js');
  const result = spawnSync(process.execPath, browserModule ? ['--check', '--input-type=module'] : ['--check', filename],
    { encoding: 'utf8', timeout: 10000, ...(browserModule ? { input: fs.readFileSync(filename, 'utf8') } : {}) });
  if (result.status !== 0) {
    failures++;
    console.error(`SYNTAX FAIL ${path.relative(root, filename)}\n${result.error?.message || result.stderr || result.stdout}`);
  }
}
console.log(`syntax: ${files.length} active JS files, ${failures} failures (vendor, dependencies and legacy excluded)`);
process.exitCode = failures || !files.length ? 1 : 0;
