// Checks the dorm courtyard's bath after work (places/dorm-bath.js, the `bath` discovery): the humming starts on its
// own once audio is unlocked and gets louder toward the sento door, the Bath marker shows, and using it plays the
// story's scene: Eric stops at the curtain, the first man's last try and the second man's answer play, and the caption
// comes up only after the second voice is done and stays until advanced. Stills of the marker and the caption.
//   node game3d/tools/bath-check.mjs <outdir>
// SIZES=1366x860,390x844 (default). BASE=.claude/worktrees/<name>/game3d for a worktree.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'game3d/shots/bath-check';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const fails = [],
  errors = [],
  notes = [];
await withBrowserJob(
  'bath-check',
  async (browser) => {
    for (const [W, H] of sizes) {
      const phone = W < 700,
        tag = `${W}x${H}`;
      const context = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
      // every buffer that starts playing: its length and the offset it starts at (the bath's two files are the
      // only ones near 6.8 s and 5.1 s long)
      await page.addInitScript(() => {
        globalThis.__starts = [];
        const start = globalThis.AudioBufferSourceNode.prototype.start;
        globalThis.AudioBufferSourceNode.prototype.start = function (when, offset) {
          globalThis.__starts.push({ d: +(this.buffer?.duration || 0).toFixed(2), offset: offset || 0, t: performance.now() });
          return start.apply(this, arguments);
        };
      });
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=dorm_court`, { timeout: 60000 });
      await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
      // unlock audio as the player's first key does (a short step toward the sento, well short of it)
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(120);
      await page.keyboard.up('ArrowRight');
      const stateUrl = new URL(`http://127.0.0.1:8771/${base}/js/narrative/state.js`).href;
      await page.evaluate(async (u) => {
        const { flags } = await import(u);
        flags.going_home = true;
      }, stateUrl);
      // the humming: wait for the first phrase, standing where he comes in
      await page.waitForTimeout(4000);
      const hums = await page.evaluate(() => globalThis.__starts.filter((s) => Math.abs(s.d - 6.83) < 0.1).length);
      if (!hums) fails.push(`FAIL ${tag}: no humming within 4 s of arriving`);
      else notes.push(`${tag}: humming started on its own (${hums} phrase)`);
      const marker = await page.evaluate(() => {
        const m = globalThis.__game.markers.list.find((x) => x.id === 'bath');
        return m && m.enabled() ? { text: m.el.textContent, onScreen: globalThis.getComputedStyle(m.el).display !== 'none' } : null;
      });
      if (!marker) fails.push(`FAIL ${tag}: no usable Bath thing`);
      else notes.push(`${tag}: marker "${marker.text}", ${marker.onScreen ? 'on screen' : 'off screen from where he comes in'}`);
      await page.screenshot({ path: path.join(out, `court-${tag}.png`) });
      // use it, as a tap on the marker does
      const t0 = await page.evaluate(() => {
        const g = globalThis.__game;
        const h = g.place.hooks.bathSong;
        g.place.hooks.bathSong = async (a) => {
          globalThis.__hook = [performance.now()];
          await h(a);
          globalThis.__hook.push(performance.now());
        };
        g.use(g.markers.list.find((x) => x.id === 'bath'));
        return performance.now();
      });
      await page.waitForFunction(() => globalThis.__starts.some((s) => Math.abs(s.d - 5.09) < 0.1), null, { timeout: 90000 }).catch(() => fails.push(`FAIL ${tag}: the answer never played`));
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `curtain-${tag}.png`) });
      const cap = await page
        .waitForFunction(() => /finishes the song/.test(globalThis.document.body.innerText), null, { timeout: 60000 })
        .then(() => page.evaluate(() => performance.now()))
        .catch(() => null);
      if (!cap) fails.push(`FAIL ${tag}: no caption`);
      const r = await page.evaluate(
        ({ t0 }) => {
          const g = globalThis.__game,
            p = g.player.root.position,
            s = g.place.spots.bath,
            st = globalThis.__starts,
            first = st.find((x) => x.t > t0 && x.offset > 4),
            ans = st.find((x) => x.t > t0 && Math.abs(x.d - 5.09) < 0.1);
          return { at: [p.x, p.z].map((v) => +v.toFixed(2)), spot: s, first: first && first.t - t0, ans: ans && ans.t - t0 };
        },
        { t0 },
      );
      if (Math.hypot(r.at[0] - r.spot[0], r.at[1] - r.spot[1]) > 0.35) fails.push(`FAIL ${tag}: Eric at ${r.at}, not at the spot ${r.spot}`);
      if (!r.first) fails.push(`FAIL ${tag}: the first man's last try never played`);
      if (cap && r.ans && cap - t0 < r.ans + 3500) fails.push(`FAIL ${tag}: the caption came ${Math.round(cap - t0 - r.ans)} ms after the answer began`);
      notes.push(`${tag}: hook ${JSON.stringify(await page.evaluate(() => globalThis.__hook))}`);
      notes.push(`${tag}: last try at ${Math.round(r.first)} ms, answer at ${Math.round(r.ans)} ms, caption at ${cap && Math.round(cap - t0)} ms after the tap`);
      await page.waitForTimeout(2500);
      const still = await page.evaluate(() => /finishes the song/.test(globalThis.document.body.innerText));
      if (!still) fails.push(`FAIL ${tag}: the caption went away on its own`);
      await page.screenshot({ path: path.join(out, `caption-${tag}.png`) });
      await context.close();
    }
  },
  { timeoutMs: 290000 },
);
console.log(notes.join('\n'));
if (errors.length) console.log('page errors:\n' + errors.join('\n'));
console.log(fails.length ? fails.join('\n') : `PASS: stills in ${out}`);
process.exit(fails.length || errors.length ? 1 : 0);
