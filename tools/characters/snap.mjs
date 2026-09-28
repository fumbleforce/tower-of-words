// Screenshot a character check page: node tools/characters/snap.mjs "<url path+query>" out.png [w h]
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
const [url, out, w = 1440, h = 880] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://127.0.0.1:8771/' + url);
await p.waitForFunction(() => window.__done, null, { timeout: 120000 }).catch(() => errs.push('timeout'));
await p.screenshot({ path: out, fullPage: true });
console.log(out, errs.length ? 'ERR ' + errs.join(' | ') : 'ok');
await b.close();
