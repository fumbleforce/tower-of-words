// Exercise the public asset preview through its own build/update methods, across repeated gait cycles.
// BASE_URL=http://127.0.0.1:8771/.../ node tools/assets/check-motion.mjs [capture directory]
import fs from 'node:fs';
import { withBrowserJob } from '../lib/browser-job.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:8771/';
const out = process.argv[2] || 'game3d/shots/asset-motion';
fs.mkdirSync(out, { recursive: true });
const results = [];
await withBrowserJob('asset-library-motion', async browser => {
  for (const [width, height] of [[1366, 860], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'tools/assets/index.html');
    await page.evaluate(async () => {
      const v = await import('./viewer.js');
      globalThis.document.body.replaceChildren();
      const el = globalThis.document.createElement('div');
      Object.assign(el.style, { width: '100vw', height: '100vh' });
      globalThis.document.body.appendChild(el);
      globalThis.motionTest = { ...v, stage: new v.Stage(el) };
    });
    for (const id of ['mio', 'kenji', 'carina']) {
      await page.evaluate(async id => {
        const t = globalThis.motionTest;
        t.b = await t.buildAsset(id === 'mio' ? { type: 'mio' } : { type: 'meshy', id });
        t.stage.show(t.b); t.stage.auto = false;
      }, id);
      for (const motion of ['walk', 'idle', 'run', 'idle', 'sit', 'walk']) {
        const result = await page.evaluate(async motion => {
          const { b, stage } = globalThis.motionTest;
          await b.play(motion);
          const m = b.meshy, snapshots = [];
          for (let frame = 0; frame < 600; frame++) {
            b.update(1 / 60);
            if (frame % 15 === 0) {
              const pose = [];
              m.root.traverse(o => { if (o.isBone && /leg|calf|thigh|foot/i.test(o.name)) pose.push(...o.quaternion.toArray()); });
              snapshots.push({ frame, state: m.state, pose, z: m.root.position.z + m.root.parent.position.z });
            }
          }
          stage.step(0);
          return { snapshots, motion, state: m.state };
        }, motion);
        if (motion === 'walk' || motion === 'run') {
          for (const start of [120, 240, 360, 480]) {
            const frames = result.snapshots.filter(s => s.frame >= start && s.frame < start + 120);
            if (new Set(frames.map(s => s.pose.map(n => n.toFixed(4)).join(','))).size < 5) throw new Error(`${id} ${motion}: frozen in cycle ${start}`);
            if (frames.some(s => s.state !== 'walk' || Math.abs(s.z) > 1e-6)) throw new Error(`${id} ${motion}: gait stopped or preview drifted`);
          }
        } else if (result.state !== motion) throw new Error(`${id}: ${motion} ended in ${result.state}`);
        results.push({ width, id, motion, frames: 600, state: result.state });
      }
      // Sustained wall-clock playback checks the gait's stationary timeout as well as simulated cycles.
      await page.evaluate(() => globalThis.motionTest.stage.start());
      await page.waitForTimeout(2000);
      const state = await page.evaluate(() => { const t = globalThis.motionTest; t.stage.stop(); return t.b.meshy.state; });
      if (state !== 'walk') throw new Error(`${id}: walking stopped after real-time timeout`);
      await page.screenshot({ path: `${out}/${width}-${id}-walk.png` });
    }
    if (errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
}, { timeoutMs: 240000 });
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
console.log(`PASS: ${results.length} state runs, 10 seconds each, plus sustained wall-clock walks at desktop and phone sizes`);
