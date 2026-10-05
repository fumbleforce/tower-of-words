// In-game stills of one person seated on the day-1 train (Rei: Review rei-meshy-1), made from staff-meshy-1/game-shots.mjs:
// the day plays in test mode until the train is built, then the person is shown (the story's `show` hook: Rei is hidden
// all day, so this is only for the picture; Mio, who later takes her seat, is hidden), the page elements are hidden and the place's own view is taken at full size. Errors are printed.
//   WHO=rei BASE=<path under 8771 to game3d> node art/candidates/rei-rig-1/train-shots.mjs <w> <h> <out dir>
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [W, H, out] = [+(process.argv[2] || 1366), +(process.argv[3] || 860), process.argv[4]];
const base = process.env.BASE || 'game3d';
const who = process.env.WHO || 'rei';
fs.mkdirSync(out, { recursive: true });
const errs = [];
await withBrowserJob('train-shots', async (browser) => {
  const p = await browser.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || /3D cast/.test(m.text())) errs.push(m.text()); });
  p.on('response', (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url()}`); });
  await p.goto(`http://127.0.0.1:8771/${base}/index.html?test=fast&q=1`, { timeout: 60000 });
  await p.waitForFunction(() => window.__game?.place?.name === 'train' && window.__game.hooks, null, { timeout: 120000 });
  await p.waitForTimeout(700);
  // only the 3D view: every page element but the canvas hidden (dialogue, phone, HUD), and no "you can talk to this"
  // highlight (main.js updateOutline clears it while the game is busy)
  await p.evaluate((SHOW) => {
    window.__game.busy = true;
    window.__game.hooks.show({ id: SHOW });
    // Rei: as the train is before the story seats Mio in her place (train.js placeMio), with Mio's laptop there
    const mio = window.__game.place.people.mio;
    if (SHOW === 'rei' && mio) mio.root.visible = false;
    const c = document.querySelector('canvas');
    for (const e of document.querySelectorAll('body *')) if (e !== c && !e.contains(c)) e.style.visibility = 'hidden';
  }, who);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/train-full.jpg`, type: 'jpeg', quality: 90 });
}, { timeoutMs: 200000 });
console.log('stills in', out);
console.log(errs.length ? 'ERRORS ' + errs.slice(0, 8).join(' | ') : 'no page errors');
