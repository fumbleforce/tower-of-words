// A new conversation must open on the new person, never on the last one talked to (Jørgen, S23: "Whenever i talk to
// someone new, i first initially see the last person i talked to"). Portrait files are slowed down like a phone on
// the network; the page talks to Mio, closes the talk, then talks to the guard, and records every frame from the
// guard's first line: no frame may show Mio's picture (or a picture still loading over the old one), the name is the
// guard's from the first frame, and the guard's picture is up within a few seconds. Then Mio changes expression
// mid-talk: she stays on screen the whole time (no blank frame) and ends on the new face.
//   node game3d/tools/portrait-swap-check.mjs [w] [h] [delay ms]
//   writes game3d/shots/portrait-swap/<w>x<h>/
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const [W = '390', H = '844', DELAY = '900'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/portrait-swap/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const res = [];
await withBrowserJob('portrait-swap', async (b) => {
  const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  // every portrait arrives late, like a phone fetching it for the first time
  await p.route(/\/assets\/portraits\//, async (r) => {
    await new Promise((ok) => setTimeout(ok, +DELAY));
    await r.continue();
  });
  await p.goto(`${base}/index.html?shell=talk&place=gate&skip&q=0`);
  await p.waitForFunction(() => window.__shellReady, null, { timeout: 120000 });
  await p.evaluate(() => {
    window.__game.runner.trigger = () => false;
    // what each frame shows on the other speaker's side (the right, on desktop and phone)
    window.__por = () => {
      const S = document.querySelector('#stage'),
        L = S.querySelector('.por.right'),
        img = L.querySelector('img');
      const shown = !S.hidden && !L.hidden && +getComputedStyle(L).opacity > 0.02;
      return {
        shown,
        src: (img.getAttribute('src') || '').replace(/^.*\/|\?.*$/g, ''),
        loaded: img.complete && img.naturalWidth > 0,
        name: document.querySelector('#talk .who .nm')?.textContent || '',
      };
    };
    window.__record = () => {
      const frames = (window.__frames = []);
      const t0 = performance.now();
      const tick = () => {
        frames.push({ t: Math.round(performance.now() - t0), ...window.__por() });
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
      };
      tick();
    };
  });
  const ui = (fn, arg) => p.evaluate(fn, arg);
  // A: Mio, her picture fully up
  await ui(() => void window.__game.ui.say({ name: 'Mio', color: '#5fc6bf' }, 'Over here.', { whoId: 'mio', face: 'smile' }));
  await p.waitForFunction(() => window.__por().shown && window.__por().src.startsWith('mio-') && window.__por().loaded, null, { timeout: 15000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(out, '0-mio.png') });
  for (const [label, close] of [
    ['after the talk closed', true],
    ['straight from her line', false],
  ]) {
    const face = close ? 'stern' : 'amused';
    if (close) await ui(() => window.__game.ui.closeTalk());
    await p.waitForTimeout(200);
    // B: the guard, first frame on
    await ui(
      (f) => {
        window.BUILD = `swap-${Math.random()}`; // fresh file names: nothing preloaded, every picture comes late
        window.__game.ui.say({ name: 'Guard', color: '#c9a65a' }, 'Pass, please.', { whoId: 'guard', face: f });
        window.__record();
      },
      face,
    );
    await p.waitForTimeout(60);
    await p.screenshot({ path: path.join(out, `1-guard-first-${close ? 'closed' : 'direct'}.png`) });
    await p.waitForTimeout(4100);
    await p.screenshot({ path: path.join(out, `2-guard-up-${close ? 'closed' : 'direct'}.png`) });
    const frames = await ui(() => window.__frames);
    // the old person shows if her file is on, or if the new file isn't loaded yet (the browser paints the old one)
    const bad = frames.filter((f) => f.shown && (f.src.startsWith('mio-') || !f.loaded));
    const firstUp = frames.find((f) => f.shown);
    const names = [...new Set(frames.map((f) => f.name))];
    res.push({
      test: `${label}: no frame shows Mio once the guard talks`,
      pass: !bad.length,
      detail: `${frames.length} frames, ${bad.length} bad${bad.length ? ` first at ${bad[0].t} ms: ${bad[0].src} loaded=${bad[0].loaded}` : ''}`,
    });
    res.push({
      test: `${label}: the guard's picture comes up`,
      pass: !!firstUp && firstUp.src === `guard-${face}.webp` && frames.at(-1).shown,
      detail: firstUp ? `up at ${firstUp.t} ms (${firstUp.src})` : 'never shown',
    });
    res.push({ test: `${label}: the name is the guard's from the first frame`, pass: names.join() === 'Guard', detail: names.join(' | ') });
    if (!close) break;
    // back to Mio for the second round
    await ui(() => void window.__game.ui.say({ name: 'Mio', color: '#5fc6bf' }, 'Over here.', { whoId: 'mio', face: 'smile' }));
    await p.waitForFunction(() => window.__por().shown && window.__por().src.startsWith('mio-'), null, { timeout: 15000 });
    await p.waitForTimeout(300);
  }
  // expression change mid-talk: Mio (smile, already loaded) turns tired, a file not fetched yet; she never blinks out
  await ui(() => {
    window.BUILD = `swap-${Math.random()}`;
  });
  await ui(() => void window.__game.ui.say({ name: 'Mio', color: '#5fc6bf' }, 'Over here.', { whoId: 'mio', face: 'smile' }));
  await p.waitForFunction(() => window.__por().shown && window.__por().src === 'mio-smile.webp', null, { timeout: 15000 });
  await p.waitForTimeout(400);
  await ui(() => {
    window.__game.ui.say({ name: 'Mio', color: '#5fc6bf' }, 'Long day.', { whoId: 'mio', face: 'tired' });
    window.__record();
  });
  await p.waitForTimeout(4100);
  const frames = await ui(() => window.__frames);
  const gone = frames.filter((f) => !f.shown);
  res.push({
    test: 'expression change: Mio stays on screen and ends on the new face',
    pass: !gone.length && frames.at(-1).src === 'mio-tired.webp' && frames.every((f) => f.src.startsWith('mio-') && f.loaded),
    detail: `${gone.length} blank frames, ends on ${frames.at(-1).src}, ${frames.filter((f) => !f.src.startsWith('mio-') || !f.loaded).length} frames of a picture still loading`,
  });
  res.push({ test: 'no page errors', pass: !errs.length, detail: errs.join(' | ') });
});
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}  ${r.detail}`);
console.log(`artifacts: ${out}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
