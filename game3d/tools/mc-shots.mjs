// A protagonist on screen: boot with ?mc=<id>, start a new game, and capture the player's own line (speaker name and
// portrait) and the ticket app's header, at phone and desktop size; prints what the save recorded.
//   node game3d/tools/mc-shots.mjs [mc=carina] [outdir]      BASE=.claude/worktrees/<name>/game3d for a worktree
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [mc = 'carina', out = `game3d/shots/mc-${mc}`] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?q=0&mc=${mc}`;
await withBrowserJob('mc-shots', async (b) => {
  for (const [tag, W, H] of [['phone', 390, 844], ['desktop', 1366, 860]]) {
    const phone = W < 700;
    const p = await b.newPage({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 1, sayUsed: false }));
    });
    await p.goto(url);
    await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 120000 });
    await p.waitForTimeout(1000);
    await p.click('#title .go');
    await p.waitForFunction(() => window.__game?.player && !document.body.classList.contains('at-title'), null, {
      timeout: 60000,
    });
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => {
      const G = window.__game;
      G.runner.sayLine('eric', 'This is my line.', null, null, {});
      return { mc: G.mc.id, saved: JSON.parse(localStorage.getItem('amakawa-day1-save') || '{}').mc };
    });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/line-${tag}.png` });
    const who = await p.evaluate(() => document.querySelector('#talk')?.innerText.split('\n').slice(0, 2).join(' / '));
    console.log(tag, JSON.stringify(info), 'talk:', who, errs.length ? 'ERR ' + errs.join(' | ') : 'no page errors');
    await p.close();
  }
});
