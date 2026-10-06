// The pins' tooltips (docs/game/controls-and-ui.md, The HUD, Markers): on the forecourt, a talk pin and two ways out
// (PLACE=office PINS=vending for a look pin) each show their tooltip on hover (desktop) or a long press (phone); the
// long press doesn't use the pin, a plain tap still does. Close-ups of each with its tooltip: game3d/shots/pin-tip/.
//   node game3d/tools/pin-tip-check.mjs [W H]   env PLACE, PINS (ids, comma-separated), BASE (a worktree's path under
//   the review server), GPU_WAIT_MS
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const [W = '1366', H = '860'] = process.argv.slice(2);
const out = 'game3d/shots/pin-tip';
fs.mkdirSync(out, { recursive: true });
const PLACE = process.env.PLACE || 'forecourt';
const PINS = (process.env.PINS || 'kuro,lift,plaza_lane').split(',');
let bad = 0;
const ok = (c, msg) => {
  if (!c) bad++;
  console.log(`${c ? 'ok ' : 'BAD'} ${msg}`);
};
await withBrowserJob('pin-tip', async (b) => {
  const phone = +W < 700;
  const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  p.setDefaultTimeout(90000);
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }));
    } catch {}
  });
  const base = process.env.BASE || 'game3d';
  await p.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=${PLACE}`);
  await p.waitForFunction(() => window.__game?.player && !document.body.classList.contains('at-title'));
  await p.waitForTimeout(2500);
  for (let i = 0; i < 30 && (await p.evaluate(() => !!window.__game.busy || !document.getElementById('talk').hidden)); i++) {
    await p.keyboard.press('Space');
    await p.waitForTimeout(400);
  }
  const cdp = phone ? await p.context().newCDPSession(p) : null;
  for (const id of PINS) {
    // Eric a few steps from it, so its pin is on screen and full size
    const at = await p.evaluate((id) => {
      const G = window.__game;
      const m = G.markers.list.find((x) => x.id === id);
      if (!m) return null;
      const s = m.spot && m.spot();
      if (s) {
        G.player.root.position.x = s[0] + 1.6;
        G.player.root.position.z = s[1] + 1.2;
        G.walker.sync?.();
      }
      G.walker.path = null; // nothing left over from the pin before
      G.ui.closeActs?.();
      return true;
    }, id);
    if (!at) {
      ok(false, `${id}: no such pin here`);
      continue;
    }
    await p.waitForTimeout(1200);
    const pin = await p.evaluate((id) => {
      const m = window.__game.markers.list.find((x) => x.id === id);
      if (m.el.style.display === 'none' || m.el.classList.contains('crowded')) return null;
      const r = m.el.querySelector('.pin').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, glyph: [...m.el.classList].find((c) => c.startsWith('g-')) };
    }, id);
    if (!pin) {
      ok(false, `${id}: pin hidden or crowded`);
      continue;
    }
    const before = await p.evaluate(() => [window.__game.player.root.position.x, window.__game.player.root.position.z]);
    if (phone) {
      const pt = [{ x: pin.x, y: pin.y }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
      await p.waitForTimeout(700);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await p.mouse.move(pin.x, pin.y);
    await p.waitForTimeout(400);
    const tip = await p.evaluate(() => {
      const t = document.getElementById('pinTip');
      const r = t.getBoundingClientRect();
      return { shown: !t.hidden, text: t.textContent, r: [r.left, r.top, r.right, r.bottom], sel: getComputedStyle(t).userSelect };
    });
    const after = await p.evaluate(() => ({
      pos: [window.__game.player.root.position.x, window.__game.player.root.position.z],
      walking: !!window.__game.walker?.path,
      menu: !document.getElementById('actMenu').hidden,
      busy: !!window.__game.busy,
    }));
    ok(tip.shown && tip.text.length > 2, `${id} (${pin.glyph}): tooltip "${tip.text}"`);
    ok(tip.r[0] >= 0 && tip.r[1] >= 0 && tip.r[2] <= +W && tip.r[3] <= +H, `${id}: tooltip on screen`);
    if (phone) {
      const moved = Math.hypot(after.pos[0] - before[0], after.pos[1] - before[1]);
      ok(!after.walking && !after.menu && !after.busy && moved < 0.05, `${id}: the long press didn't use the pin ${JSON.stringify({ ...after, moved })}`);
    }
    const cx = Math.max(0, Math.min(+W - 360, pin.x - 180)),
      cy = Math.max(0, Math.min(+H - 220, pin.y - 140));
    await p.screenshot({ path: `${out}/${id}-${W}x${H}.png`, clip: { x: cx, y: cy, width: 360, height: 220 } });
    if (!phone) await p.mouse.move(5, +H - 5);
    else if (/g-(door|arrow|lift|stairs|walk)/.test(pin.glyph)) {
      // a way out would leave the place: the next press anywhere ends the preview
      await p.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.getElementById('pinTip').hidden), `${id}: the next press ends the preview`);
    } else {
      // the next tap ends the preview; a plain tap on the pin still uses it
      await p.touchscreen.tap(pin.x, pin.y);
      await p.waitForTimeout(900);
      const used = await p.evaluate(() => ({
        tip: !document.getElementById('pinTip').hidden,
        walking: !!window.__game.walker?.path,
        menu: !document.getElementById('actMenu').hidden,
        busy: !!window.__game.busy,
        pos: [window.__game.player.root.position.x, window.__game.player.root.position.z],
      }));
      const moved = Math.hypot(used.pos[0] - before[0], used.pos[1] - before[1]);
      ok(!used.tip && (used.walking || used.menu || used.busy || moved > 0.05), `${id}: a tap still uses the pin`);
      // back to rest for the next pin
      for (let i = 0; i < 30 && (await p.evaluate(() => !!window.__game.busy || !document.getElementById('talk').hidden)); i++) {
        await p.keyboard.press('Space');
        await p.waitForTimeout(400);
      }
      if (await p.evaluate((P) => window.__game.place.name !== P, PLACE)) break;
    }
    if (!phone) await p.waitForTimeout(300);
  }
  const hud = await p.evaluate(() => {
    const b = document.querySelector('#hud button, #muteBtn');
    return b ? getComputedStyle(b).userSelect : 'none';
  });
  ok(hud === 'none', `HUD buttons are not selectable (user-select ${hud})`);
  ok(!errs.length, `page errors: ${errs.join(' | ') || 'none'}`);
}, { gpuWaitMs: +process.env.GPU_WAIT_MS || 60000, timeoutMs: (+process.env.GPU_WAIT_MS || 0) + 285000 });
console.log(bad ? `FAIL pin-tip ${W}x${H}: ${bad}` : `PASS pin-tip ${W}x${H}`);
process.exit(bad ? 1 : 0);
