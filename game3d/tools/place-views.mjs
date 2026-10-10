// Matched views of one outdoor place for a place pass (#375: "Every place must look designed from every direction"):
// Eric stood at each listed spot, then on desktop (1366x860) the follow camera turned four ways (north, east, south,
// west) at its lowest pitch, then the place's own camera, and on the phone (390x844) the place's own camera. Draw calls
// and triangles per frame go in report.json. Serves the tree this file is in, so a worktree is shot as it is (ROOT=
// another tree).
//   node game3d/tools/place-views.mjs <spec.json>[#key] <tag> [desktop|phone]
// spec: { place, day, period?, spots: [{ id, at: [x, z] }] }; pictures in game3d/shots/place-views/<tag>/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../tools/lib/static-server.mjs';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = process.env.ROOT || here; // ROOT=<another checkout> shoots that tree (main, for the before pictures)
const [file, key] = process.argv[2].split('#');
const spec = key ? JSON.parse(fs.readFileSync(file, 'utf8'))[key] : JSON.parse(fs.readFileSync(file, 'utf8'));
const tag = process.argv[3] || 'run';
const RUNS = [
  ['desktop', 'follow'],
  ['desktop', 'overview'],
  ['phone', 'overview'],
].filter(([size]) => !process.argv[4] || size === process.argv[4]);
const out = path.join(here, 'game3d/shots/place-views', tag);
fs.mkdirSync(out, { recursive: true });
const FACINGS = [
  ['n', Math.PI],
  ['e', Math.PI / 2],
  ['s', 0],
  ['w', -Math.PI / 2],
];
const report = { place: spec.place, rows: [], errors: [] };
ensureBuild();
const server = await serveFolder(root);
const sample = (page) =>
  page.evaluate(async () => {
    const r = globalThis.__game.renderer.info,
      frame = () => new Promise((ok) => globalThis.requestAnimationFrame(ok)),
      got = [];
    for (let i = 0; i < 3; i++) {
      await frame();
      r.autoReset = false;
      r.reset();
      await frame();
      got.push([r.render.calls, r.render.triangles]);
      r.autoReset = true;
    }
    return { calls: got.map((g) => g[0]).sort((a, b) => a - b)[1], tris: got.map((g) => g[1]).sort((a, b) => a - b)[1] };
  });
try {
  await withBrowserJob(
    `place-views-${tag}`,
    async (browser) => {
      for (const [size, mode] of RUNS) {
        const phone = size === 'phone',
          follow = mode === 'follow';
        const context = await browser.newContext({
          viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 860 },
          isMobile: phone,
          hasTouch: phone,
        });
        const page = await context.newPage();
        page.on('pageerror', (e) => report.errors.push(`${size}: ${e.message}`));
        await page.addInitScript(
          (mode) =>
            globalThis.localStorage.setItem(
              'amakawa-settings',
              JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: mode, textSpeed: 'instant' }),
            ),
          mode,
        );
        await page.goto(
          `${server.url}/game3d/index.html?place=${spec.place}&day=${spec.day || 2}&mc=eric&q=${phone ? 1 : 2}`,
        );
        await page.waitForFunction(() => globalThis.__done, null, { timeout: 90000 });
        await page.waitForFunction(
          () => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.__game.walker.path,
          null,
          { timeout: 60000 },
        );
        if (spec.period) {
          await page.evaluate((to) => globalThis.__game.hooks.period({ to }), spec.period);
          await page.waitForTimeout(1200);
        }
        for (const s of spec.spots) {
          const put = (at) =>
            page.evaluate((at) => {
              const g = globalThis.__game,
                p = (g.walker?.body || g.player.root).position;
              g.walker?.stop();
              p.set(at[0], p.y, at[1]);
              g.place.cam?.snap?.(p);
            }, at);
          await put(s.at);
          const views = follow ? FACINGS : [['own', null]];
          for (const [facing, yaw] of views) {
            if (follow) await page.evaluate((yaw) => globalThis.__game.followCamera.aim(yaw, -1), yaw);
            await page.waitForTimeout(900);
            const name = `${size}-${s.id}-${facing}.png`;
            await page.screenshot({ path: path.join(out, name) });
            const row = { size, spot: s.id, facing, file: name, ...(await sample(page)) };
            report.rows.push(row);
            console.log(JSON.stringify(row));
          }
        }
        await context.close();
      }
    },
    { timeoutMs: 30 * 60e3, gpuWaitMs: 20 * 60e3 },
  );
} finally {
  server.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
}
if (report.errors.length) console.log('ERRORS\n' + report.errors.join('\n'));
console.log(out);
