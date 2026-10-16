// The frame rate the game draws at on the default settings (#568): the title, B2 standing still, the pause menu over
// B2 and a fullscreen picture with a line under it, each measured for 5 s on the real GPU.
//   BASE=.claude/worktrees/<name>/game3d node game3d/tools/perf/refresh-rate.mjs [width height] [--json out.json]
// Headless Chrome ticks at 60 Hz; this tool unpins it (CHROME_ARGS), so a frame without a cap comes as fast as the
// GPU allows: Auto shows the headroom over a 120 Hz screen, and any cap below it shows as its own rate.
// Per scene: the active limit, frames presented a second (worldDraws: frames the 3D view really drew; a paused world
// holds its last frame), and the median and 95th percentile time between presented frames
// (ms). Settings are the defaults (quality and frame limit Auto); FRAMECAP=60 etc. measures an explicit choice.
// Public content only; the picture is a neutral generated one, as in game3d/tools/cg-performance.mjs.
import fs from 'node:fs';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';

process.env.CHROME_ARGS ??= '--disable-frame-rate-limit --disable-gpu-vsync';
const nums = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const [W, H] = nums.length >= 2 ? nums : [2560, 1440];
const jsonAt = process.argv.indexOf('--json');
const jsonOut = jsonAt > 0 ? process.argv[jsonAt + 1] : null;
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html`;
const SECONDS = 5;
const stored = { privateMode: false, ...(process.env.FRAMECAP ? { frameCap: process.env.FRAMECAP } : {}) };

// presented frames over `seconds`: a frame is a change of view.presentations seen by a requestAnimationFrame callback
async function sample(page, seconds) {
  return page.evaluate(async (seconds) => {
    const g = globalThis.__game, v = g.view, stamps = [];
    let seen = v.presentations, running = true;
    const tick = (now) => {
      if (!running) return;
      if (v.presentations !== seen) (seen = v.presentations), stamps.push(now);
      globalThis.requestAnimationFrame(tick);
    };
    globalThis.requestAnimationFrame(tick);
    const draws = v.draws, start = performance.now();
    await new Promise((r) => setTimeout(r, seconds * 1000));
    running = false;
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
    const q = (p) => (gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))] : 0);
    const r2 = (x) => Math.round(x * 100) / 100;
    return {
      limit: v.activeCap(),
      fps: r2((stamps.length * 1000) / (performance.now() - start)),
      medianMs: r2(q(0.5)),
      p95Ms: r2(q(0.95)),
      worldDraws: v.draws - draws,
      quality: v.quality,
      gpu: g.renderer.userData,
      place: g.place?.name,
    };
  }, seconds);
}

const results = {};
await withBrowserJob(
  'refresh-rate',
  async (browser) => {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const scopeErrors = [], errors = [];
    await context.route('**/*', scopedRoute({ publicOnly: true, onFailure: (e) => scopeErrors.push(String(e)) }));
    await context.addInitScript((s) => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify(s)), stored);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(base);
    await page.waitForFunction(() => globalThis.__shellBooted && globalThis.__game?.view?.post && globalThis.document.body.classList.contains('at-title'), null, { timeout: 90000 });
    await page.waitForTimeout(2500);
    results.title = await sample(page, SECONDS);
    console.log('title', JSON.stringify(results.title));
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/title.png`, timeout: 10000 });

    await page.goto(`${base}?place=office&mc=carina`);
    await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && globalThis.__done, null, { timeout: 90000 });
    await page.waitForFunction(() => !globalThis.__game.place.perf?.busy?.(), null, { timeout: 30000 }).catch(() => {});
    await page.evaluate(() => {
      const g = globalThis.__game;
      g.player.root.position.set(4.96, 0, -1.2);
      g.place.cam?.snap?.(g.player.root.position);
    });
    await page.waitForTimeout(2000);
    results.office = await sample(page, SECONDS);
    console.log('office', JSON.stringify(results.office));

    await page.evaluate(() => globalThis.__shell.setPaused(true));
    await page.waitForTimeout(1000);
    results.paused = await sample(page, SECONDS);
    console.log('paused', JSON.stringify(results.paused));
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/paused.png`, timeout: 10000 });
    await page.evaluate(() => globalThis.__shell.setPaused(false));

    // a fullscreen picture (the private cg.js layer's look: blurred backdrop, slow push-in) with a line under it
    await page.evaluate(() => {
      const d = globalThis.document, pic = d.createElement('canvas');
      pic.width = 1536; pic.height = 1024;
      const b = pic.getContext('2d'), grad = b.createLinearGradient(0, 0, 1536, 1024);
      grad.addColorStop(0, '#426174'); grad.addColorStop(1, '#15262f'); b.fillStyle = grad; b.fillRect(0, 0, 1536, 1024);
      for (let x = 0; x < 1536; x += 40) { b.fillStyle = x % 80 ? '#577c82' : '#324958'; b.fillRect(x, 120, 22, 800); }
      const src = pic.toDataURL(), cover = d.createElement('div');
      cover.style.cssText = 'position:fixed;inset:0;z-index:15;background:rgb(14,18,28);overflow:hidden';
      const bg = d.createElement('div');
      bg.style.cssText = `position:absolute;inset:-6%;background:center/cover url(${src});filter:blur(26px) brightness(.42) saturate(1.1)`;
      const img = d.createElement('img');
      img.src = src;
      img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;will-change:transform';
      cover.append(bg, img);
      img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.065) translate(-.8%,.6%)' }], { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      d.body.appendChild(cover);
      const css = d.createElement('style');
      css.textContent = 'body.cg-on #stage,body.cg-on #marks{visibility:hidden!important} body.cg-on #ui{z-index:16}';
      d.head.appendChild(css);
      globalThis.__game.busy = true;
      d.body.classList.add('cg-on');
      globalThis.__game.ui.typePrompt('sumimasen');
    });
    await page.waitForTimeout(1500);
    results.picture = await sample(page, SECONDS);
    console.log('picture', JSON.stringify(results.picture));
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/picture.png`, timeout: 10000 });

    if (scopeErrors.length || errors.length) console.error('errors', JSON.stringify({ scopeErrors, errors }));
    await context.close();
  },
  { gpuLock: `refresh-rate-${process.pid}`, gpuWaitMs: 1800000, timeoutMs: 240000 },
);
console.log(`\n${W}x${H}  scene    limit  fps     median  p95 (ms)`);
for (const [k, r] of Object.entries(results))
  console.log(`  ${k.padEnd(8)} ${String(r.limit || 'none').padEnd(6)} ${String(r.fps).padEnd(7)} ${String(r.medianMs).padEnd(7)} ${r.p95Ms}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ size: [W, H], results }, null, 2));
