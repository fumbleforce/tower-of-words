// Shared pieces of the content pack format (desktop/pak/FORMAT.md): layout constants, key derivation, nonces,
// MIME types, path rules and the error type. pack.mjs writes this format and source.mjs reads it.
import crypto from 'node:crypto';

export const MAGIC = Buffer.from('AMKWPAK1');
export const TRAILER_MAGIC = Buffer.from('AMKWEND1');
export const VERSION = 1;
export const CHUNK = 64 * 1024;
export const TAG = 16;
export const HEADER = 32; // magic 8, version u32, chunk u32, key check 16
export const TRAILER = 48; // index offset u64, index length u32, nonce 12, tag 16, magic 8

export class PakError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PakError';
    this.code = code;
  }
}

// A 32-byte key as a Buffer or 64 hex characters.
export function parseKey(key) {
  if (Buffer.isBuffer(key) && key.length === 32) return key;
  if (typeof key === 'string' && /^[0-9a-f]{64}$/i.test(key.trim())) return Buffer.from(key.trim(), 'hex');
  throw new PakError('PAK_BAD_KEY', 'content pack key must be 32 bytes (64 hex characters)');
}

// One master key, four independent subkeys, so the index, the file contents, the nonces and the key check never
// share a key.
export function deriveKeys(master) {
  const sub = purpose => Buffer.from(crypto.hkdfSync('sha256', parseKey(master), Buffer.alloc(0), `amakawa-pak v1 ${purpose}`, 32));
  const check = crypto.createHmac('sha256', sub('check')).update('key check').digest().subarray(0, 16);
  return { content: sub('content'), index: sub('index'), nonce: sub('nonce'), check };
}

// The 12-byte GCM nonce of chunk i of a blob: its 8-byte nonce prefix and the chunk number.
export function chunkNonce(prefix, i) {
  const nonce = Buffer.allocUnsafe(12);
  prefix.copy(nonce, 0, 0, 8);
  nonce.writeUInt32BE(i, 8);
  return nonce;
}

export const chunkCount = stored => Math.ceil(stored / CHUNK);
export const diskSize = stored => stored + chunkCount(stored) * TAG;

const TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8', svg: 'image/svg+xml', xml: 'application/xml', wasm: 'application/wasm',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  ico: 'image/x-icon', mp3: 'audio/mpeg', ogg: 'audio/ogg', wav: 'audio/wav', m4a: 'audio/mp4', opus: 'audio/ogg',
  mp4: 'video/mp4', webm: 'video/webm', glb: 'model/gltf-binary', gltf: 'model/gltf+json', bin: 'application/octet-stream',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', vtt: 'text/vtt; charset=utf-8',
  ktx2: 'image/ktx2', hdr: 'image/vnd.radiance',
};
const ext = path => path.slice(path.lastIndexOf('.') + 1).toLowerCase();
export const mimeType = path => TYPES[ext(path)] || 'application/octet-stream';
// Text compresses; images, audio, video and fonts already are compressed and are stored as they are.
export const compressible = path => /^(?:text\/|application\/(?:json|xml|wasm)|image\/svg|model\/gltf\+json)/.test(mimeType(path));

// URL paths inside the pack: relative, forward slashes, no empty, dot or dot-dot segments.
export function normalPath(path) {
  const p = String(path).replace(/^\/+/, '');
  if (!p || p.includes('\\') || p.includes('\0') || p.split('/').some(s => !s || s === '.' || s === '..'))
    throw new PakError('PAK_BAD_PATH', `not a content path: ${JSON.stringify(String(path))}`);
  return p;
}
