// Where a place's triangles go with the chibi look (?chibi=1): the frame's triangles (all passes), then again with
// each group hidden in turn (the crowd, the place's people, Eric and Mio), so the difference is that group's share.
//   node game3d/tools/chibi-tris.mjs [place:period ...]      SIZE=phone|desktop  Q=0  CHIBI=1  BASE=<worktree>/game3d
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const specs = process.argv.slice(2).length ? process.argv.slice(2) : ['shotengai:lunch'];
const phone = (process.env.SIZE || 'phone') === 'phone';
const view = phone
  ? { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true }
  : { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 };
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`;
await withBrowserJob('chibi-tris', async (browser) => {
  for (const spec of specs) {
    const [place, period] = spec.split(':');
    const ctx = await browser.newContext(view);
    const p = await ctx.newPage();
    await p.goto(`${base}?q=${process.env.Q || 0}&place=${place}&skip&chibi=${process.env.CHIBI || 1}`);
    await p.waitForFunction(() => window.__game?.place && window.__done, null, { timeout: 120000 });
    const r = await p.evaluate(async (period) => {
      const g = window.__game,
        ren = g.renderer;
      if (period) {
        const v = document.querySelector('script[src*="main.js"]').src.split('main.js')[1];
        const { sim } = await import('./js/sim.js' + v);
        sim.period = period;
        g.place.onPeriod?.(period);
        g.place.ambient?.enter(period);
        await new Promise((ok) => setTimeout(ok, 3000));
      }
      window.__perfHold = true;
      const frame = () =>
        new Promise((ok) =>
          requestAnimationFrame(() => {
            ren.info.autoReset = false;
            ren.info.reset();
            requestAnimationFrame(() => {
              const t = ren.info.render.triangles;
              ren.info.autoReset = true;
              ok(t);
            });
          }),
        );
      const avg = async () => {
        let s = 0;
        for (let i = 0; i < 20; i++) s += await frame();
        return Math.round(s / 20);
      };
      const groups = {
        crowd: [...(g.place.crowd || [])],
        people: Object.values(g.place.people || {}),
        extras: Object.values(g.place.extras || {}),
        eric: [g.player],
        mio: [g.mioNpc],
      };
      const out = { all: await avg(), lods: [] };
      g.place.scene.traverseVisible((o) => o.isLOD && out.lods.push(Math.round(o.userData.px)));
      for (const [k, list] of Object.entries(groups)) {
        const roots = list.filter((x) => x?.root?.visible).map((x) => x.root);
        roots.forEach((x) => (x.visible = false));
        out[k] = { n: roots.length, share: out.all - (await avg()) };
        roots.forEach((x) => (x.visible = true));
      }
      window.__perfHold = false;
      return out;
    }, period);
    console.log(spec, JSON.stringify(r));
    await ctx.close();
  }
});
