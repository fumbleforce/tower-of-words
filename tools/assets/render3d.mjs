// 3D thumbnails for the asset gallery: every entry in tools/assets/assets.json with a 3D view (Meshy models,
// animations, code-built chibis, every variant of the world pieces, rooms and the props in them) rendered by the game's own code in one
// headless browser run. Only missing or stale thumbnails are rendered (a thumbnail is stale when a file the entry
// lists is newer than it), so a second run is quick.
//   node tools/assets/render3d.mjs            render what is missing or stale, then refresh assets.json
//   node tools/assets/render3d.mjs --all      render everything again
//   node tools/assets/render3d.mjs --only=chibi   render the entries whose id contains 'chibi'
// Takes the shared browser lock (GUIDE, Process). Software GL (SwiftShader), so it never touches the GPU lock.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ALL = process.argv.includes('--all');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/assets/assets.json'), 'utf8'));
const mtime = (p) => { try { return fs.statSync(path.join(ROOT, p)).mtimeMs; } catch { return 0; } };
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
// a world piece has one thumbnail per variant; its variants come from tools/assets/kit.json, so a variant is also
// redrawn when its arguments change (the last drawn ones are kept in thumbs/pieces.json)
const DRAWN = path.join(ROOT, 'tools/assets/thumbs/pieces.json');
const drawn = (() => { try { return JSON.parse(fs.readFileSync(DRAWN, 'utf8')); } catch { return {}; } })();
const items = data.assets.flatMap((e) => (e.variants ? e.variants.map((v, i) => ({ id: `${e.id}#${i}`, view: v.view, thumb3d: v.thumb3d, paths: e.paths, piece: true })) : [e]));
const todo = items.filter((e) => e.thumb3d && (!ONLY || ONLY.split(',').some((o) => e.id.includes(o))) && (ALL || ONLY || !mtime(e.thumb3d)
  || e.paths.some((p) => mtime(p) > mtime(e.thumb3d)) || (e.piece && drawn[e.thumb3d] !== JSON.stringify(e.view))));
if (!todo.length) { console.log('3D thumbnails: all current'); process.exit(0); }
// rooms first, so each room is built once and its props reuse it
todo.sort((a, b) => (a.view.type === 'room' ? 0 : 1) - (b.view.type === 'room' ? 0 : 1) || String(a.view.room).localeCompare(String(b.view.room)));

const LOCK = '/tmp/claude-1000/browser.lock.' + process.pid, ME = 'asset-thumbs';
for (let tries = 0; ; tries++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (tries % 12 === 0) console.log('waiting for the browser lock, held by', (() => { try { return fs.readFileSync(LOCK + '/owner', 'utf8'); } catch { return '?'; } })()); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));

// a private static server, so this doesn't depend on ./start
const PORT = 8779;
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => srv.kill());
await new Promise((r) => setTimeout(r, 700));

const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 480, height: 480 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:${PORT}/tools/assets/render.html`);
await p.waitForFunction(() => window.ready, null, { timeout: 30000 });
let ok = 0, bad = 0;
const t0 = Date.now();
for (const e of todo) {
  try {
    const url = await Promise.race([p.evaluate((v) => window.renderThumb(v), e.view), new Promise((_, no) => setTimeout(() => no(new Error('timed out after 90 s')), 90000))]);
    fs.writeFileSync(path.join(ROOT, e.thumb3d), Buffer.from(url.split(',')[1], 'base64'));
    if (e.piece) { drawn[e.thumb3d] = JSON.stringify(e.view); fs.writeFileSync(DRAWN, JSON.stringify(drawn)); }
    ok++;
    if (ok % 10 === 0) console.log(`${ok}/${todo.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  } catch (err) { bad++; console.log('FAILED', e.id, String(err.message || err).split('\n')[0]); }
}
await b.close();
console.log(`3D thumbnails: ${ok} rendered, ${bad} failed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (errs.length) console.log('page errors:\n ' + [...new Set(errs)].slice(0, 12).join('\n '));
unlock(); srv.kill();
execFileSync('python3', [path.join(ROOT, 'tools/assets/scan.py'), '--no-thumbs'], { stdio: 'inherit' });
process.exit(bad ? 1 : 0);
