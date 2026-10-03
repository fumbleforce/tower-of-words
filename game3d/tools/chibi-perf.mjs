// The chibi look's cost on the phone profile (393 x 851, DPR 2.75, touch, CPU 4x slower), with and without ?chibi=1:
// per place, draw calls and triangles per frame, frame time over a few seconds, and the GPU memory the scene holds
// (every texture's pixels with mipmaps, every geometry's buffers; estimated from the objects, as WebGL can't report it)
// plus the named people's share of it (Eric, Mio and the place's people) and the crowd's (the ambient crowd and the
// background people: Review chibi-crowd-1).
//   node game3d/tools/chibi-perf.mjs [q=0,1] [places=train,gate,forecourt,office,plaza] [size=phone|desktop] [chibi=0,1]
// size=desktop: 1366 x 860 at DPR 1, no CPU throttling (the fast test's desktop).
// A place may name its time of day, place:period (forecourt:morning,plaza:lunch,shotengai:lunch): the crowd for it.
// BASE=.claude/worktrees/<name>/game3d measures a worktree. Prints a table; writes game3d/shots/chibi/perf-<size>.json.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(k + '=')) || '').split('=')[1] || d;
const QS = arg('q', '0,1').split(',');
const PLACES = arg('places', 'train,gate,forecourt,office,plaza').split(',');
const SIZE = arg('size', 'phone');
const CHIBI = arg('chibi', '0,1').split(',');
const VIEW =
  SIZE === 'desktop'
    ? { viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 }
    : { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true };
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`;
const rows = [];
await withBrowserJob(
  'chibi-perf',
  async (browser) => {
    for (const q of QS)
      for (const chibi of CHIBI)
        for (const spec of PLACES) {
          const [place, period] = spec.split(':');
          const ctx = await browser.newContext(VIEW);
          const p = await ctx.newPage();
          const cdp = await ctx.newCDPSession(p);
          if (SIZE !== 'desktop') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          const errs = [];
          p.on('pageerror', (e) => errs.push(e.message));
          await p.goto(`${base}?q=${q}&place=${place}&skip&chibi=${chibi}`);
          await p.waitForFunction(() => window.__game?.place && window.__done, null, { timeout: 120000 }).catch(() => errs.push('timeout'));
          const r = await p.evaluate(async (period) => {
            const g = window.__game,
              ren = g.renderer;
            if (period) {
              const v = document.querySelector('script[src*="main.js"]').src.split('main.js')[1];
              const { sim } = await import('./js/sim.js' + v);
              sim.period = period;
              g.place.onPeriod?.(period);
              g.place.ambient?.enter(period);
              await new Promise((ok) => setTimeout(ok, 3000)); // a few walkers out and in view
            }
            window.__perfHold = true;
            ren.info.autoReset = false;
            const frames = [];
            let calls = 0,
              tris = 0,
              n = 0,
              last = performance.now();
            await new Promise((ok) => {
              const tick = () => {
                const now = performance.now();
                frames.push(now - last);
                last = now;
                calls += ren.info.render.calls;
                tris += ren.info.render.triangles;
                ren.info.reset();
                if (++n < 120) requestAnimationFrame(tick);
                else ok();
              };
              requestAnimationFrame(tick);
            });
            ren.info.autoReset = true;
            window.__perfHold = false;
            frames.sort((a, b) => a - b);
            // GPU memory held: unique textures and geometries in the scene
            const texB = (t) => {
              const im = t.image;
              const w = im?.width || im?.videoWidth || 0,
                h = im?.height || im?.videoHeight || 0;
              return w * h * 4 * (t.generateMipmaps === false ? 1 : 4 / 3);
            };
            const geoB = (geo) => {
              let s = geo.index ? geo.index.array.byteLength : 0;
              for (const a of Object.values(geo.attributes)) s += a.array.byteLength;
              return s;
            };
            // each texture and geometry once, however many people share it
            const sum = (...roots) => {
              const tx = new Set(),
                gs = new Set();
              for (const root of roots)
                root.traverse((o) => {
                if (o.geometry) gs.add(o.geometry);
                for (const m of [].concat(o.material || []))
                  for (const v of Object.values(m)) if (v && v.isTexture) tx.add(v);
              });
              let t = 0,
                gb = 0,
                tri = 0;
              for (const x of tx) t += texB(x);
              for (const x of gs) {
                gb += geoB(x);
                tri += (x.index ? x.index.count : x.attributes.position?.count || 0) / 3;
              }
              return { texMB: +(t / 1048576).toFixed(1), geoMB: +(gb / 1048576).toFixed(1), tris: Math.round(tri) };
            };
            const people = [...new Set([g.player, g.mioNpc, ...Object.values(g.place.people || {})])].filter((x) => x?.root);
            const cast = sum(...people.map((x) => x.root));
            const extra = [...(g.place.crowd || []), ...Object.values(g.place.extras || {})].filter((x) => x?.root);
            const crowd = { ...sum(...extra.map((x) => x.root)), n: extra.length };
            // which mesh tier each chibi in sight draws (chibi.js), and how many draw a sun shadow
            const tiers = {};
            g.place.scene.traverseVisible((o) => {
              if (!o.isSkinnedMesh || o.userData.tier == null) return;
              const k = (o.userData.tier || 'hi') + (o.castShadow ? '+shadow' : '');
              tiers[k] = (tiers[k] || 0) + 1;
            });
            return {
              tiers,
              ms50: +frames[60].toFixed(1),
              ms95: +frames[114].toFixed(1),
              calls: Math.round(calls / 120),
              tris: Math.round(tris / 120),
              scene: sum(g.place.scene),
              cast: { ...cast, n: people.length },
              crowd,
              heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null,
              textures: g.renderer.info.memory.textures,
              geometries: g.renderer.info.memory.geometries,
            };
          }, period);
          rows.push({ size: SIZE, q, chibi, place: spec, ...r, errors: errs });
          console.log(q, chibi, place, JSON.stringify(r), errs.length ? 'ERR ' + errs.join(' | ') : '');
          await ctx.close();
        }
  },
  { timeoutMs: 600000 },
);
fs.mkdirSync(path.join(G, 'shots/chibi'), { recursive: true });
fs.writeFileSync(path.join(G, `shots/chibi/perf-${SIZE}.json`), JSON.stringify(rows, null, 1));
console.log('\nq chibi place            calls  tris    ms50  ms95  sceneTexMB sceneGeoMB castTexMB castTris crowdN crowdTexMB crowdGeoMB');
for (const r of rows)
  console.log(
    [r.q, r.chibi, r.place.padEnd(16), String(r.calls).padStart(5), String(r.tris).padStart(7), String(r.ms50).padStart(5), String(r.ms95).padStart(5),
      String(r.scene.texMB).padStart(10), String(r.scene.geoMB).padStart(10), String(r.cast.texMB).padStart(9), String(r.cast.tris).padStart(8),
      String(r.crowd.n).padStart(6), String(r.crowd.texMB).padStart(10), String(r.crowd.geoMB).padStart(10)].join(' '),
  );
