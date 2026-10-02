// The typing prompt with the phone keyboard up (js/ui/keyboard-fit.js). A headless browser has no soft keyboard, so
// this stands in a smaller visual viewport (window.__vv) as a keyboard and bottom browser bar leave it, draws a grey
// block where they would be, and checks that every part of the prompt (prompt line, word card, field, mic, hint,
// "Never mind") is inside the visible area, the portraits step out, the field keeps focus and the canvas keeps its
// size; then the keyboard closes and the prompt goes back to the bottom.
//   node game3d/tools/keyboard-fit.mjs [w] [h] [visible heights, comma separated] [pan]
//   writes game3d/shots/keyboard-fit/<w>x<h>/
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
const [W = '390', H = '844', VIS = '400,450', PAN = '0'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/keyboard-fit/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const res = [];
const PARTS = ['#talk', '#talk .tp-prompt', '#talk .tp-word', '#talk .tp-in', '#talk .vc-mic', '#talk .tp-hint', '#talk .tp-cancel'];
await withBrowserJob('keyboard-fit', async (b) => {
  const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${base}/index.html?shell=talk&place=gate&skip&q=0`);
  await p.waitForFunction(() => window.__shellReady, null, { timeout: 120000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => {
    window.__game.runner.trigger = () => false;
    window.__game.ui.typePrompt(
      'gaijin',
      { who: { name: 'Mio', color: '#5fc6bf' }, text: 'Gaijin. Um, foreigner? So... you, obviously.', whoId: 'mio' },
      { cancel: true },
    );
  });
  await p.waitForSelector('#talk.typing .tp-in');
  await p.waitForTimeout(400);
  const inp = p.locator('#talk .tp-in');
  if (phone) await inp.tap();
  else await inp.click();
  // a wrong answer, so the hint line is up too (the tallest the prompt gets)
  await p.keyboard.type('gai');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  const canvas0 = await p.evaluate(() => [document.querySelector('canvas#c').clientWidth, document.querySelector('canvas#c').clientHeight]);
  await p.screenshot({ path: path.join(out, '00-no-keyboard.png') });
  const measure = (sel) =>
    p.evaluate((sels) => {
      const r = {};
      for (const s of sels) {
        const e = document.querySelector(s);
        if (!e || !e.getClientRects().length || getComputedStyle(e).display === 'none') continue;
        const b = e.getBoundingClientRect();
        r[s] = [Math.round(b.top), Math.round(b.bottom)];
      }
      const t = document.querySelector('#talk');
      return {
        r,
        kb: document.body.classList.contains('kb'),
        focus: document.activeElement?.className,
        value: document.activeElement?.value,
        over: t.scrollHeight - t.clientHeight,
        pors: [...document.querySelectorAll('#stage .por')].filter((e) => !e.hidden && getComputedStyle(e).visibility !== 'hidden').length,
        canvas: [document.querySelector('canvas#c').clientWidth, document.querySelector('canvas#c').clientHeight],
      };
    }, sel);
  const shows = phone ? VIS.split(',').map(Number) : [];
  for (const vis of shows) {
    for (const pan of PAN === '0' ? [0] : [0, +PAN]) {
      await p.evaluate(
        ([h, top, H]) => {
          window.__vv = { height: h, offsetTop: top, width: innerWidth, scale: 1 };
          window.__kbFit();
          let k = document.getElementById('__fakeKb');
          if (!k) {
            k = document.createElement('div');
            k.id = '__fakeKb';
            k.innerHTML = '<div class="a"></div><div class="b">keyboard + browser bar</div>';
            document.body.appendChild(k);
          }
          k.querySelector('.a').style.cssText = `position:fixed;left:0;right:0;top:0;height:${top}px;background:rgba(60,60,60,.92);z-index:99999;pointer-events:none`;
          k.querySelector('.b').style.cssText = `position:fixed;left:0;right:0;top:${top + h}px;height:${H - top - h}px;background:#3a3d42;color:#ccc;font:14px sans-serif;display:grid;place-items:center;z-index:99999;pointer-events:none`;
        },
        [vis, pan, +H],
      );
      await p.waitForTimeout(250);
      const m = await measure(PARTS);
      const bad = Object.entries(m.r).filter(([, [t, bo]]) => t < pan || bo > pan + vis);
      const name = `kb-${vis}${pan ? `-pan${pan}` : ''}`;
      await p.screenshot({ path: path.join(out, `${name}.png`) });
      res.push({
        test: `${name}: whole prompt visible above the keyboard`,
        pass: m.kb && !bad.length && m.over <= 1 && m.pors === 0 && m.focus === 'tp-in' && m.value === 'gai' && m.canvas.join() === canvas0.join(),
        detail: JSON.stringify({ bad, over: m.over, pors: m.pors, focus: m.focus, canvas: m.canvas, parts: Object.keys(m.r).length }),
      });
    }
  }
  // the word still plays and the field keeps focus with the keyboard up
  if (phone) {
    const xy = await p.evaluate(() => {
      const r = document.querySelector('#talk .tp-jp .jp[data-w]')?.getClientRects()[0];
      return r && [r.x + r.width / 2, r.y + r.height / 2];
    });
    if (xy) {
      await p.touchscreen.tap(xy[0], xy[1]);
      await p.waitForTimeout(300);
      const m = await measure(PARTS);
      res.push({ test: 'tap the word with the keyboard up: field keeps focus', pass: m.focus === 'tp-in' && m.kb, detail: m.focus });
    }
    // the keyboard closes: back to the bottom, portraits back
    await p.evaluate(() => {
      window.__vv = null;
      document.getElementById('__fakeKb')?.remove();
      window.__kbFit();
    });
    await p.waitForTimeout(300);
    const m = await measure(PARTS);
    await p.screenshot({ path: path.join(out, 'kb-closed.png') });
    const t = m.r['#talk'];
    res.push({ test: 'keyboard closed: prompt back at the bottom, portraits back', pass: !m.kb && t && t[1] > +H - 40 && m.pors > 0, detail: JSON.stringify({ talk: t, pors: m.pors }) });
  } else {
    const m = await measure(PARTS);
    res.push({ test: 'desktop: no keyboard layout', pass: !m.kb, detail: JSON.stringify(m.r['#talk']) });
  }
  res.push({ test: 'no page errors', pass: !errs.length, detail: errs.join(' | ') });
});
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}  ${r.detail}`);
console.log(`artifacts: ${out}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
