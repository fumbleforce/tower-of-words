// Before/after pictures and numbers for the far view (js/look/far-flag.js, #365): in each place, from its start spot,
// the follow camera turned four ways at its lowest pitch (desktop 1366x860, quality high), and the phone overview
// (390x844, quality medium), each with the far view off (?far=0, before) and on (the default, after), in the morning
// and then after work (the clock's own change, game.hooks.period). Logs draw calls and triangles for every frame (all
// passes, one frame, the median of five samples) to report.json. Serves the tree this file is in unless URL is given.
//   node game3d/tools/far-view-shots.mjs [place ...]
//   PERIODS=morning (only the morning) · QS=&day=2 (more of the URL) · URL=http://127.0.0.1:8771/game3d (another server) · OUT=<folder>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../tools/lib/static-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let server = null;
if (!process.env.URL) {
  ensureBuild();
  server = await serveFolder(root);
}
const base = process.env.URL || `${server.url}/game3d`;
const places = process.argv.slice(2).length ? process.argv.slice(2) : ['works', 'shotengai', 'harbour'];
const periods = (process.env.PERIODS || 'morning,evening').split(',');
const out =
  process.env.OUT ||
  new URL(`../shots/far-view/${new Date().toISOString().replace(/[:.]/g, '-')}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const FACINGS = [
  ['north', Math.PI],
  ['east', Math.PI / 2],
  ['south', 0],
  ['west', -Math.PI / 2],
];
const report = { base, periods, rows: [], errors: [] };

async function sample(page) {
  return page.evaluate(async () => {
    const r = globalThis.__game.renderer.info,
      frame = () => new Promise((ok) => globalThis.requestAnimationFrame(ok)),
      got = [];
    globalThis.__perfHold = true;
    for (let i = 0; i < 5; i++) {
      await frame();
      r.autoReset = false;
      r.reset();
      await frame();
      got.push([r.render.calls, r.render.triangles]);
      r.autoReset = true;
    }
    globalThis.__perfHold = false;
    const mid = (k) => got.map((g) => g[k]).sort((a, b) => a - b)[2];
    return { calls: mid(0), tris: mid(1) };
  });
}

try {
  await withBrowserJob('far-view-shots', async (browser) => {
    for (const place of places)
      for (const far of [false, true])
        for (const phone of [false, true]) {
          const context = await browser.newContext({
            viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 860 },
            isMobile: phone,
            hasTouch: phone,
          });
          const page = await context.newPage();
          page.on('pageerror', (e) => report.errors.push(`${place} ${far} ${phone}: ${e.message}`));
          await page.addInitScript(
            (mode) => {
              globalThis.localStorage.setItem(
                'amakawa-settings',
                JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: mode, textSpeed: 'instant' }),
              );
            },
            phone ? 'overview' : 'follow',
          );
          await page.goto(`${base}/index.html?place=${place}&q=${phone ? 1 : 2}${far ? '' : '&far=0'}${process.env.QS || ''}`);
          await page.waitForFunction(() => globalThis.__done, null, { timeout: 90000 });
          await page.waitForFunction(
            () => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.__game.walker.path,
            null,
            { timeout: 60000 },
          );
          await page.waitForFunction(
            () =>
              !globalThis.document.getElementById('boot') ||
              globalThis.document.getElementById('boot').classList.contains('gone'),
          );
          for (const period of periods) {
            await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
            await page.waitForTimeout(1500);
            const tag = `${place}-${period}-${far ? 'after' : 'before'}`;
            if (phone) {
              await page.screenshot({ path: `${out}/${tag}-phone.png` });
              report.rows.push({ place, far, period, view: 'phone', ...(await sample(page)) });
              continue;
            }
            await page.waitForFunction(() => globalThis.__game.followCamera.active);
            for (const [facing, yaw] of FACINGS) {
              await page.evaluate((yaw) => globalThis.__game.followCamera.aim(yaw, -1), yaw);
              await page.waitForTimeout(700);
              await page.screenshot({ path: `${out}/${tag}-${facing}.png` });
              const extra = await page.evaluate(() => ({
                cameraFar: globalThis.__game.place.camera.far,
                farModel: globalThis.__game.place.farView?.stats || null,
              }));
              report.rows.push({ place, far, period, view: facing, ...(await sample(page)), ...extra });
            }
          }
          await context.close();
        }
  }, { timeoutMs: places.length * 6 * 60e3, gpuWaitMs: 10 * 60e3 });
} finally {
  server?.close();
}
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
for (const r of report.rows)
  console.log(
    `${r.place.padEnd(10)} ${r.period.padEnd(8)} ${r.far ? 'after ' : 'before'} ${r.view.padEnd(6)} calls ${String(r.calls).padStart(4)}  tris ${r.tris}`,
  );
if (report.errors.length) console.log('ERRORS\n' + report.errors.join('\n'));
console.log(out);
