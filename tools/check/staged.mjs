// A standalone staged syntax check; hook installation and full snapshot checks
// are separate. No file in the shared working tree is replaced or stashed.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'espree';
import { stagedSnapshot, readStagedFile, readStagedPrefix, assertSnapshotCurrent } from '../lib/staged-tree.mjs';

function language(file, source) {
  const extension = path.extname(file);
  if (/^\.[cm]?js$/.test(extension)) return 'javascript';
  if (extension === '.json') return 'json';
  if (extension === '.py') return 'python';
  const interpreter = /^#![^\n]*\b(python(?:[23](?:\.\d+)?)?|node|bash|zsh|sh)(?:\s|$)/.exec(source)?.[1];
  if (interpreter?.startsWith('python')) return 'python';
  if (interpreter === 'node') return 'javascript';
  if (interpreter) return interpreter;
  if (['.sh', '.bash', '.zsh'].includes(extension)) return extension === '.zsh' ? 'zsh' : 'bash';
}

export function checkStagedSyntax(cwd, { env = process.env } = {}) {
  const snapshot = stagedSnapshot(cwd, { env }), failures = [], checked = [];
  for (const change of snapshot.changes) {
    if (change.status === 'D' || !['100644', '100755'].includes(change.mode)) continue;
    const file = change.file;
    const sourceExtension = /\.(?:[cm]?js|json|py|sh|bash|zsh)$/.test(file);
    if (!sourceExtension && path.extname(file) && change.mode !== '100755') continue;
    try {
      if (!sourceExtension) {
        const prefix = readStagedPrefix(cwd, snapshot, file, { env }).toString('utf8');
        if (!prefix.startsWith('#!') || !language(file, prefix)) continue;
      }
      const bytes = readStagedFile(cwd, snapshot, file, { env });
      assert(!bytes.includes(0), 'binary data in source file');
      const source = bytes.toString('utf8');
      assert(Buffer.from(source).equals(bytes), 'source is not valid UTF-8');
      const kind = language(file, source);
      if (!kind) continue;
      if (kind === 'javascript') {
        const commonjs = file.endsWith('.cjs') || ['tools/audio-list.js', 'tools/opening/capture.js'].includes(file);
        parse(source, { ecmaVersion: 'latest', sourceType: commonjs ? 'commonjs' : 'module' });
      } else if (kind === 'json') JSON.parse(source);
      else {
        const python = kind === 'python';
        const command = python ? 'python3' : kind;
        const args = python ? ['-c', 'import sys; compile(sys.stdin.read(), sys.argv[1], "exec")', `<staged>/${file}`] : ['-n'];
        const result = spawnSync(command, args, { cwd, env, input: source, encoding: 'utf8', timeout: 10000 });
        assert(result.status === 0 && !result.error, result.error?.message || result.stderr || 'syntax check failed');
      }
      checked.push(file);
    } catch (error) { failures.push({ file, error: error.message }); }
  }
  assertSnapshotCurrent(cwd, snapshot, { env });
  return { ...snapshot, checked, failures };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkStagedSyntax(process.cwd());
  console.log(`staged syntax: ${result.checked.length} files; ${result.failures.length} failures; diff ${result.diffHash}`);
  for (const failure of result.failures) console.error(`${failure.file}: ${failure.error}`);
  process.exitCode = result.failures.length ? 1 : 0;
}
