// Plays a minigame to its end card in a headless browser, the way a player would (clicks, drags),
// and saves a screenshot after every step.
//   node game3d/minigames/tools/play.mjs <give|give-v1|compare|want> <width> <height> [--wrong N] [--port P] [--again]
// --wrong N gets every Nth task wrong first, to see the mistakes play out. --again also plays Play again.
// Needs the repo served on the port (default 8771). Prints PASS or FAIL with any page errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withBrowserJob } from '../../../tools/lib/browser-job.mjs';

const [name, w = '390', h = '844', ...rest] = process.argv.slice(2);
const flag = (k, d) => (rest.includes(k) ? rest[rest.indexOf(k) + 1] : d);
const wrongEvery = Number(flag('--wrong', 0));
const port = flag('--port', '8771');
const again = rest.includes('--again');
if (!name) throw new Error('Which minigame? give, give-v1, compare or want');
const width = Number(w), height = Number(h), phone = width < 640 || width / height < 0.8;
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = path.join(root, 'shots', 'minigames', `${name}-${width}x${height}${wrongEvery ? '-wrong' : ''}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await withBrowserJob(`minigame-${name}`, async browser => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/game3d/minigames/${name}.html`);
  const state = () => page.evaluate(() => window.mg && { ...window.mg.expect, steps: window.mg.steps, done: window.mg.done });
  const centre = async sel => {
    const b = await page.locator(sel).first().boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  let last = -1, n = 0, tasks = 0, ends = 0;
  const shot = label => page.screenshot({ path: path.join(out, `${String(n++).padStart(3, '0')}-${label}.png`) });
  for (let guard = 0; guard < 600; guard++) {
    let e;
    for (let t = 0; t < 80; t++) {
      e = await state();
      if (e && e.steps !== last && e.kind) break;
      await page.waitForTimeout(100);
    }
    if (!e || e.steps === last) throw new Error(`stuck after step ${last}: ${JSON.stringify(e)}`);
    last = e.steps;
    await page.waitForTimeout(80);
    if (e.kind === 'end') {
      await shot('end');
      if (again && ends++ === 0) {
        await page.click('.again');
        continue;
      }
      break;
    }
    const isTask = e.kind !== 'tap' || e.sel !== '.talk .box';
    const wrong = isTask && wrongEvery && ++tasks % wrongEvery === 0 && e.wrong;
    const act = wrong ? (e.kind === 'fill' ? { kind: 'fill', seq: e.wrong } : e.kind === 'link' ? { kind: 'link', ...e.wrong } : { kind: 'tap', sel: e.wrong }) : e;
    await shot(isTask ? `task-${act.kind}${wrong ? '-wrong' : ''}` : 'line');
    // A line moves on from a tap on the box's edge; a tap on a word only shows its meaning.
    if (act.kind === 'tap') await page.click(act.sel, act.sel === '.talk .box' ? { position: { x: 6, y: 6 } } : {});
    else if (act.kind === 'fill') for (const s of act.seq) await page.click(s);
    else if (act.kind === 'link') {
      const a = await centre(act.from), b = await centre(act.to);
      await page.mouse.move(a.x, a.y);
      await page.mouse.down();
      await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2 - 20, { steps: 6 });
      await page.mouse.move(b.x, b.y, { steps: 6 });
      await shot('dragging');
      await page.mouse.up();
    }
  }
  await context.close();
  const ok = !errors.length && ends + 1 >= (again ? 2 : 1);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${width}x${height}: ${n} shots in ${path.relative(process.cwd(), out)}`);
  for (const m of errors) console.log('  page error:', m);
  if (!ok) process.exitCode = 1;
});
