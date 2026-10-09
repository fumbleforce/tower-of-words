// Captures for the walkable-ground system (#362; notes/grounds-system.md): matched player views, overhead views
// with the walk grid laid over them, and walks into an edge (where does he stop, against what is drawn there).
//   node game3d/tools/grounds-shots.mjs <width> <spec.json>[#key] [out]
// The matched before/after views for stage 1 are game3d/tools/grounds-views.json#forecourt and #campus.
// spec: { place, day, diorama, views: [{ id, at: [x, z], face?, top?: { c: [x, z], h, r }, push?: [dx, dz] }] }
//   at     where Eric stands (set directly, then the game's own camera snaps to him)
//   face   the direction he faces, radians (his back to the camera is the default)
//   top    an overhead view centred on c, `h` high, with the walk grid of radius r drawn over the ground (green free,
//          red blocked), instead of the game's camera
//   push   walk him from `at` in that direction for 1.5 s, holding the key, and report where he stopped
// BASE=.claude/worktrees/<name>/game3d tests a worktree.
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 600,
  [file, key] = process.argv[3].split('#'),
  spec = key ? JSON.parse(fs.readFileSync(file, 'utf8'))[key] : JSON.parse(fs.readFileSync(file, 'utf8'));
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/grounds/${process.argv[4] || spec.out || 'run'}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { width, place: spec.place, views: [], errors: [] };
await withBrowserJob(
  `grounds-shots-${width}`,
  async (browser) => {
    const context = await browser.newContext({
      viewport: { width, height: phone ? 844 : 860 },
      isMobile: phone,
      hasTouch: phone,
    });
    const page = await context.newPage();
    let closing = false;
    await context.route(
      '**/*',
      scopedRoute({
        publicOnly: true,
        isClosing: () => closing,
        onFailure: (e) => report.errors.push(String(e)),
      }),
    );
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({
          privateMode: false,
          voiceOn: false,
          textSpeed: 'instant',
          quality: 'high',
        }),
      ),
    );
    try {
      await waitForGame(
        page,
        90000,
        () =>
          page.goto(
            `http://127.0.0.1:8771/${base}/index.html?day=${spec.day || 2}&place=${spec.place}&mc=eric&q=2` +
              (spec.diorama ? '&diorama=1' : ''),
          ),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy);
      for (const v of spec.views) {
        const state = await page.evaluate(async (v) => {
          const T = await import('three'),
            g = globalThis.__game,
            P = g.place,
            cam = P.cam,
            nav = P.nav,
            p = (g.walker?.body || g.player.root).position;
          g.walker?.stop();
          globalThis.__groundsOverlay?.removeFromParent();
          if (globalThis.__groundsCamUpdate) cam.update = globalThis.__groundsCamUpdate;
          p.set(v.at[0], p.y, v.at[1]);
          if (v.face != null) g.player.root.rotation.y = v.face;
          cam.snap(p);
          if (v.top) {
            const [cx, cz] = v.top.c,
              r = v.top.r || 6,
              cell = 0.05,
              n = Math.round((2 * r) / cell),
              data = new Uint8Array(n * n * 4);
            for (let j = 0; j < n; j++)
              for (let i = 0; i < n; i++) {
                const ok = nav.free(cx - r + (i + 0.5) * cell, cz - r + (j + 0.5) * cell),
                  k = (j * n + i) * 4;
                data.set(ok ? [40, 220, 90, 70] : [235, 40, 40, 110], k);
              }
            const tex = new T.DataTexture(data, n, n);
            tex.needsUpdate = true;
            const m = new T.Mesh(
              new T.PlaneGeometry(2 * r, 2 * r).rotateX(-Math.PI / 2),
              new T.MeshBasicMaterial({
                map: tex,
                transparent: true,
                depthTest: false,
                depthWrite: false,
              }),
            );
            // the texture's first row is its bottom (v = 0), which the rotated plane puts at z = cz + r
            tex.flipY = false;
            m.scale.z = -1;
            m.position.set(cx, 0.02, cz);
            m.renderOrder = 999;
            (P.space || P.scene).add(m);
            globalThis.__groundsOverlay = m;
            globalThis.__groundsCamUpdate = cam.update;
            const h = v.top.h || 18;
            cam.update = () => {
              cam.camera.position.set(cx, h, cz + h * 0.08);
              cam.camera.lookAt(cx, 0, cz);
              cam.camera.updateMatrixWorld();
            };
          }
          return { at: p.toArray(), same: g.walker?.body === g.player.root };
        }, v);
        await page.waitForTimeout(v.top ? 500 : 1200);
        let pushed = null;
        if (v.push) {
          // keys move him in screen directions; the overhead cameras look north, so up is -z
          const key =
            v.push[1] < 0 ? 'ArrowUp' : v.push[1] > 0 ? 'ArrowDown' : v.push[0] > 0 ? 'ArrowRight' : 'ArrowLeft';
          pushed = {
            from: await page.evaluate(() => globalThis.__game.walker.body.position.toArray()),
          };
          await page.keyboard.down(key);
          await page.waitForTimeout(1500);
          await page.keyboard.up(key);
          await page.waitForTimeout(400);
          pushed.to = await page.evaluate(() => globalThis.__game.walker.body.position.toArray());
        }
        const calls = v.top
          ? null
          : await page.evaluate(async () => {
              const info = globalThis.__game.renderer.info,
                n = [];
              info.autoReset = false;
              for (let i = 0; i < 8; i++) {
                info.reset();
                await new Promise(globalThis.requestAnimationFrame);
                n.push(info.render.calls);
              }
              info.autoReset = true;
              return n.sort((a, b) => a - b)[4];
            });
        const file = `${width}-${v.id}.png`;
        await page.screenshot({ path: out + file });
        report.views.push({ id: v.id, file, ...state, pushed, calls });
        console.log(v.id, JSON.stringify({ ...state, pushed, calls }));
      }
      report.calls = await page.evaluate(async () => {
        const g = globalThis.__game,
          info = g.renderer.info;
        info.autoReset = false;
        const calls = [];
        for (let i = 0; i < 10; i++) {
          info.reset();
          await new Promise(globalThis.requestAnimationFrame);
          calls.push(info.render.calls);
        }
        info.autoReset = true;
        return calls.sort((a, b) => a - b)[5];
      });
    } finally {
      closing = true;
      fs.writeFileSync(out + `${width}-report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 240000 },
);
console.log(out, report.errors.length ? 'ERRORS ' + report.errors.join(' | ') : 'ok', 'calls', report.calls);
