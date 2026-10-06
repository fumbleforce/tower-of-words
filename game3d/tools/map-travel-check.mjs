// The map and fast travel in a real browser (docs/game/controls-and-ui.md, The map; systems.md, Fast travel).
//   node game3d/tools/map-travel-check.mjs [w] [h]      (BASE=<path to game3d> tests a worktree)
// Saturday from its start in Eric's room: the minimap shows; the map opens by a tap or click on it and with M, and
// closes with Esc and the close button; pins are at least 44 px; Go there is greyed with its reason while a line is
// up; then six fast travels through the UI, each checked to arrive at the place with its start run, Eric in the
// frame and no page errors. Measures the JS heap and the GPU's geometries and textures after each hop (places
// stay built in game.prepared). Screenshots of the minimap and the open map go to game3d/shots/map-travel/<time>/.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const [W = '390', H = '844'] = process.argv.slice(2);
const phone = +W < 700;
const tag = phone ? 'phone' : 'desktop';
const out = fileURLToPath(new URL(`../shots/map-travel/${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}`, import.meta.url));
fs.mkdirSync(out, { recursive: true });
const HOPS = ['plaza', 'sports', 'shotengai', 'east_coast', 'gate', 'pool'];
const fails = [],
  log = [];
const t0 = Date.now();
const check = (ok, what) => {
  (ok ? log : fails).push(what);
  console.log(`${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s ${ok ? 'ok  ' : 'FAIL'} ${what}`);
};
try {
  ensureBuild();
} catch (e) {
  console.log('build stamp failed:', e.message);
}

await withBrowserJob('map-travel-check', async (browser) => {
  const context = await browser.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.addInitScript(() => localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true })));
  const url = `http://127.0.0.1:${process.env.PORT || 8771}/${process.env.BASE || 'game3d'}/index.html?day=3&q=0`;
  await page.goto(url);
  const settled = () =>
    page.waitForFunction(
      () => {
        const g = window.__game;
        return g?.place && !g.busy && !g.pendingStart && !g.transition && document.getElementById('talk')?.hidden;
      },
      null,
      { timeout: 90000 },
    );
  // a line on screen (the day's opening) is read on
  const settle = async () => {
    for (let i = 0; i < 60; i++) {
      const s = await page.evaluate(() => { const t = document.getElementById('talk'); return { talk: !!t && !t.hidden, g: !!window.__game?.place }; });
      if (s.g && !s.talk && (await page.evaluate(() => !window.__game.busy && !window.__game.pendingStart))) break;
      if (s.talk) await page.mouse.click(+W / 2, +H - 60);
      await page.waitForTimeout(400);
    }
    await settled();
  };
  await page.waitForFunction(() => window.__game?.place && window.__game.walker, null, { timeout: 90000 });
  await settle();
  check(true, 'the game is up and settled');
  const mm = page.locator('#minimap');
  await page.waitForTimeout(600);
  check(await mm.isVisible(), 'the minimap shows in the HUD');
  const box = await mm.boundingBox();
  check(box && box.x < 40 && box.y + box.height > +H - 40, `the minimap sits bottom left (${JSON.stringify(box)})`);
  await page.screenshot({ path: `${out}/hud.png` });
  if (box) await page.screenshot({ path: `${out}/minimap-close.png`, clip: { x: 0, y: Math.max(0, box.y - 40), width: Math.min(+W, box.width + 120), height: box.height + 40 + (+H - box.y - box.height) } });

  const isOpen = () => page.evaluate(() => !!window.__game.mapOpen && !document.getElementById('mapView').hidden);
  await page.evaluate(() => Promise.all(Array.from({ length: 3 }, () => window.__game.map.open())));
  check(await page.locator('#mapView').count() === 1, 'concurrent first opens create only one map');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  // open by tap or click, close with Esc; open with M, close with the button
  if (phone) await mm.tap();
  else await mm.click();
  await page.waitForTimeout(500);
  check(await isOpen(), 'a tap or click on the minimap opens the map');
  const pins = await page.$$eval('#mapView .pin:not([hidden])', (b) => b.map((x) => { const r = x.getBoundingClientRect(); return { id: x.dataset.pick, w: r.width, h: r.height }; }));
  check(pins.length >= 5, `pins on the map (${pins.length})`);
  check(pins.every((p) => p.w >= 44 && p.h >= 44), `every pin is at least 44 px (${pins.filter((p) => p.w < 44 || p.h < 44).map((p) => p.id)})`);
  const close = await page.locator('#mapView .mv-close').boundingBox();
  check(close && close.width >= 44 && close.height >= 44, 'the close button is 44 px');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(!(await isOpen()), 'Esc closes the map');
  check(!(await page.evaluate(() => document.body.classList.contains('paused'))), 'Esc did not open the pause menu');
  await page.keyboard.press('m');
  await page.waitForTimeout(500);
  check(await isOpen(), 'M opens the map');
  const pick = async (id) => {
    const pin = page.locator(`#mapView .pin[data-pick="${id}"]:not([hidden])`);
    if (await pin.count()) {
      if (phone) await pin.tap();
      else await pin.click();
    } else await page.evaluate((id) => window.__game.map.view().pick(id), id);
    await page.waitForTimeout(300);
  };
  await pick('sports');
  const inside = await page.$$eval('#mapView .mv-inside button', (buttons) => buttons.map((b) => b.getBoundingClientRect().height));
  check(!phone || inside.every((h) => h >= 44), 'phone interior destinations have 44 px targets');
  const frame = await page.evaluate(() => window.__game.renderer.info.render.frame);
  await page.waitForTimeout(200);
  check(await page.evaluate((frame) => window.__game.renderer.info.render.frame === frame, frame), 'the covered game stops drawing while the map is open');
  await page.screenshot({ path: `${out}/map-open.png` });
  await page.locator('#mapView .mv-close').click();
  await page.waitForTimeout(400);
  check(!(await isOpen()), 'the close button closes the map');
  const drawn = await page.evaluate(() => window.__game.mapOpen === false && !window.__game.paused);
  check(drawn, 'the game runs again after the map closes');

  // a line on screen: the map opens, Go there is greyed with the reason
  await page.evaluate(() => void window.__game.beat(() => window.__game.runner.steps(['> A test line.'])));
  await page.waitForTimeout(500);
  await page.keyboard.press('m');
  await page.waitForTimeout(500);
  check(await isOpen(), 'M opens the map during a line');
  await pick('plaza');
  const greyed = await page.evaluate(() => ({ off: document.querySelector('#mapView .mv-go')?.disabled, why: document.querySelector('#mapView .mv-why')?.textContent }));
  check(greyed.off && /conversation/.test(greyed.why || ''), `Go there is greyed during a line ("${greyed.why}")`);
  await page.screenshot({ path: `${out}/map-talking.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await settle();

  // six fast travels through the map
  const mem = async () => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('Performance.enable');
    const { metrics } = await cdp.send('Performance.getMetrics');
    await cdp.detach();
    const heap = Math.round((metrics.find((m) => m.name === 'JSHeapUsedSize')?.value || 0) / 1048576);
    return { heap, ...(await page.evaluate(() => ({ ...window.__game.renderer.info.memory, built: Object.keys(window.__game.prepared).length }))) };
  };
  const mems = [{ at: await page.evaluate(() => window.__game.place.name), ...(await mem()) }];
  for (const dest of HOPS) {
    await page.keyboard.press('m');
    await page.waitForTimeout(400);
    if (!(await isOpen())) {
      fails.push(`the map did not open before the trip to ${dest}`);
      break;
    }
    await pick(dest);
    const state = await page.evaluate((d) => window.__game.map.view().states()[d]?.state, dest);
    const go = page.locator('#mapView .mv-go');
    if (state !== 'go' || (await go.isDisabled())) {
      fails.push(`${dest} can't be travelled to (${state})`);
      await page.keyboard.press('Escape');
      continue;
    }
    const tHop = Date.now();
    if (phone) await go.tap();
    else await go.click();
    await page.waitForFunction((d) => window.__game.place?.name === d, dest, { timeout: 60000 }).catch(() => {});
    await settle().catch(() => {});
    const r = await page.evaluate(() => {
      const g = window.__game,
        p = g.player.root.position.clone();
      p.y += 1;
      p.project(g.place.camera);
      return { at: g.place.name, start: !g.pendingStart, ndc: [p.x, p.y, p.z], visited: JSON.parse(localStorage.getItem('amakawa-day1-save') || '{}').visited || [] };
    });
    check(r.at === dest, `arrived at ${dest} (${r.at}) in ${((Date.now() - tHop) / 1000).toFixed(1)} s`);
    check(r.start, `${dest}: its start scene ran`);
    check(Math.abs(r.ndc[0]) < 1 && Math.abs(r.ndc[1]) < 1 && r.ndc[2] < 1, `${dest}: Eric is in the frame (${r.ndc.map((v) => v.toFixed(2))})`);
    check(r.visited.includes(dest), `${dest} is saved as visited`);
    mems.push({ at: dest, ...(await mem()) });
    await page.screenshot({ path: `${out}/arrived-${dest}.png` });
  }
  console.log('memory after each hop (MB JS heap, GPU geometries and textures, places built):');
  for (const m of mems) console.log(`  ${m.at.padEnd(12)} heap ${m.heap} MB  geometries ${m.geometries}  textures ${m.textures}  built ${m.built}`);
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 5).join(' | ') : ''}`);
  await context.close();
}, { loadWaitMs: 60000, gpuWaitMs: 60000 });
console.log(`${fails.length ? 'FAIL' : 'PASS'} map-travel-check ${W}x${H}; shots: ${out}`);
process.exit(fails.length ? 1 : 0);
