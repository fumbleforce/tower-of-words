// Lists every selectable thing in each place and what its action menu shows (E row, Say row), with every word known.
// Say shows where a word does something now: a say: trigger for it, or a thing with nothing else to use (issue #103).
//   node game3d/tools/say-menu-check.mjs [W H] [place...]   (shots of each menu in game3d/shots/say-menu/)
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const args = process.argv.slice(2);
const [W = '1366', H = '860'] = args.filter((a) => /^\d+$/.test(a));
const only = args.filter((a) => !/^\d+$/.test(a));
const PLACES = only.length ? only : ['train', 'gate', 'forecourt', 'office', 'plaza', 'dorm_court', 'dorms'];
const SHOT = process.env.SHOT; // "place:thing,place:thing" to screenshot those menus
const out = `game3d/shots/say-menu/${W}x${H}`;
fs.mkdirSync(out, { recursive: true });
let bad = 0;
await withBrowserJob('say-menu', async (b) => {
  const phone = +W < 700;
  // a fresh page at the place with every word known; again after a thing starts a scene or a trip (the lift, a lane)
  const open = async (place) => {
    const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
    p.setDefaultTimeout(90000);
    p.on('pageerror', (e) => {
      bad++;
      console.log(`ERROR ${place}: ${e.message}`);
    });
    await p.addInitScript(() => {
      globalThis.localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }));
    });
    await p.goto(`${process.env.BASE || 'http://127.0.0.1:8771/game3d'}/index.html?q=1&skip&place=${place}`);
    await p.waitForFunction(() => globalThis.__game?.player && globalThis.__game.saveEnabled);
    await p.waitForTimeout(3000);
    // the place's opening lines, if any
    for (let i = 0; i < 40 && (await p.evaluate(() => !!globalThis.__game.busy)); i++) {
      await p.keyboard.press('Space');
      await p.waitForTimeout(400);
    }
    const ids = await p.evaluate(async () => {
      const { known, SAYABLE } = await import(new URL("js/lang.js", globalThis.location.href).href);
      for (const w of SAYABLE) known.add(w);
      return globalThis.__game.markers.list.filter((m) => m.enabled() && m.spot && m.spot()).map((m) => m.id);
    });
    return { p, ids };
  };
  for (const place of PLACES) {
    let { p, ids } = await open(place);
    console.log(`\n${place}`);
    for (const id of ids) {
      const moved = await p.evaluate(
        (place) => globalThis.__game.place.name !== place || globalThis.__game.busy || globalThis.document.body.classList.contains('trip'),
        place,
      );
      if (moved) {
        await p.close();
        ({ p } = await open(place));
      }
      const r = await p.evaluate(async (id) => {
        const G = globalThis.__game;
        const m = G.markers.list.find((x) => x.id === id);
        G.targetLock = m;
        const s = m.spot();
        if (G.player.seated) G.standUp();
        G.player.root.position.x = s[0];
        G.player.root.position.z = s[1];
        G.walker.sync?.();
        G.place.cam?.snap?.(G.player.root.position);
        await new Promise((r) => setTimeout(r, 400));
        const act = globalThis.document.getElementById('actMenu');
        return {
          near: G.near?.id,
          says: G.saysSomething(m),
          use: G.canUse(m),
          rows: act.hidden ? [] : [...act.children].map((c) => (c.className.replace('act ', '') + ':' + c.textContent).trim()),
        };
      }, id);
      const sayRow = r.rows.some((x) => x.startsWith('say'));
      const useRow = r.rows.some((x) => x.startsWith('use'));
      // the menu must match: Say row exactly where a word does something, E row exactly where there is a use
      const ok = r.near !== id || (sayRow === r.says && useRow === r.use && (useRow || sayRow || !r.says));
      if (!ok) bad++;
      console.log(
        `${ok ? '  ' : 'BAD'} ${id.padEnd(18)} ${r.near === id ? '' : '(not in reach: ' + r.near + ') '}use=${r.use ? 'yes' : 'no '} say=${r.says ? 'yes' : 'no '}  menu: ${r.rows.join(' | ')}`,
      );
      if (SHOT && SHOT.split(',').includes(`${place}:${id}`)) {
        await p.waitForTimeout(2000); // the camera catches up with him
        await p.screenshot({ path: `${out}/${place}-${id}.png` });
        // the Say row opens the word list aimed at this thing
        if (sayRow) {
          await p.click('#actMenu .act.say');
          await p.waitForTimeout(300);
          const head = await p.evaluate(() => globalThis.document.querySelector('#sayMenu .head').textContent);
          await p.screenshot({ path: `${out}/${place}-${id}-say.png` });
          await p.click('#sayMenu .cancel');
          console.log(`     Say row opens: "${head}"`);
        }
      }
    }
    await p.close();
  }
});
console.log(bad ? `\nFAIL ${bad}` : '\nPASS');
process.exit(bad ? 1 : 0);
