// Captures for the lighting and time-of-day system (#370; notes/lighting-system.md): the same cameras in each period,
// entered in that period, and then stepped through the clock forward and back, with the light's numbers at each
// step so a step back can be checked against the first visit.
//   node game3d/tools/light-shots.mjs <width> <spec.json>#<key> [out]
// spec: { place, day, start?: period, steps?: [period, ...], views: [{ id, at?: [x, z], face? }] }
//   start  the period the game boots in (the clock's first value is patched for the capture only), so the place is
//          entered in it as a player would arrive then
//   steps  periods to move the clock to afterwards, one at a time, through the game's own period hook; every view
//          is captured after each
//   at     where Eric stands (the game's camera snaps to him); none: where the place puts him
// BASE=.claude/worktrees/<name>/game3d tests a worktree. Shots and report.json go to game3d/shots/light/<out>/.
import fs from 'node:fs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';

const width = +(process.argv[2] || 1366),
  phone = width < 600,
  [file, key] = process.argv[3].split('#'),
  spec = JSON.parse(fs.readFileSync(file, 'utf8'))[key];
const base = process.env.BASE || 'game3d';
const out = new URL(`../shots/light/${process.argv[4] || key}/`, import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const report = { width, place: spec.place, day: spec.day, start: spec.start, shots: [], errors: [] };

// what the light is now: the place's lights (every hemisphere and directional light), its grade, its background
const lightState = () => {
  const g = globalThis.__game,
    P = g.place,
    lights = [];
  P.scene.traverse((o) => {
    if (o.isHemisphereLight || o.isDirectionalLight)
      lights.push([
        o.type,
        o.color.getHexString(),
        o.groundColor?.getHexString(),
        +o.intensity.toFixed(4),
        o.position
          .clone()
          .sub(o.target?.position || o.position.clone().setScalar(0))
          .normalize()
          .toArray()
          .map((v) => +v.toFixed(3)),
      ]);
  });
  return {
    period: P.light?.state?.period ?? null,
    lights,
    grade: P.grade || null,
    bg: P.scene.background?.isColor ? P.scene.background.getHexString() : null,
  };
};

await withBrowserJob(
  `light-shots-${width}`,
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
      scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: (e) => report.errors.push(String(e)) }),
    );
    if (spec.start)
      await context.route(/\/js\/sim\.js(\?|$)/, async (route) => {
        const r = await route.fetch();
        const text = await r.text(),
          body = text.replace("period: 'early',", `period: '${spec.start}',`);
        if (body === text) report.errors.push('start period not patched');
        else report.patched = true;
        await route.fulfill({ response: r, body });
      });
    page.on('pageerror', (e) => report.errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ privateMode: false, voiceOn: false, textSpeed: 'instant', quality: 'high' }),
      ),
    );
    const day = spec.day > 1 ? `day=${spec.day}&place=${spec.place}` : `place=${spec.place}&skip`;
    try {
      await waitForGame(
        page,
        90000,
        () => page.goto(`http://127.0.0.1:8771/${base}/index.html?${day}&mc=eric&q=2`),
        'play',
      );
      await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 30000 }).catch(() => {});
      await page.addStyleTag({ content: '.mark{display:none!important}' });
      const capture = async (step) => {
        for (const v of spec.views) {
          await page.evaluate((v) => {
            const g = globalThis.__game,
              p = (g.walker?.body || g.player.root).position;
            g.walker?.stop?.();
            if (v.at) p.set(v.at[0], p.y, v.at[1]);
            if (v.face != null) g.player.root.rotation.y = v.face;
            g.place.cam?.snap?.(p);
          }, v);
          await page.waitForTimeout(900);
          const name = `${width}-${step}-${v.id}.png`;
          await page.screenshot({ path: out + name });
          const calls = await page.evaluate(async () => {
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
          report.shots.push({ step, view: v.id, file: name, calls, light: await page.evaluate(lightState) });
          console.log(step, v.id, 'calls', calls);
        }
      };
      await capture(`0-${spec.start || 'start'}`);
      for (const [i, to] of (spec.steps || []).entries()) {
        await page.evaluate((to) => globalThis.__game.hooks.period({ to }), to);
        await page.waitForTimeout(300);
        await capture(`${i + 1}-${to}`);
      }
    } finally {
      closing = true;
      fs.writeFileSync(out + `${width}-report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  },
  { timeoutMs: 480000, gpuWaitMs: 240000 },
);
console.log(out, report.errors.length ? 'ERRORS ' + report.errors.join(' | ') : 'ok');
