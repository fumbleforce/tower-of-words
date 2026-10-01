// kuro-body-1: Kuro's portrait as the game places it, with the installed file or a candidate swapped in.
// Plays the day in fast test mode to the first line with someone on stage, holds it, then has Kuro say a line
// (the fast test never talks to the receptionist, so her own scene isn't reached) and saves the screen.
//   node art/candidates/portraits/kuro-body-1/ingame.mjs <w> <h> <tag> [candidate.webp]
// With a candidate, game3d/assets/portraits/kuro-neutral.webp is served from that file and FACE.kuro's H is set to
// the candidate's height (W and the face box stay: the candidates only add rows at the bottom).
// Output: game3d/shots/kuro-body-1/<w>x<h>-<tag>.png
import { withBrowserJob } from '../../../../tools/lib/browser-job.mjs';
import { openGame } from '../../../../game3d/test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', TAG = 'installed', CAND] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const out = path.join(ROOT, 'game3d/shots/kuro-body-1');
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const rel = path.relative('/home/jorgen/repo/japanese', ROOT);
const url = `http://127.0.0.1:8771/${rel ? rel + '/' : ''}game3d/index.html?test=fast&q=0`;
let candH = null;
if (CAND) {
  const b = fs.readFileSync(CAND);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') candH = b.readUIntLE(27, 3) + 1; // canvas height minus one
  else if (kind === 'VP8L') candH = ((b.readUInt32LE(21) >> 14) & 0x3fff) + 1; // lossless: 14-bit height minus one
  else candH = b.readUInt16LE(28) & 0x3fff; // lossy VP8
  if (!(candH > 800 && candH < 1200)) throw new Error(`unexpected candidate height ${candH}`);
}
await withBrowserJob('kuro-body-shots', async (browser) => {
  const { page: p } = await openGame(browser, {
    viewport: { width: +W, height: +H }, mode: 'fast', touch: phone, url,
    beforeNavigate: async (page) => {
      if (!CAND) return;
      await page.route(/portraits\/kuro-neutral\.webp/, (r) => r.fulfill({ body: fs.readFileSync(CAND), contentType: 'image/webp' }));
      await page.route(/js\/ui\/portraits\.js/, async (r) => {
        const res = await r.fetch();
        const js = (await res.text()).replace(/kuro: \{ W: 630, H: \d+,/, `kuro: { W: 630, H: ${candH},`);
        await r.fulfill({ response: res, body: js });
      });
    },
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
  await p.evaluate(() => { globalThis.__say({ name: 'Receptionist' }, 'Good morning. Your name, please?', { whoId: 'kuro' }); });
  await p.waitForTimeout(1500);
  const box = await p.evaluate(() => [...document.querySelectorAll('#stage .por')].map((e) => { const r = e.getBoundingClientRect(); return { who: e.dataset.who, hidden: e.hidden, short: e.classList.contains('short'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
  await p.screenshot({ path: path.join(out, `${W}x${H}-${TAG}.png`), timeout: 120000 });
  console.log(`${W}x${H}-${TAG}`, JSON.stringify(box));
  await p.goto('about:blank');
}, { timeoutMs: 280000 });
