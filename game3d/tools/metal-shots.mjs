// Close-ups of metal and glass (#366, kit/materials/): free cameras in a place, in the morning and after work, at
// desktop and phone size, for before-and-after pictures of the shared finishes.
//   node game3d/tools/metal-shots.mjs <outdir> <views.json>#<key> [view ...]     SIZES=1366x860,390x844
// views.json: { key: { place, day?, periods?: ['morning', 'evening'], at?: [x, z],
//                      views: [{ id, cam: [x, y, z], look: [x, y, z], fov? }                      a free camera
//                              or { id, target: 'mesh name', from: [x, y, z], dist, fov? }] } }  looking at a mesh
// at: where Eric stands (out of the way). The clock moves through the game's own period hook, as in play.
// ROOT=<repo tree> serves another tree (a checkout of the commit before, for the "before" pictures).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../tools/lib/static-server.mjs';

const [out, ref, ...only] = process.argv.slice(2);
if (!out || !ref) throw new Error('usage: metal-shots.mjs <outdir> <views.json>#<key> [view ...]');
const [file, key] = ref.split('#'),
  spec = JSON.parse(fs.readFileSync(file, 'utf8'))[key];
if (!spec) throw new Error('no views ' + key);
fs.mkdirSync(out, { recursive: true });
const root = process.env.ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (!process.env.ROOT) ensureBuild();
const server = await serveFolder(root);
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const views = spec.views.filter((v) => !only.length || only.includes(v.id));
const errors = [];
try {
  await withBrowserJob(
    `metal-shots-${key}`,
    async (browser) => {
      for (const [w, h] of sizes) {
        const phone = w < 700;
        const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(e.message));
        await page.addInitScript(() =>
          globalThis.localStorage.setItem(
            'amakawa-settings',
            JSON.stringify({ v: 99, privateMode: false, voiceOn: false, cameraMode: 'overview', textSpeed: 'instant' }),
          ),
        );
        const day = spec.day || 1;
        await page.goto(
          `${server.url}/game3d/index.html?place=${spec.place}&day=${day}${day === 1 ? '&skip' : ''}&mc=eric&q=${phone ? 1 : 2}`,
        );
        await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
        await page.waitForFunction(() => globalThis.__game?.place && !globalThis.__game.busy, null, { timeout: 60000 });
        await page.waitForFunction(
          () => !globalThis.document.getElementById('boot') || globalThis.document.getElementById('boot').classList.contains('gone'),
        );
        await page.addStyleTag({ content: '.mark{display:none!important}' });
        await page.waitForTimeout(1200);
        // PROBE=1: where Eric starts and the box of every named mesh, to place the cameras
        if (process.env.PROBE) {
          console.log(
            await page.evaluate(() => {
              const g = globalThis.__game,
                out = { eric: g.player.root.position.toArray().map((v) => +v.toFixed(2)), meshes: {} };
              g.place.scene.traverse((o) => {
                if (!o.isMesh || !o.name || !o.geometry) return;
                o.geometry.computeBoundingBox();
                const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
                out.meshes[o.name] = [...b.min.toArray(), ...b.max.toArray()].map((v) => +v.toFixed(1));
              });
              return JSON.stringify(out);
            }),
          );
          await context.close();
          continue;
        }
        for (const period of spec.periods || ['morning', 'evening']) {
          await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
          await page.waitForTimeout(500);
          for (const v of views) {
            await page.evaluate(
              ([v, at]) => {
                const g = globalThis.__game,
                  cam = g.place.cam,
                  p = (g.walker?.body || g.player.root).position;
                g.walker?.stop?.();
                if (at) p.set(at[0], p.y, at[1]);
                cam.snap?.(p);
                let [from, to] = [v.cam, v.look];
                if (v.target) {
                  // a named mesh, looked at from a direction (v.from) and distance (v.dist)
                  let o = null;
                  g.place.scene.traverse((x) => {
                    if (!o && x.name === v.target) o = x;
                  });
                  if (!o) throw new Error('no mesh ' + v.target);
                  const c = new o.position.constructor();
                  o.geometry.computeBoundingBox();
                  o.geometry.boundingBox.getCenter(c);
                  o.localToWorld(c);
                  const d = new o.position.constructor(...v.from).normalize().multiplyScalar(v.dist || 8);
                  to = c.toArray();
                  from = c.clone().add(d).toArray();
                }
                cam.update = () => {
                  const c = cam.camera;
                  c.fov = v.fov || 45;
                  c.far = 600;
                  c.updateProjectionMatrix();
                  c.position.set(...from);
                  c.lookAt(...to);
                  c.updateMatrixWorld();
                };
              },
              [v, spec.at || null],
            );
            await page.waitForTimeout(1100);
            const name = `${key}-${v.id}-${period}-${phone ? 'phone' : 'desk'}.png`;
            await page.screenshot({ path: path.join(out, name) });
            console.log(name);
          }
        }
        await context.close();
      }
    },
    { timeoutMs: 30 * 60e3, gpuWaitMs: 45 * 60e3 },
  );
} finally {
  server.close();
}
if (errors.length) console.log('ERRORS\n' + [...new Set(errors)].join('\n'));
