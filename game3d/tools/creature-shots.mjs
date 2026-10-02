// Stills of the outdoor places with their birds and animals (js/creatures/), desktop and phone, morning or evening.
//   node game3d/tools/creature-shots.mjs <outdir> name:place[:eve][:wait=<s>][:mx=<x>,<z>][:zoom=<k>][:focus=<kind>][:scare=<kind>[:seq=<n>]] ...
// Each shot: the place loaded on its own (?place=), the period set, a few seconds of play so the creatures settle,
// then <name>-desk.png / <name>-phone.png. SIZES=1366x860,390x844 (default both). BASE=.claude/worktrees/<n>/game3d.
// zoom=<k> brings the camera k times closer, on the first one of focus=<kind> (pigeon, cat, ...) or on Eric. INFO=1 prints what the creatures system placed.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [out, ...specs] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const errors = [];
await withBrowserJob(
  'creature-shots',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
      for (const spec of specs) {
        const [name, place, ...rest] = spec.split(':');
        const opt = (k) => rest.find((r) => r.startsWith(k + '='))?.slice(k.length + 1);
        const eve = rest.includes('eve');
        const wait = +(opt('wait') || 4);
        const at = opt('mx');
        const zoom = +(opt('zoom') || 1);
        const page = await context.newPage();
        page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
        page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(`${name}: ${m.text()}`));
        const [mx, mz] = at ? at.split(',') : [];
        const q = `cap&q=${process.env.Q || 1}&place=${place}${at ? `&mx=${mx}&mz=${mz}` : ''}`;
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?${q}`, { timeout: 60000 });
        await page
          .waitForFunction(() => globalThis.__done, null, { timeout: 120000 })
          .catch(() => errors.push(`${name}: timeout`));
        await page.evaluate(() => (globalThis.__run = true)); // ?cap holds the world still; let it play
        if (eve)
          await page.evaluate(async () => {
            // the game's own sim module (its URL carries the build's ?v=)
            const url = performance.getEntriesByType('resource').find((e) => /\/js\/sim\.js/.test(e.name)).name;
            (await import(url)).sim.period = 'evening';
            globalThis.__game.place.onPeriod?.('evening');
            globalThis.__creatures?.reset(); // as if the place had been entered after work
          });
        await page.waitForTimeout(wait * 1000);
        // a close-up: the camera k times closer, on the first one of a kind that is out (focus=<kind>), or on Eric
        if (zoom !== 1)
          await page.evaluate(
            async ([k, kind]) => {
              const THREE = await import('three');
              const g = globalThis.__game,
                c = g.place.cam,
                cr = globalThis.__creatures;
              const t = g.player.root.position.clone();
              const grp = kind && cr?.groups.find((x) => x.def.kind === kind);
              const b = grp?.birds?.find((x) => x.mode === 'rest') || grp?.bugs?.find((x) => x.on);
              if (b) t.copy(b.p);
              else if (grp?.root) t.copy(grp.root.position);
              g.place.space.localToWorld(t);
              globalThis.document.head.insertAdjacentHTML('beforeend', '<style>.mark{display:none!important}</style>');
              const d = c.fitDist / k;
              c.wanted = () => [new THREE.Vector3().copy(t), d];
              c.target.copy(t);
              c.dist = d;
              c.place();
            },
            [zoom, opt('focus')],
          );
        await page.waitForTimeout(400);
        if (process.env.INFO)
          console.log(name, JSON.stringify(await page.evaluate(() => globalThis.__creatures?.info?.())));
        const file = path.join(out, `${name}-${phone ? 'phone' : 'desk'}.png`);
        await page.screenshot({ path: file });
        console.log('wrote', file);
        // scare=<kind>: Eric steps up next to the first resting one of that kind, and seq=<n> frames follow, 0.25 s
        // apart (<name>-<i>-desk.png ...)
        const scare = opt('scare');
        if (scare) {
          const ok = await page.evaluate((kind) => {
            const g = globalThis.__game,
              grp = globalThis.__creatures?.groups.find((x) => x.def.kind === kind);
            const b = grp?.birds?.find((x) => x.mode === 'rest');
            if (!b) return false;
            const p = g.player.root.position,
              K = g.place.charScale || 1;
            p.set(b.p.x + 1.1 * K, p.y, b.p.z + 1.1 * K);
            g.walker?.sync?.();
            return true;
          }, scare);
          if (!ok) errors.push(`${name}: no resting ${scare} to walk up to`);
          for (let i = 0; i < +(opt('seq') || 6); i++) {
            const f = path.join(out, `${name}-${i}-${phone ? 'phone' : 'desk'}.png`);
            await page.screenshot({ path: f });
            console.log('wrote', f);
            await page.waitForTimeout(250);
          }
        }
        await page.close();
      }
      await context.close();
    }
  },
  { timeoutMs: 590000, gpuWaitMs: 400000 },
);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
