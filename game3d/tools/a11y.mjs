// Accessibility basics on the shell and the HUD, desktop and phone:
//   node game3d/tools/a11y.mjs
// 1. Text contrast: every visible piece of text against what's actually behind it (the page is shot twice, with
//    and without the text, and the text colour is compared with the pixels under its box; 10th percentile, so a
//    bright patch behind part of a line counts). WCAG AA: 4.5, or 3 for large text (24 px, or 18.7 px bold).
// 2. Font sizes on the phone: nothing under 12 px; body text under 14 px is listed.
// 3. Touch targets on the phone: every button, input and switch at least 44 x 44 px (world markers have a 48 x 62
//    touch area of their own in CSS and are listed apart).
// 4. Keyboard: the title, settings, pause and Say menu work with keys alone (focus lands, moves, opens, closes).
// Uses ?shell=<screen> (js/shell-qa.js). Writes game3d/shots/a11y/report.json and prints the failures.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/a11y'); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const SCREENS = ['title', 'settings', 'load', 'pause', 'hud', 'end'];
const DEV = { desktop: [1366, 860], phone: [390, 844] };
const report = { contrast: [], small: [], targets: [], keyboard: [] };

for (const s of process.env.A11Y_KB ? [] : SCREENS) for (const [dev, [w, h]] of Object.entries(DEV)) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: dev === 'phone', hasTouch: dev === 'phone' });
  const inGame = ['pause', 'hud', 'end'].includes(s);
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?shell=${s}&pics=/game3d/shots/shell/places${inGame ? '&place=gate&skip' : ''}`);
  await p.waitForFunction(() => window.__shellReady, null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(800);
  // freeze the world so both shots have the same background
  await p.evaluate(() => { const g = window.__game; if (g) g.paused = true; document.body.classList.add('a11y-freeze'); });
  // entrance animations run to their end; looping ones stop where they are
  await p.evaluate(() => { for (const a of document.getAnimations()) { if (a.effect && a.effect.getTiming().iterations === Infinity) a.pause(); else a.finish(); } });
  await p.addStyleTag({ content: '*{transition:none!important} #build{display:none!important}' });
  const texts = await p.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
    const out = [];
    const all = document.querySelectorAll('body *:not(script):not(style):not(canvas):not(svg):not(svg *)');
    for (const e of all) {
      const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own || !vis(e) || e.closest('#boot,[hidden],.mark.far,#stage')) continue;
      let hid = false; for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || +cs.opacity < 0.05) { hid = true; break; } }
      if (hid) continue;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      // the text's own box (a range over its text nodes), not the element's padding
      const rg = document.createRange(); rg.selectNodeContents(e); const tr = rg.getBoundingClientRect();
      const box = tr.width ? tr : r;
      // covered by something else (a sheet over the title, a scrolled-away row): not what the player sees
      const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, box.left + box.width / 2)), Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2)));
      if (!hit || !(hit === e || e.contains(hit) || hit.contains(e))) continue;
      out.push({ text: own.slice(0, 40), sel: e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''), color: cs.color, size: parseFloat(cs.fontSize), weight: +cs.fontWeight, box: [box.left, box.top, box.width, box.height].map(Math.round) });
    }
    return out;
  });
  const shotA = path.join(out, `${s}-${dev}.png`), shotB = path.join(out, `${s}-${dev}-bg.png`);
  await p.screenshot({ path: shotA });
  await p.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;caret-color:transparent!important} .rv{opacity:1!important}' });
  await p.waitForTimeout(100);
  await p.screenshot({ path: shotB });
  fs.writeFileSync(path.join(out, `${s}-${dev}.json`), JSON.stringify(texts));
  const py = String.raw`
import sys, json, re, warnings
warnings.filterwarnings('ignore')
from PIL import Image
bg = Image.open(sys.argv[1]).convert('RGB'); T = json.load(open(sys.argv[2]))
def lin(c): c /= 255; return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
def L(r, g, b): return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
res = []
for t in T:
    m = re.findall(r'[\d.]+', t['color']); r, g, b = map(float, m[:3]); a = float(m[3]) if len(m) > 3 else 1
    x, y, w, h = t['box']; x0, y0 = max(0, x), max(0, y); x1, y1 = min(bg.width, x + w), min(bg.height, y + h)
    if x1 <= x0 or y1 <= y0: continue
    px = list(bg.crop((x0, y0, x1, y1)).resize((max(1, (x1 - x0) // 2), max(1, (y1 - y0) // 2))).getdata())
    cr = []
    for (R, Gg, B) in px:
        fr, fg, fb = r * a + R * (1 - a), g * a + Gg * (1 - a), b * a + B * (1 - a)
        l1, l2 = L(fr, fg, fb), L(R, Gg, B); cr.append((max(l1, l2) + 0.05) / (min(l1, l2) + 0.05))
    cr.sort(); c = cr[len(cr) // 10]
    large = t['size'] >= 24 or (t['size'] >= 18.66 and t['weight'] >= 700)
    res.append({**t, 'contrast': round(c, 2), 'need': 3 if large else 4.5})
print(json.dumps(res))
`;
  const rs = JSON.parse(execFileSync('python3', ['-c', py, shotB, path.join(out, `${s}-${dev}.json`)]).toString());
  for (const t of rs) if (t.contrast < t.need) report.contrast.push({ screen: `${s}/${dev}`, text: t.text, sel: t.sel, contrast: t.contrast, need: t.need, size: t.size });
  if (dev === 'phone') {
    for (const t of rs) if (t.size < 14) report.small.push({ screen: s, text: t.text, sel: t.sel, size: t.size, level: t.size < 12 ? 'FAIL' : 'note' });
    const tg = await p.evaluate(() => [...document.querySelectorAll('button, input, [role=switch], [role=radio], a[href]')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; for (let a = e; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; } return !e.closest('[hidden],.mark') && r.bottom > 0 && r.top < innerHeight; })
      .map((e) => { const r = e.getBoundingClientRect(); return { sel: e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0], label: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; }));
    for (const t of tg) if (t.w < 44 || t.h < 44) report.targets.push({ screen: s, ...t });
  }
  await p.close();
}

// keyboard
{
  const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
  const ok = (name, v, detail = '') => report.keyboard.push({ check: name, pass: !!v, detail });
  await p.goto('http://127.0.0.1:8771/game3d/index.html');
  await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const act = () => p.evaluate(() => { const a = document.activeElement; return a ? (a.className || a.tagName) + ':' + (a.textContent || '').trim().slice(0, 20) : 'none'; });
  ok('title: focus starts on Start', /go/.test(await act()), await act());
  await p.keyboard.press('ArrowDown'); ok('title: Down moves to the next item', /mcont|msettings/.test(await act()), await act());
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  await p.keyboard.press('ArrowUp');
  await p.evaluate(() => document.querySelector('#title .msettings').focus());
  await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  ok('title: Enter on Settings opens it', await p.evaluate(() => !!document.querySelector('#settings') && !document.querySelector('#settings').hidden));
  ok('settings: focus is inside', await p.evaluate(() => !!document.activeElement.closest('#settings')), await act());
  for (let i = 0; i < 30; i++) await p.keyboard.press('Tab');
  ok('settings: Tab stays inside', await p.evaluate(() => !!document.activeElement.closest('#settings')), await act());
  await p.evaluate(() => document.querySelector('#settings .seg[data-key=textSpeed] [aria-checked=true]').focus());
  await p.keyboard.press('ArrowLeft');
  ok('settings: arrows change a choice', await p.evaluate(() => window.__settings.textSpeed !== 'fast'), await p.evaluate(() => window.__settings.textSpeed));
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok('settings: Esc closes it', await p.evaluate(() => document.querySelector('#settings').hidden));
  ok('settings: focus returns to the menu', /msettings/.test(await act()), await act());
  await p.evaluate(() => document.querySelector('#title .go').focus());
  await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
  ok('title: Enter on Start starts the day', await p.evaluate(() => !document.body.classList.contains('at-title')));
  // in play: Space/Enter advance lines until the player is free, then Esc pauses
  // (a typing prompt is answered by typing the romaji it shows, the way a player would)
  for (let i = 0; i < 80 && await p.evaluate(() => window.__game.busy || !!document.querySelector('#talk:not([hidden])')); i++) {
    const ro = await p.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('tp-in') ? document.querySelector('.tp-ro').textContent : null; });
    if (ro) { await p.keyboard.type(ro); await p.waitForTimeout(600); continue; }
    await p.keyboard.press('Enter'); await p.waitForTimeout(350);
  }
  ok('play: Enter advances the opening lines', await p.evaluate(() => !window.__game.busy));
  const before = await p.evaluate(() => ({ cls: document.body.className, layers: document.querySelectorAll('.layer:not([hidden])').length }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('play: Esc opens the pause menu', await p.evaluate(() => document.body.classList.contains('paused')), JSON.stringify(before));
  ok('pause: focus on Resume', /resume/.test(await act()), await act());
  await p.keyboard.press('ArrowDown'); ok('pause: Down moves', /save/.test(await act()), await act());
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  ok('pause: Esc resumes', await p.evaluate(() => !document.body.classList.contains('paused')));
  // walking with keys
  const x0 = await p.evaluate(() => window.__game.player.root.position.x);
  await p.keyboard.down('KeyD'); await p.waitForTimeout(900); await p.keyboard.up('KeyD');
  ok('play: WASD walks', Math.abs((await p.evaluate(() => window.__game.player.root.position.x)) - x0) > 0.05);
  await p.close();
}
await b.close();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
const uniq = (arr, k) => [...new Map(arr.map((x) => [k(x), x])).values()];
const cf = uniq(report.contrast, (x) => x.sel + x.text + x.screen);
console.log(`contrast: ${cf.length} below AA`); for (const c of cf.slice(0, 40)) console.log(`  ${c.screen.padEnd(16)} ${c.contrast} < ${c.need}  ${c.sel} "${c.text}" (${c.size}px)`);
const sm = uniq(report.small, (x) => x.sel + x.text);
console.log(`phone text under 14 px: ${sm.length} (${sm.filter((x) => x.level === 'FAIL').length} under 12)`); for (const c of sm.slice(0, 30)) console.log(`  ${c.level.padEnd(4)} ${c.size}px ${c.screen}: ${c.sel} "${c.text}"`);
const tg = uniq(report.targets, (x) => x.sel + x.label);
console.log(`phone touch targets under 44 px: ${tg.length}`); for (const c of tg) console.log(`  ${c.w}x${c.h} ${c.screen}: ${c.sel} "${c.label}"`);
console.log(`keyboard: ${report.keyboard.filter((k) => k.pass).length}/${report.keyboard.length}`); for (const k of report.keyboard) if (!k.pass) console.log(`  FAIL ${k.check} (${k.detail})`);
