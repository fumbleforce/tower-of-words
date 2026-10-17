// The place budget check (#372): opens every place on its own, indoor and outdoor, measures it from fixed cameras at
// each quality tier in place-budgets.json, and fails when a number goes over its budget or known-exception ceiling.
//   node game3d/tools/perf/place-budget.mjs [--places forecourt,plaza] [--tiers phone] [--json out.json]
// Serves the tree this file is in (a worktree is checked as it is) on a private port; no review server needed.
// Per place and tier: load (navigation until the place is drawing, CPU throttled as the tier says), then draw calls and
// triangles of whole frames from the overview camera and, where the tier lists it, the third-person camera turned
// eight ways at its lowest pitch (the worst facing counts), and the geometry and texture memory its scene holds.
// A frame tier (frame: true; #625) stands each place and screen (title, B2, pause, a picture; frame-measure.mjs) still
// at its viewport for a few seconds on default settings, uncapped, and times its frames: median and p95. It holds the
// exclusive GPU lock (other jobs would skew the times), waiting its turn for up to GPU_WAIT s (default 1200). When
// Jørgen's image gen dashboard asks for the GPU it stops between places (#701; browser-job.mjs stops it where it stands
// after a short grace) and keeps what it measured; the rest of the tier is unmeasured.
// A place over budget is measured once more and the lower numbers count, so moving crowds don't fail a landing.
// Exit 0 within budget, 1 over budget or a place failed to open, 75 deferred (machine or GPU busy): nothing measured,
// or the frame tier alone, whole or in part (the JSON's `unmeasured` names what wasn't, and why).
// tools/land.sh runs it before main moves when game3d/ changed. Budgets and exceptions: notes/PERF.md, "Place budgets".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob, gpuWaitOptions } from '../../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../../tools/lib/static-server.mjs';
import { parseModule } from '../../../tools/lib/place-source.mjs';
import { sampleFrames, sceneMemory, look } from './place-measure.mjs';
import { overBudget, staleExceptions, describe, lower, table, METRICS } from './place-budget-lib.mjs';
import { UNCAPPED, sampleFrameTimes, measureScreens } from './frame-measure.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const budgets = JSON.parse(fs.readFileSync(path.join(here, 'place-budgets.json'), 'utf8'));
// every place the game has: the keys of PLACE_FILES, read without importing the game (and its story files)
const allPlaces = parseModule(fs.readFileSync(path.join(root, 'game3d/js/places/definitions.js'), 'utf8')).body
  .flatMap(n => n.type === 'ExportNamedDeclaration' ? n.declaration?.declarations || [] : [])
  .find(d => d.id.name === 'PLACE_FILES').init.properties.map(p => p.key.name ?? p.key.value);
const allScreens = Object.keys(budgets.screens || {});
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const names = arg('--places')?.split(',') || [...allPlaces, ...allScreens];
const places = names.filter(n => !allScreens.includes(n)), screens = names.filter(n => allScreens.includes(n));
const tiers = arg('--tiers')?.split(',') || Object.keys(budgets.tiers);
const jsonOut = arg('--json');
const missing = allPlaces.filter(p => !places.includes(p));
const isFrame = tier => !!budgets.tiers[tier].frame;
const FACINGS = 8, FRAMES = 4;

async function measure(page, cdp, tier, place, base) {
  const t = budgets.tiers[tier];
  const errors = [];
  const onError = e => errors.push(e.message);
  page.on('pageerror', onError);
  try {
    if (t.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: t.cpu });
    const started = Date.now();
    await page.goto(`${base}/game3d/index.html?place=${place}&cap${t.q == null ? '' : `&q=${t.q}`}`, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForFunction(p => (globalThis.__done && globalThis.__game?.place?.name === p) || globalThis.document.querySelector('.err'),
      place, { timeout: 45000, polling: 50 });
    const loadMs = Date.now() - started;
    if (t.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const failure = await page.evaluate(() => globalThis.document.querySelector('.err')?.textContent);
    if (failure) throw new Error(failure.slice(0, 160));
    // the world runs (crowds, creatures), the draw-call pass finishes merging, then a short settle
    await page.evaluate(() => { globalThis.__run = true; globalThis.document.body.classList.remove('cap'); });
    await page.waitForFunction(() => !globalThis.__game.place.perf?.busy?.(), null, { timeout: 30000 });
    if (t.frame) {
      await page.waitForTimeout(1500);
      const frame = await page.evaluate(sampleFrameTimes, t.seconds);
      if (errors.length) throw new Error(`page error: ${errors[0].slice(0, 160)}`);
      return { medianMs: frame.medianMs, p95Ms: frame.p95Ms, frame };
    }
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
// A frame tier also measures the screens in the list, in one context after the places.
// Each result goes to put(name, result) as soon as it is measured, so a run stopped for the dashboard keeps them.
async function runTier(browser, job, tier, list, base, put) {
  const t = budgets.tiers[tier];
  const contextFor = () => browser.newContext({ viewport: { width: t.viewport[0], height: t.viewport[1] }, deviceScaleFactor: 1,
    isMobile: !!t.touch, hasTouch: !!t.touch, serviceWorkers: 'block' });
  const shown = list.filter(n => allScreens.includes(n));
  if (t.frame && shown.length) {
    job.checkpoint();
    const context = await contextFor();
    try {
      await context.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 99, privateMode: false, voiceOn: false })));
      for (const [name, r] of Object.entries(await measureScreens(await context.newPage(), `${base}/game3d/index.html`, shown, t.seconds))) put(name, r);
    } finally { await context.close(); }
  }
  for (const place of list.filter(n => !allScreens.includes(n))) {
    job.checkpoint();
    const context = await contextFor();
    try {
      await context.addInitScript(lookSource => {
        // a headless browser can't take a real pointer lock: the third-person camera's mouse look goes through a fake one
        Object.defineProperty(globalThis.Document.prototype, 'pointerLockElement', { get: () => globalThis.__fakePointerLock || null, configurable: true });
        globalThis.__lookBy = (0, eval)(`(${lookSource})`);
        globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }));
      }, look.toString());
      const page = await context.newPage();
      put(place, await measure(page, await context.newCDPSession(page), tier, place, base));
    } finally { await context.close(); }
  }
}

let status = 0, results = {}, busiest = 0;
const unmeasured = {};  // tier: why it wasn't measured (the frame tier when the GPU lock stayed busy)
const began = Date.now();
// timings stretch on a busy machine: past BUSY (1-minute load average, sampled through the run) a load or frame time
// over budget is a warning, not a failure (GUIDE: Headless browser runs; the other numbers don't depend on it)
const BUSY = 16, sampleLoad = () => { busiest = Math.max(busiest, os.loadavg()[0]); };
const loadTimer = setInterval(sampleLoad, 5000);
const server = await serveFolder(root);
// The tiers, then one more measurement of every place over budget in them; the lower numbers count. retrying: the
// places over budget still waiting for that second measurement, which don't count if the run stops before it.
// Nothing measured after the dashboard asked for the GPU is kept (a closing browser fails whatever was running).
const retrying = {};
async function measureTiers(browser, job, list) {
  const keep = (tier, again) => (place, r) => {
    if (job.shouldYield()) return;
    results[tier][place] = again ? lower(results[tier][place], r) : r;
    if (again) retrying[tier].delete(place);
  };
  for (const tier of list) { results[tier] = {}; await runTier(browser, job, tier, names, server.url, keep(tier)); }
  for (const o of overBudget(budgets, Object.fromEntries(list.map(t => [t, results[t]])))) (retrying[o.tier] ||= new Set()).add(o.place);
  for (const tier of list) if (retrying[tier]?.size) await runTier(browser, job, tier, [...retrying[tier]], server.url, keep(tier, true));
}
try {
  ensureBuild();
  const slotTiers = tiers.filter(t => !isFrame(t)), frameTiers = tiers.filter(isFrame);
  if (slotTiers.length && places.length) await withBrowserJob('place-budget', (browser, job) => measureTiers(browser, job, slotTiers), { timeoutMs: 600000, loadWaitMs: 120000, gpuWaitMs: 240000 });
  if (frameTiers.length) {
    // the exclusive GPU lock, uncapped: frame times with nothing else drawing on the card
    const before = process.env.CHROME_ARGS;
    process.env.CHROME_ARGS = [before, UNCAPPED].filter(Boolean).join(' ');
    try {
      await withBrowserJob('place-budget-frame', (browser, job) => measureTiers(browser, job, frameTiers),
        { gpuLock: `place-budget-frame-${process.pid}`, loadWaitMs: 120000, ...gpuWaitOptions(1200, 900000) });
    } catch (error) {
      if (!['LOAD_DEFERRED', 'GPU_DEFERRED'].includes(error.code)) throw error;
      // stopped part way (the dashboard asked for the GPU): the places it finished count, the rest is unmeasured
      for (const tier of frameTiers) {
        for (const place of retrying[tier] || []) delete results[tier]?.[place];
        const left = names.filter(n => !results[tier]?.[n]);
        if (results[tier] && !Object.keys(results[tier]).length) delete results[tier];
        if (left.length) unmeasured[tier] = error.message.split('\n')[0] + (results[tier] ? `; not measured: ${left.join(', ')}` : '');
      }
      if (!Object.keys(results).length) throw error;
    } finally {
      if (before === undefined) delete process.env.CHROME_ARGS; else process.env.CHROME_ARGS = before;
    }
  }
  sampleLoad();
  const all = overBudget(budgets, results);
  const lenient = busiest > BUSY ? all.filter(o => METRICS[o.metric]?.timing) : [];
  const over = all.filter(o => !lenient.includes(o));
  console.log(table(budgets, results));
  console.log('(! over its limit, * a known exception within its ceiling; worst camera per number; load at the tier\'s CPU throttle)');
  for (const note of staleExceptions(budgets, results)) console.log('note: ' + note);
  if (missing.length && !arg('--places')) console.log(`note: no measurement for ${missing.join(', ')}`);
  for (const o of lenient) console.log(`warning (machine busy, load average up to ${busiest.toFixed(0)}): ${describe(o)}`);
  for (const [tier, why] of Object.entries(unmeasured)) console.log(`NOT MEASURED: the ${tier} tier of ${names.join(', ')}: ${why}`);
  if (over.length) {
    console.log(`FAIL place budgets: ${over.length} over`);
    for (const o of over) console.log('  ' + describe(o));
    console.log('Bring it down (notes/PERF.md, "Place budgets"), or, if the place has to go over for now, give it a known exception with an issue in game3d/tools/perf/place-budgets.json.');
    status = 1;
  } else if (Object.keys(unmeasured).length) {
    console.log(`DEFERRED place budgets: within budget where measured; the ${Object.keys(unmeasured).join(' and ')} tier not measured`);
    status = 75;
  } else console.log(`PASS place budgets: ${places.length} places${screens.length ? ` and ${screens.length} screens` : ''} at ${tiers.join(', ')} in ${Math.round((Date.now() - began) / 1000)} s`);
} catch (error) {
  if (['LOAD_DEFERRED', 'GPU_DEFERRED'].includes(error.code)) {
    console.log(`DEFERRED place budgets: ${error.message}`);
    for (const tier of tiers) unmeasured[tier] = error.message.split('\n')[0];
    status = 75;
  } else { console.log(`FAIL place budgets: ${error.message.split('\n')[0]}`); status = 1; }
} finally {
  server.close();
  clearInterval(loadTimer);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ when: new Date().toISOString(), tiers, names, results, unmeasured }, null, 2) + '\n');
process.exit(status);
