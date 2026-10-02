// The 3D view keeps drawing on a phone (Jørgen, S23 Chrome, 2026-10-02: "After first gaijin scene with mio screen turns
// grey, cant see the people anymore"). Plays the train's gaijin scene at phone size, opens a fake soft keyboard at the
// typing prompt (the window shrinks to 400 px in steps and grows back; Chrome on Android keeps it full height, other browsers don't), then loses the WebGL context
// twice: once given back by the browser, once never given back (the game must reload into the autosave), and last
// stops drawing with the context still there (it must reload too). After each,
// the canvas must show a picture (pixels that differ), not the flat page background.
//   node game3d/tools/gl-recover-check.mjs [w] [h] [dpr]     writes game3d/shots/gl-recover/<w>x<h>/
// Works from a worktree too: the review server serves the whole repo, so the page comes from this file's own game3d/.
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '390', H = '844', DPR = '2.625'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const url = `http://127.0.0.1:8771/${path.relative(repo, G)}/index.html`;
const out = path.join(G, `shots/gl-recover/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const res = [];
const check = (test, pass, detail = '') => res.push({ test, pass: !!pass, detail });

await withBrowserJob('gl-recover-check', async (browser) => {
  const ctx = await browser.newContext({
    viewport: { width: +W, height: +H },
    deviceScaleFactor: +DPR,
    isMobile: phone,
    hasTouch: phone,
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text());
  });
  // the spread of the 3D view's pixels, with the HTML overlay hidden: about 0 when nothing is drawn
  const spread = async (tag) => {
    await p.evaluate(() => document.getElementById('ui')?.style.setProperty('visibility', 'hidden'));
    await p.waitForTimeout(150);
    const png = (await p.screenshot({ path: path.join(out, `${tag}.png`) })).toString('base64');
    await p.evaluate(() => document.getElementById('ui')?.style.removeProperty('visibility'));
    return p.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = 120;
      c.height = Math.round((120 * img.height) / img.width);
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0,
        s = 0,
        s2 = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
        s += l;
        s2 += l * l;
        n++;
      }
      return Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
    }, png);
  };
  const drawn = async (test, tag) => {
    const sd = await spread(tag);
    const st = await p.evaluate(() => {
      const R = window.__game?.renderer,
        c = R?.domElement;
      return { lost: R?.getContext().isContextLost(), canvas: c ? [c.width, c.height] : null };
    });
    check(test, sd > 8 && !st.lost, JSON.stringify({ spread: +sd.toFixed(1), ...st }));
  };
  const settled = (ms = 60000) =>
    p.waitForFunction(
      () => window.__game?.place && !window.__game.busy && !document.body.classList.contains('at-title'),
      null,
      { timeout: ms },
    );

  await p.goto(url);
  await p.waitForSelector('#title .go:not([hidden])', { timeout: 90000 });
  await p.waitForTimeout(500);
  if (phone) await p.locator('#title .go').tap();
  else await p.locator('#title .go').click();
  await settled();
  await p.waitForTimeout(1500);
  await drawn('train draws after Start', '00-start');

  // the scene plays by itself up to the typing prompt (lines advance, first replies taken); the prompt waits for us
  await p.evaluate(() => {
    const g = window.__game,
      ui = g.ui,
      tp = ui.typePrompt.bind(ui);
    ui.auto = true;
    ui.typePrompt = (...a) => {
      ui.auto = false;
      window.__typing = true;
      return tp(...a).then((v) => ((ui.auto = true), (window.__typing = false), v));
    };
    g.beat(() => g.runner.run('seat'));
  });
  await p.waitForFunction(() => window.__typing && document.querySelector('#talk.typing .tp-in'), null, {
    timeout: 60000,
  });
  if (phone) await p.locator('#talk .tp-in').tap();
  else await p.locator('#talk .tp-in').click();
  // the keyboard slides up: the window shrinks over a few frames (each one a resize), and back down later
  const kb = Math.min(400, +H);
  for (let i = 1; i <= 8; i++) {
    await p.setViewportSize({ width: +W, height: Math.round(+H - ((+H - kb) * i) / 8) });
    await p.waitForTimeout(30);
  }
  await p.setViewportSize({ width: +W, height: 0 }).catch(() => {}); // a zero-height step must not break anything
  await p.waitForTimeout(60);
  await p.setViewportSize({ width: +W, height: kb });
  await p.waitForTimeout(800);
  await drawn('draws with the keyboard up', '01-keyboard');
  await p.locator('#talk .tp-in').fill('gaijin');
  for (let i = 1; i <= 8; i++) {
    await p.setViewportSize({ width: +W, height: Math.round(kb + ((+H - kb) * i) / 8) });
    await p.waitForTimeout(30);
  }
  await p
    .waitForFunction(() => /Talk to Mio again/.test(window.__game.ui.goalText || ''), null, {
      timeout: 60000,
    })
    .catch(async (e) => {
      await p.screenshot({ path: path.join(out, 'stuck.png') });
      const st = await p.evaluate(() => ({
        goal: document.getElementById('goal')?.textContent,
        talk: document.getElementById('talk')?.className,
        line: document.querySelector('#talk .line')?.textContent?.slice(0, 120),
        typing: window.__typing,
        busy: window.__game.busy,
        node: window.__game.runner.currentNode,
      }));
      throw new Error(`stuck before the goal: ${JSON.stringify(st)} ${e.message}`);
    });
  await settled();
  await p.waitForTimeout(1000);
  await drawn('draws after the gaijin scene', '02-after-scene');

  // the context is lost and the browser gives it back
  await p.evaluate(() => {
    window.__lx = window.__game.renderer.getContext().getExtension('WEBGL_lose_context');
    window.__lx.loseContext();
  });
  await p.waitForTimeout(600);
  await p.evaluate(() => window.__lx.restoreContext());
  await p.waitForTimeout(2500);
  await drawn('draws after a lost context comes back', '03-restored');

  // lost and never given back: the game reloads into the autosave by itself
  const before = await p.evaluate(() => window.__game.place.name);
  const pxBefore = await p.evaluate(() => window.__game.renderer.getPixelRatio());
  const reloaded = p.waitForEvent('load', { timeout: 30000 });
  await p.evaluate(() => window.__game.renderer.getContext().getExtension('WEBGL_lose_context').loseContext());
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(out, '04-lost-note.png') });
  const note = await p.evaluate(() => document.querySelector('.gl-lost')?.textContent || '').catch(() => '');
  check('says what happened while the view is gone', /graphics/i.test(note), note);
  try {
    await reloaded;
    await p.waitForFunction(
      () => window.__game?.place && !document.body.classList.contains('at-title') && !window.__game.busy,
      null,
      { timeout: 90000 },
    );
    await p.waitForTimeout(2500);
    const after = await p.evaluate(() => ({ place: window.__game.place.name, goal: window.__game.ui.goalText || '' }));
    check(
      'a lost context that never comes back reloads into the save',
      after.place === before && /Talk to Mio again/.test(after.goal),
      JSON.stringify(after),
    );
    await drawn('draws after the reload', '04-reloaded');
    // and a tier lighter for the rest of the session: fewer pixels to draw
    const px = await p.evaluate(() => window.__game.renderer.getPixelRatio());
    check('plays a tier lighter after the reload', px < pxBefore, `pixel ratio ${pxBefore} -> ${px}`);
  } catch (e) {
    check('a lost context that never comes back reloads into the save', false, e.message.split('\n')[0]);
  }
  // the context is there but nothing reaches the canvas (what his save and load fixed): it reloads too
  try {
    const reloaded2 = p.waitForEvent('load', { timeout: 30000 });
    await p.evaluate(() => {
      window.__game.renderer.render = () => {};
    });
    await reloaded2;
    await p.waitForFunction(
      () => window.__game?.place && !document.body.classList.contains('at-title') && !window.__game.busy,
      null,
      { timeout: 90000 },
    );
    await p.waitForTimeout(2500);
    await drawn('a view that draws nothing reloads and draws again', '05-blank-reloaded');
  } catch (e) {
    check('a view that draws nothing reloads and draws again', false, e.message.split('\n')[0]);
  }
  check('no page errors', !errs.length, errs.slice(0, 5).join(' | '));
  await ctx.close();
});
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}  ${r.detail}`);
console.log(`artifacts: ${out}`);
process.exit(res.length && res.every((r) => r.pass) ? 0 : 1);
