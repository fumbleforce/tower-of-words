import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const rel = path.relative('/home/jorgen/repo/japanese', root);
const base = `http://127.0.0.1:8771/${rel ? rel + '/' : ''}`;
const out = path.join(root, 'art/parts/crowd-pilot-5/review-check');
fs.mkdirSync(out, { recursive: true });
await withBrowserJob('crowd5-review-page', async browser => {
  for (const [width, height] of [[1366, 860], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: e => errors.push(e) }));
    await page.addInitScript(() => localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false })));
    await page.goto(base + 'bible/#review/crowd-pilot-5');
    await page.waitForFunction(() => document.body.dataset.ready === '1');
    await page.locator('h1').filter({ hasText: 'Crowd pilot 5' }).waitFor();
    const images = page.locator('#main img');
    await images.evaluateAll(async imgs => Promise.all(imgs.map(im => im.decode())));
    assert.ok(await images.count() >= 15);
    const anchor = page.locator('#main a').filter({ hasText: 'Live 3D: Meshy retries' });
    assert.equal(await anchor.count(), 1);
    assert.ok((await anchor.getAttribute('href')).includes('crowd-pilot-5/viewer.html'));
    assert.ok(await anchor.evaluate(el => el.getBoundingClientRect().top < document.querySelector('#main img').getBoundingClientRect().top));
    await page.screenshot({ path: `${out}/${width}-review.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
}, { timeoutMs: 120000 });
console.log('PASS review images, visible first live-viewer link, public-only scope; desktop and phone');
