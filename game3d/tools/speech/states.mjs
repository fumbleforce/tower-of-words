// The voice-input UI states, desktop and phone, as one sheet: game3d/shots/voice/states-sheet.png
//   node game3d/tools/speech/states.mjs
// Takes the shared browser lock (/tmp/claude-1000/browser.lock) like every headless run.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '../../..'), out = join(root, 'game3d/shots/voice');
mkdirSync(out, { recursive: true });
const STATES = ['idle', 'asking', 'loading', 'listening', 'thinking', 'hit', 'miss', 'miss2', 'other', 'quiet', 'blocked', 'saymenu', 'words'];
const LOCK = '/tmp/claude-1000/browser.lock', ME = 'voice-input';
for (;;) { try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'owner'), `${ME} ${new Date().toISOString()}\n`); break; } catch { await new Promise((r) => setTimeout(r, 15000)); } }
const drop = () => { try { if (readFileSync(join(LOCK, 'owner'), 'utf8').startsWith(ME)) rmSync(LOCK, { recursive: true }); } catch { /* */ } };
const port = +(process.env.PORT || 18784);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const browser = await chromium.launch({ headless: true });
const files = { desktop: [], phone: [] };
try {
  for (const [kind, vp] of [['desktop', { width: 1366, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('page:', e.message));
    for (const st of STATES) {
      await page.goto(`http://127.0.0.1:${port}/game3d/tools/speech/states.html?state=${st}&phone=${kind === 'phone' ? 1 : 0}`);
      await page.waitForFunction(() => window.ready, null, { timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const f = join(out, `${st}-${kind}.png`); await page.screenshot({ path: f }); files[kind].push(f);
    }
    await page.close();
  }
} finally { await browser.close(); srv.kill(); drop(); }
// tile: desktop shots cropped to the lower part where the prompt sits, phone shots whole
execFileSync('python3', ['-c', `
import sys
from PIL import Image, ImageDraw
d = sys.argv[1].split(','); p = sys.argv[2].split(','); out = sys.argv[3]
def crop_desk(f):
    im = Image.open(f).convert('RGB'); w, h = im.size
    return im.crop((0, int(h * 0.42), w, h)).resize((int(w * 0.5), int((h - int(h * 0.42)) * 0.5)))
def crop_phone(f):
    im = Image.open(f).convert('RGB'); w, h = im.size
    return im.crop((0, int(h * 0.30), w, h)).resize((int(w * 0.62), int((h - int(h * 0.30)) * 0.62)))
D = [crop_desk(f) for f in d]; P = [crop_phone(f) for f in p]
cols = 3; dw, dh = D[0].size; pw, ph = P[0].size
rowsD = (len(D) + cols - 1) // cols; colsP = 7; rowsP = (len(P) + colsP - 1) // colsP
W = max(cols * dw, colsP * pw) + 16; H = rowsD * dh + rowsP * ph + 40
S = Image.new('RGB', (W, H), (14, 18, 28))
for i, im in enumerate(D): S.paste(im, (8 + (i % cols) * dw, 8 + (i // cols) * dh))
y0 = 24 + rowsD * dh
for i, im in enumerate(P): S.paste(im, (8 + (i % colsP) * pw, y0 + (i // colsP) * ph))
S.save(out)
print(out, S.size)
`, files.desktop.join(','), files.phone.join(','), join(out, 'states-sheet.png')], { stdio: 'inherit' });
