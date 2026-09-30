// Eric's portrait framing next to Mio's: plays the day in fast test mode until the first line where Eric and Mio
// are both on stage, then saves the frame and a close-up of the two faces.
//   node game3d/tools/eric-face-shots.mjs [w] [h] [tag]
// WHO=eric (or mio) holds on the first line with just that person on stage (the phone shows one at a time).
// BASE=.claude/worktrees/<name>/game3d shoots a worktree's game through the review server, as fast.mjs does.
// Output: game3d/shots/eric-face/<w>x<h>[-tag].png and -faces.png, plus the placed boxes in the console.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { openGame } from '../test/support/open-game.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', TAG = ''] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/eric-face');
fs.mkdirSync(out, { recursive: true });
const name = `${W}x${H}${TAG ? '-' + TAG : ''}`;
const phone = +W < 700;
await withBrowserJob('eric-face-shots', async (browser) => {
const url = process.env.BASE ? `http://127.0.0.1:8771/${process.env.BASE}/index.html?test=fast&q=0` : undefined;
const { page: p } = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', touch: phone, url });
// hold the day on the first line with both of them on stage (the say never resolves)
await p.evaluate((need) => {
  const g = globalThis.__game, say = g.ui.say.bind(g.ui);
  const on = () => [...globalThis.document.querySelectorAll('#stage .por')].filter((e) => !e.hidden).map((e) => e.dataset.who);
  g.ui.say = (...a) => {
    const r = say(...a);
    const w = on();
    if (need.every((x) => w.includes(x))) { globalThis.__hold = true; return new Promise(() => {}); }
    return r;
  };
}, (process.env.WHO || 'eric,mio').split(','));
await p.waitForFunction(() => globalThis.__hold, null, { timeout: 240000, polling: 50 });
await p.waitForTimeout(1500);
const box = await p.evaluate(() => [...globalThis.document.querySelectorAll('#stage .por')].map((e) => { const r = e.getBoundingClientRect(); return { who: e.dataset.who, face: e.dataset.face, hidden: e.hidden, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
await p.screenshot({ path: path.join(out, name + '.png'), timeout: 120000 });
console.log(name, JSON.stringify(box));
await p.goto('about:blank');
}, { timeoutMs: 280000 });
