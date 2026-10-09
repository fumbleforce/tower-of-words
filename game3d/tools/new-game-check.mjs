// The new-game screen (js/ui/new-game.js; docs/game/controls-and-ui.md, Title) at a size, as a player:
//   node game3d/tools/new-game-check.mjs [w h]          (no size: 390x844 and 1366x860)
// Scenarios, each in a fresh browser profile:
//   eric    Start, keep Eric and the checks on, Start: the day starts on the train with no reload, the save says eric
//   carina  Start, pick Carina, checks off (and, when this server has the local plugin, the other version), Start:
//           the page reloads as Carina and starts the new game by itself; settings and save keep the choices
//   back    Start, Esc: the title menu is back and nothing changed
//   public  the page under a non-local host name (proxied to this server): the screen has only the public rows
//           and the local plugin newgame.js is never requested
// PORT (8771) and BASE (game3d) pick the server and the game, as for fast.mjs. Stills: game3d/shots/new-game/ (or OUT).
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.env.OUT ? path.resolve(process.env.OUT) : path.join(G, 'shots/new-game');
fs.mkdirSync(out, { recursive: true });
const ORIGIN = `http://127.0.0.1:${process.env.PORT || 8771}`;
const URL0 = `${ORIGIN}/${process.env.BASE || 'game3d'}/index.html?q=0&newgame=1`;
const args = process.argv.slice(2).map(Number);
const sizes = args.length >= 2 ? [[args[0], args[1]]] : [[390, 844], [1366, 860]];
const local = await fetch(`${ORIGIN}/api/plugins`)
  .then((r) => (r.ok ? r.json() : []))
  .then((l) => l.includes('newgame'))
  .catch(() => false);
const fails = [];

async function open(browser, W, H, host) {
  const phone = W < 700;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
  const errors = [];
  const priv = [];
  if (host)
    await ctx.route(`http://${host}/**`, async (route) => {
      const u = new URL(route.request().url());
      // a static host: no API and no private files
      if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/island/private/')) return route.fulfill({ status: 404, body: '' });
      const r = await fetch(ORIGIN + u.pathname + u.search, { method: route.request().method() }).catch(() => null);
      if (!r) return route.abort();
      route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
    });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  page.on('request', (r) => {
    if (/\/island\/private\/plugins\/newgame\.js/.test(r.url())) priv.push(r.url());
  });
  const url = host ? URL0.replace(ORIGIN, `http://${host}`) : URL0;
  await page.goto(url);
  await page.waitForFunction(() => document.body.classList.contains('at-title') && document.querySelector('#boot')?.classList.contains('gone') !== false, null, { timeout: 90000 });
  await page.waitForTimeout(600);
  const tap = (sel) => (phone ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  return { ctx, page, errors, priv, tap, phone };
}
const toTrain = (page) =>
  page.waitForFunction(
    () => window.__game?.place?.name === 'train' && !document.body.classList.contains('at-title') && !document.querySelector('.newgame'),
    null,
    { timeout: 90000 },
  );
const state = (page) =>
  page.evaluate(() => ({
    settings: JSON.parse(localStorage.getItem('amakawa-settings') || '{}'),
    save: JSON.parse(localStorage.getItem('amakawa-day1-save') || 'null'),
    skimpy: localStorage.getItem('amakawa-skimpy'),
    href: location.href,
  }));
const rows = (page) => page.$$eval('.newgame .ng-row', (r) => r.map((x) => x.dataset.key));

async function eric(browser, W, H, tag, bad) {
  const s = await open(browser, W, H);
  try {
    await s.tap('#title .go');
    await s.page.waitForSelector('.newgame.in');
    await s.page.waitForTimeout(500);
    const keys = await rows(s.page);
    const want = local ? ['checks', 'version'] : ['checks'];
    if (keys.join() !== want.join()) bad(`rows ${keys.join()}, expected ${want.join()}`);
    await s.page.screenshot({ path: path.join(out, `${tag}-screen-eric.png`) });
    if (!s.phone) {
      await s.page.locator('.ng-card[data-mc="carina"]').hover();
      await s.page.waitForTimeout(400);
      await s.page.screenshot({ path: path.join(out, `${tag}-screen-hover-carina.png`) });
    }
    await s.tap('.newgame .ng-start');
    await toTrain(s.page);
    const st = await state(s.page);
    if (st.save?.mc !== 'eric') bad(`eric: save mc ${st.save?.mc}`);
    if (st.settings.skipChecks) bad('eric: skipChecks turned on');
    if (/[?&]mc=/.test(st.href)) bad('eric: the page reloaded');
    if (st.save?.flags?.skill_checks !== true) bad(`eric: save flag skill_checks ${st.save?.flags?.skill_checks}`);
    for (const e of s.errors) bad('eric page error: ' + e);
  } finally {
    await s.ctx.close();
  }
}

async function carina(browser, W, H, tag, bad) {
  const s = await open(browser, W, H);
  try {
    await s.tap('#title .go');
    await s.page.waitForSelector('.newgame.in');
    await s.tap('.ng-card[data-mc="carina"]');
    await s.tap('.ng-row[data-key="checks"] [data-id="off"]');
    if (local) await s.tap('.ng-row[data-key="version"] [data-id="adult"]');
    await s.page.waitForTimeout(500);
    await s.page.screenshot({ path: path.join(out, `${tag}-screen-carina.png`) });
    if (local) {
      await s.tap('.ng-row[data-key="version"] [data-id="vanilla"]');
      await s.page.waitForTimeout(300);
      await s.page.screenshot({ path: path.join(out, `${tag}-screen-carina-vanilla.png`) });
      await s.tap('.ng-row[data-key="version"] [data-id="adult"]');
    }
    await s.tap('.newgame .ng-start');
    await s.page.waitForURL(/[?&]mc=carina/, { timeout: 30000 });
    await toTrain(s.page);
    await s.page.waitForTimeout(1500);
    await s.page.screenshot({ path: path.join(out, `${tag}-carina-train.png`) });
    const st = await state(s.page);
    if (st.save?.mc !== 'carina') bad(`carina: save mc ${st.save?.mc}`);
    if (!st.settings.skipChecks) bad('carina: skipChecks not on');
    if (st.save?.flags?.skill_checks !== false) bad(`carina: save flag skill_checks ${st.save?.flags?.skill_checks}`);
    if (local && (!st.settings.privateMode || st.skimpy !== '1')) bad(`carina: adult not applied (privateMode ${st.settings.privateMode}, skimpy ${st.skimpy})`);
    for (const e of s.errors) bad('carina page error: ' + e);
  } finally {
    await s.ctx.close();
  }
}

async function back(browser, W, H, tag, bad) {
  const s = await open(browser, W, H);
  try {
    await s.tap('#title .go');
    await s.page.waitForSelector('.newgame.in');
    await s.page.keyboard.press('Escape');
    await s.page.waitForTimeout(400);
    const r = await s.page.evaluate(() => ({ screen: !!document.querySelector('.newgame'), menu: !document.querySelector('#title .inner').hidden, title: document.body.classList.contains('at-title') }));
    if (r.screen || !r.menu || !r.title) bad(`back: ${JSON.stringify(r)}`);
    for (const e of s.errors) bad('back page error: ' + e);
  } finally {
    await s.ctx.close();
  }
}

async function pub(browser, W, H, tag, bad) {
  const s = await open(browser, W, H, 'amakawa-public.test');
  try {
    await s.tap('#title .go');
    await s.page.waitForSelector('.newgame.in');
    await s.page.waitForTimeout(500);
    const keys = await rows(s.page);
    if (keys.join() !== 'checks') bad(`public: rows ${keys.join()}`);
    const text = await s.page.locator('.newgame').innerText();
    if (/adult|vanilla|version/i.test(text)) bad('public: a local-only row shows');
    if (s.priv.length) bad(`public: requested ${s.priv.slice(0, 3).join(', ')}`);
    await s.page.screenshot({ path: path.join(out, `${tag}-screen-public.png`) });
  } finally {
    await s.ctx.close();
  }
}

await withBrowserJob(
  'new-game-check',
  async (browser) => {
    for (const [W, H] of sizes) {
      const tag = `${W}x${H}`;
      const bad = (m) => fails.push(`${tag}: ${m}`);
      for (const f of [eric, carina, back, pub])
        await f(browser, W, H, tag, bad).catch((e) => bad(`${f.name}: ${e.message.split('\n')[0]}`));
      console.log(`${tag} done`);
    }
  },
  { timeoutMs: 280000 * sizes.length + 240000, gpuWaitMs: 240000 },
);
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : `PASS (local rows: ${local})`, `(${out})`);
process.exitCode = fails.length ? 1 : 0;
