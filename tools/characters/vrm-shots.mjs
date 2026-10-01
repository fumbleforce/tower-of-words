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
        if (size === 'phone' && variant === 'base' && view === 'face') {
          await page.getByRole('button', { name: 'Pause', exact: true }).click();
          const probe = () => {
            const character = globalThis.__preview.character;
            const weights = [];
            character.model.traverse(object => {
              if (object.morphTargetInfluences) weights.push(...object.morphTargetInfluences);
            });
            return { time: character.mixer.time, weights };
          };
          const before = await page.evaluate(probe);
          await page.locator('#expression').selectOption('happy');
          await page.waitForTimeout(100);
          const after = await page.evaluate(probe);
          if (before.time !== after.time || JSON.stringify(before.weights) === JSON.stringify(after.weights))
            errors.push('Paused expression failed to update while animation stayed frozen');
          await page.locator('#expression').selectOption('neutral');
          await page.getByRole('button', { name: 'Play', exact: true }).click();
        }
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
    const configPage = await context.newPage();
    configPage.on('pageerror', error => errors.push(error.message));
    await configPage.goto(`${base}/vrm-test.html?variant=recolour&view=face`);
    await configPage.waitForFunction(() => globalThis.__ready);
    await configPage.getByRole('button', { name: 'Pause', exact: true }).click();
    const original = await configPage.evaluate(() => {
      const p = globalThis.__preview;
      const head = p.character.vrm.humanoid.getNormalizedBoneNode('head');
      return { config: p.getConfig(), head: head.quaternion.toArray() };
    });
    await configPage.locator('#tint-top').fill('#4477aa');
    await configPage.locator('#headPitch').evaluate(input => { input.value = 15; input.dispatchEvent(new globalThis.Event('input', { bubbles: true })); });
    await configPage.locator('#expression').selectOption('happy');
    await configPage.locator('#glasses').uncheck();
    await configPage.locator('#view').selectOption('front');
    await configPage.locator('#animation').selectOption('walk');
    const changed = await configPage.evaluate(() => {
      const p = globalThis.__preview;
      p.step(0);
      const head = p.character.vrm.humanoid.getNormalizedBoneNode('head');
      const before = head.quaternion.clone();
      for (let i = 0; i < 100; i++) p.step(0);
      const colours = [];
      p.character.model.traverse(o => {
        for (const m of [o.material].flat()) if (m && /Tops/.test(m.name)) colours.push(m.color.getHexString());
      });
      return { config: p.getConfig(), drift: before.angleTo(head.quaternion), head: head.quaternion.toArray(), colours, glasses: p.character.eyewear.visible };
    });
    if (changed.config.tints.top !== '#4477aa' || changed.glasses || changed.colours.every(c => c === 'ffffff')) errors.push('Appearance controls did not apply');
    if (changed.drift > 0.00001 || JSON.stringify(changed.head) === JSON.stringify(original.head)) errors.push('Head offset failed or accumulated while paused');
    const [download] = await Promise.all([
      configPage.waitForEvent('download'), configPage.getByRole('button', { name: 'Download JSON', exact: true }).click(),
    ]);
    const saved = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    if (JSON.stringify(saved) !== JSON.stringify(changed.config)) errors.push('Downloaded settings differ from visible configuration');
    await configPage.reload(); await configPage.waitForFunction(() => globalThis.__ready);
    const reloaded = await configPage.evaluate(() => globalThis.__preview.getConfig());
    if (JSON.stringify(reloaded) !== JSON.stringify(changed.config)) errors.push('Browser settings did not survive reload');
    await configPage.screenshot({ path: path.join(out, `${size}-config-controls.png`) });
    await configPage.getByRole('button', { name: 'Reset', exact: true }).click();
    const reset = await configPage.evaluate(() => globalThis.__preview.getConfig());
    if (reset.headPitch !== 0 || reset.tints.top !== '#ffffff' || reset.expression !== 'neutral' || !reset.glasses) errors.push('Reset failed');
    await configPage.locator('#load-config').setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await configPage.waitForFunction(() => globalThis.__preview.getConfig().headPitch === 15);
    const loaded = await configPage.evaluate(() => globalThis.__preview.getConfig());
    if (JSON.stringify(loaded) !== JSON.stringify(saved)) errors.push('Imported settings differ');
    await configPage.locator('#load-config').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":999}') });
    await configPage.waitForFunction(() => globalThis.document.querySelector('#config-status').textContent.startsWith('Invalid setting:'));
    if (JSON.stringify(await configPage.evaluate(() => globalThis.__preview.getConfig())) !== JSON.stringify(saved)) errors.push('Invalid import changed existing settings');
    await configPage.locator('#load-config').setInputFiles({ name: 'oversize.json', mimeType: 'application/json', buffer: Buffer.alloc(17000, ' ') });
    await configPage.waitForFunction(() => globalThis.document.querySelector('#config-status').textContent.includes('smaller than 16 KB'));
    report.push({ size, controls: 'tints, pose, expressions, glasses, save, reload, reset, load, invalid/oversized imports checked', headDrift: changed.drift });
    await configPage.close();
    await context.close();
  }
  const failed = await browser.newPage();
  await failed.addInitScript(() => {
    const original = globalThis.HTMLCanvasElement.prototype.getContext;
    globalThis.HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type.startsWith('webgl')) return null;
      return original.call(this, type, ...args);
    };
  });
  await failed.goto(`${base}/vrm-test.html`);
  await failed.waitForFunction(() => globalThis.__error);
  if (!(await failed.locator('#info').textContent()).startsWith('Preview could not load:'))
    errors.push('WebGL initialization failure is not visible');
  await failed.close();
  const noStorage = await browser.newPage();
  await noStorage.addInitScript(() => {
    globalThis.Storage.prototype.setItem = () => { throw new Error('Storage disabled for regression check'); };
  });
  await noStorage.goto(`${base}/vrm-test.html`);
  await noStorage.waitForFunction(() => globalThis.__ready);
  const settings = await noStorage.evaluate(() => globalThis.__preview.getConfig());
  async function storageWarning() {
    const status = await noStorage.locator('#config-status').textContent();
    if (!status.includes('Browser storage is unavailable') || !status.includes('Download settings'))
      errors.push('Storage failure was hidden by success text: ' + status);
  }
  await noStorage.getByRole('button', { name: 'Reset', exact: true }).click();
  await storageWarning();
  await noStorage.locator('#json-details').evaluate(element => { element.open = true; });
  await noStorage.locator('#config-json').fill(JSON.stringify(settings));
  await noStorage.getByRole('button', { name: 'Apply JSON', exact: true }).click();
  await storageWarning();
  await noStorage.locator('#load-config').setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(settings)) });
  await noStorage.waitForTimeout(100);
  await storageWarning();
  await noStorage.close();
}, { timeoutMs: 280000 });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ report, errors }, null, 2));
console.log(JSON.stringify({ captures: report.length, errors, first: report[0] }));
if (errors.length) process.exitCode = 1;
