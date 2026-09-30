// Does a commit boot? Serves exactly that commit's game3d/ (git archive, plus the used binaries its asset lock file
// lists, linked from the main checkout) on a private port and opens the title screen in a headless browser at desktop
// and phone size. PASS needs the title to reach ready with no page error, console error or failed request.
//   node tools/check/head-boot.mjs [commit]          default HEAD
//   node tools/check/head-boot.mjs [commit] --record  also write the result to <git dir>/head-boot/ (post-commit hook)
// Exit 0 PASS, 1 FAIL, 75 DEFERRED (load above GUIDE's limit; nothing was checked). No working tree file is read, so
// uncommitted edits in any checkout can't hide or cause a failure. Takes 5 to 30 s.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';

const args = process.argv.slice(2);
const record = args.includes('--record');
const here = path.dirname(fileURLToPath(import.meta.url));
const git = (...a) => execFileSync('git', a, { cwd: here, encoding: 'utf8', maxBuffer: 64 << 20 }).trim();
const commit = git('rev-parse', '--verify', (args.find(a => !a.startsWith('--')) || 'HEAD') + '^{commit}');
const short = commit.slice(0, 7);
const commonDir = git('rev-parse', '--path-format=absolute', '--git-common-dir');
const main = path.dirname(commonDir);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

// Missing on GitHub Pages too, and the game copes: the local review server's API and the favicon.
const OPTIONAL = /^\/(api\/|favicon\.ico$)/;

fs.mkdirSync('/tmp/claude-1000', { recursive: true });
const site = fs.mkdtempSync('/tmp/claude-1000/head-boot-');
const lines = [];
const say = line => { lines.push(line); console.log(line); };
let status = 1, server;
try {
  // 1. the commit's game3d tree, its locked binaries, and a build stamp (build.json is generated, never committed)
  execFileSync('sh', ['-c', `git -C "$1" archive "$2" game3d | tar -x -C "$3"`, 'sh', main, commit, site]);
  let lock = { files: {} };
  try { lock = JSON.parse(git('show', `${commit}:tools/assets/assets.lock.json`)); } catch { /* no lock file then */ }
  let linked = 0; const missing = [];
  for (const file of Object.keys(lock.files || {}).filter(f => f.startsWith('game3d/'))) {
    const from = path.join(main, file), to = path.join(site, file);
    if (!fs.existsSync(from)) { missing.push(file); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.rmSync(to, { force: true });
    fs.symlinkSync(from, to); linked++;
  }
  execFileSync('python3', [path.join(site, 'game3d/tools/stamp.py')], { cwd: site, stdio: 'ignore',
    env: { ...process.env, GIT_DIR: '/nonexistent', GIT_CEILING_DIRECTORIES: '/tmp' } });
  if (missing.length) say(`note: ${missing.length} locked binaries are not on this disk (sync.py pull game3d): ${missing.slice(0, 3).join(', ')}`);

  // 2. a private static server for that folder
  server = http.createServer((req, res) => {
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
  const url = `http://127.0.0.1:${server.address().port}/game3d/index.html?q=0`;

  // 3. the title screen at both sizes
  const problems = [];
  const check = async browser => {
    for (const [width, height] of [[1366, 860], [390, 844]]) {
      const failed = [];
      let game;
      try {
        game = await openGame({ newContext: async options => {
          const context = await browser.newContext(options);
          context.on('response', r => { if (r.status() >= 400 && !OPTIONAL.test(new URL(r.url()).pathname)) failed.push(`HTTP ${r.status()} ${r.url().replace(/^http:\/\/[^/]+/, '')}`); });
          context.on('requestfailed', r => r.failure()?.errorText === 'net::ERR_ABORTED' || failed.push(`request failed ${r.url().replace(/^http:\/\/[^/]+/, '')} (${r.failure()?.errorText})`));
          return context;
        } }, { mode: 'title', url, viewport: { width, height }, touch: width < 600, timeoutMs: 45000 });
        await game.page.waitForTimeout(1500); // late errors from the title's first frames
        const found = [...game.errors, ...failed];
        if (found.length) problems.push(`${width}x${height}: ${[...new Set(found)].join(' | ')}`);
      } catch (error) {
        problems.push(`${width}x${height}: ${error.message.split('\n')[0]}`);
      } finally {
        await game?.close().catch(() => {});
      }
    }
  };
  try { await withBrowserJob('head-boot', check, { timeoutMs: 150000, loadWaitMs: 30000, gpuWaitMs: 30000 }); }
  catch (error) {
    // Only the title renders, a few seconds: when the GPU slots are all taken, software GL is cheap enough (the
    // load limit still applies), and a check that always defers under a busy test pool would never run.
    if (error.code !== 'GPU_DEFERRED') throw error;
    say('GPU slots busy: checking with software GL instead');
    process.env.GL = 'soft';
    await withBrowserJob('head-boot', check, { timeoutMs: 120000, loadWaitMs: 30000 });
  }
  if (problems.length) { say(`FAIL head boot ${short}`); problems.forEach(p => say('  ' + p)); status = 1; }
  else { say(`PASS head boot ${short}: title ready at 1366x860 and 390x844, no errors${linked ? ` (${linked} locked binaries)` : ''}`); status = 0; }
} catch (error) {
  if (['LOAD_DEFERRED', 'GPU_DEFERRED'].includes(error.code)) { say(`DEFERRED head boot ${short}: ${error.message}`); status = 75; }
  else { say(`FAIL head boot ${short}: ${error.message.split('\n')[0]}`); status = 1; }
} finally {
  server?.close();
  fs.rmSync(site, { recursive: true, force: true });
}
if (record) {
  const dir = path.join(commonDir, 'head-boot');
  fs.mkdirSync(dir, { recursive: true });
  const text = `${new Date().toISOString()} ${commit}\n${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(dir, short + '.txt'), text);
  fs.writeFileSync(path.join(dir, 'latest.txt'), text);
}
process.exit(status);
