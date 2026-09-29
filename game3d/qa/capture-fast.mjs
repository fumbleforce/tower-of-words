// QA capture: the whole day in fast test mode, a still at every story beat, every place start and every few
// seconds of play, plus a transcript of every line. Run it under the browser lock:
//   sh game3d/tools/with-browser-lock.sh qa node game3d/qa/capture-fast.mjs <w> <h> <outdir> [all]
// all: shoot every line (not only the first line of each trigger). Writes NNN-<place>__<what>.jpg,
// transcript.txt and steps.json.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', outArg, mode = ''] = process.argv.slice(2);
const out = path.resolve(outArg); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const ALL = mode === 'all', phone = +W < 700;
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: phone, isMobile: phone });
const errs = [], steps = [], lines = [];
p.on('pageerror', (e) => errs.push(e.message));
let n = 0, busyShot = false;
const shot = async (name) => {
  busyShot = true;
  const f = `${String(n++).padStart(3, '0')}-${name.replace(/[^\w.~-]+/g, '_').slice(0, 70)}.jpg`;
  try { await p.screenshot({ path: path.join(out, f), type: 'jpeg', quality: 80, timeout: 120000 }); steps.push(f); } catch (e) { errs.push('shot ' + f + ': ' + e.message); }
  busyShot = false;
};
await p.exposeFunction('__qaShot', (name) => shot(name));
await p.exposeFunction('__qaLine', (s) => { lines.push(s); });
await p.addInitScript((ALL) => {
  const hook = () => {
    const g = window.__game; if (!g || !g.runner || !g.ui || g.__qaHooked) return setTimeout(hook, 50);
    g.__qaHooked = true;
    let pending = null, lastPlace = '';
    const clean = (s) => String(s).replace(/[^\w:-]+/g, '_').replace(/:/g, '.');
    const trig = g.runner.trigger.bind(g.runner);
    g.runner.trigger = (key, ...a) => { const r = trig(key, ...a); if (r) pending = `${g.place ? g.place.name : 'x'}__${clean(key)}`; return r; };
    const run = g.runner.run.bind(g.runner);
    g.runner.run = (...a) => { const pl = g.place && g.place.name; if (pl && pl !== lastPlace) { lastPlace = pl; window.__qaLine(`\n=== PLACE ${pl}`); if (!pending) pending = `${pl}__start`; } return run(...a); };
    const txt = (h) => { const d = document.createElement('div'); d.innerHTML = String(h); return d.textContent; };
    const wrap = (fn, kind) => async (...a) => {
      const pr = fn(...a);
      const sp = a[0] ? a[0].name : '(narration)';
      const extra = kind === 'choose' ? '  [choices: ' + (a[2] || []).map((c) => txt(c.html || c.text || c)).join(' | ') + ']' : '';
      window.__qaLine(`${g.place ? g.place.name : ''} | ${sp}: ${txt(a[1])}${extra}`);
      const name = pending || (ALL ? `${g.place ? g.place.name : 'x'}__line` : null);
      if (name) { pending = null; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await window.__qaShot(name); }
      return pr;
    };
    g.ui.say = wrap(g.ui.say.bind(g.ui), 'say');
    g.ui.choose = wrap(g.ui.choose.bind(g.ui), 'choose');
    const tp = g.ui.typePrompt.bind(g.ui);
    g.ui.typePrompt = async (id, ...a) => { const pr = tp(id, ...a); window.__qaLine(`${g.place ? g.place.name : ''} | TYPE PROMPT: ${id}`); await window.__qaShot(`${g.place ? g.place.name : 'x'}__type.${id}`); return pr; };
  };
  hook();
}, ALL);
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0`);
// periodic stills of play between beats
const tick = setInterval(async () => {
  if (busyShot) return;
  const s = await p.evaluate(() => { const g = window.__game; return g && g.place ? { place: g.place.name, busy: g.busy } : null; }).catch(() => null);
  if (s && !s.busy) shot(`${s.place}__play`);
}, 6000);
await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: +(process.env.QA_S || 420) * 1000, polling: 1000 }).catch(() => errs.push('timeout: the day did not finish'));
clearInterval(tick);
while (busyShot) await new Promise((r) => setTimeout(r, 200));
await shot('zz__end');
const r = await p.evaluate(() => window.__test ? { places: window.__test.places, errors: window.__test.errors, log: window.__test.log.slice(-20), move: window.__moveCheck || null } : null).catch(() => null);
await b.close();
fs.writeFileSync(path.join(out, 'transcript.txt'), lines.join('\n') + '\n');
fs.writeFileSync(path.join(out, 'steps.json'), JSON.stringify({ size: `${W}x${H}`, secs: Math.round((Date.now() - t0) / 1000), errors: errs, test: r, shots: steps }, null, 1));
console.log(`${steps.length} shots, ${lines.length} lines in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${out}`, errs.length ? 'errors: ' + errs.slice(0, 4).join(' | ') : '', r ? 'places: ' + r.places.join(' > ') : '');
