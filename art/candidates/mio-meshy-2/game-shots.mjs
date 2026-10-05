// Mio in the real game for reviews/mio-meshy-2 (aoi-emi-meshy-2/game-shots.mjs's method): day 1 plays itself in test
// mode (?test=fast) with the candidate (?mio=meshy2) or her model now (MIO=now), and the page holds for two stills on
// every line Mio says (up to MAX per place): the scene as played, then the story's own camera step closing on her
// (cam, zoom 2.6) with the dialogue box hidden; and one as each place starts. The run is also recorded as a video
// (Playwright recordVideo), so her walk, idle and sit can be watched as they play. Page errors are printed.
//   node art/candidates/mio-meshy-2/game-shots.mjs <w> <h>      BASE=<path under 8771 to game3d>  MIO=meshy2|now
// Writes the main checkout's art/parts/mio-meshy-2/game/<mio>-<w>x<h>/ (local only).
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [W, H] = [+(process.argv[2] || 1366), +(process.argv[3] || 860)];
const base = process.env.BASE || 'game3d';
const MIO = process.env.MIO || 'meshy2';
const MAX = +(process.env.MAX || 3);
const out = `/home/jorgen/repo/japanese/art/parts/mio-meshy-2/game/${MIO}-${W}x${H}`;
const errs = [], shots = [];
await withBrowserJob('mio-meshy-2-shots', async (browser) => {
  // a fresh folder only once the job is admitted (a deferred run must not wipe the last one)
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 700, isMobile: W < 700,
    recordVideo: { dir: out, size: { width: W, height: H } } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || /chibi failed|3D cast/.test(m.text())) errs.push(m.text()); });
  const seen = {};
  await p.exposeFunction('__mShot', async (name) => {
    const n = (seen[name] = (seen[name] || 0) + 1);
    if (n > MAX) return;
    const file = `${name}-${n}.jpg`;
    await p.screenshot({ path: `${out}/${file}`, type: 'jpeg', quality: 88 });
    shots.push(file);
  });
  await p.addInitScript(() => {
    const hook = () => {
      const g = window.__game;
      if (!g || !g.ui || !g.runner || g.__mHooked) return setTimeout(hook, 50);
      g.__mHooked = true;
      const hide = document.createElement('style');
      hide.textContent = '#talk,#stage,#hud,#sayBtn,#caption{visibility:hidden!important}';
      const close = async (name) => {
        g.hooks.cam({ on: 'mio', zoom: 2.6 });
        await new Promise((r) => setTimeout(r, 900));
        document.head.append(hide);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await window.__mShot(name);
        hide.remove();
      };
      const say = g.ui.say.bind(g.ui);
      g.ui.say = async (speaker, text, o = {}) => {
        const who = String(o.whoId || speaker || '').toLowerCase();
        const pr = say(speaker, text, o);
        if (who === 'mio' && g.mioNpc?.root?.visible) {
          const pl = g.place ? g.place.name : 'x';
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await window.__mShot(`${pl}-${g.mioNpc.state || 'x'}`);
          await close(`${pl}-${g.mioNpc.state || 'x'}-close`);
        }
        return pr;
      };
      let last = '';
      const run = g.runner.run.bind(g.runner);
      g.runner.run = (...a) => {
        const pl = g.place && g.place.name;
        if (pl && pl !== last) {
          last = pl;
          setTimeout(() => window.__mShot(`${pl}-start`), 600);
        }
        return run(...a);
      };
    };
    hook();
  });
  const q = MIO === 'now' ? '' : `&mio=${MIO}`;
  await p.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&q=1${q}`, { timeout: 60000 });
  await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: +(process.env.WAIT || 280000) }).catch(() => errs.push('timeout'));
  await ctx.close();
}, { timeoutMs: +(process.env.WAIT || 280000) + 60000 });
for (const f of fs.readdirSync(out)) if (f.endsWith('.webm')) fs.renameSync(`${out}/${f}`, `${out}/play.webm`);
console.log(shots.length, 'stills in', out);
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 8).join(' | ') : 'no page errors');
