// Layout fixtures exercise the real caption/dialogue API; opening-browser covers native play.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { scopedRoute } from '../../tools/bible/check-scope.mjs';
import { openGame } from '../test/support/open-game.mjs';
const base = process.env.BASE || 'game3d';
const out = process.env.OUT || new URL('../shots/caption-clearance/', import.meta.url).pathname;
fs.mkdirSync(out, { recursive: true });
const results = [];
await withBrowserJob('caption-clearance', async browser => {
  for (const [width, height] of [[2560, 1440], [1366, 860], [390, 844]]) {
    let closing = false;
    const failures = [];
    const { page, context, errors } = await openGame(browser, {
      mode: 'play', viewport: { width, height }, touch: width < 700,
      url: `http://127.0.0.1:8771/${base}/index.html?q=0`,
      beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: s => failures.push(s) }));
        await page.addInitScript(() => globalThis.localStorage.setItem('amakawa-settings', JSON.stringify({ privateMode: false, textSpeed: 'instant', voiceOn: false })));
      },
    });
    try {
      await page.waitForTimeout(800);
      await page.evaluate(async base => {
        globalThis.captionQA = (await import(`/${base}/js/ui.js`)).ui;
        globalThis.captionQA.caption(null, 'The next stop is Amakawa.');
      }, base);
      async function capture(name, open = true, clearsPlayer = true) {
        await page.waitForTimeout(450);
        const result = await page.evaluate(() => {
          const caption = globalThis.document.getElementById('caption');
          const talk = globalThis.document.getElementById('talk');
          const c = caption.getBoundingClientRect(), t = talk.getBoundingClientRect();
          const overlaps = [...globalThis.document.querySelectorAll('#stage:not([hidden]) .por:not([hidden]):not(.aside)')].filter(p => {
            const r = p.getBoundingClientRect();
            return c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top;
          }).length;
          const player = globalThis.__game.ericBox();
          const coversPlayer = player && c.left < player.x1 && c.right > player.x0 && c.top < player.y1 && c.bottom > player.y0;
          return { caption: c.toJSON(), talk: t.toJSON(), overlaps, coversPlayer, player, hidden: caption.hidden, property: caption.style.getPropertyValue('--caption-bottom'), viewport: globalThis.innerHeight };
        });
        results.push({ width, height, name, ...result });
        await page.screenshot({ path: `${out}/${width}-${name}.png` });
        assert(!result.hidden && result.caption.top >= 0 && result.caption.bottom <= result.viewport, `${name}: caption visible within viewport`);
        if (open) {
          assert(result.caption.bottom <= result.talk.top - 10, `${name}: caption clears dialogue`);
          assert.equal(result.overlaps, 0, `${name}: caption clears portraits`);
          if (clearsPlayer) assert(!result.coversPlayer, `${name}: caption clears player`);
        } else assert.equal(result.property, '', `${name}: ordinary caption position restored`);
      }
      await capture('ambient', false);
      await page.evaluate(() => { void globalThis.captionQA.say({ name: 'Mio' }, 'Oh, you found a seat.', { whoId: 'mio' }); });
      await capture('conversation');
      await page.evaluate(() => {
        globalThis.captionQA.caption(null, 'The next stop is Amakawa. Please check that you have all your belongings with you before leaving the train.');
        void globalThis.captionQA.say({ name: 'Eric' }, 'Thanks. I have my bag here.', { whoId: 'eric' });
      });
      await capture('wide-player');
      await page.evaluate(() => { void globalThis.captionQA.say({ name: 'Mio' }, 'Oh, good.', { whoId: 'mio' }); });
      await capture('wide-switch');
      await page.evaluate(() => globalThis.captionQA.caption(null, 'The next stop is Amakawa.'));
      await page.evaluate(() => { void globalThis.captionQA.choose({ name: 'Mio' }, 'Do you want to sit here?', [{ html: 'Yes, thank you.' }, { html: 'I will stand for a little while.' }, { html: 'Is anyone sitting beside the window?' }], { whoId: 'mio' }); });
      await capture('choices');
      await page.evaluate(async base => (await import(`/${base}/js/settings.js`)).setSetting('uiSize', 1.4), base);
      await capture('large-ui');
      await page.setViewportSize({ width: width < 700 ? 430 : width - 200, height });
      await capture('resized');
      await page.evaluate(() => globalThis.captionQA.closeTalk({ sceneOver: true }));
      await capture('closed', false);
      // Real interior camera projection, including a close-up whose head extends above the viewport.
      await page.setViewportSize({ width, height });
      await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=0&cap&place=office`);
      await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && globalThis.__game?.player);
      await page.evaluate(async base => {
        (await import(`/${base}/js/settings.js`)).setSetting('uiSize', 1);
        globalThis.document.body.classList.remove('cap');
        globalThis.__run = true;
        const g = globalThis.__game;
        g.busy = true; // hold the isolated camera fixture; no authored scene is running
        g.player.root.position.set(-5.45, 0, -3.05);
        g.walker.sync();
        globalThis.captionQA = (await import(`/${base}/js/ui.js`)).ui;
        globalThis.captionQA.caption(null, 'The next stop is Amakawa.');
        void globalThis.captionQA.choose({ name: 'Mio' }, 'Do you want to sit here?', [{ html: 'Yes, thank you.' }, { html: 'I will stand for a little while.' }, { html: 'Is anyone sitting beside the window?' }], { whoId: 'mio' });
        g.place.cam.closeOn([-5.45, -3.05], 2.5, 0.7);
        g.place.cam.snap(g.player.root.position);
      }, base);
      await page.waitForTimeout(1200);
      await capture('interior');
      await page.evaluate(() => {
        const g = globalThis.__game;
        g.place.cam.closeOn([-5.45, -3.05], 9, 0.15);
        g.place.cam.snap(g.player.root.position);
      });
      await page.waitForTimeout(1200);
      await capture('interior-close', true, false);
      assert(results.at(-1).player.y0 < results.at(-1).caption.height + 24, 'close interior fixture has no room above the player');
      await page.evaluate(async base => (await import(`/${base}/js/settings.js`)).setSetting('uiSize', 1.4), base);
      await capture('interior-close-large-ui', true, false);
      await page.evaluate(async base => {
        // Deterministic edge case complements the actual interior camera projection.
        const { setCaptionAvoid } = await import(`/${base}/js/ui/caption-layout.js`);
        setCaptionAvoid(() => [{ x0: 0, x1: globalThis.innerWidth, y0: -300, y1: globalThis.innerHeight }]);
      }, base);
      await capture('interior-no-room', true, false);
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
    } finally { closing = true; await context.close(); }
  }
}, { timeoutMs: 285000, gpuWaitMs: 180000 });
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2) + '\n');
console.log(`PASS ${results.length} caption layout states`);
