// Build an encrypted content pack (desktop/pak/FORMAT.md).
//   node desktop/pak/pack.mjs --list files.json --out content.pak [--zstd]
// files.json is [{src, dest}]: src a file on disk (relative to the list file's folder or absolute), dest its URL path
// in the game (game3d/js/main.js). The key comes from DESKTOP_PAK_KEY or desktop/.key (desktop/pak/key.mjs).
// The same inputs and key give the same bytes.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  CHUNK, HEADER, MAGIC, TAG, TRAILER, TRAILER_MAGIC, VERSION, PakError, chunkCount, chunkNonce, compressible,
  deriveKeys, mimeType, normalPath,
} from './format.mjs';
import { loadKey } from './key.mjs';

// With --zstd, text is stored zstd-compressed when that saves at least an eighth. Off by default: it made startup
// slower (FORMAT.md, Benchmark); its only gain is a smaller installer.
function storedForm(dest, data, compress) {
  if (!compress || !compressible(dest) || data.length < 512) return { stored: data, z: 0 };
  const packed = zlib.zstdCompressSync(data, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 } });
  return packed.length <= data.length * 0.875 ? { stored: packed, z: 1 } : { stored: data, z: 0 };
}

function encryptBlob(keys, stored, prefix) {
  const parts = [];
  for (let i = 0, n = chunkCount(stored.length); i < n; i++) {
    const cipher = crypto.createCipheriv('aes-256-gcm', keys.content, chunkNonce(prefix, i));
    parts.push(cipher.update(stored.subarray(i * CHUNK, (i + 1) * CHUNK)), cipher.final(), cipher.getAuthTag());
  }
  return parts;
}

// files: [{src, dest}]; key: 32-byte Buffer or hex. Writes out atomically and returns counts and sizes.
export function pack({ files, out, key, compress = false }) {
  const keys = deriveKeys(key);
  const list = files.map(f => ({ src: f.src, dest: normalPath(f.dest) })).sort((a, b) => (a.dest < b.dest ? -1 : a.dest > b.dest ? 1 : 0));
  for (let i = 1; i < list.length; i++)
    if (list[i].dest === list[i - 1].dest) throw new PakError('PAK_DUPLICATE', `two files for ${list[i].dest}`);
  const tmp = `${out}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    const header = Buffer.alloc(HEADER);
    MAGIC.copy(header, 0);
    header.writeUInt32BE(VERSION, 8);
    header.writeUInt32BE(CHUNK, 12);
    keys.check.copy(header, 16);
    fs.writeSync(fd, header);
    let offset = HEADER, bytesIn = 0, unique = 0;
    const blobs = new Map(), index = {};
    for (const { src, dest } of list) {
      const data = fs.readFileSync(src);
      bytesIn += data.length;
      const { stored, z } = storedForm(dest, data, compress);
      // The nonce prefix is a keyed hash of the stored bytes: deterministic, unique per distinct content, and equal
      // content is stored once.
      const mac = crypto.createHmac('sha256', keys.nonce).update(stored).digest();
      const id = mac.toString('hex');
      let blob = blobs.get(id);
      if (!blob) {
        const parts = encryptBlob(keys, stored, mac);
        for (const part of parts) fs.writeSync(fd, part);
        blob = { offset, stored: stored.length, nonce: mac.subarray(0, 8).toString('hex') };
        offset += stored.length + chunkCount(stored.length) * TAG;
        blobs.set(id, blob);
        unique++;
      }
      index[dest] = [blob.offset, data.length, blob.stored, blob.nonce, mimeType(dest), z];
    }
    const plain = Buffer.from(JSON.stringify({ v: VERSION, chunk: CHUNK, files: index }));
    const nonce = crypto.createHmac('sha256', keys.index).update(plain).digest().subarray(0, 12);
    const cipher = crypto.createCipheriv('aes-256-gcm', keys.index, nonce);
    const sealed = Buffer.concat([cipher.update(plain), cipher.final()]);
    const trailer = Buffer.alloc(TRAILER);
    trailer.writeBigUInt64BE(BigInt(offset), 0);
    trailer.writeUInt32BE(sealed.length, 8);
    nonce.copy(trailer, 12);
    cipher.getAuthTag().copy(trailer, 24);
    TRAILER_MAGIC.copy(trailer, 40);
    fs.writeSync(fd, sealed);
    fs.writeSync(fd, trailer);
    fs.closeSync(fd);
    fs.renameSync(tmp, out);
    return { files: list.length, unique, bytesIn, bytesOut: offset + sealed.length + TRAILER };
  } catch (error) {
    try { fs.closeSync(fd); } catch { /* already closed */ }
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}

function main(argv) {
  const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const listFile = arg('--list'), out = arg('--out');
  if (!listFile || !out) {
    console.error('usage: node desktop/pak/pack.mjs --list files.json --out content.pak [--zstd]');
    process.exit(2);
  }
  const base = path.dirname(path.resolve(listFile));
  const files = JSON.parse(fs.readFileSync(listFile, 'utf8')).map(f => ({ src: path.resolve(base, f.src), dest: f.dest }));
  const { key, from, created } = loadKey();
  const start = performance.now();
  const r = pack({ files, out, key, compress: argv.includes('--zstd') });
  const mb = n => (n / 1048576).toFixed(1);
  console.log(`${out}: ${r.files} files (${r.unique} distinct), ${mb(r.bytesIn)} MB in, ${mb(r.bytesOut)} MB out, `
    + `${((performance.now() - start) / 1000).toFixed(2)} s; key from ${from}${created ? ' (new key created)' : ''}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
