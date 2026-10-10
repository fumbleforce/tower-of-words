// node --test desktop/test/: the app:// handler without Electron
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHandler, parseRange, contentPath, mimeOf } from '../app/serve.mjs';
import { openDir } from '../app/source-dir-temp.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-test-'));
fs.mkdirSync(path.join(root, 'game3d/js'), { recursive: true });
fs.writeFileSync(path.join(root, 'game3d/index.html'), '<script>1</script><script src="x.js"></script>');
fs.writeFileSync(path.join(root, 'game3d/js/a.js'), 'export const a = 1;');
fs.writeFileSync(path.join(root, 'game3d/film.mp4'), Buffer.alloc(1000, 7));
const handle = createHandler({ source: openDir(root) });
const get = (p, headers = {}) => handle(new Request(`app://game${p}`, { headers }));
test.after(() => fs.rmSync(root, { recursive: true, force: true }));

test('module with its MIME type, query ignored', async () => {
  const r = await get('/game3d/js/a.js?v=123');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.equal(await r.text(), 'export const a = 1;');
});

test('page gets a nonce on every script and a CSP naming it', async () => {
  const r = await get('/game3d/index.html');
  const body = await r.text();
  const nonce = /nonce="([^"]+)"/.exec(body)[1];
  assert.equal(body.match(/nonce="/g).length, 2);
  assert.match(r.headers.get('content-security-policy'), new RegExp(`'nonce-${nonce.replace(/[+/]/g, '\\$&')}'`));
  assert.doesNotMatch(r.headers.get('content-security-policy'), /unsafe-inline'[^;]*;\s*style/);
});

test('ranges: 206 with the right bytes, 416 past the end', async () => {
  const r = await get('/game3d/film.mp4', { range: 'bytes=100-199' });
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 100-199/1000');
  assert.equal((await r.arrayBuffer()).byteLength, 100);
  const tail = await get('/game3d/film.mp4', { range: 'bytes=-10' });
  assert.equal(tail.headers.get('content-range'), 'bytes 990-999/1000');
  assert.equal((await get('/game3d/film.mp4', { range: 'bytes=5000-' })).status, 416);
  assert.deepEqual(parseRange('bytes=0-', 10), { start: 0, end: 9 });
  assert.equal(parseRange('bytes=0-1,5-6', 10), null);
});

test('api, missing, traversal and other hosts are quiet 404s', async () => {
  assert.equal((await get('/api/feedback')).status, 404);
  assert.equal((await get('/api/plugins')).status, 404);
  assert.equal((await get('/game3d/nope.js')).status, 404);
  assert.equal((await get('/game3d/%2e%2e/%2e%2e/etc/passwd')).status, 404);
  assert.equal(contentPath('/a/../b'), null);
  assert.equal((await handle(new Request('app://other/game3d/js/a.js'))).status, 404);
  assert.equal(mimeOf('x.glb'), 'model/gltf-binary');
});

test('nothing is read while not ready; the extra module answers first', async () => {
  let ready = false;
  const h = createHandler({
    source: openDir(root),
    ready: () => ready,
    extra: { handle: async (p) => (p === '/shell/x' ? new Response('x') : null) },
  });
  assert.equal((await h(new Request('app://game/game3d/js/a.js'))).status, 403);
  assert.equal(await (await h(new Request('app://game/shell/x'))).text(), 'x');
  ready = true;
  assert.equal((await h(new Request('app://game/game3d/js/a.js'))).status, 200);
});
