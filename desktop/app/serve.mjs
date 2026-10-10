// The app:// protocol handler: serves the game's files from a content source (desktop/pak/source.mjs: a plain folder
// in a dev build, the encrypted pack in a release) at their URL paths, so app://game/game3d/index.html is the page and
// every origin-relative path the game asks for works unchanged.
//
// Pure: takes a Request, returns a Response, knows nothing of Electron (desktop/test/serve.test.mjs runs it in Node).
//   source   has / stat(path) -> {size} / read(path) -> Promise<Buffer> / stream(path, {start, end}) -> ReadableStream (end inclusive)
//   extra    optional: handle(pathname, request) -> Response | null, asked first (the full flavor's own routes)
//   ready    optional: () => false while no content may be read (a start page is still open); content gets 403
// Anything else under /api/ gets a quiet 404, as do missing files and paths outside the content.
import { randomBytes } from 'node:crypto';

export const HOST = 'game';
const SMALL = 2 << 20;

const MIME = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  vtt: 'text/vtt; charset=utf-8',
  svg: 'image/svg+xml',
  wasm: 'application/wasm',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  bin: 'application/octet-stream',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  ktx2: 'image/ktx2',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

export function mimeOf(path) {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// The page's rules: only this origin, no remote anything. 'unsafe-eval' stays because the story engine compiles its
// conditions with new Function (game3d/js/narrative/conditions.js). Inline scripts run only with this response's
// nonce (the page passes it on to the import map it writes, game3d/index.html).
export function csp(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'self'",
  ].join('; ');
}

// A page as a Response: every <script> gets a fresh nonce, and the CSP header allows that nonce only
export function htmlResponse(html, { head = false } = {}) {
  const nonce = randomBytes(18).toString('base64');
  const body = html.replace(/<script\b/gi, `<script nonce="${nonce}"`);
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': csp(nonce),
    'Content-Length': String(Buffer.byteLength(body)),
    'Cache-Control': 'no-cache',
  };
  return new Response(head ? null : body, { status: 200, headers });
}

// "bytes=a-b", "bytes=a-", "bytes=-n" -> {start, end} (end inclusive); null for no or unusable header (whole file),
// false for a range past the end (416). Multi-range requests get the whole file.
export function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0) return false;
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return false;
  return { start, end };
}

// URL path -> content path ('game3d/js/main.js'), or null when it leaves the content root
export function contentPath(pathname) {
  let p;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  p = p.replace(/^\/+/, '');
  if (!p || p.includes('\\') || p.includes('\0')) return null;
  if (p.split('/').some((s) => s === '..' || s === '.' || s === '')) return null;
  return p;
}

const quiet404 = () => new Response(null, { status: 404 });

export function createHandler({ source, extra = null, ready = () => true }) {
  return async function handle(request) {
    const url = new URL(request.url);
    if (url.host !== HOST) return quiet404();
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response(null, { status: 405 });
    const fromExtra = extra ? await extra.handle(url.pathname, request) : null;
    if (fromExtra) return fromExtra;
    if (url.pathname.startsWith('/api/')) return quiet404();
    if (!ready()) return new Response(null, { status: 403 });
    const path = contentPath(url.pathname);
    if (!path || !source.has(path)) return quiet404();
    const { size } = source.stat(path);
    const type = mimeOf(path);
    const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const head = request.method === 'HEAD';
    if (type.startsWith('text/html')) return htmlResponse((await source.read(path)).toString('utf8'), { head });
    const range = parseRange(request.headers.get('range'), size);
    if (range === false) {
      return new Response(null, { status: 416, headers: { ...headers, 'Content-Range': `bytes */${size}` } });
    }
    if (range) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
      headers['Content-Length'] = String(range.end - range.start + 1);
      return new Response(head ? null : source.stream(path, range), { status: 206, headers });
    }
    headers['Content-Length'] = String(size);
    if (size === 0) return new Response(head ? null : '', { status: 200, headers });
    // small files (modules, story, JSON, most pictures) in one read: a stream per file costs more than it saves
    if (size <= SMALL) return new Response(head ? null : await source.read(path), { status: 200, headers });
    return new Response(head ? null : source.stream(path, { start: 0, end: size - 1 }), { status: 200, headers });
  };
}
