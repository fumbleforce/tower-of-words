import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readStagedFile } from '../lib/staged-tree.mjs';

export const GENERATED_ASSET_LOCK = 'tools/assets/assets.lock.json';
export const GENERATED_ASSET_LOCK_LIMIT = 16 * 1024 * 1024;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function generatedLockPaths(bytes) {
  assert(!bytes.includes(0), 'Asset lock contains binary data');
  const source = bytes.toString('utf8');
  assert(Buffer.from(source).equals(bytes), 'Asset lock is not valid UTF-8');
  const lock = JSON.parse(source);
  assert(record(lock) && Object.keys(lock).sort().join(',') === 'about,files', 'Invalid asset lock schema');
  assert(typeof lock.about === 'string' && lock.about.length > 0 && Buffer.byteLength(lock.about) <= 1024
    && !/[\x00-\x1f\x7f]/.test(lock.about), 'Invalid asset lock description');
  assert(record(lock.files), 'Invalid asset lock files');
  for (const [file, entry] of Object.entries(lock.files)) {
    const parts = file.split('/');
    assert(file.isWellFormed() && file.length <= 4096 && !/[\\\x00-\x1f\x7f]/.test(file) && !/^[a-z]:/i.test(file)
      && parts.every(part => part && !['.', '..', '.git', 'private'].includes(part.toLowerCase())),
    `Unsafe asset lock path: ${file}`);
    assert(record(entry) && Object.keys(entry).sort().join(',') === 'sha256,size,type', `Invalid asset lock record: ${file}`);
    assert(Number.isSafeInteger(entry.size) && entry.size >= 0, `Invalid asset lock size: ${file}`);
    assert(typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256), `Invalid asset lock sha256: ${file}`);
    assert(typeof entry.type === 'string' && entry.type.length <= 255
      && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(entry.type),
      `Invalid asset lock content type: ${file}`);
  }
  return Object.keys(lock.files);
}

// Use staged policy and immutable blob bytes; never traverse live asset folders.
export function checkStagedAssets(cwd, snapshot, { env = process.env } = {}) {
  const git = args => execFileSync('git', ['--no-replace-objects', ...args],
    { cwd, env, encoding: 'utf8', timeout: 10000, maxBuffer: 3 * 1024 * 1024 });
  const config = JSON.parse(git(['show', `${snapshot.tree}:tools/assets/sync.json`]));
  const cap = (config.max_text_kb ?? 2048) * 1024;
  assert(Number.isSafeInteger(cap) && cap > 0 && cap <= 16 * 1024 * 1024, 'Invalid asset text-size limit');
  assert(Array.isArray(config.binary_ext) && config.binary_ext.every(value => typeof value === 'string'), 'Invalid binary extensions');
  assert(Array.isArray(config.commit_allow) && config.commit_allow.every(value => typeof value === 'string'), 'Invalid commit allowlist');
  assert(config.never === undefined || (Array.isArray(config.never) && config.never.every(value => typeof value === 'string')),
    'Invalid excluded asset paths');
  const entries = [];
  let lockedPaths = [];
  for (const change of snapshot.changes) {
    assert(!change.file.split('/').includes('private'), 'Private paths cannot be committed');
    if (change.status === 'D') continue;
    assert(['100644', '100755'].includes(change.mode), `Nonregular staged asset: ${change.file}`);
    const size = Number(git(['cat-file', '-s', change.oid]).trim());
    assert(Number.isSafeInteger(size), 'Invalid staged blob size');
    if (change.file === GENERATED_ASSET_LOCK) {
      lockedPaths = generatedLockPaths(readStagedFile(cwd, snapshot, change.file,
        { env, maxBytes: GENERATED_ASSET_LOCK_LIMIT }));
      continue;
    }
    // Every unallowed text candidate fits the cap, so inspect all its bytes for NUL.
    const binary = size <= cap && readStagedFile(cwd, snapshot, change.file, { env, maxBytes: cap }).includes(0);
    entries.push({ file: change.file, size, binary });
  }
  const failures = JSON.parse(execFileSync('python3', ['-c', `import fnmatch,json,os,sys
data=json.load(sys.stdin)
conf=data['config']; cap=data['cap']; failures=[]
extensions={'.'+ext.lower() for ext in conf['binary_ext']}
for p in data['lockedPaths']:
    if any(p.startswith(rule) if rule.endswith('/') else fnmatch.fnmatchcase(p, rule) for rule in conf.get('never', [])):
        failures.append(p+': excluded asset lock path')
for entry in data['entries']:
    p=entry['file']
    if any(p.startswith(rule) if rule.endswith('/') else fnmatch.fnmatchcase(p, rule) for rule in conf['commit_allow']): continue
    if entry['binary'] or os.path.splitext(p)[1].lower() in extensions: failures.append(p+': binary belongs in asset storage')
    elif entry['size']>cap: failures.append(p+': text exceeds staged size limit')
print(json.dumps(failures[:20]))`], { cwd, env, input: JSON.stringify({ config, cap, entries, lockedPaths }),
    encoding: 'utf8', timeout: 10000, maxBuffer: 3 * 1024 * 1024 }));
  assert(!failures.length, failures.join('\n'));
}
