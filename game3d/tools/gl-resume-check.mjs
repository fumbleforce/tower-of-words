// The 3D view comes back after switching apps (Jørgen, S23 Chrome, 2026-10-05: "got black screen again on mobile in
// elevator as i switched between apps"). For an outdoor place (the gate) and the lift ride, the page goes to the
// background (visibilitychange hidden, Page.setWebLifecycleState frozen), the WebGL context is lost there in one of
// three ways, and the page comes back (active, visible, pageshow):
//   none     nothing lost: the view must still draw
//   restore  lost and given back by the browser: three.js rebuilds, the view must draw
//   silent   lost and never given back, and the lost event never reaches the page: the guard must notice on its own
//            and reload into the save (perf/gl-guard.js)
// and once at the gate the frames come out all black with the context alive: the guard must reload too.
// After each the canvas must show a picture (pixels that differ) with a live context, within a few seconds.
// The lift ride's own dark must not count as a dead view: a ride played through must not reload.
//   node game3d/tools/gl-resume-check.mjs [w] [h] [dpr]     writes game3d/shots/gl-resume/<w>x<h>/
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '390', H = '844', DPR = '2.625'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}/index.html?test=fast&q=1`;
const out = path.join(G, `shots/gl-resume/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const res = [];
const check = (test, pass, detail = '') => {
  res.push({ test, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${test}  ${detail}`);
};

const PLACES = {
  gate: { place: 'gate', ready: () => true },
  lift: {
    place: 'forecourt',
    ready: () => window.__lift && window.__lift.ride.on && window.__game.place.name === 'forecourt',
  },
};
const RUNS = [
  ['gate', 'restore'],
  ['gate', 'silent'],
  ['gate', 'black'],
  ['lift', 'none'],
  ['lift', 'restore'],
  ['lift', 'silent'],
];

await withBrowserJob(
  'gl-resume-check',
  async (browser) => {
    const ctx = await browser.newContext({
      viewport: { width: +W, height: +H },
      deviceScaleFactor: +DPR,
      isMobile: phone,
      hasTouch: phone,
    });
    for (const [where, how] of RUNS) {
      const tag = `${where}-${how}`;
      const p = await ctx.newPage();
      const cdp = await ctx.newCDPSession(p);
      const errs = [],
        warns = [];
      p.on('pageerror', (e) => errs.push(e.message));
      p.on('console', (m) => {
        if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text());
        if (/draws nothing|context lost/i.test(m.text())) warns.push(m.text());
      });
      // the spread of the view's pixels with the HTML overlay hidden (about 0 when nothing is drawn)
      const spread = async (name) => {
        await p.evaluate(() => document.getElementById('ui')?.style.setProperty('visibility', 'hidden'));
        await p.waitForTimeout(120);
        const png = (await p.screenshot({ path: path.join(out, `${name}.png`) })).toString('base64');
        await p.evaluate(() => document.getElementById('ui')?.style.removeProperty('visibility'));
        return p.evaluate(async (b64) => {
          const img = new Image();
          img.src = 'data:image/png;base64,' + b64;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = 120;
          c.height = Math.round((120 * img.height) / img.width);
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0, c.width, c.height);
          const d = g.getImageData(0, 0, c.width, c.height).data;
          let n = 0,
            s = 0,
            s2 = 0;
          for (let i = 0; i < d.length; i += 4) {
            const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
            s += l;
            s2 += l * l;
            n++;
          }
          return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
        }, png);
      };
      const state = () =>
        p.evaluate(() => ({
          place: window.__game?.place?.name,
          lost: !!window.__game?.renderer.getContext().isContextLost(),
          ride: !!window.__lift?.ride?.on,
          same: window.__mark === 1, // still the page from before (no reload)
        }));
      const away = async (on) => {
        await p.evaluate((on) => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => on });
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => (on ? 'hidden' : 'visible'),
          });
          document.dispatchEvent(new Event('visibilitychange'));
          window.dispatchEvent(new window.PageTransitionEvent(on ? 'pagehide' : 'pageshow', { persisted: true }));
        }, on);
        await cdp.send('Page.setWebLifecycleState', { state: on ? 'frozen' : 'active' });
      };
      try {
        await p.goto(`${base}&place=${PLACES[where].place}`);
        await p.waitForFunction(() => window.__game?.place && !document.body.classList.contains('at-title'), null, {
          timeout: 90000,
        });
        await p.waitForFunction(PLACES[where].ready, null, { timeout: 120000, polling: 50 });
        await p.waitForTimeout(where === 'lift' ? 1200 : 2500);
        await p.evaluate(() => (window.__mark = 1));
        const before = await state();
        if (how === 'black') {
          // the frames come out all black, the context alive (the post chain draws nothing but a black clear)
          await p.evaluate(() => {
            const R = window.__game.renderer;
            R.render = () => {
              R.setRenderTarget(null);
              R.setClearColor(0x000000, 1);
              R.clear();
            };
          });
        } else {
          await away(true);
          if (how !== 'none')
            await p.evaluate((how) => {
              if (how === 'silent')
                window.addEventListener('webglcontextlost', (e) => (e.preventDefault(), e.stopImmediatePropagation()), {
                  capture: true,
                  once: true,
                });
              window.__lx = window.__game.renderer.getContext().getExtension('WEBGL_lose_context');
              window.__lx.loseContext();
            }, how);
          await p.waitForTimeout(800);
          await away(false);
          if (how === 'restore') {
            await p.waitForTimeout(300);
            await p.evaluate(() => window.__lx.restoreContext());
          }
        }
        // drawn again within 15 s (a reload into the save included)
        let st = null,
          sd = 0;
        const until = Date.now() + 15000;
        await p.waitForTimeout(1500);
        while (Date.now() < until) {
          st = await state().catch(() => null);
          if (st?.place && !st.lost && !(how === 'black' && st.same)) {
            sd = await spread(tag).catch(() => 0);
            if (sd > 8) break;
          }
          await p.waitForTimeout(1000);
        }
        const reloadWanted = how === 'silent' || how === 'black';
        check(
          `${where}: ${how}: the view draws again${reloadWanted ? ' (after a reload)' : ''}`,
          st && !st.lost && sd > 8 && (reloadWanted ? !st.same : true),
          JSON.stringify({ before: before.place, ride: before.ride, after: st, spread: +sd.toFixed(1), warns }),
        );
        if (how === 'none' || how === 'restore') check(`${where}: ${how}: no reload`, st?.same, st ? '' : 'no state');
        if (where === 'lift' && how === 'none') {
          // the rest of the ride and the arrival: the dark mustn't read as a dead view
          await p.waitForFunction(() => window.__game?.place?.name === 'office' && !window.__lift.ride.on, null, {
            timeout: 60000,
          });
          await p.waitForTimeout(1500);
          const end = await state();
          check(
            'lift: the ride to B2 plays through without a reload',
            end.same && !warns.some((w) => /nothing/.test(w)),
            JSON.stringify(warns),
          );
        }
      } catch (e) {
        await p.screenshot({ path: path.join(out, `${tag}-error.png`) }).catch(() => {});
        check(`${where}: ${how}`, false, e.message.split('\n')[0]);
      }
      check(`${where}: ${how}: no page errors`, !errs.length, errs.slice(0, 3).join(' | '));
      await p.close();
    }
    await ctx.close();
  },
  { timeoutMs: 540000 },
);
console.log(`artifacts: ${out}`);
process.exit(res.length && res.every((r) => r.pass) ? 0 : 1);
