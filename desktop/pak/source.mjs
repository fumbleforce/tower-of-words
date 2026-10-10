// Where the desktop shell gets game files from: a plain folder (openDir, for development) or an encrypted content
// pack (openPak, for releases; desktop/pak/FORMAT.md). Both return the same object:
//   has(path) -> boolean            list(prefix) -> sorted paths under prefix
//   stat(path) -> {size, type}      read(path) -> Promise<Buffer>
//   stream(path, {start, end}) -> web ReadableStream of bytes start..end, end inclusive like an HTTP Range
// Paths are URL paths without a leading slash (game3d/js/main.js). A missing path throws PakError PAK_NOT_FOUND.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import {
  CHUNK, HEADER, MAGIC, TAG, TRAILER, TRAILER_MAGIC, VERSION, PakError, chunkCount, chunkNonce, deriveKeys, diskSize,
  mimeType, normalPath,
} from './format.mjs';

const BATCH = 16; // chunks per disk read when streaming: 1 MB, the most a stream holds at once
const notFound = p => new PakError('PAK_NOT_FOUND', `no such file in the game content: ${p}`);
const prefixOf = prefix => String(prefix || '').replace(/^\/+/, '');

// Clamp an inclusive byte range to a file of the given size; null when nothing is left.
function range(size, { start = 0, end = size - 1 } = {}) {
  start = Math.max(0, Math.floor(start));
  end = Math.min(size - 1, Math.floor(end));
  return start > end ? null : { start, end };
}
const emptyStream = () => new ReadableStream({ start: c => c.close() });

export function openDir(root) {
  root = path.resolve(root);
  let all = null;
  const file = p => {
    const abs = path.join(root, normalPath(p));
    let st;
    try { st = fs.statSync(abs); } catch { return null; }
    return st.isFile() ? { abs, size: st.size } : null;
  };
  const need = p => file(p) || (() => { throw notFound(p); })();
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => {
    const rel = dir ? `${dir}/${e.name}` : e.name;
    const st = e.isSymbolicLink() ? fs.statSync(path.join(root, rel), { throwIfNoEntry: false }) : e;
    return !st ? [] : st.isDirectory() ? walk(rel) : st.isFile() ? [rel] : [];
  });
  return {
    has: p => { try { return !!file(p); } catch { return false; } },
    list: prefix => (all ||= walk('').sort()).filter(p => p.startsWith(prefixOf(prefix))),
    stat: p => ({ size: need(p).size, type: mimeType(p) }),
    read: async p => fs.promises.readFile(need(p).abs),
    stream: (p, opts) => {
      const { abs, size } = need(p);
      const r = range(size, opts);
      return r ? Readable.toWeb(fs.createReadStream(abs, r)) : emptyStream();
    },
  };
}

function readIndex(fd, file, keys) {
  const size = fs.fstatSync(fd).size;
  const header = Buffer.alloc(HEADER), trailer = Buffer.alloc(TRAILER);
  if (size >= HEADER) fs.readSync(fd, header, 0, HEADER, 0);
  if (!header.subarray(0, 8).equals(MAGIC)) throw new PakError('PAK_NOT_A_PACK', `${file} is not a content pack`);
  if (header.readUInt32BE(8) !== VERSION || header.readUInt32BE(12) !== CHUNK)
    throw new PakError('PAK_VERSION', `${file} is pack version ${header.readUInt32BE(8)}; this build reads version ${VERSION}`);
  if (!crypto.timingSafeEqual(header.subarray(16, 32), keys.check))
    throw new PakError('PAK_WRONG_KEY', `${file} was packed with a different key`);
  if (size >= HEADER + TRAILER) fs.readSync(fd, trailer, 0, TRAILER, size - TRAILER);
  if (size < HEADER + TRAILER || !trailer.subarray(40).equals(TRAILER_MAGIC))
    throw new PakError('PAK_TRUNCATED', `${file} is truncated (its end marker is missing)`);
  const indexAt = Number(trailer.readBigUInt64BE(0)), indexLen = trailer.readUInt32BE(8);
  if (indexAt < HEADER || indexAt + indexLen + TRAILER !== size)
    throw new PakError('PAK_CORRUPT', `${file} is corrupt (index position does not match the file size)`);
  const sealed = Buffer.alloc(indexLen);
  fs.readSync(fd, sealed, 0, indexLen, indexAt);
  let index;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', keys.index, trailer.subarray(12, 24));
    d.setAuthTag(trailer.subarray(24, 40));
    index = JSON.parse(Buffer.concat([d.update(sealed), d.final()]).toString('utf8'));
  } catch {
    throw new PakError('PAK_CORRUPT', `${file} is corrupt (its index failed authentication)`);
  }
  const files = new Map();
  for (const [p, [offset, size, stored, nonce, type, z]] of Object.entries(index.files)) {
    if (offset + diskSize(stored) > indexAt) throw new PakError('PAK_CORRUPT', `${file} is corrupt (${p} runs past the data)`);
    files.set(p, { offset, size, stored, prefix: Buffer.from(nonce, 'hex'), type, z });
  }
  return files;
}

// Open a pack synchronously: reads and authenticates only the header, trailer and index. File bytes are read and
// decrypted per request, one 64 KB chunk at a time.
export function openPak(file, key) {
  const keys = deriveKeys(key);
  const fd = fs.openSync(file, 'r');
  let files;
  try { files = readIndex(fd, file, keys); } catch (error) { fs.closeSync(fd); throw error; }
  const paths = [...files.keys()].sort();
  const entry = p => files.get(prefixOf(p)) || (() => { throw notFound(p); })();
  const pread = (buffer, position) => new Promise((resolve, reject) =>
    fs.read(fd, buffer, 0, buffer.length, position, (error, n) => (error ? reject(error)
      : n < buffer.length ? reject(new PakError('PAK_TRUNCATED', `${file} is truncated`)) : resolve(buffer))));

  // Decrypt chunks first..first+count-1 of an entry. Returns one Buffer per chunk.
  async function chunks(e, first, count) {
    const begin = first * (CHUNK + TAG);
    const last = Math.min(first + count, chunkCount(e.stored));
    const plainEnd = Math.min(last * CHUNK, e.stored);
    const raw = await pread(Buffer.allocUnsafe(plainEnd - first * CHUNK + (last - first) * TAG), e.offset + begin);
    const out = [];
    for (let i = first, at = 0; i < last; i++) {
      const len = Math.min(CHUNK, e.stored - i * CHUNK);
      const d = crypto.createDecipheriv('aes-256-gcm', keys.content, chunkNonce(e.prefix, i));
      d.setAuthTag(raw.subarray(at + len, at + len + TAG));
      try {
        const head = d.update(raw.subarray(at, at + len)), tail = d.final();
        out.push(tail.length ? Buffer.concat([head, tail]) : head);
      } catch {
        throw new PakError('PAK_CORRUPT', `${file} is corrupt (chunk ${i} failed authentication)`);
      }
      at += len + TAG;
    }
    return out;
  }

  async function read(p) {
    const e = entry(p);
    if (!e.stored) return Buffer.alloc(0);
    const parts = await chunks(e, 0, chunkCount(e.stored));
    const stored = parts.length === 1 ? parts[0] : Buffer.concat(parts, e.stored);
    return e.z ? zlib.zstdDecompressSync(stored) : stored;
  }

  function stream(p, opts) {
    const e = entry(p);
    const r = range(e.size, opts);
    if (!r) return emptyStream();
    if (e.z) // compressed text is small: decompress it whole and slice
      return new ReadableStream({ async start(c) {
        try { c.enqueue((await read(p)).subarray(r.start, r.end + 1)); c.close(); } catch (error) { c.error(error); }
      } });
    let next = Math.floor(r.start / CHUNK);
    const lastChunk = Math.floor(r.end / CHUNK);
    return new ReadableStream({
      async pull(c) {
        try {
          const first = next, parts = await chunks(e, first, Math.min(BATCH, lastChunk - first + 1));
          next += parts.length;
          for (let k = 0; k < parts.length; k++) {
            const base = (first + k) * CHUNK;
            const piece = parts[k].subarray(Math.max(0, r.start - base), Math.min(parts[k].length, r.end + 1 - base));
            if (piece.length) c.enqueue(piece);
          }
          if (next > lastChunk) c.close();
        } catch (error) { c.error(error); }
      },
    });
  }

  return {
    has: p => files.has(prefixOf(p)),
    list: prefix => paths.filter(p => p.startsWith(prefixOf(prefix))),
    stat: p => { const e = entry(p); return { size: e.size, type: e.type }; },
    read,
    stream,
    close: () => fs.closeSync(fd),
  };
}
