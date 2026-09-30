// node tools/creator/base/dress_shots.mjs <shots.json> <out dir> [--port 8771] [--size 900x900] [--query v=source16]
// Screenshots of the live creator (dress.html) in given looks, poses and cameras, for close-up checks.
// shots.json: [{ "name": "eric-face", "look": {"body":"eric","eyes":"original"}, "pose": ["neutral", 0.5],
//               "camera": [yaw, pitch, zoom, faceView, [x,y,z] focus or null], "beside": false }]
// The creator must be served from the checkout you want to see (python3 -m http.server <port> from its root).
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../browser-job.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args.splice(i, 2)[1]; };
const port = opt('--port', '8771'), query = opt('--query', ''), [w, h] = opt('--size', '900x900').split('x').map(Number);
const [specFile, outDir] = args;
if (!specFile || !outDir) throw new Error('Usage: node tools/creator/base/dress_shots.mjs <shots.json> <out dir> [--port N] [--size WxH] [--query v=source16]');
const shots = JSON.parse(fs.readFileSync(specFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

await withBrowserJob('creator-dress-shots', async (browser) => {
  const page = await browser.newPage({ viewport: { width: w + 400, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/tools/creator/base/dress.html${query ? '?' + query : ''}`, { timeout: 30000 });
  await page.waitForFunction(() => globalThis.__done || globalThis.__err, null, { timeout: 120000 });
  for (const shot of shots) {
    await page.evaluate(async (s) => {
      const v = globalThis.__creator;
      await v.set({ body: 'mio', hair: 'own', hairColour: '', hairAccent: '', facial: 'own', eyes: 'original', iris: '', top: 'own', topColour: '', bottom: 'own', bottomColour: '', shoes: 'own', shoesColour: '', skin: '', ...s.look });
      const beside = globalThis.document.getElementById('beside');
      if ((beside.getAttribute('aria-pressed') === 'true') !== !!s.beside) beside.click();
      await new Promise((r) => setTimeout(r, 50));
      await v.ready || null;
    }, shot);
    await page.waitForFunction((b) => globalThis.__creator.ready && globalThis.__creator.beside === b, !!shot.beside, { timeout: 60000 });
    await page.evaluate((s) => {
      const v = globalThis.__creator;
      v.pose(...(s.pose || ['neutral', 0.5]));
      v.camera(...(s.camera || [0, 0.12, 1, false, null]));
    }, shot);
    await page.waitForTimeout(120);
    await page.locator('#viewport canvas').screenshot({ path: path.join(outDir, shot.name + '.png') });
  }
  if (errors.length) throw new Error(errors.join(' | '));
});
console.log(`${shots.length} shots in ${outDir}`);
