// rei-body-1: Rei's portrait as the game places it. Plays the day in fast test mode to the first line with someone on
// stage, holds it, then has Rei say a line (no scene on day 1 or day 2 gives her a line yet; she is hidden all day) and
// saves the screen. With DAY=2 in the environment it starts on day 2 (?day=2).
//   node art/candidates/portraits/rei-body-1/ingame.mjs <w> <h> <tag>
// Output: game3d/shots/rei-body-1/<w>x<h>-<tag>.png
import { withBrowserJob } from '../../../../tools/lib/browser-job.mjs';
import { openGame } from '../../../../game3d/test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', TAG = 'installed'] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const out = path.join(ROOT, 'game3d/shots/rei-body-1');
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const rel = path.relative('/home/jorgen/repo/japanese', ROOT);
const url = `http://127.0.0.1:8771/${rel ? rel + '/' : ''}game3d/index.html?test=fast&q=0${process.env.DAY ? '&day=' + process.env.DAY : ''}`;
await withBrowserJob('rei-body-shots', async (browser) => {
  const { page: p } = await openGame(browser, {
    viewport: { width: +W, height: +H }, mode: 'fast', touch: phone, url,
  });
  await p.evaluate(() => {
    const g = globalThis.__game, say = g.ui.say.bind(g.ui);
    g.ui.say = (...a) => {
      const r = say(...a);
      if ([...document.querySelectorAll('#stage .por')].some((e) => !e.hidden)) { globalThis.__hold = true; return new Promise(() => {}); }
      return r;
    };
    globalThis.__say = say;
  });
  await p.waitForFunction(() => globalThis.__hold, null, { timeout: 240000, polling: 50 });
  await p.evaluate(() => { globalThis.__say({ name: 'Rei' }, 'You must be the new one from B2. Rei, Sales.', { whoId: 'rei' }); });
  await p.waitForTimeout(1500);
  const box = await p.evaluate(() => [...document.querySelectorAll('#stage .por')].map((e) => { const r = e.getBoundingClientRect(); return { who: e.dataset.who, hidden: e.hidden, short: e.classList.contains('short'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
  await p.screenshot({ path: path.join(out, `${W}x${H}-${TAG}.png`), timeout: 120000 });
  console.log(`${W}x${H}-${TAG}`, JSON.stringify(box));
  await p.goto('about:blank');
}, { timeoutMs: 280000 });
