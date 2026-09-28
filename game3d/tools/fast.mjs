// Fast QA run: the whole day in test mode (?test=fast). node game3d/tools/fast.mjs [w] [h] [seconds]
// Prints PASS/FAIL, the places reached, the time taken and any page errors; saves the end screen.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
const [W = '1366', H = '860', S = '180'] = process.argv.slice(2);
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0${process.env.Q || ''}`);
await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: +S * 1000 }).catch(() => {});
const r = await p.evaluate(() => ({ ...window.__test, ended: !!window.__ended, place: window.__game.place && window.__game.place.name, goal: window.__game.ui.goalText }));
await p.screenshot({ path: `/tmp/claude-1000/fast-${W}x${H}.png` });
console.log(r.ended && !errs.length && !r.errors.length ? 'PASS' : 'FAIL', `${W}x${H}`, `${((Date.now() - t0) / 1000).toFixed(0)} s`, 'places:', r.places.join(' > '), 'at:', r.place, '| goal:', r.goal);
console.log('last steps:', r.log.slice(-8).join(' | '));
if (errs.length || r.errors.length) console.log('errors:', [...errs, ...r.errors].slice(0, 6).join(' | '));
await b.close();
