// Stills for Review crowd-everyday-2 from its live viewer (one headless browser): every candidate's face at one
// camera distance (front, and turned 0.6 rad each way), each person's scene whole-body from the front, three-quarter,
// side and back in idle, and the full row beside the approved office pair. Same viewer light and camera as
// crowd-pilot-5's captures of the approved pair.
//   node art/candidates/crowd-everyday-2/capture.mjs [outDir]   (from the worktree root; server on 8771)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const base = 'http://127.0.0.1:8771/' + path.relative('/home/jorgen/repo/japanese', root) + (root.endsWith('japanese') ? '' : '/');
const out = process.argv[2] || '/home/jorgen/repo/japanese/art/parts/crowd-everyday-2/captures';
fs.mkdirSync(out, { recursive: true });
const C = ['casual-1', 'casual-2', 'older-1', 'older-2', 'service-1', 'service-2'];
await withBrowserJob('crowd-everyday-2-capture', async (browser) => {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } }), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => errors.push(e) }));
  await page.goto(base + 'reviews/crowd-everyday-2/viewer.html?s=pair');
  await page.waitForFunction(() => window.__viewer?.ready, null, { timeout: 120000 });
  const call = (f, ...a) => page.evaluate(([f, a]) => window.__viewer[f](...a), [f, a]);
  const shot = async (name) => { await page.waitForTimeout(150); await page.locator('#c').screenshot({ path: `${out}/${name}.png` }); };
  await call('freeze', true); await call('setMotion', 'idle'); await call('advance', 60);
  for (const [v, k] of [['whole row', 'row-front'], ['three-quarter', 'row-34']]) { await call('view', v); await shot(k); }
  for (const key of [...C, 'office-a', 'office-b']) {
    for (const [name, yaw] of [['front', 0], ['left', -0.6], ['right', 0.6]]) { await call('closeOn', key, 'face', yaw); await shot(`${key}-face-${name}`); }
    for (const [name, yaw] of [['front', 0], ['34', -0.7]]) { await call('closeOn', key, 'body', yaw); await shot(`${key}-body-${name}`); }
  }
  for (const s of ['casual', 'older', 'service']) {
    await call('show', s); await call('setMotion', 'idle'); await call('advance', 60);
    for (const [v, k] of [['whole row', 'front'], ['three-quarter', '34'], ['from the side', 'side'], ['from behind', 'back']]) { await call('view', v); await shot(`${s}-${k}`); }
    await call('setMotion', 'sit'); await call('advance', 60); await call('view', 'three-quarter'); await shot(`${s}-sit`);
    await call('setMotion', 'walk'); await call('setWay', 'treadmill');
    for (let i = 0; i < 4; i++) { await call('advance', 9); await call('view', 'from the side'); await shot(`${s}-walk-${i}`); }
    await call('setMotion', 'idle');
  }
  if (errors.length) throw Error(errors.join('\n'));
  console.log('captures in', out);
}, { timeoutMs: 280000 });
