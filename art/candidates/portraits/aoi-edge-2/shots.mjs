// aoi-edge-2: Aoi's portrait in the game with each attempt, at one viewport. Plays the day in fast test mode to the
// first line with Aoi on stage, holds it, then swaps her picture the way portraits.js does (img src and the --src mask)
// to the game file and to each attempt in turn (passed in as data URLs; nothing in game3d/ changes).
//   node art/candidates/portraits/aoi-edge-2/shots.mjs <w> <h> <name> ...   (name: original, or an attempt in this folder)
// Output: game3d/shots/aoi-edge-2/<w>x<h>-<name>.png and -close.png (git-ignored).
import { withBrowserJob } from '../../../../tools/lib/browser-job.mjs';
import { openGame } from '../../../../game3d/test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', ...NAMES] = process.argv.slice(2);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(HERE, '../../../../game3d/shots/aoi-edge-2');
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const file = (n) => (n === 'original' ? path.resolve(HERE, '../../../../game3d/assets/portraits/aoi-neutral.webp') : path.join(HERE, `aoi-${n}.webp`));

await withBrowserJob('aoi-edge-2-shots', async (browser) => {
  const { page: p, errors } = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', touch: phone });
  await p.evaluate(() => {
    const g = globalThis.__game, say = g.ui.say.bind(g.ui);
    const on = () => [...globalThis.document.querySelectorAll('#stage .por')].filter((e) => !e.hidden).map((e) => e.dataset.who);
    g.ui.say = (...a) => {
      const r = say(...a);
      if (on().includes('aoi')) { globalThis.__hold = true; return new Promise(() => {}); }
      return r;
    };
  });
  await p.waitForFunction(() => globalThis.__hold, null, { timeout: 240000, polling: 50 });
  await p.waitForTimeout(1200);
  for (const n of NAMES) {
    const src = `data:image/webp;base64,${fs.readFileSync(file(n)).toString('base64')}`;
    await p.evaluate(async (src) => {
      const el = [...globalThis.document.querySelectorAll('#stage .por')].find((e) => e.dataset.who === 'aoi' && !e.hidden);
      const img = el.querySelector('img');
      el.classList.remove('listen', 'hop');
      img.style.animation = 'none';
      img.src = src;
      el.style.setProperty('--src', `url("${src}")`);
      await img.decode();
    }, src);
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const el = [...globalThis.document.querySelectorAll('#stage .por')].find((e) => e.dataset.who === 'aoi' && !e.hidden);
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
    });
    const name = `${W}x${H}-${n}`;
    await p.screenshot({ path: path.join(out, name + '.png'), timeout: 120000 });
    const cx = Math.max(0, r.x - 30), cy = Math.max(0, r.y);
    await p.screenshot({ path: path.join(out, name + '-close.png'),
      clip: { x: cx, y: cy, width: Math.min(+W - cx, r.w + 60), height: Math.min(+H - cy, r.h) } });
    console.log(name, JSON.stringify(r));
  }
  if (errors.length) console.log('page errors:', errors.join(' | '));
  await p.goto('about:blank');
}, { timeoutMs: 280000 });
