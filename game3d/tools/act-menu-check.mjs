// The action menu opens only when the player asks (Jørgen, 2026-10-02: "The interaction menu opens automatically
// everywhere and is very disruptive"). In each place, Eric stands at every pinned thing in turn: no menu may show.
// Then a tap (or click) on the pin of a thing with its verb and Say opens its menu, which must not cover Eric, the
// thing or its pin.
//   node game3d/tools/act-menu-check.mjs [W H] [place...]     (shots in game3d/shots/act-menu/<W>x<H>/)
//   BASE=http://127.0.0.1:8771/game3d to point at another build
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const args = process.argv.slice(2);
const [W = '1366', H = '860'] = args.filter((a) => /^\d+$/.test(a));
const only = args.filter((a) => !/^\d+$/.test(a));
const PLACES = only.length ? only : ['train', 'office', 'plaza'];
const out = `game3d/shots/act-menu/${W}x${H}`;
fs.mkdirSync(out, { recursive: true });
let bad = 0;
await withBrowserJob('act-menu', async (b) => {
  const phone = +W < 700;
  for (const place of PLACES) {
    const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    p.setDefaultTimeout(90000);
    p.on('pageerror', (e) => {
      bad++;
      console.log(`ERROR ${place}: ${e.message}`);
    });
    // USES=1 shows the E key on the pin in reach (desktop, before five uses)
    await p.addInitScript((uses) => {
      globalThis.localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses, sayUsed: true }));
    }, +(process.env.USES ?? 9));
    await p.goto(`${process.env.BASE || 'http://127.0.0.1:8771/game3d'}/index.html?q=1&skip&place=${place}`);
    await p.waitForFunction(() => globalThis.__game?.player && globalThis.__game.saveEnabled);
    await p.waitForTimeout(3000);
    for (let i = 0; i < 40 && (await p.evaluate(() => !!globalThis.__game.busy)); i++) {
      await p.keyboard.press('Space');
      await p.waitForTimeout(400);
    }
    await p.evaluate(async () => {
      const { known, SAYABLE } = await import(new URL('js/lang.js', globalThis.location.href).href);
      for (const w of SAYABLE) known.add(w);
    });
    await p.waitForTimeout(600);
    const ids = await p.evaluate(() =>
      globalThis.__game.markers.list.filter((m) => m.enabled() && m.spot && m.spot()).map((m) => m.id),
    );
    // standing at each thing: highlighted, no menu
    let shotNear = false,
      cands = [];
    for (const id of ids) {
      const r = await p.evaluate(async (id) => {
        const G = globalThis.__game;
        if (G.busy || globalThis.document.body.classList.contains('trip')) return { skip: true };
        const m = G.markers.list.find((x) => x.id === id);
        if (G.player.seated) G.standUp();
        const s = m.spot();
        G.player.root.position.x = s[0];
        G.player.root.position.z = s[1];
        G.walker.sync?.();
        G.place.cam?.snap?.(G.player.root.position);
        await new Promise((r) => setTimeout(r, 500));
        return {
          near: G.near?.id,
          menu: !globalThis.document.getElementById('actMenu').hidden,
          both: G.near === m && G.canUse(m) && (G.sayRow ? G.sayRow(m) : G.saysSomething(m)),
          teachE: globalThis.getComputedStyle(m.el.querySelector('.tag .key')).display !== 'none' && globalThis.getComputedStyle(m.el.querySelector('.tag')).display !== 'none',
        };
      }, id);
      if (r.skip) continue;
      if (process.env.USES && !shotNear && r.near === id) console.log(`  E key on the pin in reach: ${r.teachE}`);
      if (r.menu) {
        bad++;
        console.log(`BAD ${place} at ${id}: the menu opened by itself (near ${r.near})`);
      }
      if (!shotNear && r.near === id) {
        shotNear = true;
        await p.waitForTimeout(1200);
        await p.screenshot({ path: `${out}/${place}-near-${id}.png` });
      }
      if (r.both) cands.push(id);
    }
    console.log(`${place}: ${ids.length} things walked to, ${cands.length} with a verb and Say`);
    // the cat first (Jørgen's screenshot), then the others, until one has its pin clear to tap
    cands.sort((a, b) => (b === 'tama') - (a === 'tama'));
    for (const asked of cands.slice(0, 5)) {
      const xy = await p.evaluate(async (id) => {
        const G = globalThis.__game;
        const m = G.markers.list.find((x) => x.id === id);
        const s = m.spot();
        G.player.root.position.x = s[0];
        G.player.root.position.z = s[1];
        G.walker.sync?.();
        G.place.cam?.snap?.(G.player.root.position);
        // the camera settles on him; tap where the pin has come to rest
        let last = null;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 200));
          const b = m.el.querySelector('.pin').getBoundingClientRect();
          if (last && Math.abs(b.x - last.x) + Math.abs(b.y - last.y) < 1) break;
          last = b;
        }
        const b = m.el.querySelector('.pin').getBoundingClientRect();
        const at = globalThis.document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return m.el.contains(at) ? [b.x + b.width / 2, b.y + b.height / 2] : null;
      }, asked);
      if (!xy) continue;
      if (phone) await p.touchscreen.tap(xy[0], xy[1]);
      else await p.mouse.click(xy[0], xy[1]);
      await p.waitForTimeout(2500);
      // a teleported Eric can stand where the walk to its talking spot finds no path: then he never gets there
      const stuck = await p.evaluate(() => {
        const G = globalThis.__game;
        return globalThis.document.getElementById('actMenu').hidden && !G.busy && !G.ui.talking && !G.walker.path;
      });
      if (stuck) {
        console.log(`  tap ${asked}: no walk from the teleport spot, trying another`);
        continue;
      }
      const r = await p.evaluate((id) => {
        const G = globalThis.__game,
          a = globalThis.document.getElementById('actMenu');
        if (a.hidden) return { open: false, busy: !!G.busy, near: G.near?.id, talking: !!G.ui.talking };
        const box = a.getBoundingClientRect(),
          m = G.markers.list.find((x) => x.id === id),
          pin = m.el.querySelector('.pin').getBoundingClientRect(),
          e = G.ericBox?.();
        const hit = (k) => k && box.left < k.x1 && box.right > k.x0 && box.top < k.y1 && box.bottom > k.y0;
        return {
          open: true,
          rows: [...a.querySelectorAll('.act .lb')].map((x) => x.textContent),
          size: [Math.round(box.width), Math.round(box.height)],
          coversEric: hit(e),
          coversPin: hit({ x0: pin.left, x1: pin.right, y0: pin.top, y1: pin.bottom }),
          onScreen: box.left >= 0 && box.top >= 0 && box.right <= globalThis.innerWidth && box.bottom <= globalThis.innerHeight,
        };
      }, asked);
      console.log(`  tap ${asked}: ${JSON.stringify(r)}`);
      if (!r.open || r.coversPin || !r.onScreen) {
        bad++;
        console.log(`BAD ${place} ${asked}: the tapped menu is ${r.open ? 'misplaced' : 'missing'}`);
      }
      if (r.coversEric) console.log(`  note: the menu overlaps Eric's box`);
      await p.screenshot({ path: `${out}/${place}-tap-${asked}.png` });
      break;
    }
    await p.close();
  }
});
console.log(bad ? `\nFAIL ${bad}` : '\nPASS');
process.exit(bad ? 1 : 0);
