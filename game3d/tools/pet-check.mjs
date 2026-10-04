// Petting the stray cats (creatures/pet.js; Jørgen, 2026-10-04: "I need to be able to pet the other stray cats as
// well"), checked on its own in each place given, at phone size by a tap on the cat and at desktop size by E:
//   - the cat is a target once Eric is close (its paw pin shows, Pet on it), and not while it sits too high,
//   - Eric walks to free floor beside it and bends down; the cat leans in, then settles (curled, washing or sitting),
//   - the first pet of the day shows one narration line; a second pet shows none and the game isn't left busy,
//   - nothing else in the place is held up: no page errors, game.busy clears.
//   node game3d/tools/pet-check.mjs [outdir] [place[:eve] ...]   (default: shotengai harbour works plaza:eve)
// SIZES=390x844,1366x860 (default); BASE=<path to game3d> tests a worktree's copy. Stills: <outdir>/<place>-<n>-<w>x<h>.png
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [outArg, ...specArgs] = process.argv.slice(2);
const out = outArg || 'game3d/shots/pet';
const specs = specArgs.length ? specArgs : ['shotengai', 'harbour', 'works', 'plaza:eve'];
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '390x844,1366x860').split(',').map((s) => s.split('x').map(Number));
const fails = [],
  errors = [],
  done = [];
const ok = (c, msg) => c || fails.push(msg);

// the place's first cat that can be petted, with Eric put a few steps from it (tries a few cat placements)
async function findCat(page) {
  for (let i = 0; i < 8; i++) {
    const r = await page.evaluate(() => {
      const g = globalThis.__game,
        P = g.place,
        K = P.charScale || 1;
      for (const [id, t] of Object.entries(P.things)) {
        if (!id.startsWith('stray_') || !t.obj.visible) continue;
        const c = t.obj.position;
        // free floor about two steps from it, then it must be a target from there
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2,
            x = c.x + Math.sin(a) * 1.6 * K,
            z = c.z + Math.cos(a) * 1.6 * K;
          if (!P.nav.free(x, z, P.nav.R + 0.05)) continue;
          // not in a zone (a way out to the next place, a scene's trigger)
          if (Object.values(P.zones || {}).some((fn) => fn(x, z) || fn(c.x, c.z))) continue;
          g.player.root.position.set(x, 0, z);
          g.walker.sync?.();
          const m = g.markers.list.find((q) => q.id === id);
          if (m.enabled()) return { id, y: +c.y.toFixed(2), K };
        }
      }
      globalThis.__creatures.reset();
      return null;
    });
    if (r) return r;
    await page.waitForTimeout(600);
  }
  return null;
}
// the camera a few times closer, on the middle between Eric and the cat (as creature-shots.mjs zooms)
const frame = (page, id) =>
  page.evaluate(async (id) => {
    const THREE = await import('three');
    const g = globalThis.__game,
      c = g.place.cam,
      a = g.place.things[id].obj.getWorldPosition(new THREE.Vector3()),
      b = g.player.root.getWorldPosition(new THREE.Vector3()),
      t = a.add(b).multiplyScalar(0.5),
      d = c.fitDist / 2.6;
    c.wanted = () => [t.clone(), d];
    c.target.copy(t);
    c.dist = d;
    c.place();
  }, id);
const state = (page, id) =>
  page.evaluate((id) => {
    const g = globalThis.__game,
      c = globalThis.__creatures.groups.find((q) => 'stray_' + q.def.id === id),
      m = g.markers.list.find((q) => q.id === id),
      t = globalThis.document.querySelector('#talk');
    if (!m) return { gone: g.place.name };
    const p = g.player.root.position,
      s = m.spot();
    return {
      busy: !!g.busy,
      petting: !!c.petting,
      lean: +c.rig.lean.toFixed(2),
      mode: c.rig.mode,
      near: g.near?.id || null,
      pin: m.el.style.display !== 'none',
      verb: m.el.querySelector('.vb')?.textContent,
      walking: !!g.walker.path,
      gap: s ? +Math.hypot(p.x - c.root.position.x, p.z - c.root.position.z).toFixed(2) : null,
      line: t && !t.hidden ? t.textContent.trim() : '',
    };
  }, id);

await withBrowserJob(
  'pet-check',
  async (browser) => {
    for (const [W, H] of sizes) {
      const phone = W < 700,
        tag = `${W}x${H}`;
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
      for (const spec of specs) {
        const [place, eve] = spec.split(':');
        const page = await ctx.newPage();
        page.on('pageerror', (e) => errors.push(`${tag} ${place}: ${e.message}`));
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?cap&q=1&place=${place}`, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
        await page.evaluate(async (eve) => {
          globalThis.__run = true;
          if (!eve) return;
          const url = performance.getEntriesByType('resource').find((e) => /\/js\/sim\.js/.test(e.name)).name;
          (await import(url)).sim.period = 'evening';
          globalThis.__game.place.onPeriod?.('evening');
          globalThis.__creatures?.reset();
        }, eve);
        await page.waitForTimeout(1500);
        let n = 0;
        const shot = (name) => page.screenshot({ path: path.join(out, `${place}-${++n}-${name}-${tag}.png`) });
        const cat = await findCat(page);
        if (!cat) {
          fails.push(`${tag} ${place}: no cat to pet`);
          await page.close();
          continue;
        }
        await frame(page, cat.id);
        await page.waitForTimeout(700);
        let s = await state(page, cat.id);
        ok(s.verb === 'Pet', `${tag} ${place}: the cat's pin says "${s.verb}", not Pet`);
        await shot('near');
        if (phone) {
          // a tap on the cat itself
          const at = await page.evaluate((id) => {
            const g = globalThis.__game,
              v = g.place.things[id].obj.getWorldPosition(g.player.root.position.clone());
            v.y += 0.15 * (g.place.charScale || 1);
            v.project(g.place.camera);
            const r = g.renderer.domElement.getBoundingClientRect();
            return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
          }, cat.id);
          await page.touchscreen.tap(at[0], at[1]);
        } else {
          // E on the nearest target: he walks the last bit himself
          await page.evaluate((id) => {
            const g = globalThis.__game,
              sp = g.place.things[id].spot(),
              p = g.player.root.position;
            p.set(p.x + (sp[0] - p.x) * 0.7, 0, p.z + (sp[1] - p.z) * 0.7);
            g.walker.sync?.();
          }, cat.id);
          await page.waitForTimeout(1000); // the cat's spot beside her is worked out again every 0.7 s
          s = await state(page, cat.id);
          ok(s.near === cat.id, `${tag} ${place}: E's target is ${s.near}, not the cat`);
          ok(s.pin, `${tag} ${place}: no pin on the cat in reach`);
          await page.keyboard.press('KeyE');
        }
        // the most the cat leans in, sampled every frame
        await page.evaluate((id) => {
          const c = globalThis.__creatures.groups.find((q) => 'stray_' + q.def.id === id);
          globalThis.__lean = 0;
          const f = () => {
            globalThis.__lean = Math.max(globalThis.__lean, c.rig.lean);
            globalThis.requestAnimationFrame(f);
          };
          f();
        }, cat.id);
        await page.waitForFunction((id) => globalThis.__creatures.groups.find((q) => 'stray_' + q.def.id === id).petting, cat.id, { timeout: 8000 }).catch(() => {});
        await page.waitForFunction(() => !globalThis.__game.walker.path, null, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1300);
        s = await state(page, cat.id);
        await frame(page, cat.id);
        await page.waitForTimeout(60);
        await shot('petting');
        ok(s.petting && s.busy, `${tag} ${place}: not petting after the ${phone ? 'tap' : 'E'} (${JSON.stringify(s)})`);
        await page.waitForFunction(() => !globalThis.document.querySelector('#talk').hidden, null, { timeout: 8000 }).catch(() => {});
        const lean = await page.evaluate(() => globalThis.__lean);
        ok(lean > 0.5, `${tag} ${place}: the cat doesn't lean in (${lean})`);
        ok(s.gap !== null && s.gap < 1.0 * cat.K, `${tag} ${place}: Eric is ${s.gap} from the cat`);
        await page.waitForFunction(() => !globalThis.document.querySelector('#talk').hidden, null, { timeout: 8000 }).catch(() => {});
        s = await state(page, cat.id);
        ok(!!s.line, `${tag} ${place}: no narration line the first time`);
        await page.waitForTimeout(700);
        await shot('line');
        const line = s.line;
        if (phone) await page.locator('#talkHit').click({ force: true });
        else await page.keyboard.press('Space');
        await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(800);
        s = await state(page, cat.id);
        ok(!s.busy && !s.petting, `${tag} ${place}: still busy after the line (${JSON.stringify(s)})`);
        ok(['sleep', 'wash', 'sit'].includes(s.mode), `${tag} ${place}: the cat settles as "${s.mode}"`);
        await shot('settled');
        // a second pet: no line this time
        await page.evaluate((id) => {
          const g = globalThis.__game;
          g.use(g.markers.list.find((q) => q.id === id));
        }, cat.id);
        await page.waitForTimeout(600);
        await page.waitForFunction(() => !globalThis.__game.busy, null, { timeout: 9000 }).catch(() => {});
        s = await state(page, cat.id);
        ok(!s.line && !s.busy && !s.petting, `${tag} ${place}: the second pet ${JSON.stringify(s)}`);
        done.push(`${tag} ${place}: ${cat.id} (y ${cat.y}) "${line}"`);
        await page.close();
      }
      await ctx.close();
    }
  },
  { timeoutMs: 590000, gpuWaitMs: 300000 },
);
for (const d of done) console.log('petted', d);
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(fails.length || errors.length ? `FAIL\n${fails.join('\n')}` : 'PASS');
process.exitCode = fails.length || errors.length ? 1 : 0;
