// The train HUD at the cat moment: goal, a tip and the action prompt beside the cat, at desktop and phone sizes.
//   node game3d/tools/hud-shots.mjs <outdir> [prefix]     (run under tools/with-browser-lock.sh)
// Writes <prefix>-desktop.png, <prefix>-phone.png, plus -hint variants with a story hint in place of the Say tip.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [out = 'game3d/shots/hud-goal', pre = 'after'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [tag, W, H] of [['desktop', 1366, 860], ['phone', 390, 844]]) {
  const phone = W < 700;
  const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false })); } catch {} });
  await p.goto(`http://127.0.0.1:${process.env.PORT || 8771}/game3d/index.html?q=0`);
  await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 }).catch((e) => { console.log(tag, 'no title', errs.join(' | ')); throw e; });
  await p.waitForTimeout(1500);
  if (phone) await p.tap('#title .go'); else await p.click('#title .go');
  await p.waitForFunction(() => window.__game && window.__game.player && !document.body.classList.contains('at-title'), null, { timeout: 60000 });
  await p.waitForTimeout(2500);
  // talk to a passenger once (onboarding holds the goal and hints until then), click through their lines
  await p.evaluate(() => { const G = window.__game, q = G.player.root.position; const m = G.markers.list.filter((m) => m.enabled() && /person/.test(m.kind || '') && !['mio', 'kuroda', 'tama'].includes(m.id)).sort((a, b) => Math.hypot(q.x - a.spot()[0], q.z - a.spot()[1]) - Math.hypot(q.x - b.spot()[0], q.z - b.spot()[1]))[0]; const s = m.spot(); q.x = s[0]; q.z = s[1]; });
  await p.waitForTimeout(600);
  await p.evaluate(() => window.__game.use(window.__game.near));
  for (let i = 0; i < 20; i++) { await p.waitForTimeout(500); const busy = await p.evaluate(() => !!window.__game.busy || !document.querySelector('#talk').hidden); if (!busy) break; await p.mouse.click(W - 20, H - 20); }
  // stand next to the cat
  await p.evaluate(() => { const G = window.__game; const m = G.markers.list.find((x) => x.id === 'tama'); const s = m.spot(); G.player.root.position.x = s[0]; G.player.root.position.z = s[1]; });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const G = window.__game; if (G.flagsRef) G.flagsRef.say_tip = false; const m = G.markers.list.find((x) => x.id === 'tama'); m.goal = () => true; G.ui.goal('Say good morning to the cat.'); G.runner.learnCmd('ohayo'); });
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `${out}/${pre}-${tag}.png` });
  await p.evaluate(() => { const G = window.__game; G.ui._sayTipOff?.(); G.ui.hint('If something won\'t budge, try a word you know on it.'); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${pre}-${tag}-hint.png` });
  console.log(tag, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
  await p.close();
}
await b.close();
