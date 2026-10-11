// Mio and Eric close-ups in a place, to judge how the place's grade treats the people (#445).
//   node game3d/tools/mio-grade-shots.mjs <width> <place> <day> <period|-> <tag>
// Shots go to game3d/shots/mio-grade/<tag>/. BASE=.claude/worktrees/<name>/game3d tests a worktree.
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const [, , w, place, day, period, tag] = process.argv,
  width = +w,
  phone = width < 600,
  base = process.env.BASE || 'game3d',
  out = new URL(`../shots/mio-grade/${tag}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const errors = [];
await withBrowserJob(
  `mio-grade-${place}`,
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
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => errors.push(String(e)) }),
    );
    if (period !== '-')
      await context.route(/\/js\/sim\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        await route.fulfill({ response: r, body: (await r.text()).replace("period: 'early',", `period: '${period}',`) });
      });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant', quality: 'high' }),
      ),
    );
    const q = `cap&place=${place}&day=${day}`;
    try {
      await waitForGame(
        page,
        90000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?${q}&mc=eric&q=2`),
        'play',
      );
      await page.waitForFunction(() => globalThis.__done);
      await page.evaluate(() => {
        globalThis.__run = true;
        const g = globalThis.__game;
        if (g.place.name === 'office' && g.flagsRef.day === 2) {
          g.flagsRef.d2_ticket_done = true;
          g.place.hooks.officeDay2({ state: 'arrive' });
        }
      });
      await page.waitForTimeout(1200);
      await page.addStyleTag({
        content: '.mark,#dialogue,.dialogue,#hud,.hud,.portraits,#portraits{display:none!important}',
      });
      // Eric stands next to Mio; the camera looks at them both (wide) and then at Mio alone (close)
      const cams = async (mode) =>
        page.evaluate(async (mode) => {
          const g = globalThis.__game,
            T = await import('three'),
            m = g.mioNpc,
            e = g.player.root;
          if (mode === 'mio' && !m.root.visible) return { noMio: true };
          m.root.updateMatrixWorld(true);
          const mp = m.root.getWorldPosition(new T.Vector3());
          e.updateMatrixWorld(true);
          const ep = e.getWorldPosition(new T.Vector3());
          globalThis.__run = false;
          g.paused = true;
          const who0 = (md) => (md === 'eric' ? e : m.root);
          const camera = g.place.camera || g.place.cam.camera;
          const yaw = who0(mode).getWorldQuaternion(new T.Quaternion());
          const who = mode === 'eric' ? e : m.root,
            mid = who.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.75, 0));
          const dist = new T.Vector3(0.8, 0.4, 1.7);
          camera.position.copy(mid).add(dist.applyQuaternion(yaw));
          camera.lookAt(mid);
          camera.fov = 42;
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
          return { mio: mp.toArray(), eric: ep.toArray(), grade: g.place.grade };
        }, mode);
      const info = await cams('eric');
      console.log(JSON.stringify(info));
      await page.waitForTimeout(500);
      await page.screenshot({ path: out + `${width}-eric.png` });
      {
        await cams('mio');
        await page.waitForTimeout(400);
        await page.screenshot({ path: out + `${width}-mio.png` });
      }
    } finally {
      closing = true;
      await context.close();
    }
  },
  { timeoutMs: 300000, gpuWaitMs: 240000 },
);
console.log(out, errors.length ? 'ERRORS ' + errors.join(' | ') : 'ok');
