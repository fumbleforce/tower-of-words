// QA: on the title screen, move the mouse over people seen through the train windows and shoot what shows.
//   node game3d/qa/title-hover.mjs <outdir>
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/claude-1000/qa-title'; fs.mkdirSync(out, { recursive: true });
const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const b = await chromium.launch({ headless: true, args: gl });
const p = await b.newPage({ viewport: { width: 1366, height: 860 } });
await p.goto('http://127.0.0.1:8771/game3d/index.html');
await p.waitForFunction(() => document.body.classList.contains('at-title'), null, { timeout: 180000 });
await p.waitForTimeout(2000);
let k = 0;
for (const [x, y] of [[1193, 342], [990, 360], [680, 290], [1180, 380]]) { await p.mouse.move(x, y); await p.waitForTimeout(600); await p.screenshot({ path: `${out}/title-hover-${k++}.png` }); }
await b.close();
