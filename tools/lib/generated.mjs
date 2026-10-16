// Files that a tool writes and git does not track: tools/generated.json names each one and its builder. A consumer
// that reads one calls ensureGenerated() first, so a missing file is built (./start rebuilds every one on each serve).
// trackedGenerated() lists the ones git tracks, and the unit test game3d/test/unit/generated-outputs.test.mjs fails on any.
//   node tools/lib/generated.mjs            build the missing outputs in this checkout
//   node tools/lib/generated.mjs --list     show each output and whether it exists
//   node tools/lib/generated.mjs --tracked  show the outputs git tracks (exit 1 if any)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedGitEnvironment } from './git-environment.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function generatedOutputs(root = ROOT) {
  return JSON.parse(fs.readFileSync(path.join(root, 'tools/generated.json'), 'utf8')).outputs;
}

// Builds the missing outputs (only the listed paths, when given) and returns their paths. A builder that writes two
// outputs runs once.
export function ensureGenerated(only, root = ROOT) {
  const missing = generatedOutputs(root)
    .filter(o => (!only || only.includes(o.path)) && !fs.existsSync(path.join(root, o.path)));
  const ran = new Set();
  for (const { builder } of missing) {
    const key = builder.join(' ');
    if (ran.has(key)) continue;
    ran.add(key);
    const r = spawnSync(builder[0], builder.slice(1), { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) {
      const tail = `${r.stderr || ''}${r.stdout || ''}`.trim().split('\n').slice(-8).join('\n');
      throw new Error(`${key} failed:\n${tail}`);
    }
  }
  return missing.map(o => o.path);
}

// The outputs git tracks in this checkout, or null where there is no git (a plain copy of the files).
export function trackedGenerated(root = ROOT) {
  if (!fs.existsSync(path.join(root, '.git'))) return null;
  const listed = generatedOutputs(root).map(o => o.path);
  const out = execFileSync('git', ['ls-files', '-z', '--', ...listed],
    { cwd: root, env: isolatedGitEnvironment(), encoding: 'utf8' });
  return out.split('\0').filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--list')) {
      for (const o of generatedOutputs()) {
        console.log(`${fs.existsSync(path.join(ROOT, o.path)) ? 'built  ' : 'missing'} ${o.path}  (${o.builder.join(' ')})`);
      }
    } else if (process.argv.includes('--tracked')) {
      const tracked = trackedGenerated() ?? [];
      for (const file of tracked) console.log(`tracked ${file}`);
      process.exitCode = tracked.length ? 1 : 0;
    } else {
      const built = ensureGenerated();
      console.log(built.length ? `generated: built ${built.join(', ')}` : 'generated: every output is present');
    }
  } catch (error) {
    console.error(`generated: ${error.message}`);
    process.exitCode = 1;
  }
}
