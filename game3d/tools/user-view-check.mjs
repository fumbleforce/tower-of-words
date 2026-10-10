// Wheel zoom, middle-drag turn and the Camera button in free play. Usage: node user-view-check.mjs W H
// (BASE=.claude/worktrees/<name>/game3d to test a worktree; needs the review server on 8771).
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import assert from 'node:assert/strict';
const [W, H] = [+process.argv[2] || 1366, +process.argv[3] || 860];
const base = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}`;
const shots = process.env.SHOTS || '/tmp';
await withBrowserJob(
  `user-view-${W}`,
  async (browser) => {
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() =>
      globalThis.localStorage.setItem(
        'amakawa-settings',
        JSON.stringify({ v: 99, privateMode: false, voiceOn: false, textSpeed: 'instant' }),
      ),
    );
    await page.goto(`${base}/index.html?place=forecourt&perf&mc=eric`);
    await page.waitForFunction(() => globalThis.__done);
    await page.waitForFunction(
      () => globalThis.__game?.place && !globalThis.__game.busy && !globalThis.document.body.classList.contains('title-leaving'),
    );
    await page.waitForTimeout(1500);
    const view = () =>
      page.evaluate(() => {
        const c = globalThis.__game.place.cam,
          p = c.camera.position;
        return { dist: +p.distanceTo(c.target).toFixed(2), x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) };
      });
    const settle = () => page.waitForTimeout(1500);
    const a = await view();
    await page.mouse.move(W / 2, H / 2);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -120);
    await settle();
    const b = await view();
    console.log('start', a, 'zoomed in', b);
    assert(b.dist < a.dist * 0.8, 'wheel up zooms in');
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -120);
    await settle();
    const min = await view();
    for (let i = 0; i < 80; i++) await page.mouse.wheel(0, 120);
    await settle();
    const max = await view();
    console.log('min', min.dist, 'max', max.dist);
    assert(min.dist > a.dist * 0.3 && max.dist < a.dist * 1.3 && min.dist < max.dist, 'zoom is clamped');
    await page.screenshot({ path: `${shots}/uv-${W}-zoomout.png` });
    await page.evaluate(() => globalThis.__game.userView.reset());
    await settle();
    const c0 = await view();
    const cdp = await page.context().newCDPSession(page);
    const mouse = (type, x, y) =>
      cdp.send('Input.dispatchMouseEvent', {
        type,
        x,
        y,
        button: 'middle',
        buttons: type === 'mouseReleased' ? 0 : 4,
        clickCount: 1,
      });
    await mouse('mousePressed', W / 2, H / 2);
    for (let i = 1; i <= 20; i++) await mouse('mouseMoved', W / 2 + i * 10, H / 2 + i * 8);
    await mouse('mouseReleased', W / 2 + 200, H / 2 + 160);
    await settle();
    const c1 = await view();
    console.log('orbit', c0, c1);
    assert(Math.hypot(c1.x - c0.x, c1.z - c0.z) > 1 || Math.abs(c1.y - c0.y) > 1, 'middle drag orbits');
    await page.screenshot({ path: `${shots}/uv-${W}-orbit.png` });
    await mouse('mousePressed', W / 2, H / 2);
    for (let i = 1; i <= 60; i++) await mouse('mouseMoved', W / 2, H / 2 - i * 20);
    await mouse('mouseReleased', W / 2, H / 2 - 1200);
    await settle();
    const low = await view();
    console.log('low pitch', low);
    assert(low.y > 0.8, 'pitch clamped above ground');
    await page.locator('#cameraReset').click();
    await settle();
    const r = await view();
    console.log('reset', r);
    assert(
      Math.abs(r.dist - a.dist) < 0.3 && Math.abs(r.x - a.x) < 0.5 && Math.abs(r.z - a.z) < 0.5,
      'camera button resets',
    );
    console.log('errors', errors);
    assert.equal(errors.length, 0);
    console.log('PASS');
  },
  { timeoutMs: 200000 },
);
