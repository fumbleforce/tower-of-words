// Dialogue click and hover test: every part of the screen continues a line (top, middle, bottom, the empty corners,
// the portrait, the text itself), a click on a taught word or its play button plays it without moving on, and
// moving the mouse across the dialogue area doesn't flicker (the band's pixels stay steady frame to frame).
//   node game3d/tools/talk-clicks.mjs [w] [h]      writes game3d/shots/talk-clicks/<w>x<h>/ with frames and a sheet
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, `shots/talk-clicks/${W}x${H}`); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
await p.goto(`http://127.0.0.1:8771/game3d/index.html?shell=talkseq&place=gate&skip&q=0`);
await p.waitForFunction(() => window.__shellReady, null, { timeout: 120000 });
await p.waitForTimeout(800);
const line = () => p.evaluate(() => window.__line);
const tap = async (x, y) => { if (phone) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
const res = [];
await p.screenshot({ path: path.join(out, '00-line.png') });
// 1. clicks everywhere continue
const pts = { 'top-left': [20, 90], 'top-middle': [+W / 2, 120], middle: [+W / 2, +H / 2], 'bottom-left corner': [12, +H - 12], 'bottom-right corner': [+W - 12, +H - 12], 'below the text': [+W / 2, +H - 8], 'on the text': null, 'left portrait': [+W * 0.14, +H * 0.8] };
for (const [name, xy0] of Object.entries(pts)) {
  let xy = xy0;
  // a plain letter of the line (not the taught word)
  if (!xy) xy = await p.evaluate(() => { const c = [...document.querySelectorAll('#talk .line .rv')].find((e) => !e.closest('.jp') && /\w/.test(e.textContent)); const r = (c || document.querySelector('#talk .line')).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await p.waitForTimeout(450);
  const a = await line(); await tap(xy[0], xy[1]); await p.waitForTimeout(700); const c = await line();
  res.push({ test: `click ${name}`, pass: c === a + 1, detail: `${a} -> ${c}` });
}
// 2. the word and its play button play without continuing
for (const sel of ['#talk .line .wplay', '#talk .line .jp[data-w]']) {
  await p.waitForTimeout(450);
  // the centre of the element's first box (a word can wrap across two lines)
  const xy = await p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getClientRects()[0]; return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
  if (!xy) { res.push({ test: `click ${sel}`, pass: false, detail: 'not found' }); continue; }
  const a = await line(); await tap(xy[0], xy[1]); await p.waitForTimeout(500); const c = await line();
  res.push({ test: `click ${sel} (plays, stays on the line)`, pass: c === a, detail: `${a} -> ${c}` });
}
await p.screenshot({ path: path.join(out, '01-word.png') });
// 3. hover: sweep the mouse across the band; the band must not change between frames
if (!phone) {
  const frames = [];
  for (let i = 0; i <= 8; i++) {
    const x = 40 + ((+W - 80) * i) / 8, y = +H - 60 - (i % 3) * 70;
    await p.mouse.move(x, y, { steps: 3 }); await p.waitForTimeout(120);
    const f = path.join(out, `hover-${i}.png`); await p.screenshot({ path: f, clip: { x: 0, y: +H * 0.55, width: +W, height: +H * 0.45 } }); frames.push(f);
  }
  const d = JSON.parse(execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageChops
fs = sys.argv[1:]; ims = [Image.open(f).convert('L').resize((320, 90)) for f in fs]
out = []
for a, b in zip(ims, ims[1:]):
    d = ImageChops.difference(a, b); out.append(round(sum(i * n for i, n in enumerate(d.histogram())) / (320 * 90), 2))
print(json.dumps(out))`, ...frames]).toString());
  res.push({ test: 'hover sweep: band steady (mean frame difference under 3)', pass: Math.max(...d) < 3, detail: d.join(' ') });
}
await b.close();
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(res, null, 1));
for (const r of res) console.log(r.pass ? 'PASS' : 'FAIL', r.test, `(${r.detail})`);
