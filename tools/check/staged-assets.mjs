import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readStagedFile } from '../lib/staged-tree.mjs';

export const GENERATED_ASSET_LOCK = 'tools/assets/assets.lock.json';
export const GENERATED_ASSET_LOCK_LIMIT = 16 * 1024 * 1024;
export const GENERATED_ASSET_CATALOG = 'tools/assets/assets.json';
export const GENERATED_ASSET_CATALOG_LIMIT = 8 * 1024 * 1024;
// Files under sync.json's large_allow (the shipping game asset folders) may be this big, and no bigger. Scripts and
// JSON also go through the syntax check, which parses at most 2 MiB (staged.mjs).
export const LARGE_ALLOW_LIMIT = 16 * 1024 * 1024;
// Pictures and video stay out of git wherever they are, including every shots folder that captures are written to.
const PICTURE_OR_VIDEO = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'tif', 'tiff', 'psd', 'kra', 'exr',
  'hdr', 'svg', 'mp4', 'webm', 'mov', 'mkv', 'avi']);
const WHERE = 'keep used assets in storage (tools/assets/sync.py push) and scratch output in ~/.cache/amakawa/<name>/';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function generatedJson(bytes, label) {
  assert(!bytes.includes(0), `${label} contains binary data`);
  const source = bytes.toString('utf8');
  assert(Buffer.from(source).equals(bytes), `${label} is not valid UTF-8`);
  return JSON.parse(source);
}
function publicRelativePath(file, label) {
  const parts = file.split('/');
  assert(file.isWellFormed() && file.length <= 4096 && !/[\\\x00-\x1f\x7f]/.test(file) && !/^[a-z]:/i.test(file)
    && parts.every(part => part && !['.', '..', '.git', 'private'].includes(part.toLowerCase())),
  `Unsafe ${label} path: ${file}`);
}
function generatedLockPaths(bytes) {
  const lock = generatedJson(bytes, 'Asset lock');
  assert(record(lock) && Object.keys(lock).sort().join(',') === 'about,files', 'Invalid asset lock schema');
  assert(typeof lock.about === 'string' && lock.about.length > 0 && Buffer.byteLength(lock.about) <= 1024
    && !/[\x00-\x1f\x7f]/.test(lock.about), 'Invalid asset lock description');
  assert(record(lock.files), 'Invalid asset lock files');
  for (const [file, entry] of Object.entries(lock.files)) {
    publicRelativePath(file, 'asset lock');
    assert(record(entry) && Object.keys(entry).sort().join(',') === 'sha256,size,type', `Invalid asset lock record: ${file}`);
    assert(Number.isSafeInteger(entry.size) && entry.size >= 0, `Invalid asset lock size: ${file}`);
    assert(typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256), `Invalid asset lock sha256: ${file}`);
    assert(typeof entry.type === 'string' && entry.type.length <= 255
      && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(entry.type),
      `Invalid asset lock content type: ${file}`);
  }
  return Object.keys(lock.files);
}

// sync.json rules: "dir/" matches a path prefix; any other rule is a glob where * and ? match as in fnmatch.
function ruleMatches(file, rule) {
  if (rule.endsWith('/')) return file.startsWith(rule);
  const source = [...rule].map(char => (char === '*' ? '.*' : char === '?' ? '.' : char.replace(/[.+^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${source}$`, 's').test(file);
}
const anyRule = (file, rules = []) => rules.some(rule => ruleMatches(file, rule));
const limitLabel = bytes => (bytes % (1024 * 1024) === 0 ? `${bytes / (1024 * 1024)} MB` : `${bytes / 1024} KB`);
const binaryFailure = file => `${file}: binary belongs in asset storage; ${WHERE}`;
const sizeFailure = (file, ceiling) => `${file}: text exceeds the ${limitLabel(ceiling)} staged limit; large files stay out of git; ${WHERE}`;
const pictureFailure = file => `${file}: pictures and video stay out of git; game captures go to game3d/shots/<job>/ (git-ignored) and other scratch output to ~/.cache/amakawa/<name>/`;

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
  assert(config.large_allow === undefined
    || (Array.isArray(config.large_allow) && config.large_allow.every(value => typeof value === 'string')),
  'Invalid large-file allowlist');
  const binaryExtensions = new Set(config.binary_ext.map(ext => ext.toLowerCase()));
  const failures = [];
  let lockedPaths = [], catalogPaths = [];
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
    if (change.file === GENERATED_ASSET_CATALOG) {
      const bytes = readStagedFile(cwd, snapshot, change.file, { env, maxBytes: GENERATED_ASSET_CATALOG_LIMIT });
      const catalog = generatedJson(bytes, 'Asset catalog');
      assert(record(catalog) && Array.isArray(catalog.assets) && record(catalog.counts)
        && record(catalog.kinds) && Array.isArray(catalog.statuses), 'Invalid asset catalog schema');
      assert(catalog.assets.every(entry => record(entry) && typeof entry.id === 'string'
        && typeof entry.kind === 'string' && Array.isArray(entry.paths)
        && entry.paths.every(file => typeof file === 'string')), 'Invalid asset catalog entry');
      // The producer owns unique ids and count totals; ids are labels, not filesystem paths.
      catalogPaths = catalog.assets.flatMap(entry => entry.paths);
      for (const file of catalogPaths) publicRelativePath(file, 'asset catalog');
      continue;
    }
    const extension = path.extname(change.file).slice(1).toLowerCase();
    if (change.file.split('/').slice(0, -1).includes('shots') && PICTURE_OR_VIDEO.has(extension)) {
      failures.push(pictureFailure(change.file));
      continue;
    }
    if (anyRule(change.file, config.commit_allow)) continue;
    const ceiling = anyRule(change.file, config.large_allow) ? LARGE_ALLOW_LIMIT : cap;
    if (binaryExtensions.has(extension)) failures.push(binaryFailure(change.file));
    else if (size > ceiling) failures.push(sizeFailure(change.file, ceiling));
    // Every candidate fits its ceiling here, so inspect all its bytes for NUL.
    else if (readStagedFile(cwd, snapshot, change.file, { env, maxBytes: ceiling }).includes(0)) {
      failures.push(binaryFailure(change.file));
    }
  }
  for (const file of lockedPaths) if (anyRule(file, config.never)) failures.push(`${file}: excluded asset lock path`);
  for (const file of catalogPaths) if (anyRule(file, config.never)) failures.push(`${file}: excluded asset catalog path`);
  assert(!failures.length, failures.slice(0, 20).join('\n'));
}
