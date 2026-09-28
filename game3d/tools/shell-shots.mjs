// Stills of every shell screen on its own (title, settings, continue, pause, save, loading, end of day), on
// desktop and phone, plus a contact sheet. node game3d/tools/shell-shots.mjs [outdir] [screens,...]
// Default outdir game3d/shots/shell. Uses ?shell=<screen> (js/shell-qa.js). GL=gpu renders on the GPU (take the
// GPU lock first, GUIDE.md); otherwise SwiftShader.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const out = path.resolve(process.argv[2] || path.join(ROOT, 'game3d/shots/shell'));
const only = process.argv[3] ? process.argv[3].split(',') : null;
fs.mkdirSync(path.join(out, 'places'), { recursive: true });
const rel = path.relative(ROOT, out).split(path.sep).join('/');
const BASE = 'http://127.0.0.1:8771/';
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const ALL = { desktop: [1366, 860], qhd: [2560, 1440], phone: [390, 844] };
const SIZES = Object.fromEntries((process.env.SIZES || 'desktop,phone').split(',').map((k) => [k, ALL[k]]));

// 1. a frame of each place, for the thumbnails and the end-of-day photos
if (!only || only.includes('end') || only.includes('load') || only.includes('save')) {
  for (const place of ['train', 'gate', 'office']) {
    const p = await b.newPage({ viewport: { width: 960, height: 600 } });
    await p.goto(`${BASE}game3d/index.html?cap&q=1&place=${place}`);
    await p.waitForFunction(() => window.__done, null, { timeout: 90000 }).catch(() => {});
    await p.addStyleTag({ content: '#ui,#build,#title{display:none!important}' });
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, 'places', place + '.jpg'), type: 'jpeg', quality: 80 });
    await p.close();
  }
}

// 2. each screen
const SCREENS = ['title', 'settings', 'load', 'pause', 'save', 'loading', 'hud', 'hudfar', 'end', 'act', 'actnext', 'talk', 'wait', 'goaltrain'];
const QS = { hudfar: 'hud&far=-6,3&zoom=3.4', act: 'act&at=guard', actnext: 'act&at=guard&cycle=1', goaltrain: 'goal' };
const PLACE = { goaltrain: 'train' };
const results = [];
for (const s of SCREENS.filter((x) => !only || only.includes(x))) {
  for (const [dev, [w, h]] of Object.entries(SIZES)) {
    const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: dev === 'phone', isMobile: dev === 'phone', deviceScaleFactor: 1 });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const inGame = !['title', 'settings', 'load'].includes(s);
    const q = `shell=${QS[s] || s}&pics=${encodeURIComponent('/' + rel + '/places')}${inGame ? `&place=${PLACE[s] || 'gate'}&skip` : ''}`;
    await p.goto(`${BASE}game3d/index.html?${q}${dev === 'qhd' ? '&q=0' : ''}`);
    await p.waitForFunction(() => window.__shellReady, null, { timeout: 90000 }).catch(() => errs.push('timeout'));
    await p.waitForTimeout(900);
    const file = path.join(out, `${s}-${dev}.png`);
    try { await p.screenshot({ path: file, timeout: 180000 }); results.push({ s, dev, file, errs }); } catch (e) { errs.push('screenshot: ' + e.message.split('\n')[0]); }
    console.log(s, dev, errs.length ? 'ERR ' + errs.slice(0, 3).join(' | ') : 'ok');
    await p.close();
  }
}
await b.close();

// 3. contact sheet: desktop and phone side by side, one row per screen
const py = `
import sys, json
from PIL import Image, ImageDraw, ImageFont
rows = json.loads(sys.argv[1]); out = sys.argv[2]
by = {}
for r in rows: by.setdefault(r['s'], {})[r['dev']] = r['file']
H = 430; pad = 16; lab = 28
try: font = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Bold.ttf', 18)
except Exception: font = ImageFont.load_default()
tiles = []
for s, d in by.items():
    ims = []
    for dev in ('desktop', 'qhd', 'phone'):
        if dev in d:
            im = Image.open(d[dev]).convert('RGB'); im = im.resize((int(im.width * H / im.height), H)); ims.append(im)
    w = sum(i.width for i in ims) + pad * (len(ims) - 1)
    t = Image.new('RGB', (w, H + lab), (24, 27, 34)); x = 0
    for i in ims: t.paste(i, (x, lab)); x += i.width + pad
    ImageDraw.Draw(t).text((4, 4), s, fill=(230, 234, 240), font=font); tiles.append(t)
W = max(t.width for t in tiles) + pad * 2
sheet = Image.new('RGB', (W, sum(t.height + pad for t in tiles) + pad), (16, 18, 23)); y = pad
for t in tiles: sheet.paste(t, (pad, y)); y += t.height + pad
sheet.save(out); print(out)
`;
if (results.length) console.log(execFileSync('python3', ['-c', py, JSON.stringify(results), path.join(out, 'sheet.png')]).toString().trim());
