// The desktop content pack (desktop/pak/FORMAT.md): round trip, ranges at chunk edges, empty files, wrong key,
// truncation and corruption, path lookup, determinism, and that openDir and openPak answer the same.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { pack } from '../../../desktop/pak/pack.mjs';
import { openDir, openPak } from '../../../desktop/pak/source.mjs';
import { CHUNK } from '../../../desktop/pak/format.mjs';
import { loadKey } from '../../../desktop/pak/key.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pak-test-'));
process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
const key = crypto.randomBytes(32);
const big = crypto.randomBytes(3 * CHUNK + 1234); // random: stored as is, spans four chunks
const text = Buffer.from('export const hello = "world";\n'.repeat(5000)); // compresses
const fixtures = {
  'game3d/index.html': Buffer.from('<!doctype html><title>t</title>'),
  'game3d/js/main.js': text,
  'game3d/js/copy.js': text, // same bytes as main.js: stored once
  'game3d/assets/big.glb': big,
  'game3d/assets/exact.bin': crypto.randomBytes(2 * CHUNK),
  'game3d/empty.json': Buffer.alloc(0),
  'game3d/data/x.json': Buffer.from('{"a":1}'),
};
const root = path.join(dir, 'root');
for (const [p, data] of Object.entries(fixtures)) {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), data);
}
const files = Object.keys(fixtures).map(dest => ({ src: path.join(root, dest), dest }));
const pakFile = path.join(dir, 'content.pak');
const result = pack({ files, out: pakFile, key, compress: true }); // text compressed, binaries raw: both paths
const pak = openPak(pakFile, key);
const plain = openDir(root);
const collect = async stream => Buffer.concat(await Array.fromAsync(stream));

test('every file reads back byte for byte, through read and a whole stream, from pack and folder', async () => {
  for (const [p, data] of Object.entries(fixtures)) {
    for (const source of [pak, plain]) {
      assert.ok((await source.read(p)).equals(data), p);
      assert.ok((await collect(source.stream(p))).equals(data), p);
      assert.deepEqual(source.stat(p).size, data.length);
    }
    assert.equal(pak.stat(p).type, plain.stat(p).type);
  }
  assert.equal(pak.stat('game3d/js/main.js').type, 'text/javascript; charset=utf-8');
  assert.equal(result.unique, Object.keys(fixtures).length - 1);
});

test('ranges at and around chunk edges return exactly the bytes asked for', async () => {
  const edges = [0, 1, CHUNK - 1, CHUNK, CHUNK + 1, 2 * CHUNK - 1, 2 * CHUNK, 3 * CHUNK, big.length - 2, big.length - 1];
  for (const start of edges) for (const end of edges) {
    if (end < start) continue;
    for (const source of [pak, plain]) {
      const got = await collect(source.stream('game3d/assets/big.glb', { start, end }));
      assert.ok(got.equals(big.subarray(start, end + 1)), `${start}-${end}`);
    }
  }
  const mid = await collect(pak.stream('game3d/js/main.js', { start: 100, end: 199 }));
  assert.ok(mid.equals(text.subarray(100, 200)), 'range inside a compressed file');
  const past = await collect(pak.stream('game3d/assets/big.glb', { start: big.length - 10, end: big.length + 1000 }));
  assert.ok(past.equals(big.subarray(big.length - 10)), 'end past the file is clamped');
  assert.equal((await collect(pak.stream('game3d/empty.json', { start: 0, end: 0 }))).length, 0);
});

test('a large range is served without reading the whole file at once', async () => {
  const reads = [];
  const original = fs.read;
  fs.read = (fd, buffer, ...rest) => { reads.push(buffer.length); return original(fd, buffer, ...rest); };
  try { await collect(pak.stream('game3d/assets/big.glb', { start: 10, end: big.length - 10 })); } finally { fs.read = original; }
  assert.ok(reads.length >= 1 && Math.max(...reads) <= 16 * (CHUNK + 16), `largest read ${Math.max(...reads)}`);
});

test('path lookup: has, list, missing paths and leading slashes', async () => {
  for (const source of [pak, plain]) {
    assert.equal(source.has('game3d/js/main.js'), true);
    assert.equal(source.has('/game3d/js/main.js'), true);
    assert.equal(source.has('game3d/js/nope.js'), false);
    assert.equal(source.has('game3d/../game3d/js/main.js'), false);
    assert.deepEqual(source.list('game3d/js/'), ['game3d/js/copy.js', 'game3d/js/main.js']);
    assert.equal(source.list('').length, Object.keys(fixtures).length);
    assert.throws(() => source.stat('game3d/missing.js'), { code: 'PAK_NOT_FOUND' });
    await assert.rejects(source.read('game3d/missing.js'), { code: 'PAK_NOT_FOUND' });
  }
});

test('the same inputs and key give the same pack; another key gives another', () => {
  const again = path.join(dir, 'again.pak'), other = path.join(dir, 'other.pak');
  pack({ files: [...files].reverse(), out: again, key, compress: true });
  pack({ files, out: other, key: crypto.randomBytes(32) });
  assert.ok(fs.readFileSync(again).equals(fs.readFileSync(pakFile)));
  assert.ok(!fs.readFileSync(other).equals(fs.readFileSync(pakFile)));
  assert.ok(!fs.readFileSync(pakFile).includes(Buffer.from('game3d/js')), 'paths are not readable in the pack');
  assert.ok(!fs.readFileSync(pakFile).includes(Buffer.from('<!doctype')), 'contents are not readable in the pack');
});

test('a wrong key fails clearly', () => {
  assert.throws(() => openPak(pakFile, crypto.randomBytes(32)), { code: 'PAK_WRONG_KEY' });
  assert.throws(() => openPak(pakFile, 'not a key'), { code: 'PAK_BAD_KEY' });
});

test('a truncated or corrupt pack fails clearly, never with garbage', async () => {
  const bytes = fs.readFileSync(pakFile);
  const variant = (name, buf) => { const f = path.join(dir, name); fs.writeFileSync(f, buf); return f; };
  for (const cut of [0, 10, 40, bytes.length - 1, bytes.length - 60])
    assert.throws(() => openPak(variant(`cut${cut}.pak`, bytes.subarray(0, cut)), key), { code: /PAK_(TRUNCATED|NOT_A_PACK|CORRUPT)/ }, `cut at ${cut}`);
  const flipIndex = Buffer.from(bytes); flipIndex[bytes.length - 60] ^= 1;
  assert.throws(() => openPak(variant('index.pak', flipIndex), key), { code: 'PAK_CORRUPT' });
  const flipData = Buffer.from(bytes); flipData[40 + CHUNK + 100] ^= 1; // inside some file's chunk data
  const bad = openPak(variant('data.pak', flipData), key);
  let failures = 0;
  for (const p of Object.keys(fixtures)) {
    try { assert.ok((await bad.read(p)).equals(fixtures[p])); } catch (error) { assert.equal(error.code, 'PAK_CORRUPT'); failures++; }
    try { assert.ok((await collect(bad.stream(p))).equals(fixtures[p])); } catch (error) { assert.equal(error.code, 'PAK_CORRUPT'); }
  }
  assert.ok(failures >= 1, 'the flipped byte was detected');
  bad.close();
});

test('the build key comes from DESKTOP_PAK_KEY, else a key file created once', () => {
  const hex = crypto.randomBytes(32).toString('hex');
  assert.equal(loadKey({ env: { DESKTOP_PAK_KEY: hex } }).key.toString('hex'), hex);
  const file = path.join(dir, '.key');
  const first = loadKey({ env: {}, file });
  assert.equal(first.created, true);
  assert.ok(loadKey({ env: {}, file }).key.equals(first.key));
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});
