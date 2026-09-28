// A still of every story beat, compared with the last approved set.
//   node game3d/tools/beat-shots.mjs [w] [h]            shoot this build and compare
//   node game3d/tools/beat-shots.mjs [w] [h] --approve  make this build's set the approved one
// The day plays itself in test mode (?test=fast). Each time a story trigger (talk:, say:, event:, zone:, near:, a
// place's start) shows its first line, the page holds while the line is shot, so every beat is captured with its
// text on screen. Names come from the trigger, not the order, so a new beat doesn't shift the others.
// Output: game3d/shots/beats/<build>-<w>x<h>/ (JPEG), compared with game3d/shots/beats/approved-<w>x<h>/.
// Report: report.html and changes.png (approved | this build | difference) in the build's folder; the summary is
// printed. A beat is flagged when its mean pixel difference is over the threshold (BEAT_T, default 7 of 255), or
// it's new or missing. Moving things (the sea, commuters) change a little every run; that stays under it.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const APPROVE = process.argv.includes('--approve');
const [W = '1366', H = '860'] = args;
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const build = JSON.parse(fs.readFileSync(path.join(G, 'build.json'), 'utf8')).id;
const base = path.join(G, 'shots/beats');
const out = path.join(base, `${build}-${W}x${H}`);
const approved = path.join(base, `approved-${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });

const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, isMobile: +W < 700 });
const errs = [], shots = [];
p.on('pageerror', (e) => errs.push(e.message));
const seen = {};
await p.exposeFunction('__beatShot', async (name) => {
  const n = (seen[name] = (seen[name] || 0) + 1);
  const file = `${name}${n > 1 ? '~' + n : ''}.jpg`;
  await p.screenshot({ path: path.join(out, file), type: 'jpeg', quality: 78 });
  shots.push(file);
});
await p.addInitScript(() => {
  // wrap the runner's trigger and the first line after it, once the game is up
  const hook = () => {
    const g = window.__game; if (!g || !g.runner || !g.ui || g.__beatHooked) return setTimeout(hook, 50);
    g.__beatHooked = true;
    let pending = null;
    const clean = (s) => String(s).replace(/[^\w:-]+/g, '_').replace(/:/g, '.');
    const trig = g.runner.trigger.bind(g.runner);
    g.runner.trigger = (key, ...a) => { const r = trig(key, ...a); if (r) pending = `${g.place ? g.place.name : 'x'}__${clean(key)}`; return r; };
    const run = g.runner.run.bind(g.runner);
    let lastPlace = '';
    g.runner.run = (...a) => { const pl = g.place && g.place.name; if (pl && pl !== lastPlace) { lastPlace = pl; if (!pending) pending = `${pl}__start`; } return run(...a); };
    const wrap = (fn) => async (...a) => {
      const pr = fn(...a);
      if (pending) { const name = pending; pending = null; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); await window.__beatShot(name); }
      return pr;
    };
    g.ui.say = wrap(g.ui.say.bind(g.ui));
    g.ui.choose = wrap(g.ui.choose.bind(g.ui));
  };
  hook();
});
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0`);
await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: +(process.env.BEAT_S || 300) * 1000 }).catch(() => errs.push('timeout: the day did not finish'));
await p.screenshot({ path: path.join(out, 'zz__end.jpg'), type: 'jpeg', quality: 78 }); shots.push('zz__end.jpg');
await b.close();
console.log(`${shots.length} beats in ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${path.relative(path.dirname(G), out)}`);
if (errs.length) console.log('page errors:', errs.slice(0, 5).join(' | '));

if (APPROVE) {
  fs.rmSync(approved, { recursive: true, force: true }); fs.cpSync(out, approved, { recursive: true });
  fs.writeFileSync(path.join(approved, 'BUILD'), build + '\n');
  console.log('approved:', path.relative(path.dirname(G), approved));
  process.exit(0);
}
if (!fs.existsSync(approved)) { console.log(`no approved set yet (${path.relative(path.dirname(G), approved)}); review this one and rerun with --approve`); process.exit(0); }

const py = String.raw`
import sys, os, json, html
from PIL import Image, ImageChops, ImageDraw, ImageFont
cur, app, T = sys.argv[1], sys.argv[2], float(sys.argv[3])
names = lambda d: sorted(f for f in os.listdir(d) if f.endswith('.jpg'))
A, C = set(names(app)), set(names(cur))
rows = []
for f in sorted(A | C):
    if f not in C: rows.append((f, None, 'missing')); continue
    if f not in A: rows.append((f, None, 'new')); continue
    a = Image.open(os.path.join(app, f)).convert('L').resize((320, 200)); c = Image.open(os.path.join(cur, f)).convert('L').resize((320, 200))
    d = ImageChops.difference(a, c); m = sum(i * n for i, n in enumerate(d.histogram())) / (320 * 200)
    rows.append((f, m, 'changed' if m > T else 'same'))
flag = [r for r in rows if r[2] != 'same']
try: font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 15)
except Exception: font = ImageFont.load_default()
if flag:
    tw, th = 400, 250; sheet = Image.new('RGB', (tw * 3 + 40, (th + 30) * len(flag) + 10), (16, 18, 23)); y = 10
    for f, m, st in flag:
        ims = []
        for d in (app, cur):
            p = os.path.join(d, f); ims.append(Image.open(p).convert('RGB').resize((tw, th)) if os.path.exists(p) else Image.new('RGB', (tw, th), (40, 20, 20)))
        diff = ImageChops.difference(ims[0], ims[1]).point(lambda v: min(255, v * 4))
        for i, im in enumerate(ims + [diff]): sheet.paste(im, (10 + i * (tw + 10), y + 24))
        ImageDraw.Draw(sheet).text((10, y + 2), f'{f}  {st}' + (f'  diff {m:.1f}' if m is not None else ''), fill=(230, 234, 240), font=font); y += th + 30
    sheet.save(os.path.join(cur, 'changes.png'))
with open(os.path.join(cur, 'report.html'), 'w') as o:
    o.write('<!doctype html><meta charset=utf-8><title>Beat shots</title><style>body{background:#111;color:#ddd;font:14px system-ui}img{width:420px}td{vertical-align:top;padding:4px}.changed,.new,.missing{color:#f08a7e}</style><table>')
    for f, m, st in rows:
        cells = ''.join(f'<td>{"<img src=" + json.dumps(os.path.relpath(os.path.join(d, f), cur)) + ">" if os.path.exists(os.path.join(d, f)) else ""}</td>' for d in (app, cur))
        o.write(f'<tr><td class={st}>{html.escape(f)}<br>{st}{"" if m is None else f" {m:.1f}"}</td>{cells}</tr>')
    o.write('</table>')
print(json.dumps({'beats': len(rows), 'changed': [r[0] for r in rows if r[2] == 'changed'], 'new': [r[0] for r in rows if r[2] == 'new'], 'missing': [r[0] for r in rows if r[2] == 'missing']}))
`;
const res = JSON.parse(execFileSync('python3', ['-c', py, out, approved, process.env.BEAT_T || '7']).toString());
console.log(`${res.beats} beats compared with ${fs.readFileSync(path.join(approved, 'BUILD'), 'utf8').trim()}: ${res.changed.length} changed, ${res.new.length} new, ${res.missing.length} missing`);
for (const k of ['changed', 'new', 'missing']) if (res[k].length) console.log(`  ${k}: ${res[k].join(', ')}`);
if (res.changed.length + res.new.length + res.missing.length) console.log('sheet:', path.join(out, 'changes.png'));
console.log('report:', path.join(out, 'report.html'));
