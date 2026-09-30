// Focused check of the plaza's life and the finds, at phone and desktop size, with stills of each state:
//   pigeons: pecking and walking about, flying off when Eric comes close, coming back once he has gone
//   the notice board: shut without posts; reading it holds the story's posts up close, all of them on screen
//   a photo: picking it up shows it, sets found_<id>, counts on the Photos chip, fills its frame in the album; the
//            save keeps it, and Continue from the title keeps the print gone and the count
//   the bakery flyer: taking it from mailbox 203 shows it and puts it in the album
//   node game3d/tools/finds-check.mjs [outdir]    SIZES=390x844,1366x860 (default); BASE=<worktree>/game3d
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'game3d/shots/finds';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const url = (q) => `http://127.0.0.1:8771/${base}/index.html?${q}`;
const sizes = (process.env.SIZES || '390x844,1366x860').split(',').map((s) => s.split('x').map(Number));
const fails = [],
  errors = [];
const ok = (cond, msg) => {
  if (!cond) fails.push(msg);
};

async function open(browser, W, H, q) {
  const phone = W < 700;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${W}x${H} ${q}: ${e.message}`));
  await page.goto(url(q), { timeout: 60000 });
  await page.waitForFunction(() => globalThis.__done, null, { timeout: 120000 });
  return { ctx, page };
}
const use = (page, id) =>
  page.evaluate((id) => {
    const g = globalThis.__game,
      m = g.markers.list.find((x) => x.id === id);
    if (!m || !m.enabled()) return false;
    g.use(m);
    return true;
  }, id);
const put = (page, x, z) =>
  page.evaluate(
    ([x, z]) => {
      const g = globalThis.__game;
      g.player.root.position.set(x, 0, z);
      g.walker.sync?.();
    },
    [x, z],
  );
const flock = (page) => page.evaluate(() => globalThis.__game.place.pigeons.state());
const visible = (page, sel) => page.waitForSelector(`${sel}:not([hidden])`, { timeout: 15000 }).then(() => true, () => false);

await withBrowserJob('finds-check', async (browser) => {
  for (const [W, H] of sizes) {
    const tag = `${W}x${H}`;
    const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}-${tag}.png`) });
    // ---- the plaza: pigeons, the board, a photo
    const { ctx, page } = await open(browser, W, H, 'cap&q=1&place=plaza');
    await page.evaluate(() => (globalThis.__run = true));
    const home = await page.evaluate(async () => (await import('./js/scenes/plaza/furniture.js')).PIGEON_HOME);
    await put(page, home[0] + 0.6, home[1] + 3.2);
    await page.evaluate((h) => globalThis.__game.place.cam.closeOn(h, 2.4, 0.1), home);
    await page.waitForTimeout(900);
    const a = await flock(page);
    await shot(page, 'pigeons-1-ground');
    await page.waitForTimeout(1200);
    const b = await flock(page);
    await shot(page, 'pigeons-2-ground');
    ok(a.flock === 'ground', `${tag} pigeons not on the ground at the start (${a.flock})`);
    const moved = a.birds.some((p, i) => Math.hypot(p.x - b.birds[i].x, p.z - b.birds[i].z) > 0.02 || p.state !== b.birds[i].state);
    ok(moved, `${tag} pigeons did nothing for 1.2 s`);
    await put(page, home[0] + 0.3, home[1] + 1.3);
    await page.waitForTimeout(450);
    await shot(page, 'pigeons-3-flee');
    const c = await flock(page);
    ok(c.flock === 'flying' && c.birds.some((p) => p.y > 0.3), `${tag} pigeons didn't fly off when Eric came close (${c.flock})`);
    await page.waitForTimeout(4600);
    ok((await flock(page)).flock === 'away', `${tag} pigeons didn't leave`);
    await put(page, home[0] + 0.6, home[1] + 6.2);
    await page.evaluate(() => globalThis.__game.place.pigeons.hurry());
    await page.waitForTimeout(1700);
    await shot(page, 'pigeons-4-return');
    ok(['landing', 'ground'].includes((await flock(page)).flock), `${tag} pigeons didn't come back`);
    await page.waitForTimeout(3000);
    ok((await flock(page)).flock === 'ground', `${tag} pigeons didn't land`);
    await page.evaluate(() => globalThis.__game.place.cam.release());

    // the notice board: shut with no posts, readable with the story's
    const real = await page.evaluate(async () => {
      const t = (await import('./js/finds/index.js')).findText();
      const posts = t.boards.plaza_board;
      t.boards.plaza_board = [];
      return posts;
    });
    ok(real?.length >= 4, `${tag} story/finds.js has ${real?.length} posts for the plaza board`);
    ok(!(await use(page, 'noticeboard')), `${tag} notice board usable with no posts`);
    await page.evaluate(async (posts) => {
      (await import('./js/finds/index.js')).findText().boards.plaza_board = posts;
    }, real);
    ok(await use(page, 'noticeboard'), `${tag} notice board not usable with posts`);
    ok(await visible(page, '#boardView'), `${tag} board view didn't open`);
    await page.waitForTimeout(500);
    await shot(page, 'board');
    const fit = await page.evaluate(() => {
      const d = globalThis.document,
        cork = d.querySelector('#boardView .cork'),
        r = cork.getBoundingClientRect();
      const posts = [...d.querySelectorAll('#boardView .post')];
      return {
        n: posts.length,
        scrolls: cork.scrollHeight > cork.clientHeight + 1,
        onScreen: r.top >= 0 && r.bottom <= globalThis.innerHeight && r.left >= 0 && r.right <= globalThis.innerWidth,
        wide: posts.filter((p) => p.scrollWidth > p.clientWidth + 1).length,
      };
    });
    ok(fit.n === real.length && !fit.scrolls && fit.onScreen && !fit.wide, `${tag} board doesn't fit: ${JSON.stringify(fit)}`);
    await page.click('#boardView');
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => globalThis.document.querySelector('#boardView').hidden), `${tag} board view didn't close on a tap`);

    // a photo: walk up, pick up, the close look, the chip, the album
    const photo = await page.evaluate(() => {
      const m = globalThis.__game.place.things.photo_plaza;
      return { spot: m.spot() };
    });
    await put(page, photo.spot[0] + 1.5, photo.spot[1] + 0.5);
    await page.evaluate(() => globalThis.__game.place.cam.snap(globalThis.__game.player.root.position));
    await page.waitForTimeout(400);
    await shot(page, 'photo-0-ground');
    ok(await use(page, 'photo_plaza'), `${tag} photo not usable`);
    ok(await visible(page, '#findView'), `${tag} photo view didn't open`);
    await page.waitForTimeout(500);
    await shot(page, 'photo-1-picked');
    const st = await page.evaluate(async () => {
      const { flags } = await import('./js/narrative/state.js');
      const g = globalThis.__game;
      return {
        flag: !!flags.found_photo_plaza,
        chip: globalThis.document.querySelector('#photosBtn .n').textContent,
        chipShown: !globalThis.document.querySelector('#photosBtn').hidden,
        prop: g.place.findProps.photo_plaza.visible,
        enabled: g.markers.list.find((m) => m.id === 'photo_plaza').enabled(),
      };
    });
    ok(st.flag && st.chip === '1/5' && st.chipShown && !st.prop && !st.enabled, `${tag} after pickup: ${JSON.stringify(st)}`);
    await page.click('#findView');
    await page.waitForTimeout(300);
    await page.click('#photosBtn');
    ok(await visible(page, '#photosPanel'), `${tag} album didn't open`);
    await page.waitForTimeout(300);
    await shot(page, 'photo-2-album');
    ok((await page.locator('#photosPanel .slot.got').count()) === 1, `${tag} album doesn't show one photo`);
    await page.click('#photosPanel .close');
    // the save keeps it
    const saved = await page.evaluate(async () => {
      const g = globalThis.__game;
      g.saveEnabled = true;
      (await import('./js/sim.js')).save(g);
      return JSON.parse(globalThis.localStorage.getItem('amakawa-day1-save'));
    });
    ok(saved?.flags?.found_photo_plaza === true, `${tag} save lost the photo`);
    await ctx.close();

    // ---- Continue from the title with that save
    {
      const phone = W < 700;
      const c2 = await browser.newContext({ viewport: { width: W, height: H }, isMobile: phone, hasTouch: phone });
      const p2 = await c2.newPage();
      p2.on('pageerror', (e) => errors.push(`${tag} continue: ${e.message}`));
      await p2.addInitScript((s) => {
        if (globalThis.sessionStorage.getItem('seeded')) return;
        globalThis.localStorage.setItem('amakawa-day1-save', JSON.stringify(s));
        globalThis.sessionStorage.setItem('seeded', '1');
      }, saved);
      await p2.goto(url('q=1'), { timeout: 60000 });
      await p2.locator('#title .mcont').click({ timeout: 60000 });
      await p2.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
      await p2.waitForFunction(() => globalThis.__game?.place?.name === 'plaza' && !globalThis.document.body.classList.contains('at-title'), null, { timeout: 60000 });
      await p2.waitForTimeout(1200);
      const r = await p2.evaluate(() => {
        const g = globalThis.__game;
        return {
          prop: g.place.findProps.photo_plaza.visible,
          chip: globalThis.document.querySelector('#photosBtn .n').textContent,
          chipShown: !globalThis.document.querySelector('#photosBtn').hidden,
        };
      });
      ok(!r.prop && r.chip === '1/5' && r.chipShown, `${tag} Continue: ${JSON.stringify(r)}`);
      await p2.screenshot({ path: path.join(out, `photo-3-continued-${tag}.png`) });
      await c2.close();
    }

    // ---- the bakery flyer from mailbox 203
    {
      const { ctx: c3, page: p3 } = await open(browser, W, H, 'cap&q=1&place=dorm_court');
      await p3.evaluate(async () => {
        const { flags } = await import('./js/narrative/state.js');
        Object.assign(flags, { going_home: true, dorm_room_known: true });
        globalThis.__run = true;
        const g = globalThis.__game;
        g.player.root.position.set(0.5, 0, -1.75);
        g.walker.sync?.();
      });
      ok(await use(p3, 'mailboxes'), `${tag} mailbox not usable`);
      let seen = false;
      for (let i = 0; i < 40 && !seen; i++) {
        seen = await p3.evaluate(() => !globalThis.document.querySelector('#findView')?.hidden && !!globalThis.document.querySelector('#findView'));
        if (!seen) {
          await p3.keyboard.press('Space'); // moves the line on
          await p3.waitForTimeout(350);
        }
      }
      ok(seen, `${tag} flyer view didn't open`);
      await p3.waitForTimeout(400);
      await p3.screenshot({ path: path.join(out, `flyer-1-taken-${tag}.png`) });
      await p3.click('#findView');
      await p3.waitForTimeout(1500);
      const r = await p3.evaluate(async () => {
        const { flags } = await import('./js/narrative/state.js');
        const g = globalThis.__game;
        return { flag: !!flags.found_bakery_flyer, pin: g.markers.list.find((m) => m.id === 'mailboxes').enabled(), busy: g.busy };
      });
      ok(r.flag && !r.pin && !r.busy, `${tag} after the flyer: ${JSON.stringify(r)}`);
      await p3.click('#photosBtn');
      await p3.waitForTimeout(300);
      await p3.screenshot({ path: path.join(out, `flyer-2-album-${tag}.png`) });
      ok((await p3.locator('#photosPanel .paper-row').count()) === 1, `${tag} album doesn't list the flyer`);
      await p3.click('#photosPanel .paper-row');
      ok(await visible(p3, '#findView'), `${tag} flyer didn't reopen from the album`);
      await p3.waitForTimeout(400);
      await p3.screenshot({ path: path.join(out, `flyer-3-reopened-${tag}.png`) });
      const lines = await p3.evaluate(() => {
        const v = globalThis.document.querySelector('#findView .shot'),
          r = v.getBoundingClientRect();
        return { n: v.querySelectorAll('.ln').length, fits: r.top >= 0 && r.bottom <= globalThis.innerHeight };
      });
      ok(lines.n === 4 && lines.fits, `${tag} reopened flyer: ${JSON.stringify(lines)}`);
      await c3.close();
    }
  }
});
for (const f of fails.filter(Boolean)) console.log('FAIL', f);
for (const e of errors) console.log('ERROR', e);
const bad = fails.filter(Boolean).length + errors.length;
console.log(bad ? `FAIL (${bad})` : `PASS finds, board and pigeons at ${sizes.map((s) => s.join('x')).join(', ')}; stills in ${out}`);
process.exit(bad ? 1 : 0);
