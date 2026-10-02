// The dorm courtyard bath after the listen was removed. With private mode off, the pin stays off and the old
// humming does not start. The optional scene is not part of this public check.
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
  errors = [];
await withBrowserJob('bath-check', async (browser) => {
  for (const [W, H] of sizes) {
    const phone = W < 700,
      tag = `${W}x${H}`;
    const context = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    await page.addInitScript(() => {
      globalThis.__starts = [];
      const start = globalThis.AudioBufferSourceNode.prototype.start;
      globalThis.AudioBufferSourceNode.prototype.start = function (when, offset) {
        globalThis.__starts.push({ d: +(this.buffer?.duration || 0).toFixed(2), offset: offset || 0 });
        return start.apply(this, arguments);
      };
      const saved = JSON.parse(globalThis.localStorage.getItem('amakawa-settings') || '{}');
      saved.privateMode = false;
      globalThis.localStorage.setItem('amakawa-settings', JSON.stringify(saved));
    });
    await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&place=dorm_court`, { timeout: 60000 });
    await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(1500);
    const seen = await page.evaluate(() => {
      const bath = globalThis.__game.markers.list.find((m) => m.id === 'bath');
      return {
        on: !!bath?.enabled(),
        hook: typeof globalThis.__game.place.hooks.bathPeep,
        song: typeof globalThis.__game.place.hooks.bathSong,
        hums: globalThis.__starts.filter((s) => s.d > 4).length,
      };
    });
    await page.screenshot({ path: path.join(out, `bath-off-${tag}.png`) });
    if (seen.on) fails.push(`${tag}: bath pin is on with private mode off`);
    if (seen.hook !== 'undefined') fails.push(`${tag}: a private hook is registered with private mode off`);
    if (seen.song !== 'undefined') fails.push(`${tag}: bathSong still registered`);
    if (seen.hums) fails.push(`${tag}: humming started (${seen.hums})`);
    await context.close();
  }
});
if (errors.length) fails.push(...errors);
if (fails.length) {
  console.error(fails.join('\n'));
  process.exit(1);
}
console.log('PASS bath pin off, no humming');
