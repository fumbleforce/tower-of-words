// What desktop/test/app-run.mjs can check in a running app. Each scenario gets the app-run context and {out}, and
// returns a result object ({pass: false} fails the run).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// mean and spread of the display's pixels (a dark loader or start page is flat; the 3D title is not)
function look(ctx, file) {
  ctx.shot(file);
  const out = execFileSync('magick', [file, '-colorspace', 'gray', '-format', '%[fx:mean] %[fx:standard_deviation]', 'info:']).toString();
  const [mean, sd] = out.trim().split(/\s+/).map(Number);
  return { mean, sd };
}

async function waitTitle(page, ms = 120000) {
  await page.waitForFunction(() => document.getElementById('title') && !document.getElementById('title').hidden && document.body.classList.contains('at-title'), null, { timeout: ms });
}

// the full build's start page on a first launch: Enter on its focused Continue, pressed again until the window has focus
async function passGate(ctx, page, out = null) {
  await page.waitForLoadState();
  if (!page.url().includes('/shell/')) return null;
  const at = Date.now() - ctx.t0;
  if (out) ctx.shot(path.join(out, 'gate.png'));
  for (let i = 0; i < 10 && page.url().includes('/shell/'); i++) {
    ctx.key('Return');
    await page.waitForURL(/game3d\/index\.html/, { timeout: 2000 }).catch(() => {});
  }
  if (page.url().includes('/shell/')) throw new Error('the start page did not take Enter');
  return at;
}

// The same measurement for the app and the dev server (desktop/test/timing-web.mjs): the title up (the game built
// and the train shown; a first visit's opening is closed), then Start, New game's Start, and the train playable.
// t0: when the app or page was asked for.
export async function measure(page, t0) {
  const out = {};
  out.renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  await page.waitForFunction(() => window.__game?.place && document.body.classList.contains('at-title'), null, { timeout: 120000 });
  out.titleMs = Date.now() - t0;
  out.fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0;
        const s = performance.now();
        const f = () => (++n, performance.now() - s < 1000 ? requestAnimationFrame(f) : resolve(n));
        requestAnimationFrame(f);
      }),
  );
  out.navStartMs = Math.round((await page.evaluate(() => performance.timeOrigin)) - t0); // when this page began loading
  out.pageMs = out.titleMs - out.navStartMs; // the page itself, to the title
  out.res = await page.evaluate(() => { const e = performance.getEntriesByType('resource'); const d = e.map((x) => x.duration).sort((a, b) => a - b); return { n: e.length, lastEnd: Math.round(Math.max(...e.map((x) => x.responseEnd))), median: Math.round(d[d.length >> 1]), p95: Math.round(d[Math.floor(d.length * 0.95)]), title: Math.round(performance.now()) }; });
  await page.evaluate(() => document.getElementById('opening')?.remove());
  await page.locator('#title .go').click();
  await page.locator('.ng-start').waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  const t1 = Date.now();
  if (await page.locator('.ng-start').isVisible()) await page.locator('.ng-start').click();
  await page.waitForFunction(() => window.__game?.walker && !document.body.classList.contains('at-title') && !document.body.classList.contains('loading'), null, { timeout: 60000 });
  out.firstPlaceMs = Date.now() - t1;
  return out;
}

export const scenarios = {
  // what the page is doing after a while (dev build): console, failed requests, a screenshot
  async probe(ctx, { out }) {
    const page = await ctx.page();
    const msgs = [];
    page.on('console', (m) => msgs.push(`${m.type()}: ${m.text()}`.slice(0, 300)));
    page.on('pageerror', (e) => msgs.push(`pageerror: ${e.message}`.slice(0, 300)));
    page.on('requestfailed', (r) => msgs.push(`failed: ${r.url()} ${r.failure()?.errorText}`));
    page.on('response', (r) => r.status() >= 400 && msgs.push(`${r.status()}: ${r.url()}`));
    await passGate(ctx, page);
    await sleep(30000);
    ctx.shot(path.join(out, 'probe.png'));
    const info = await page.evaluate(() => ({ url: location.href, body: document.body.className, game: !!window.__game, desktop: JSON.stringify(window.desktop) }));
    return { info, msgs: msgs.slice(0, 60), log: ctx.log.join('').slice(-3000) };
  },

  // dev build, over the debugging port, but played with real X clicks and keys: start page, the opening film (plays,
  // seeks through the range answers, Skip), the title's Start, the new-game screen, then the train until the first
  // goal shows. Writes the clicks it made to clicks.json so the release run (replay) can make the same ones.
  async play(ctx, { out }) {
    const page = await ctx.page();
    const clicks = [];
    const media = [];
    const at = (label) => ctx.shot(path.join(out, `${String(clicks.length).padStart(2, '0')}-${label}.png`));
    const clickBox = async (label, box) => {
      const x = Math.round(box.x + box.width / 2);
      const y = Math.round(box.y + box.height / 2);
      clicks.push({ label, x, y, t: Date.now() - ctx.t0 });
      ctx.click(x, y);
      await sleep(400);
    };
    const clickSel = async (label, sel, frame = page) => {
      const loc = frame.locator(sel).first();
      await loc.waitFor({ state: 'visible', timeout: 60000 });
      await clickBox(label, await loc.boundingBox());
    };
    page.on('response', (r) => /\.mp4/.test(r.url()) && media.push({ status: r.status(), range: r.request().headers().range || '', len: r.headers()['content-length'] }));
    const result = { pass: false };
    result.gateMs = await passGate(ctx, page, out);
    // the opening on a first launch
    const frameEl = await page.waitForSelector('#opening iframe', { timeout: 60000 }).catch(() => null);
    if (frameEl) {
      const frame = await frameEl.contentFrame();
      await frame.waitForSelector('#start.ready', { timeout: 90000 });
      at('opening-ready');
      await clickSel('opening-play', '#start', frame);
      await sleep(4000);
      const t1 = await frame.evaluate(() => document.getElementById('film')?.currentTime || 0);
      at('opening-playing');
      await frame.evaluate(() => {
        document.getElementById('film').currentTime = 61;
      });
      await sleep(3000);
      const film = await frame.evaluate(() => {
        const v = document.getElementById('film');
        return { t: v.currentTime, ready: v.readyState, err: v.error?.code || 0 };
      });
      at('opening-seeked');
      await clickSel('opening-skip', '#skip', frame);
      await page.waitForSelector('#opening', { state: 'detached', timeout: 15000 });
      result.opening = { playedTo: +t1.toFixed(2), afterSeek: +film.t.toFixed(2), readyState: film.ready, error: film.err, mp4: media.slice(0, 8) };
    }
    await waitTitle(page);
    result.titleMs = Date.now() - ctx.t0;
    await sleep(1500);
    at('title');
    await clickSel('start', '#title .go');
    // the new-game screen: who you play (Eric is picked), then Start
    await page.locator('.ng-start').waitFor({ state: 'visible', timeout: 60000 });
    await sleep(800);
    at('new-game');
    await clickSel('new-game-start', '.ng-start');
    await page.waitForFunction(() => window.__game?.walker && window.__game.place?.name === 'train' && !document.body.classList.contains('at-title'), null, { timeout: 60000 });
    await sleep(2500);
    at('train');
    // talk to a passenger: click their pin, then go through the lines until the first goal shows
    const pin = async () =>
      page.evaluate(() => {
        for (const id of ['aoi', 'bun', 'music']) {
          const m = window.__game.markers.list.find((x) => x.id === id);
          const r = m?.el?.querySelector('.pin')?.getBoundingClientRect();
          if (r && r.width && r.x > 0 && r.y > 0 && r.x < innerWidth && r.y < innerHeight) return { id, x: r.x, y: r.y, width: r.width, height: r.height };
        }
        return null;
      });
    let target = null;
    for (let i = 0; i < 20 && !(target = await pin()); i++) await sleep(500);
    if (!target) throw new Error('no passenger pin on screen');
    await clickBox(`pin-${target.id}`, target);
    const goal = () =>
      page.evaluate(() => {
        const g = document.getElementById('goal');
        return g && !g.hidden && g.textContent.trim() ? g.textContent.trim() : '';
      });
    for (let i = 0; i < 40 && !(result.goal = await goal()); i++) {
      await sleep(700);
      ctx.key('space');
    }
    result.goalMs = Date.now() - ctx.t0;
    // the goal chip shows once the little scene after the reply is over
    await page.waitForFunction(() => !window.__game.busy && document.getElementById('goal')?.getBoundingClientRect().width > 0, null, { timeout: 20000 }).catch(() => {});
    await sleep(1500);
    at('first-goal');
    result.pass = !!result.goal;
    fs.writeFileSync(path.join(out, 'clicks.json'), JSON.stringify(clicks, null, 1));
    return result;
  },

  // the optional plugins over app:// (dev build): the listing, another /api route, and one module import
  async plugins(ctx) {
    const page = await ctx.page();
    await passGate(ctx, page);
    await page.waitForFunction(() => !!window.__game, null, { timeout: 60000 });
    return page.evaluate(async () => {
      const res = await fetch('/api/plugins');
      const names = res.ok ? await res.json() : [];
      const other = await fetch('/api/feedback').then((r) => r.status);
      let mod = null;
      try {
        mod = Object.keys(await import(`${location.origin}/${['island', 'private', 'plugins'].join('/')}/newgame.js`));
      } catch (e) {
        mod = String(e);
      }
      return { pass: res.ok, plugins: res.status, count: names.length, other, mod, desktop: JSON.stringify(window.desktop) };
    });
  },

  // a release, played blind with the clicks the dev build recorded (desktop/test/clicks.json, same window size),
  // a screenshot at each step to look at. APP_GATE=1: the build shows its start page first (a fresh userData).
  async replay(ctx, { out }) {
    const clicks = Object.fromEntries(JSON.parse(fs.readFileSync(new URL('./clicks.json', import.meta.url), 'utf8')).map((c) => [c.label, c]));
    const shot = (name) => look(ctx, path.join(out, `${name}.png`));
    const click = (label) => ctx.click(clicks[label].x, clicks[label].y);
    let windowMs = null;
    // the first rendered frame (the start page or the game's loader): a window is up
    for (let i = 0; i < 60 && !windowMs; i++) {
      await sleep(250);
      if (look(ctx, path.join(out, 'first.png')).mean > 0.02) windowMs = Date.now() - ctx.t0;
    }
    await sleep(1000);
    shot('a-first-screen');
    if (process.env.APP_GATE === '1') {
      ctx.key('Return');
      await sleep(1500);
    }
    // the opening's loader, then its Play
    await sleep(Number(process.env.APP_LOAD_MS || 12000));
    shot('b-opening-ready');
    click('opening-play');
    await sleep(5000);
    shot('c-opening-playing');
    click('opening-skip');
    await sleep(5000);
    shot('d-title');
    click('start');
    await sleep(4500);
    shot('e-new-game');
    click('new-game-start');
    await sleep(10000);
    shot('f-train');
    click('pin-aoi');
    for (let i = 0; i < 24; i++) {
      await sleep(1000);
      if (i % 4 === 3) shot(`g-talk-${String(i).padStart(2, '0')}`);
      if (i < 14) ctx.key('space');
    }
    shot('h-first-goal');
    return { pass: ctx.running(), windowMs };
  },

  // what a launch shows first (a release, by eye): a screenshot after 6 s
  async first(ctx, { out }) {
    await sleep(6000);
    look(ctx, path.join(out, 'first-screen.png'));
    return { pass: ctx.running() };
  },

  // the start page's Leave: Esc closes the app
  async leave(ctx, { out }) {
    await sleep(6000);
    look(ctx, path.join(out, 'start-page.png'));
    ctx.key('Escape');
    const code = await Promise.race([ctx.exited, sleep(8000).then(() => 'still running')]);
    return { pass: code !== 'still running', exit: code };
  },

  // the title's Settings, opened with a real click (dev build): every row's text, and a screenshot of each page
  async settings(ctx, { out }) {
    const page = await ctx.page();
    await passGate(ctx, page);
    await page.waitForFunction(() => window.__game?.place && document.body.classList.contains('at-title'), null, { timeout: 120000 });
    await page.evaluate(() => document.getElementById('opening')?.remove());
    const box = await page.locator('#title .msettings').boundingBox();
    ctx.click(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
    await sleep(1200);
    ctx.shot(path.join(out, 'settings-1.png'));
    const text = [];
    for (let i = 0; i < 8; i++) {
      text.push(await page.evaluate(() => document.querySelector('.settings, #settings, [class*=settings]')?.innerText || ''));
      await page.mouse.wheel(0, 600);
      await sleep(300);
    }
    ctx.shot(path.join(out, 'settings-2.png'));
    const all = [...new Set(text.join('\n').split('\n').map((s) => s.trim()).filter(Boolean))];
    return { pass: all.length > 0, rows: all };
  },

  // cold start and the first place (dev build): launch to the title, then New game's Start to a player who can walk
  async timing(ctx) {
    const page = await ctx.page();
    await passGate(ctx, page);
    return { pass: true, ...(await measure(page, ctx.t0)) };
  },
};
