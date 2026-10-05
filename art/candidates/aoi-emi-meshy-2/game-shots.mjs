// In-game stills of Aoi and Emi (round 2 Meshy models) for the Showcase entry: the day plays itself in test mode
// (?test=fast), as beat-shots.mjs does, and the page holds for two stills on every line Aoi or Emi says (up to MAX per
// person): the scene as played, then with the story's own camera step closing on her (cam, zoom 2.6) and the dialogue
// box and portraits hidden; and one as each place starts, closed on Aoi when she is there. Errors are printed.
//   node art/candidates/aoi-emi-meshy-2/game-shots.mjs <w> <h> [day]     BASE=<path under 8771 to game3d>
// Writes game3d/shots/aoi-emi-2/<day>-<w>x<h>/ (local only).
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [W, H, DAY] = [+(process.argv[2] || 1366), +(process.argv[3] || 860), +(process.argv[4] || 1)];
const base = process.env.BASE || 'game3d';
const MAX = +(process.env.MAX || 4);
const out = `game3d/shots/aoi-emi-2/day${DAY}-${W}x${H}`;
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const errs = [], shots = [];
await withBrowserJob('aoi-emi-2-shots', async (browser) => {
  const p = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700 });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || /3D cast/.test(m.text())) errs.push(m.text()); });
  const seen = {};
  await p.exposeFunction('__aeShot', async (name) => {
    const n = (seen[name] = (seen[name] || 0) + 1);
    if (n > MAX) return;
    const file = `${name}-${n}.jpg`;
    await p.screenshot({ path: `${out}/${file}`, type: 'jpeg', quality: 85 });
    shots.push(file);
  });
  await p.addInitScript(() => {
    const hook = () => {
      const g = window.__game;
      if (!g || !g.ui || !g.runner || g.__aeHooked) return setTimeout(hook, 50);
      g.__aeHooked = true;
      const say = g.ui.say.bind(g.ui);
      g.ui.say = async (speaker, text, o = {}) => {
        const who = String(o.whoId || speaker || '').toLowerCase();
        const pr = say(speaker, text, o);
        if (who === 'aoi' || who === 'emi') {
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__aeShot(`${g.place ? g.place.name : 'x'}-${who}`);
          await close(who, `${g.place ? g.place.name : 'x'}-${who}-close`);
        }
        return pr;
      };
      const hide = document.createElement('style');
      hide.textContent = '#talk,#stage,#hud,#sayBtn,#caption{visibility:hidden!important}';
      const close = async (who, name) => {
        g.hooks.cam({ on: who, zoom: 2.6 });
        await new Promise((r) => setTimeout(r, 900));
        document.head.append(hide);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await window.__aeShot(name);
        hide.remove();
      };
      let last = '';
      const run = g.runner.run.bind(g.runner);
      g.runner.run = (...a) => {
        const pl = g.place && g.place.name;
        if (pl && pl !== last) {
          last = pl;
          setTimeout(async () => {
            await window.__aeShot(`${pl}-start`);
            if (g.place.people?.aoi?.root?.visible) await close('aoi', `${pl}-aoi`);
          }, 600);
        }
        return run(...a);
      };
    };
    hook();
  });
  const q = DAY > 1 ? `&day=${DAY}` : '';
  await p.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&q=1${q}`, { timeout: 60000 });
  await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: 240000 }).catch(() => errs.push('timeout'));
}, { timeoutMs: 290000 });
console.log(shots.length, 'stills in', out);
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 8).join(' | ') : 'no page errors');
