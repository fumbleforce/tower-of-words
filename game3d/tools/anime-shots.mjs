// Pictures and costs for the anime look trial (#383, game3d/js/look/anime/): the plaza's fountain from the same
// cameras with each trick on its own, all together and none (the default look), in the morning and after work, on a
// phone (390x844 at a device pixel ratio of 3, quality medium, the overview camera) and a desktop (1366x860, quality
// high, the third-person camera behind Eric facing the fountain, and the overview). Per picture: draw calls and
// triangles (whole frames, every pass, the median of five) and the frame's time on this machine (from the frame's
// start until the GPU has finished it, forced with a one-pixel read, the median of 40 frames).
//   node game3d/tools/anime-shots.mjs
//   VARIANTS="0;toon;outline;dapple;paint;water;crowns;1" (the ?anime= values) · PERIODS=morning,evening
//   SIZES=phone,desktop · OUT=<folder under game3d/shots/anime/> · URL=<another server's game3d>
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
const variants = (process.env.VARIANTS || '0;toon;outline;dapple;paint;water;crowns;1').split(';');
const periods = (process.env.PERIODS || 'morning,evening').split(',');
const sizes = (process.env.SIZES || 'phone,desktop').split(',');
const out = new URL(
  `../shots/anime/${process.env.OUT || new Date().toISOString().replace(/[:.]/g, '-')}/`,
  import.meta.url,
).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { base, variants, periods, rows: [], errors: [] };
const name = (v) => (v === '0' ? 'off' : v === '1' ? 'all' : v.replace(/,/g, '+'));

// draw calls, triangles and the frame's time
const sample = (page) =>
  page.evaluate(async () => {
    const g = globalThis.__game,
      info = g.renderer.info,
      gl = g.renderer.getContext(),
      px = new Uint8Array(4),
      frame = () => new Promise((ok) => globalThis.requestAnimationFrame(ok));
    const got = [];
    for (let i = 0; i < 5; i++) {
      await frame();
      info.autoReset = false;
      info.reset();
      await frame();
      got.push([info.render.calls, info.render.triangles]);
      info.autoReset = true;
    }
    const ms = [];
    for (let i = 0; i < 40; i++) {
      // queued after the game's own frame callback: its frame is drawn when this runs
      const t = await new Promise((ok) =>
        globalThis.requestAnimationFrame((start) => {
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          ok(performance.now() - start);
        }),
      );
      ms.push(t);
    }
    const mid = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return {
      calls: mid(got.map((r) => r[0])),
      tris: mid(got.map((r) => r[1])),
      frameMs: +mid(ms).toFixed(2),
      anime: g.place.look?.anime || null,
    };
  });

// Eric south of the fountain, facing it; the follow camera behind him
const stand = (page, view) =>
  page.evaluate(
    async ({ view }) => {
      const g = globalThis.__game,
        f =
          g.place.scene.getObjectByName('fountain:ripple')?.parent ||
          g.place.scene.getObjectByName('anime:water')?.parent,
        c = f ? f.getWorldPosition(f.position.clone()) : { x: 0, z: 0 };
      const settings = await import(new URL('js/settings.js', globalThis.location.href).href);
      if (view === 'overview') settings.setSetting('cameraMode', 'overview');
      else settings.setSetting('cameraMode', 'follow');
      const p = (g.walker?.body || g.player.root).position;
      g.walker?.stop?.();
      // trees: west of the grove by the cross walk, its crowns ahead of him to the east
      const at = { close: [1.2, 5.2], trees: [12, 1.6] }[view] || [0.4, 6.4];
      p.set(c.x + at[0], p.y, c.z + at[1]);
      g.player.root.rotation.y = Math.PI;
      if (g.walker) g.walker.facing = Math.PI;
      g.place.cam?.snap?.(p);
      if (view !== 'overview') {
        for (let i = 0; i < 40 && !g.followCamera?.active; i++) await new Promise((ok) => setTimeout(ok, 100));
        const aim = { close: [0.25, 0.35], trees: [-1.17, 0.02] }[view] || [0, 0.08];
        g.followCamera?.aim?.(Math.PI + aim[0], aim[1]);
      }
    },
    { view },
  );

try {
  await withBrowserJob(
    'anime-shots',
    async (browser) => {
      for (const size of sizes) {
        const phone = size === 'phone';
        const views = phone ? ['overview'] : (process.env.VIEWS || 'follow,close,trees,overview').split(',');
        for (const v of variants) {
          const context = await browser.newContext({
            viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 860 },
            deviceScaleFactor: phone ? 3 : 1,
            isMobile: phone,
            hasTouch: phone,
          });
          const page = await context.newPage();
          page.on('pageerror', (e) => report.errors.push(`${size} ${v}: ${e.message}`));
          await page.addInitScript(() =>
            globalThis.localStorage.setItem(
              'amakawa-settings',
              JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }),
            ),
          );
          await page.goto(`${base}/index.html?place=plaza&q=${phone ? 1 : 2}&anime=${encodeURIComponent(v)}`);
          await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
          await page.waitForFunction(
            () => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.__game.walker.path,
            null,
            { timeout: 60000 },
          );
          await page.waitForFunction(() => !globalThis.document.getElementById('boot')?.matches(':not(.gone)'));
          await page.addStyleTag({ content: '.mark{display:none!important}' });
          for (const period of periods) {
            if (period !== 'morning') await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
            for (const view of views) {
              await stand(page, view);
              await page.waitForTimeout(1600);
              const file = `${size}-${name(v)}-${period}-${view}.png`;
              await page.screenshot({ path: out + file });
              const row = { size, variant: name(v), period, view, file, ...(await sample(page)) };
              report.rows.push(row);
              console.log(
                `${size.padEnd(7)} ${row.variant.padEnd(8)} ${period.padEnd(8)} ${view.padEnd(8)} calls ${String(row.calls).padStart(4)} tris ${String(row.tris).padStart(7)} ${row.frameMs} ms`,
              );
            }
          }
          await context.close();
        }
      }
    },
    { timeoutMs: 20 * 60e3, gpuWaitMs: 10 * 60e3 },
  );
} finally {
  server?.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
if (report.errors.length) console.log('ERRORS\n' + [...new Set(report.errors)].join('\n'));
console.log(out);
