// Pictures and costs for the anime look trial (#383, game3d/js/look/anime/) in any place: the same views with the
// trial's tricks on and off, in the morning and after work (game3d/tools/anime-shots.mjs took the first round at the
// plaza fountain). A spec names the views:
//   node game3d/tools/anime-views.mjs <spec.json>#<key>
// spec: { variants: ["0", "toon", "toon,outline"], periods: ["morning", "evening"], sizes: ["desktop", "phone"],
//         places: [{ place, views: [{ id, at?: [x, z], face?, pitch?, cam?, near?, turn? }] }] }
//   at     where Eric stands, in the place's coordinates (none: where the place starts him)
//   face   which way he and the follow camera look (yaw: 0 south, PI/2 east, PI north, as followCamera.aim)
//   pitch  the follow camera's pitch (look() clamps it)
//   near   "person": stand 2.2 m from the nearest of the place's people, facing them (turn: round them, radians)
//   cam    "overview" (the default camera, the only one a phone has) or "follow" (the desktop's third person)
// A phone (390x844 at a device pixel ratio of 3, quality medium) takes only the overview views; a desktop (1366x860,
// quality high) takes all. Per picture: draw calls and triangles (whole frames, every pass, the median of five) and
// the frame's time on this machine (frame start until the GPU has finished it, forced with a one-pixel read, the
// median of 40 frames). Out: game3d/shots/anime/<key>/ with report.json. URL=<a running server's game3d> to use it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { ensureBuild } from '../../tools/lib/build-stamp.mjs';
import { serveFolder } from '../../tools/lib/static-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [file, key] = (process.argv[2] || '').split('#');
if (!file || !key) throw new Error('usage: anime-views.mjs <spec.json>#<key>');
const spec = JSON.parse(fs.readFileSync(file, 'utf8'))[key];
let server = null;
if (!process.env.URL) {
  ensureBuild();
  server = await serveFolder(root);
}
const base = process.env.URL || `${server.url}/game3d`;
const out = new URL(`../shots/anime/${key}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { base, spec, rows: [], errors: [] };
const name = (v) => (v === '0' ? 'off' : v === '1' ? 'all' : v.replace(/,/g, '+'));

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
      ms.push(
        await new Promise((ok) =>
          globalThis.requestAnimationFrame((start) => {
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
            ok(performance.now() - start);
          }),
        ),
      );
    }
    const mid = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    return { calls: mid(got.map((r) => r[0])), tris: mid(got.map((r) => r[1])), frameMs: +mid(ms).toFixed(2) };
  });

const stand = (page, view) =>
  page.evaluate(async (view) => {
    const g = globalThis.__game,
      P = g.place;
    const settings = await import(new URL('js/settings.js', globalThis.location.href).href);
    settings.setSetting('cameraMode', view.cam === 'follow' ? 'follow' : 'overview');
    const p = (g.walker?.body || g.player.root).position;
    g.walker?.stop?.();
    let face = view.face ?? Math.PI;
    if (view.at) p.set(view.at[0], p.y, view.at[1]);
    if (view.near === 'person') {
      let best = null,
        d = Infinity;
      const w = p.clone();
      for (const r of Object.values(P.people || {})) {
        const o = r?.root || r;
        if (!o?.isObject3D || !o.visible || o === g.player.root || o === g.mioNpc?.root) continue;
        o.getWorldPosition(w);
        const dd = Math.hypot(w.x - p.x, w.z - p.z);
        if (dd < d) {
          d = dd;
          best = w.clone();
        }
      }
      if (best) {
        const a = Math.atan2(p.x - best.x, p.z - best.z) + (view.turn || 0);
        p.set(best.x + Math.sin(a) * 2.2, p.y, best.z + Math.cos(a) * 2.2);
        face = a + Math.PI;
      }
    }
    g.player.root.rotation.y = face;
    if (g.walker) g.walker.facing = face;
    P.cam?.snap?.(p);
    if (view.cam === 'follow') {
      for (let i = 0; i < 40 && !g.followCamera?.active; i++) await new Promise((ok) => setTimeout(ok, 100));
      g.followCamera?.aim?.(face, view.pitch ?? 0.08);
    }
  }, view);

try {
  await withBrowserJob(
    'anime-views',
    async (browser) => {
      for (const size of spec.sizes || ['desktop', 'phone']) {
        const phone = size === 'phone';
        for (const { place, views } of spec.places) {
          const list = views.filter((v) => !phone || v.cam !== 'follow');
          if (!list.length) continue;
          for (const v of spec.variants) {
            const context = await browser.newContext({
              viewport: phone ? { width: 390, height: 844 } : { width: 1366, height: 860 },
              deviceScaleFactor: phone ? 3 : 1,
              isMobile: phone,
              hasTouch: phone,
            });
            try {
              const page = await context.newPage();
              page.on('pageerror', (e) => report.errors.push(`${size} ${place} ${v}: ${e.message}`));
              await page.addInitScript(() =>
                globalThis.localStorage.setItem(
                  'amakawa-settings',
                  JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }),
                ),
              );
              await page.goto(`${base}/index.html?place=${place}&q=${phone ? 1 : 2}&anime=${encodeURIComponent(v)}`);
              await page.waitForFunction(() => globalThis.__done, null, { timeout: 180000 });
              await page.waitForFunction(
                () => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.__game.walker.path,
                null,
                { timeout: 150000 },
              );
              await page.waitForFunction(() => !globalThis.document.getElementById('boot')?.matches(':not(.gone)'));
              await page.addStyleTag({ content: '.mark{display:none!important}' });
              for (const period of spec.periods || ['morning', 'evening']) {
                if (period !== 'morning') await page.evaluate((to) => globalThis.__game.hooks.period({ to }), period);
                for (const view of list) {
                  await stand(page, view);
                  await page.waitForTimeout(1600);
                  const shot = `${size}-${place}-${view.id}-${period}-${name(v)}.png`;
                  await page.screenshot({ path: out + shot });
                  const row = {
                    size,
                    place,
                    view: view.id,
                    period,
                    variant: name(v),
                    file: shot,
                    ...(await sample(page)),
                  };
                  report.rows.push(row);
                  console.log([size, place, view.id, period, row.variant, row.calls, row.tris, row.frameMs].join(' '));
                }
              }
            } catch (e) {
              report.errors.push(`${size} ${place} ${v}: ${e.message}`);
            } finally {
              await context.close();
            }
          }
        }
      }
    },
    { timeoutMs: 120 * 60e3, gpuWaitMs: 30 * 60e3 },
  );
} finally {
  server?.close();
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
}
if (report.errors.length) console.log('ERRORS\n' + [...new Set(report.errors)].join('\n'));
console.log(out);
