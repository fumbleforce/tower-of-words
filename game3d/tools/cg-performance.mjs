// Public neutral fullscreen cover: measure the runtime without loading local content.
// BASE=.claude/worktrees/<name>/game3d GL=opengl node game3d/tools/cg-performance.mjs [phone] [--compare]
// --compare pins BASELINE_REF (default HEAD^) to measure the prior runtime in the same GPU job.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
const phone = process.argv.includes('phone');
const baselineRef = process.env.BASELINE_REF || 'HEAD^';
const original = process.env.BASELINE || process.argv.includes('--compare') ? Object.fromEntries(['main.js', 'perf/view.js', 'perf/metrics.js'].map(name => [name, execFileSync('git', ['show', `${baselineRef}:game3d/js/${name}`], { encoding: 'utf8' })])) : null;
const passes = process.argv.includes('--compare') ? [original, null] : [original];
if (original) console.log('baseline runtime pinned');
const prefix = `/tmp/cg-performance-${phone ? 'phone' : 'desktop'}-${Date.now()}`;
await withBrowserJob('cg-performance', async browser => {
  for (const pinned of passes) {
  const output = `${prefix}-${pinned ? 'baseline' : 'candidate'}`;
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: phone ? { width: 390, height: 844 } : { width: 2327, height: 1196 }, deviceScaleFactor: phone ? 3 : 1.1 });
  const scopeErrors = [], errors = [];
  await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: e => scopeErrors.push(String(e)) }));
  if (pinned) for (const [name, body] of Object.entries(pinned)) await context.route(`**/js/${name}*`, route => route.fulfill({ status: 200, contentType: 'text/javascript', body }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, quality: 'high', frameCap: 'off' })));
  await page.goto(`http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?place=office&mc=carina`);
  await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && globalThis.__done);
  assert.equal(await page.evaluate(() => typeof globalThis.__game.view.worldHidden === 'function'), !pinned, 'pinned baseline runtime must really load, including cache-busting query URLs');
  await page.evaluate(() => {
    const g = globalThis.__game;
    g.player.root.position.set(4.96, 0, -1.2);
    g.place.cam?.snap?.(g.player.root.position);
    globalThis.__measure = { active: false, draws: [], updates: [], markers: 0 };
    const markers = g.markers.update.bind(g.markers);
    g.markers.update = (...args) => { if (globalThis.__measure.active) globalThis.__measure.markers++; return markers(...args); };
    const draw = g.view.post.render.bind(g.view.post), update = g.place.update.bind(g.place);
    g.view.post.render = (...args) => { const t = performance.now(); const out = draw(...args); if (globalThis.__measure.active) globalThis.__measure.draws.push(performance.now() - t); return out; };
    g.place.update = (...args) => { const t = performance.now(); const out = update(...args); if (globalThis.__measure.active) globalThis.__measure.updates.push(performance.now() - t); return out; };
  });
  async function measure(label) {
    await page.waitForTimeout(1500);
    const result = await page.evaluate(async label => {
      const g = globalThis.__game, m = globalThis.__measure;
      m.draws.length = m.updates.length = m.markers = 0; m.active = true;
      const start = performance.now(), draws = g.view.draws, worldTime = g.t, times = [];
      let prev = start, running = true;
      const frame = now => { if (!running) return; times.push(now - prev); prev = now; globalThis.requestAnimationFrame(frame); };
      globalThis.requestAnimationFrame(frame);
      await new Promise(resolve => setTimeout(resolve, 4000));
      running = m.active = false;
      const mean = a => a.reduce((x,y) => x+y,0)/(a.length || 1);
      return { label, fps: times.length * 1000 / (performance.now() - start), worldDraws: g.view.draws - draws, worldSeconds: g.t - worldTime, updates: m.updates.length, markerUpdates: m.markers, overlay: globalThis.document.getElementById('perfHud')?.innerText, renderMs: mean(m.draws), placeUpdateMs: mean(m.updates), gpu: g.renderer.userData, quality: g.view.quality, limit: g.view.activeCap(), camera: g.place.camera.position.toArray() };
    }, label);
    console.log(JSON.stringify(result));
    return result;
  }
  const results = [await measure('world')];
  await page.evaluate(async () => {
    (await import('./js/settings.js')).setSetting('perfOverlay', true);
    const picture = globalThis.document.createElement('canvas'); picture.width = 1536; picture.height = 1024;
    const brush = picture.getContext('2d');
    const gradient = brush.createLinearGradient(0, 0, 1536, 1024); gradient.addColorStop(0, '#426174'); gradient.addColorStop(1, '#15262f'); brush.fillStyle = gradient; brush.fillRect(0, 0, 1536, 1024);
    for (let x = 0; x < 1536; x += 40) { brush.fillStyle = x % 80 ? '#577c82' : '#324958'; brush.fillRect(x, 120, 22, 800); }
    const src = picture.toDataURL();
    const cover = globalThis.document.createElement('div');
    cover.id = 'neutral-cover'; cover.style.cssText = 'position:fixed;inset:0;z-index:15;background:rgb(14,18,28);overflow:hidden';
    const bg = globalThis.document.createElement('div'); bg.style.cssText = `position:absolute;inset:-6%;background:center/cover url(${src});filter:blur(26px) brightness(.42) saturate(1.1)`; cover.appendChild(bg);
    const image = globalThis.document.createElement('img'); image.src = src; image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 50%;will-change:transform;clip-path:inset(0 40% 0 40%)'; cover.appendChild(image);
    for (const side of ['left', 'right']) { const door = globalThis.document.createElement('div'); door.style.cssText = `position:absolute;inset:0;${side === 'left' ? 'right' : 'left'}:60%;background:rgb(14,18,28);box-shadow:0 0 26px #000`; cover.appendChild(door); }
    image.animate([{transform:'scale(1)'},{transform:'scale(1.065) translate(-.8%,.6%)'}], {duration:18000,iterations:Infinity,direction:'alternate',easing:'ease-in-out'});
    globalThis.document.body.appendChild(cover);
    globalThis.__game.busy = true;
    globalThis.document.body.classList.add('cg-on');
    const style = globalThis.document.createElement('style'); style.id = 'neutral-cover-css'; style.textContent = 'body.cg-on #stage,body.cg-on #marks {visibility:hidden!important} body.cg-on #ui {z-index:16} body.cg-on #perfHud {z-index:17}'; globalThis.document.head.appendChild(style);
    globalThis.__typingDone = false; globalThis.__game.ui.typePrompt('sumimasen').then(() => globalThis.__typingDone = true);
  });
  results.push(await measure('covered'));
  if (pinned) assert.ok(results.at(-1).worldDraws > 0, 'baseline draws the hidden world');
  if (!pinned) {
    const covered = results.at(-1);
    assert.equal(covered.worldDraws, 0, 'fullscreen cover must not draw hidden world passes');
    assert.equal(covered.markerUpdates, 0, 'hidden markers must not update');
    assert.ok(covered.worldSeconds > 3, 'world clocks keep advancing');
    assert.ok(covered.updates > 0, 'scripted movement/tweens keep updating');
    assert.match(covered.overlay, /calls\s+0/);
    assert.ok(parseFloat(covered.overlay) > 25, 'overlay must show presentation frames');
    await page.evaluate(async () => {
      const g = globalThis.__game, before = g.view.draws;
      await Promise.all([new Promise(resolve => g.view.afterDraw(resolve)), new Promise(resolve => g.view.afterDraw(resolve))]);
      if (g.view.draws !== before + 1) throw new Error('frame grabs must share one fresh world draw');
      await new Promise(resolve => setTimeout(resolve, 350));
      if (g.view.draws !== before + 1) throw new Error('hidden world resumed after frame grab');
    });
  }
  await page.locator('.tp-in').pressSequentially('sumimasen', { delay: 30 });
  assert.equal(await page.locator('.tp-in').inputValue(), 'sumimasen');
  await page.waitForFunction(() => globalThis.__typingDone);
  await page.evaluate(() => globalThis.__game.ui.closeTalk({ sceneOver: true }));
  await page.screenshot({ path: `${output}-covered.png`, timeout: 10000 });
  await page.evaluate(() => { globalThis.document.body.classList.remove('cg-on'); globalThis.document.getElementById('neutral-cover').remove(); globalThis.document.getElementById('neutral-cover-css').remove(); globalThis.__game.busy = false; });
  results.push(await measure('restored'));
  assert.ok(results.at(-1).worldDraws > 0, 'closing scene restores drawing');
  assert.ok(results.at(-1).markerUpdates > 0, 'closing scene restores marker updates');
  await page.screenshot({ path: `${output}-restored.png`, timeout: 10000 });
  assert.deepEqual(scopeErrors, []); assert.deepEqual(errors, []);
  fs.writeFileSync(`${output}.json`, JSON.stringify(results, null, 2));
  console.log(output, JSON.stringify(results, null, 2));
  await context.close();
  }
}, { gpuLock: `cg-performance-${process.pid}`, gpuWaitMs: 900000, timeoutMs: 180000 });
