// Capture one bounded fast route. Usage: node tools/check/behavior-trace.mjs output.json [width height route]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../lib/browser-job.mjs';
import { openGame } from '../../game3d/test/support/open-game.mjs';
import { installBehaviorTrace } from '../../game3d/test/support/behavior-trace.mjs';
import { fastResult } from '../../game3d/test/support/fast-result.mjs';
import { installTraceClock } from '../../game3d/test/support/trace-clock.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [output, width = '1366', height = '860', route = 'magic'] = process.argv.slice(2);
assert(output, 'Supply an output path');
assert([width, height].every(value => Number.isInteger(+value) && +value > 0), 'Invalid viewport');
assert(['magic', 'social'].includes(route), 'Unknown route');
const origin = `http://127.0.0.1:${process.env.PORT || 8771}`;
const settings = { viewport: { width: +width, height: +height }, route, quality: 0, seed: 20260929, storage: {},
  clock: process.env.TRACE_CLOCK === '1' ? 'fixed-16ms-v5-zero-origin' : 'realtime',
  url: `${origin}/game3d/index.html?test=fast&q=0&route=${route}` };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = () => Object.fromEntries(['game3d/js', 'game3d/story'].flatMap(dir =>
  fs.readdirSync(path.join(root, dir), { recursive: true }).filter(file => /\.[cm]?js$/.test(file))
    .map(file => `${dir}/${file}`)).sort().map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const harnessFiles = ['tools/check/behavior-trace.mjs', 'tools/lib/browser-job.mjs', 'game3d/test/support/open-game.mjs',
  'game3d/test/support/behavior-trace.mjs', 'game3d/test/support/fast-result.mjs', 'game3d/test/support/wait-ready.mjs',
  'game3d/test/support/trace-clock.mjs',
  'package.json', 'package-lock.json'];
const harnessHashes = () => Object.fromEntries(harnessFiles.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const metadata = { version: 1, settings, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  manifest: hash(fs.readFileSync(path.join(root, 'tools/assets/assets.json'))), sources: sourceHashes(),
  harness: harnessHashes(), randomAlgorithm: 'mulberry32', build: JSON.parse(fs.readFileSync(path.join(root, 'game3d/build.json'), 'utf8')) };
const responses = {}, pending = [], errors = [];
let capture, clock;
try {
  await withBrowserJob('behavior-trace', async browser => {
    metadata.browser = browser.version();
    const onResponse = response => {
      const url = new URL(response.url());
      if (url.origin !== origin) return;
      if (!response.ok()) errors.push(`HTTP ${response.status()}: ${url.pathname}`);
      pending.push(response.body().then(bytes => {
        responses[url.pathname] = { status: response.status(), hash: hash(bytes) };
      }, error => { errors.push(`Cannot fingerprint ${url.pathname}: ${error.message}`); }));
    };
    try {
    const game = await openGame(browser, {
      mode: 'fast', viewport: settings.viewport, url: settings.url,
      beforeNavigate: async page => {
        await page.addInitScript(installBehaviorTrace, { seed: settings.seed });
        if (settings.clock !== 'realtime') clock = await installTraceClock(page);
        page.on('response', onResponse);
      },
    });
    const { page } = game;
    if (clock) await clock.finish();
    await page.waitForFunction(() => window.__test?.done && !window.__game.runner.frames.length
      && !window.__game.busy && !window.__game.queue.length, null, { timeout: 210000 });
    capture = await page.evaluate(async () => {
      const { readBehaviorTrace } = await import('./test/support/behavior-trace.mjs');
      return { trace: await readBehaviorTrace(), run: { ...window.__test, ended: !!window.__ended, move: window.__moveCheck } };
    });
    metadata.renderer = await page.evaluate(() => {
      const gl = window.__game.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { vendor: gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL || gl.VENDOR),
        renderer: gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) };
    });
    assert.deepEqual(capture.trace.initialStorage, settings.storage, 'Trace must start with empty storage');
    assert(capture.trace.events.some(event => event.kind === 'presentation' && event.method === 'say'),
      'Trace must observe rendered dialogue');
    assert(capture.trace.final.save?.ended, 'Final save must be the completed day');
    assert.equal(capture.trace.final.save.runner.execution, null, 'Final checkpoint must have unwound');
    if (!clock) await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#end')).opacity) >= 0.99);
    await page.screenshot({ path: path.resolve(output).replace(/\.json$/, '') + '.png', timeout: 5000,
      ...(clock ? { animations: 'disabled' } : {}) });
    // The observation boundary includes capture. No newly scheduled fingerprints can escape this drain.
    page.off('response', onResponse);
    await Promise.all(pending);
    errors.push(...game.errors);
    capture.result = fastResult(capture.run, errors);
    assert(capture.result.pass, capture.result.errors.join('\n'));
    for (const required of ['index.html', 'build.json', 'js/main.js', 'js/lang.js', 'js/runner.js', 'js/menu.js'])
      assert.equal(responses[`/game3d/${required}`]?.status, 200, `Missing critical fingerprint: ${required}`);
    for (const [url, response] of Object.entries(responses)) {
      const local = metadata.sources[url.slice(1)] || metadata.harness[url.slice(1)];
      if (local) assert.equal(response.hash, local, `Server served a different source: ${url}`);
    }
    } finally { await clock?.stop(); }
  });
  assert.deepEqual(sourceHashes(), metadata.sources, 'Runtime source changed during capture');
  assert.deepEqual(harnessHashes(), metadata.harness, 'Trace harness changed during capture');
  assert.equal(hash(fs.readFileSync(path.join(root, 'tools/assets/assets.json'))), metadata.manifest, 'Asset manifest changed during capture');
  fs.writeFileSync(output, JSON.stringify({ ...metadata, responses, ...capture }, null, 2) + '\n');
  console.log(`PASS behavior trace ${width}x${height} ${route}: ${capture.trace.events.length} events; ${output}`);
} catch (error) {
  fs.writeFileSync(output, JSON.stringify({ ...metadata, responses, ...capture, error: error.message }, null, 2) + '\n');
  console.error(error);
  process.exitCode = error.code === 'LOAD_DEFERRED' ? 75 : 1;
}
