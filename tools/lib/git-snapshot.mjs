import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { isolatedGitEnvironment } from './git-environment.mjs';

const git = (cwd, args, env, input) => execFileSync('git', ['--no-replace-objects', ...args],
  { cwd, env, input, encoding: 'utf8', timeout: 10000, maxBuffer: 16 * 1024 * 1024 });

// Descend one tree at a time so private subtrees are never listed or opened.
export function publicTree(cwd, tree, { env = process.env, readTree = oid => git(cwd, ['ls-tree', '-z', '-l', oid], env) } = {}) {
  assert(/^[a-f0-9]{40,64}$/.test(tree), 'Snapshot needs an immutable tree object');
  const entries = [];
  function walk(oid, prefix = '') {
    for (const record of readTree(oid).split('\0').filter(Boolean)) {
      const match = /^(\d{6}) (\w+) ([a-f0-9]{40,64})\s+(-|\d+)\t([\s\S]+)$/.exec(record);
      assert(match, 'Malformed snapshot tree');
      const [, mode, type, object, size, name] = match;
      assert(!['.', '..'].includes(name) && !name.includes('/') && name.toLowerCase() !== '.git', 'Unsafe Git tree name');
      if (name === 'private') continue;
      const file = prefix + name;
      if (type === 'tree') walk(object, file + '/');
      else {
        assert(type === 'blob' && ['100644', '100755'].includes(mode), `Snapshot refuses nonregular file: ${file}`);
        assert(Number.isSafeInteger(+size), 'Invalid snapshot blob size');
        entries.push({ file, mode, oid: object, bytes: +size });
      }
    }
  }
  walk(tree);
  return entries;
}

class BlobReader {
  constructor(stream) { this.iterator = stream[Symbol.asyncIterator](); this.pending = Buffer.alloc(0); }
  async more() {
    const result = await this.iterator.next();
    assert(!result.done, 'Git blob stream ended early');
    this.pending = this.pending.length ? Buffer.concat([this.pending, result.value]) : result.value;
  }
  async line() {
    while (!this.pending.includes(10)) { assert(this.pending.length < 200, 'Invalid Git blob header'); await this.more(); }
    const end = this.pending.indexOf(10), line = this.pending.subarray(0, end).toString('ascii');
    this.pending = this.pending.subarray(end + 1);
    return line;
  }
  async bytes(size, consume) {
    while (size) {
      if (!this.pending.length) await this.more();
      const count = Math.min(size, this.pending.length);
      consume(this.pending.subarray(0, count));
      this.pending = this.pending.subarray(count);
      size -= count;
    }
  }
}

async function writeBlobs(cwd, directory, entries, env, timeoutMs, signal) {
  signal?.throwIfAborted();
  const child = spawn('git', ['--no-replace-objects', 'cat-file', '--batch'], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
  const closed = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`Git blob reader failed: ${code}; ${stderr}`)));
  });
  closed.catch(() => {});
  child.stdin.on('error', () => {}); // The exit/reader failure below reports a broken pipe.
  const abort = () => child.kill('SIGKILL');
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const reader = new BlobReader(child.stdout);
  try {
    for (const entry of entries) {
      child.stdin.write(entry.oid + '\n');
      assert.equal(await reader.line(), `${entry.oid} blob ${entry.bytes}`, 'Snapshot blob identity changed');
      const file = path.join(directory, entry.file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const fd = fs.openSync(file, 'wx', entry.mode === '100755' ? 0o755 : 0o644);
      try {
        await reader.bytes(entry.bytes, chunk => {
          let offset = 0;
          while (offset < chunk.length) {
            const written = fs.writeSync(fd, chunk, offset, chunk.length - offset);
            assert(written > 0, 'Snapshot write made no progress');
            offset += written;
          }
        });
      }
      finally { fs.closeSync(fd); }
      await reader.bytes(1, chunk => assert.equal(chunk[0], 10, 'Missing blob terminator'));
    }
    child.stdin.end();
    await closed;
    signal?.throwIfAborted();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    if (child.exitCode === null) child.kill('SIGKILL');
    await closed.catch(() => {});
  }
}

export async function withGitSnapshot(cwd, tree, use, { env = process.env, timeoutMs = 60000, signal } = {}) {
  signal?.throwIfAborted();
  const entries = publicTree(cwd, tree, { env });
  const cleanEnv = isolatedGitEnvironment(env);
  const format = git(cwd, ['rev-parse', '--show-object-format'], env).trim();
  assert(['sha1', 'sha256'].includes(format), 'Unsupported Git object format');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `codex-git-snapshot-${process.pid}-`));
  try {
    await writeBlobs(cwd, directory, entries, env, timeoutMs, signal);
    // Separate metadata lets checks query tracked paths without reading the shared index.
    git(directory, ['init', '--quiet', '--template=', `--object-format=${format}`], cleanEnv);
    const objects = git(cwd, ['rev-parse', '--path-format=absolute', '--git-path', 'objects'], env).trim();
    fs.writeFileSync(path.join(directory, '.git/objects/info/alternates'), objects + '\n');
    const records = entries.map(entry => `${entry.mode} ${entry.oid}\t${entry.file}\0`).join('');
    git(directory, ['-c', 'core.splitIndex=false', 'update-index', '-z', '--index-info'], cleanEnv, records);
    signal?.throwIfAborted();
    return await use({ directory, entries, env: cleanEnv, tree, signal });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
}
