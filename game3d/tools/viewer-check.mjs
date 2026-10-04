// Checks the character viewer (game3d/viewer.html) at phone and desktop size: every character loads, every move
// plays, panning moves the view (right-drag on desktop, a two-finger drag on the phone), pinch and wheel zoom, and
// no page errors. Screenshots to game3d/shots/viewer/.
//   node game3d/tools/viewer-check.mjs        BASE=<path under 127.0.0.1:8771>/game3d (default game3d)
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const base = process.env.BASE || 'game3d',
  out = 'game3d/shots/viewer';
fs.mkdirSync(out, { recursive: true });
const CAST = 'eric,mio,kuro,mori,kenji,emi,guard,kuroda,aoi,rei'.split(',');
const GEN = 'suit,shirt,blouse,cardigan,polo,hoodie,apron,dock'.split(',').map((b) => 'gen-' + b);
const MOVES = ['idle', 'walk', 'run', 'sit', 'phone', 'bow', 'wave', 'shrug', 'nod'];
const CAT = ['sit', 'stand', 'sleep', 'eat', 'wash', 'walk'];
const errors = [],
  fails = [];
const ok = (cond, what) => (cond ? console.log('ok  ', what) : (fails.push(what), console.log('FAIL', what)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, size, q, phone) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: phone, isMobile: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${size.width}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${size.width}: ${m.text()}`));
  await page.goto(`http://127.0.0.1:8771/${base}/viewer.html?${q}`);
  await page.waitForFunction(() => globalThis.__viewerReady, null, { timeout: 90000 });
  await wait(600);
  return { page, ctx };
}
const target = (page) => page.evaluate(() => globalThis.__viewer.st.controls.target.toArray());
const dist = (page) =>
  page.evaluate(() => {
    const { camera, controls } = globalThis.__viewer.st;
    return camera.position.distanceTo(controls.target);
  });
const moved = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

async function size(browser, name, vp, phone) {
  let page, ctx;
  // everyone at once, in each look: all load; then every move anyone shown has (the chibis have them all), and
  // Tama's poses
  for (const [look, keys, q] of [
    ['code', [...CAST, 'worker.3', 'tama'], 'c=mio,eric,kenji,worker.2,tama'],
    ['chibi', [...CAST, ...GEN, 'tama'], 'c=mio,eric,gen-suit.2,tama&look=chibi'],
  ]) {
    if (page) await ctx.close();
    ({ page, ctx } = await open(browser, vp, `c=${keys.join(',')}&look=${look}`, phone));
    const shown = await page.evaluate(() => globalThis.__viewer.state.keys.length);
    const bad = await page.$$eval('.chip.bad', (l) => l.map((b) => b.dataset.key));
    ok(shown === keys.length && !bad.length, `${name} ${look}: all ${keys.length} load${bad.length ? ' (failed: ' + bad + ')' : ''}`);
    await page.screenshot({ path: `${out}/${name}-${look}-all.png` });
    await page.goto(`http://127.0.0.1:8771/${base}/viewer.html?${q}`);
    await page.waitForFunction(() => globalThis.__viewerReady, null, { timeout: 90000 });
    for (const m of MOVES) {
      const b = page.locator(`#moves .chip[data-key="${m}"]`);
      if (!(await b.isVisible())) {
        ok(look === 'code' && !['walk', 'run', 'sit'].includes(m), `${name} ${look}: no chip for ${m}`);
        continue;
      }
      await b.click();
      await wait(m === 'sit' ? 900 : 1300);
      const url = await page.evaluate(() => globalThis.location.search);
      ok(m === 'idle' || url.includes('a=' + m), `${name} ${look}: ${m} plays (${url})`);
      await page.screenshot({ path: `${out}/${name}-${look}-move-${m}.png` });
    }
    for (const m of CAT) {
      await page.locator(`#catmoves .chip[data-key="${m}"]`).click();
      await wait(1100);
    }
    await page.screenshot({ path: `${out}/${name}-${look}-tama-walk.png` });
  }
  // one at a time, an islander, new colours
  await page.locator('#mode-one').click();
  await page.locator('.chip[data-key="gen-hoodie"]').click();
  await wait(800);
  const one = await page.evaluate(() => globalThis.__viewer.state.keys);
  ok(one.length === 1 && one[0].startsWith('gen-hoodie'), `${name}: one at a time (${one})`);
  await page.locator('#colours').click();
  await wait(800);
  const two = await page.evaluate(() => globalThis.__viewer.state.keys);
  ok(two[0] !== one[0], `${name}: new colours (${one} -> ${two})`);
  await page.locator('#reset').click();
  await wait(500);
  await page.screenshot({ path: `${out}/${name}-one.png` });
  // to the code-built look: the islander becomes an office worker
  await page.locator('#look-code').click();
  await wait(1500);
  const code = await page.evaluate(() => [globalThis.__viewer.state.look, ...globalThis.__viewer.state.keys]);
  ok(code[0] === 'code' && code[1].startsWith('worker'), `${name}: look switch (${code})`);
  await page.screenshot({ path: `${out}/${name}-one-code.png` });

  // pan and zoom
  const box = await page.locator('#c').boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  let t0 = await target(page),
    d0 = await dist(page);
  if (!phone) {
    await page.mouse.move(cx, cy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(cx + 120, cy + 60, { steps: 8 });
    await page.mouse.up({ button: 'right' });
    await wait(500);
    ok(moved(t0, await target(page)) > 0.05, `${name}: right-drag pans`);
    t0 = await target(page);
    await page.keyboard.down('Shift');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 100, cy, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await wait(500);
    ok(moved(t0, await target(page)) > 0.05, `${name}: shift-drag pans`);
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -400);
    await wait(600);
    ok((await dist(page)) < d0 - 0.05, `${name}: wheel zooms`);
  } else {
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
    // two fingers dragged together: pan
    await touch('touchStart', [
      [cx - 40, cy],
      [cx + 40, cy],
    ]);
    for (let i = 1; i <= 8; i++)
      await touch('touchMove', [
        [cx - 40 + i * 12, cy + i * 8],
        [cx + 40 + i * 12, cy + i * 8],
      ]);
    await touch('touchEnd', []);
    await wait(500);
    ok(moved(t0, await target(page)) > 0.05, `${name}: two-finger drag pans`);
    d0 = await dist(page);
    // pinch out: zoom in
    await touch('touchStart', [
      [cx - 30, cy],
      [cx + 30, cy],
    ]);
    for (let i = 1; i <= 8; i++)
      await touch('touchMove', [
        [cx - 30 - i * 12, cy],
        [cx + 30 + i * 12, cy],
      ]);
    await touch('touchEnd', []);
    await wait(600);
    ok((await dist(page)) < d0 - 0.05, `${name}: pinch zooms`);
  }
  await page.screenshot({ path: `${out}/${name}-panned.png` });
  // deep link
  await page.goto(`http://127.0.0.1:8771/${base}/viewer.html?c=kenji,rei&a=wave&look=chibi`);
  await page.waitForFunction(() => globalThis.__viewerReady, null, { timeout: 90000 });
  await wait(1500);
  const link = await page.evaluate(() => [globalThis.__viewer.state.keys.join(), globalThis.__viewer.state.a, globalThis.location.search]);
  ok(link[0] === 'kenji,rei' && link[1] === 'wave' && !link[2].includes('chibi=0'), `${name}: deep link (${link})`);
  await page.screenshot({ path: `${out}/${name}-link.png` });
  await ctx.close();
}

await withBrowserJob('viewer-check', async (browser) => {
  await size(browser, 'phone', { width: 390, height: 844 }, true);
  await size(browser, 'desktop', { width: 1366, height: 860 }, false);
});
for (const e of errors) console.log('ERROR', e);
console.log(errors.length || fails.length ? 'FAIL' : 'PASS', `${out}/`);
process.exitCode = errors.length || fails.length ? 1 : 0;
