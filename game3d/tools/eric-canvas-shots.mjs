// Eric's portrait in the game, before and after the eric-canvas-1 re-cut (his left shoulder, image right, extended).
// Plays the day in fast test mode to the first line with Eric on stage, then shows each expression and saves the frame
// and a close-up around his portrait.
//   node game3d/tools/eric-canvas-shots.mjs <w> <h> <before|after>
// "after" serves art/candidates/portraits/eric-canvas-1/eric-<face>.webp in place of the game files and FACE.eric.W 648
// in place of 597 (page routes only; nothing in game3d/ changes).
// Output: game3d/shots/eric-canvas/<w>x<h>-<set>-<face>.png and -<face>-close.png, placed box and overflow in the console.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', SET = 'before'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const CAND = path.resolve(G, '../art/candidates/portraits/eric-canvas-1');
const NEW_W = 648;
const out = path.join(G, 'shots/eric-canvas');
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const FACES = ['neutral', 'surprised', 'tired'];

await withBrowserJob('eric-canvas-shots', async (browser) => {
  const beforeNavigate = SET !== 'after' ? undefined : async (page) => {
    await page.route(/\/assets\/portraits\/eric-(neutral|surprised|tired)\.webp/, (route) => {
      const face = route.request().url().match(/eric-(\w+)\.webp/)[1];
      route.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(path.join(CAND, `eric-${face}.webp`)) });
    });
    await page.route(/\/js\/ui\/portraits\.js/, async (route) => {
      const res = await route.fetch();
      const body = (await res.text()).replace(/eric: \{ W: 597,/, `eric: { W: ${NEW_W},`);
      if (!body.includes(`W: ${NEW_W}`)) throw new Error('FACE.eric not patched');
      route.fulfill({ response: res, body });
    });
  };
  const { page: p, errors } = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', touch: phone, beforeNavigate });
  await p.evaluate(() => {
    const g = globalThis.__game, say = g.ui.say.bind(g.ui);
    const on = () => [...globalThis.document.querySelectorAll('#stage .por')].filter((e) => !e.hidden).map((e) => e.dataset.who);
    g.ui.say = (...a) => {
      const r = say(...a);
      if (on().includes('eric')) { globalThis.__hold = true; return new Promise(() => {}); }
      return r;
    };
  });
  await p.waitForFunction(() => globalThis.__hold, null, { timeout: 240000, polling: 50 });
  await p.waitForTimeout(1200);
  for (const face of FACES) {
    // swap the expression the way portraits.js set() does (img src and the --src mask)
    await p.evaluate(async (face) => {
      const el = [...globalThis.document.querySelectorAll('#stage .por')].find((e) => e.dataset.who === 'eric' && !e.hidden);
      const img = el.querySelector('img');
      const src = img.src.replace(/eric-\w+\.webp/, `eric-${face}.webp`);
      el.classList.remove('listen', 'hop');
      img.style.animation = 'none';
      img.src = src;
      el.style.setProperty('--src', `url("${src}")`);
      await img.decode();
    }, face);
    await p.waitForTimeout(400);
    const info = await p.evaluate(() => {
      const el = [...globalThis.document.querySelectorAll('#stage .por')].find((e) => e.dataset.who === 'eric' && !e.hidden);
      const r = el.getBoundingClientRect(), img = el.querySelector('img');
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        right: Math.round(r.right), natural: [img.naturalWidth, img.naturalHeight], vw: globalThis.innerWidth,
        scrollW: globalThis.document.scrollingElement.scrollWidth };
    });
    const name = `${W}x${H}-${SET}-${face}`;
    await p.screenshot({ path: path.join(out, name + '.png'), timeout: 120000 });
    const cx = Math.max(0, info.x - 40), cy = Math.max(0, info.y);
    await p.screenshot({ path: path.join(out, name + '-close.png'),
      clip: { x: cx, y: cy, width: Math.min(+W - cx, info.w + 80), height: Math.min(+H - cy, info.h) } });
    console.log(name, JSON.stringify(info));
  }
  if (errors.length) console.log('page errors:', errors.join(' | '));
  await p.goto('about:blank');
}, { timeoutMs: 280000 });
