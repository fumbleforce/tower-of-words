import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readStagedFile } from '../lib/staged-tree.mjs';

// Use staged policy and immutable blob bytes; never traverse live asset folders.
export function checkStagedAssets(cwd, snapshot, { env = process.env } = {}) {
  const git = args => execFileSync('git', ['--no-replace-objects', ...args],
    { cwd, env, encoding: 'utf8', timeout: 10000, maxBuffer: 3 * 1024 * 1024 });
  const config = JSON.parse(git(['show', `${snapshot.tree}:tools/assets/sync.json`]));
  const cap = (config.max_text_kb ?? 2048) * 1024;
  assert(Number.isSafeInteger(cap) && cap > 0 && cap <= 16 * 1024 * 1024, 'Invalid asset text-size limit');
  assert(Array.isArray(config.binary_ext) && config.binary_ext.every(value => typeof value === 'string'), 'Invalid binary extensions');
  assert(Array.isArray(config.commit_allow) && config.commit_allow.every(value => typeof value === 'string'), 'Invalid commit allowlist');
  const entries = [];
  for (const change of snapshot.changes) {
    assert(!change.file.split('/').includes('private'), 'Private paths cannot be committed');
    if (change.status === 'D') continue;
    assert(['100644', '100755'].includes(change.mode), `Nonregular staged asset: ${change.file}`);
    const size = Number(git(['cat-file', '-s', change.oid]).trim());
    assert(Number.isSafeInteger(size), 'Invalid staged blob size');
    // Every unallowed text candidate fits the cap, so inspect all its bytes for NUL.
    const binary = size <= cap && readStagedFile(cwd, snapshot, change.file, { env, maxBytes: cap }).includes(0);
    entries.push({ file: change.file, size, binary });
  }
  const failures = JSON.parse(execFileSync('python3', ['-c', `import fnmatch,json,os,sys
data=json.load(sys.stdin)
conf=data['config']; cap=data['cap']; failures=[]
extensions={'.'+ext.lower() for ext in conf['binary_ext']}
for entry in data['entries']:
    p=entry['file']
    if any(p.startswith(rule) if rule.endswith('/') else fnmatch.fnmatchcase(p, rule) for rule in conf['commit_allow']): continue
    if entry['binary'] or os.path.splitext(p)[1].lower() in extensions: failures.append(p+': binary belongs in asset storage')
    elif entry['size']>cap: failures.append(p+': text exceeds staged size limit')
print(json.dumps(failures))`], { cwd, env, input: JSON.stringify({ config, cap, entries }),
    encoding: 'utf8', timeout: 10000, maxBuffer: 3 * 1024 * 1024 }));
  assert(!failures.length, failures.join('\n'));
}
