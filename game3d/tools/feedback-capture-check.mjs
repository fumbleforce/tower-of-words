// Real feedback attachments under frame caps, including an already paused world. Never POST feedback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { withBrowserJob, gpuWaitOptions } from '../../tools/lib/browser-job.mjs';
import { waitForGame } from '../test/support/wait-ready.mjs';
const width = +(process.argv[2] || 1366), height = width < 700 ? 844 : 860;
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const out = new URL('../shots/feedback-capture/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
await withBrowserJob(`feedback-capture-${width}`, async browser => {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [], reports = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => new URL(route.request().url()).pathname.includes('/private/')
    ? route.fulfill({ status: 404, body: '' }) : route.continue());
  await page.route('**/api/feedback', route => {
    assert.equal(route.request().method(), 'GET', 'must not post QA feedback');
    return route.fulfill({ json: { ok: true } });
  });
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({
    v: 99, privateMode: false, voiceOn: false, frameCap: '30', cameraMode: 'overview', textSpeed: 'instant',
  })));
  await waitForGame(page, 90000, () => page.goto(`${base}/index.html?place=shotengai&feedback&q=1`), 'play');
  await page.waitForFunction(() => !globalThis.window.__game.busy && globalThis.window.__done &&
    (!globalThis.document.querySelector('#boot') || globalThis.document.querySelector('#boot').classList.contains('gone')));
  await page.waitForFunction(() => {
    const boot = globalThis.document.querySelector('#boot');
    return !boot || +globalThis.getComputedStyle(boot).opacity < .01;
  });
  await page.locator('#feedbackBtn').waitFor({ state: 'visible' });
  if (!process.env.BASELINE) assert.equal(await page.locator('#cameraReset').isVisible(), false, 'ordinary view has no Camera box');
  await page.screenshot({ path: `${out}/${width}-gameplay.png` });
  for (const [cap, paused] of [['30', false], ['60', false], ['30', true]]) {
    const key = `${width}-${cap}-${paused ? 'paused' : 'playing'}`;
    await page.evaluate(async ({ cap, paused }) => {
      const { setSetting } = await import('./js/settings.js');
      setSetting('frameCap', cap);
      globalThis.window.__game.paused = paused;
    }, { cap, paused });
    await page.locator('#minimap').waitFor({ state: 'visible' });
    const minimap = await page.locator('#minimap canvas').evaluate(canvas => {
      const r = canvas.getBoundingClientRect(), { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const samples = [];
      // Top half of the actual map canvas, away from its north label and lower Map badge.
      for (let y = .2; y <= .5; y += .1) for (let x = .25; x <= .75; x += .1) {
        const i = (Math.floor(y * canvas.height) * canvas.width + Math.floor(x * canvas.width)) * 4;
        samples.push({ x: r.left + x * r.width, y: r.top + y * r.height, rgb: [...data.slice(i, i + 3)] });
      }
      return samples;
    });
    const previousShot = await page.evaluate(() => globalThis.document.querySelector('.fb-shot img')?.src || '');
    await page.keyboard.press('F8');
    await page.locator('#feedback:not([hidden])').waitFor();
    await page.waitForFunction(previous => {
      const img = globalThis.document.querySelector('.fb-shot img');
      return img?.src !== previous && img?.complete && img?.naturalWidth > 0;
    }, previousShot);
    const result = await page.locator('.fb-shot img').evaluate(async (img, minimap) => {
      const cv = globalThis.document.createElement('canvas');
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const colors = new Set(); let bright = 0, count = 0;
      // Centre of the world, away from HUD and map. A cleared framebuffer is flat dark grey.
      for (let y = Math.floor(cv.height * .3); y < cv.height * .7; y += 3)
        for (let x = Math.floor(cv.width * .3); x < cv.width * .7; x += 3) {
          const i = (y * cv.width + x) * 4;
          colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`);
          if (Math.max(pixels[i], pixels[i+1], pixels[i+2]) > 60) bright++;
          count++;
        }
      // The actual feedback HUD button has a pale SVG stroke on a dark box.
      const r = globalThis.document.querySelector('#feedbackBtn').getBoundingClientRect(), scale = cv.width / globalThis.innerWidth;
      let hudLight = 0;
      for (let y = Math.ceil(r.top * scale); y < r.bottom * scale; y++)
        for (let x = Math.ceil(r.left * scale); x < r.right * scale; x++) {
          const i = (y * cv.width + x) * 4;
          if (pixels[i] > 150 && pixels[i+1] > 150 && pixels[i+2] > 150) hudLight++;
        }
      const mapMatches = minimap.filter(sample => {
        const i = (Math.floor(sample.y * scale) * cv.width + Math.floor(sample.x * scale)) * 4;
        return sample.rgb.every((v, j) => Math.abs(v - pixels[i+j]) < 18);
      }).length / minimap.length;
      const bytes = Array.from(new Uint8Array(await (await fetch(img.src)).arrayBuffer()));
      return { colors: colors.size, bright: bright / count, hudLight, mapMatches, bytes };
    }, minimap);
    fs.writeFileSync(`${out}/${key}-attachment.png`, Buffer.from(result.bytes));
    delete result.bytes; reports.push({ key, ...result });
    console.log(key, result);
    assert(result.colors > 100 && result.bright > .15, 'attachment contains rendered world pixels');
    assert(result.hudLight > 15, 'attachment contains HUD icon pixels');
    assert(result.mapMatches > .75, 'attachment preserves the actual minimap canvas');
    await page.screenshot({ path: `${out}/${key}-feedback.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => !!globalThis.window.__game.paused), paused, 'prior pause state restored');
    await page.evaluate(() => { globalThis.window.__game.paused = false; });
  }
  fs.writeFileSync(`${out}/${width}-report.json`, JSON.stringify({ reports, errors }, null, 2));
  assert.deepEqual(errors, []);
  console.log(`PASS ${width}: feedback world + HUD at 30/60fps and paused, no persistent Camera box`);
}, gpuWaitOptions(900, 240000));
