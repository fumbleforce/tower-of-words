// A private static file server for one folder on a free local port, for checks that load the game from a tree that
// isn't the review server's (an exact commit's archive, a task worktree). Links are followed. No caching.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
  '.ktx2': 'image/ktx2', '.hdr': 'application/octet-stream' };

// Resolves to { url: 'http://127.0.0.1:<port>', close() }.
export async function serveFolder(root) {
  const site = path.resolve(root);
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(site, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    fs.stat(file, (err, st) => {
      if (err || !st.isFile() || !file.startsWith(site + path.sep)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': st.size, 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
