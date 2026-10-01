// The monorail's run in to Honsha station, as stills, desktop and phone: "cruise" is the open bay before the arrival,
// a number is that many seconds after the arrival starts (the story's `arrive`), in increasing order.
//   node game3d/tools/train-arrival-shots.mjs <outdir> [cruise 0 3 6 9 12 ...]
// Sizes: SIZES=1366x860,390x844 (default both). BASE=.claude/worktrees/<name>/game3d for a worktree. Q=quality (1).
// Each still is <pose>-desk.png / <pose>-phone.png; the log gives the motion (mode, distance to the stop, speed).
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [out, ...args] = process.argv.slice(2);
if (!out) throw new Error('usage: train-arrival-shots.mjs <outdir> [pose ...]');
fs.mkdirSync(out, { recursive: true });
const poses = args.length ? args : ['cruise', '0', '3', '6', '9', '12', '16'];
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const errors = [];
await withBrowserJob(
  'train-arrival-shots',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({
        viewport: { width: w, height: h },
        isMobile: phone,
        hasTouch: phone,
      });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(m.text()));
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=${process.env.Q || 1}&place=train`, {
        timeout: 60000,
      });
      await page.waitForFunction(() => globalThis.__done && globalThis.__game?.place?._st, null, { timeout: 120000 });
      // poses in order: "cruise" (the open bay), or seconds after the arrival starts (its `arrive` hook)
      let at = null;
      for (const pose of poses) {
        const info = await page.evaluate(
          async ([pose, at]) => {
            const P = globalThis.__game.place,
              st = P._st;
            if (pose !== 'cruise') {
              if (at === null) {
                // the arrival comes after Mio's lesson: the story's flags as they are when `approach` calls it, and
                // no caption left from the car's opening (her Wi-Fi line, the ambient list in story/train.js, plays
                // only before Eric sits, minutes before this), as in play
                const { flags } = await import(new URL('js/narrative/state.js', globalThis.location.href).href);
                const { ui } = await import(new URL('js/ui.js', globalThis.location.href).href);
                Object.assign(flags, { sat: true, lesson_on: true, cat_done: true, lesson_done: true, arriving: true });
                ui.caption(null, '');
                P.hooks.arrive();
              }
              globalThis.__advance(+pose - (at ?? 0));
            }
            return {
              mode: st.mode,
              rem: +(st.stopX - st.dist).toFixed(1),
              v: +st.v.toFixed(2),
            };
          },
          [pose, at],
        );
        if (pose !== 'cruise') at = +pose;
        await page.waitForTimeout(500);
        const file = path.join(out, `${pose}-${phone ? 'phone' : 'desk'}.png`);
        await page.screenshot({ path: file });
        console.log('wrote', file, JSON.stringify(info));
      }
      await context.close();
    }
  },
  { timeoutMs: 290000, loadWaitMs: 150000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
