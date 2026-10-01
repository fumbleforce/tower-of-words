// Isolated VRM preview checks. BASE may override the URL of game3d/.
import { withBrowserJob } from '../lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const main = repo.includes('/.claude/worktrees/') ? repo.split('/.claude/worktrees/')[0] : repo;
const base = process.env.BASE || 'http://127.0.0.1:8771/' + path.relative(main, path.join(repo, 'game3d'));
const out = process.argv[2];
if (!out) throw new Error('Usage: node tools/characters/vrm-shots.mjs OUTDIR');
fs.mkdirSync(out, { recursive: true });
const errors = [], report = [];
await withBrowserJob('vrm-preview', async browser => {
  for (const [width, height, size] of [[1366, 860, 'desktop'], [390, 844, 'phone']]) {
    const context = await browser.newContext({ viewport: { width, height } });
    for (const variant of ['base', 'recolour', 'flat']) {
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
      for (const view of ['three', 'face', 'game']) {
        await page.goto(`${base}/vrm-test.html?variant=${variant}&view=${view}`, { timeout: 60000 });
        await page.waitForFunction(() => globalThis.__ready || globalThis.__error);
        const info = await page.evaluate(() => {
          if (globalThis.__error) throw new Error(globalThis.__error);
          const preview = globalThis.__preview;
          preview.setPaused(true);
          const bone = preview.character.vrm.humanoid.getNormalizedBoneNode('leftLowerLeg');
          const movement = {};
          for (const anim of ['idle', 'walk', 'run']) {
            preview.character.setState(anim);
            preview.step(0.1); const before = bone.quaternion.clone();
            preview.step(0.2); movement[anim] = before.angleTo(bone.quaternion);
          }
          preview.character.setState('idle'); preview.step(0.1);
          return { ...globalThis.__ready, movement };
        });
        if (info.movement.walk < 0.01 || info.movement.run < 0.01) errors.push(`${variant}: animation did not move`);
        await page.screenshot({ path: path.join(out, `${size}-${variant}-${view}.png`) });
        report.push({ size, variant, view, ...info });
      }
      await page.close();
    }
    await context.close();
  }
}, { timeoutMs: 280000 });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ report, errors }, null, 2));
console.log(JSON.stringify({ captures: report.length, errors, first: report[0] }));
if (errors.length) process.exitCode = 1;
