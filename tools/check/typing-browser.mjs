// Typing in a text field never fires a shortcut: the bible's "/" (search) and the game's keys (walk, use, talk,
// Say, number chips) while typing in the bible's Review comment box, the F8 feedback box or the romaji practice box.
//   node tools/check/typing-browser.mjs [w] [h]      prints PASS/FAIL per case (BASE=<server url of a checkout>)
import { withBrowserJob } from '../lib/browser-job.mjs';
const [W = '1366', H = '860'] = process.argv.slice(2);
const phone = +W < 700;
const BASE = process.env.BASE || 'http://127.0.0.1:8771/';
const TEXT = '/wasd eqf 12 /x';
const res = [];
const ok = (test, pass, detail = '') => res.push({ test, pass, detail });
await withBrowserJob('typing-browser', async (b) => {
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  // ---- bible: Review comment boxes and "/" outside a field
  await p.goto(BASE + 'bible/#review/mori-3d');
  await p.waitForSelector('.page.review textarea', { timeout: 30000 });
  const tas = await p.$$('.page.review textarea');
  await tas[0].click();
  await p.keyboard.type(TEXT);
  ok('bible: typing "/" in a Review comment box stays in the box', (await tas[0].inputValue()).endsWith(TEXT) && await p.evaluate(() => document.activeElement.id !== 'q'),
    `value=${JSON.stringify(await tas[0].inputValue())} focus=${await p.evaluate(() => document.activeElement.tagName + '#' + document.activeElement.id)}`);
  await tas[0].fill(''); // don't leave a draft behind
  await p.evaluate(() => localStorage.clear());
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.down('Control'); await p.keyboard.press('Slash'); await p.keyboard.up('Control');
  ok('bible: Ctrl+/ does not jump to search', await p.evaluate(() => document.activeElement.id !== 'q'));
  await p.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', isComposing: true, bubbles: true })));
  ok('bible: "/" during IME composition does not jump to search', await p.evaluate(() => document.activeElement.id !== 'q'));
  await p.keyboard.press('Slash');
  ok('bible: "/" outside a field still focuses search', await p.evaluate(() => document.activeElement.id === 'q'));
  // ---- game
  await p.goto(BASE + 'game3d/index.html?place=gate&skip&q=0');
  await p.waitForFunction(() => window.__game && window.__game.walker, null, { timeout: 120000 });
  await p.waitForTimeout(4000);
  const state = () => p.evaluate(() => {
    const g = window.__game;
    return { keys: [...g.walker.keys], pos: [g.walker.rig?.root?.position?.x ?? g.walker.pos?.x, g.walker.rig?.root?.position?.z],
      say: !document.querySelector('#sayMenu') || document.querySelector('#sayMenu').hidden,
      paused: document.body.classList.contains('paused') || !!document.querySelector('#pause:not([hidden])'),
      talking: !!g.ui.talking, busy: !!g.busy, line: document.querySelector('#talk .line')?.textContent || '' };
  });
  // F8 feedback box
  await p.keyboard.press('F8');
  await p.waitForSelector('textarea[aria-label="Your feedback"]', { state: 'visible', timeout: 10000 });
  const before = await state();
  await p.keyboard.type(TEXT);
  const fb = await p.inputValue('textarea[aria-label="Your feedback"]');
  const after = await state();
  ok('game: F8 feedback box takes the text', fb === TEXT, JSON.stringify(fb));
  ok('game: typing in the feedback box moves/opens nothing', JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  // romaji practice box
  const id = await p.evaluate(async () => {
    const L = await import(new URL('js/lang.js', location.href).href);
    const id = Object.keys(L.WORDS).find((k) => L.WORDS[k].ro && /^[a-z ]+$/.test(L.WORDS[k].ro));
    window.__tp = window.__game.ui.typePrompt(id, null, { cancel: true });
    return id;
  });
  await p.waitForSelector('#talk .tp-in', { state: 'visible', timeout: 10000 });
  await p.waitForTimeout(200);
  await p.focus('#talk .tp-in');
  const b2 = await state();
  const t2 = 'wasd eqf 12 /';
  await p.keyboard.type(t2);
  const rv = await p.inputValue('#talk .tp-in');
  const a2 = await state();
  ok(`game: romaji box (${id}) takes the text`, rv === t2, JSON.stringify(rv));
  ok('game: typing in the romaji box moves/opens nothing', JSON.stringify(b2.keys) === JSON.stringify(a2.keys) && a2.say && !a2.paused && JSON.stringify(b2.pos) === JSON.stringify(a2.pos),
    `${JSON.stringify(b2)} -> ${JSON.stringify(a2)}`);
  ok('page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
});
for (const r of res) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.test}${r.detail && !r.pass ? '  ' + r.detail : ''}`);
console.log(res.every((r) => r.pass) ? `ALL PASS ${W}x${H}` : `FAIL ${W}x${H}`);
process.exit(res.every((r) => r.pass) ? 0 : 1);
