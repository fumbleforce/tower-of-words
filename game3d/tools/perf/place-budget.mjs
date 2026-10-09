// The place budget check (#372): opens every place on its own, indoor and outdoor, measures it from fixed cameras at
// each quality tier in place-budgets.json, and fails when a number goes over its budget or known-exception ceiling.
//   node game3d/tools/perf/place-budget.mjs [--places forecourt,plaza] [--tiers phone] [--json out.json]
// Serves the tree this file is in (a worktree is checked as it is) on a private port; no review server needed.
// Per place and tier: load (navigation until the place is drawing, CPU throttled as the tier says), then draw calls and
// triangles of whole frames from the overview camera and, where the tier lists it, the third-person camera turned
// eight ways at its lowest pitch (the worst facing counts), and the geometry and texture memory its scene holds.
// A place over budget is measured once more and the lower numbers count, so moving crowds don't fail a landing.
// Exit 0 within budget, 1 over budget or a place failed to open, 75 deferred (machine or GPU busy; nothing measured).
// tools/land.sh runs it before main moves when game3d/ changed. Budgets and exceptions: notes/PERF.md, "Place budgets".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../../tools/lib/static-server.mjs';
import { parseModule } from '../../../tools/lib/place-source.mjs';
import { sampleFrames, sceneMemory, look } from './place-measure.mjs';
import { overBudget, staleExceptions, describe, lower, table } from './place-budget-lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const budgets = JSON.parse(fs.readFileSync(path.join(here, 'place-budgets.json'), 'utf8'));
// every place the game has: the keys of PLACE_FILES, read without importing the game (and its story files)
const allPlaces = parseModule(fs.readFileSync(path.join(root, 'game3d/js/places/definitions.js'), 'utf8')).body
  .flatMap(n => n.type === 'ExportNamedDeclaration' ? n.declaration?.declarations || [] : [])
  .find(d => d.id.name === 'PLACE_FILES').init.properties.map(p => p.key.name ?? p.key.value);
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const places = arg('--places')?.split(',') || allPlaces;
const tiers = arg('--tiers')?.split(',') || Object.keys(budgets.tiers);
const jsonOut = arg('--json');
const missing = allPlaces.filter(p => !places.includes(p));
const FACINGS = 8, FRAMES = 4;

async function measure(page, cdp, tier, place, base) {
  const t = budgets.tiers[tier];
  const errors = [];
  const onError = e => errors.push(e.message);
  page.on('pageerror', onError);
  try {
    if (t.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: t.cpu });
    const started = Date.now();
    await page.goto(`${base}/game3d/index.html?place=${place}&cap&q=${t.q}`, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForFunction(p => (globalThis.__done && globalThis.__game?.place?.name === p) || globalThis.document.querySelector('.err'),
      place, { timeout: 45000, polling: 50 });
    const loadMs = Date.now() - started;
    if (t.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const failure = await page.evaluate(() => globalThis.document.querySelector('.err')?.textContent);
    if (failure) throw new Error(failure.slice(0, 160));
    // the world runs (crowds, creatures), the draw-call pass finishes merging, then a short settle
    await page.evaluate(() => { globalThis.__run = true; globalThis.document.body.classList.remove('cap'); });
    await page.waitForFunction(() => !globalThis.__game.place.perf?.busy?.(), null, { timeout: 30000 });
    await page.waitForTimeout(400);
    const views = { overview: await page.evaluate(sampleFrames, FRAMES) };
    if (t.cameras.includes('follow')) {
      await page.evaluate(async () => (await import(new URL('js/settings.js', globalThis.location.href).href)).setSetting('cameraMode', 'follow'));
      await page.waitForFunction(() => globalThis.__game.followCamera?.active, null, { timeout: 8000 })
        .catch(() => { throw new Error('the third-person camera did not come on'); });
      await page.evaluate(([dx, dy]) => globalThis.__lookBy(dx, dy), [0, -2000]);
      for (let i = 0; i < FACINGS; i++) {
        if (i) await page.evaluate(([dx, dy]) => globalThis.__lookBy(dx, dy), [(2 * Math.PI / FACINGS) / 0.003, 0]);
        await page.waitForTimeout(80);
        views[`follow${i}`] = await page.evaluate(sampleFrames, FRAMES);
      }
    }
    const worst = Object.values(views);
    const memory = await page.evaluate(sceneMemory);
    if (errors.length) throw new Error(`page error: ${errors[0].slice(0, 160)}`);
    return { calls: Math.max(...worst.map(v => v.calls)), tris: Math.max(...worst.map(v => v.tris)),
      geoMB: memory.geoMB, texMB: memory.texMB, loadMs, views, memory };
  } catch (error) {
    return { error: error.message.split('\n')[0] };
  } finally {
    page.off('pageerror', onError);
    if (t.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
  }
}

// One place at a time, each in its own browser context, closed before the next opens: a place's page holds a few
// hundred MB, and the machine's memory is shared with other jobs (one headless page at a time).
async function runTier(browser, tier, list, base) {
  const t = budgets.tiers[tier];
  const out = {};
  for (const place of list) {
    const context = await browser.newContext({ viewport: { width: t.viewport[0], height: t.viewport[1] }, isMobile: !!t.touch, hasTouch: !!t.touch });
    try {
      await context.addInitScript(lookSource => {
        // a headless browser can't take a real pointer lock: the third-person camera's mouse look goes through a fake one
        Object.defineProperty(globalThis.Document.prototype, 'pointerLockElement', { get: () => globalThis.__fakePointerLock || null, configurable: true });
        globalThis.__lookBy = (0, eval)(`(${lookSource})`);
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }));
      }, look.toString());
      const page = await context.newPage();
      out[place] = await measure(page, await context.newCDPSession(page), tier, place, base);
    } finally { await context.close(); }
  }
  return out;
}

let status = 0, results = {}, busiest = 0;
const began = Date.now();
// load times stretch on a busy machine: past BUSY (1-minute load average, sampled through the run) a load time over
// budget is a warning, not a failure (GUIDE: Headless browser runs; the other numbers don't depend on it)
const BUSY = 16, sampleLoad = () => { busiest = Math.max(busiest, os.loadavg()[0]); };
const loadTimer = setInterval(sampleLoad, 5000);
const server = await serveFolder(root);
try {
  ensureBuild();
  await withBrowserJob('place-budget', async browser => {
    for (const tier of tiers) results[tier] = await runTier(browser, tier, places, server.url);
    // one more measurement of every place over budget; the lower numbers count
    const again = {};
    for (const o of overBudget(budgets, results)) (again[o.tier] ||= new Set()).add(o.place);
    for (const [tier, set] of Object.entries(again)) for (const [place, second] of Object.entries(await runTier(browser, tier, [...set], server.url))) results[tier][place] = lower(results[tier][place], second);
  }, { timeoutMs: 600000, loadWaitMs: 120000, gpuWaitMs: 240000 });
  sampleLoad();
  const all = overBudget(budgets, results);
  const lenient = busiest > BUSY ? all.filter(o => o.metric === 'loadMs') : [];
  const over = all.filter(o => !lenient.includes(o));
  console.log(table(budgets, results));
  console.log('(! over its limit, * a known exception within its ceiling; worst camera per number; load at the tier\'s CPU throttle)');
  for (const note of staleExceptions(budgets, results)) console.log('note: ' + note);
  if (missing.length && !arg('--places')) console.log(`note: no measurement for ${missing.join(', ')}`);
  for (const o of lenient) console.log(`warning (machine busy, load average up to ${busiest.toFixed(0)}): ${describe(o)}`);
  if (over.length) {
    console.log(`FAIL place budgets: ${over.length} over`);
    for (const o of over) console.log('  ' + describe(o));
    console.log('Bring it down (notes/PERF.md, "Place budgets"), or, if the place has to go over for now, give it a known exception with an issue in game3d/tools/perf/place-budgets.json.');
    status = 1;
  } else console.log(`PASS place budgets: ${places.length} places at ${tiers.join(' and ')} in ${Math.round((Date.now() - began) / 1000)} s`);
} catch (error) {
  if (['LOAD_DEFERRED', 'GPU_DEFERRED'].includes(error.code)) { console.log(`DEFERRED place budgets: ${error.message}`); status = 75; }
  else { console.log(`FAIL place budgets: ${error.message.split('\n')[0]}`); status = 1; }
} finally {
  server.close();
  clearInterval(loadTimer);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ when: new Date().toISOString(), tiers, results }, null, 2) + '\n');
process.exit(status);
