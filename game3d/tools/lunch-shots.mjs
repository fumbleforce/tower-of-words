// The B2 lunch, checked on its own: every lunch choice once, and the 14:00 afternoon beat after it.
//   node game3d/tools/lunch-shots.mjs [w] [h] [runs]      runs: comma list of mio0,mio1,mio2,mori0,mori1 (default all)
// Each run starts on the office floor in fast test mode (?test=fast&place=office, Hamada's crackers on), lets the
// driver play the morning, takes the chosen lunch branch and reply, and pauses the game for a frame at: the first
// lunch line, the reply choice, the bond beat, the crackers line and Mio's vending tip. Each frame's log says where
// Eric, Mio and Mori are (zone, seated) and whether the two lunches are showing.
// Output: game3d/shots/lunch/<w>x<h>/ (JPEGs, log.json). Takes the browser lock (GUIDE, Process).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [W = '1366', H = '860', RUNS = 'mio0,mio1,mio2,mori0,mori1'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(G, 'shots/lunch', `${W}x${H}`);
fs.mkdirSync(out, { recursive: true });
// clear only this call's runs, so a partial rerun keeps the other runs' frames
for (const f of fs.readdirSync(out)) if (RUNS.split(',').some((r) => f.startsWith(r + '-'))) fs.rmSync(path.join(out, f));

const LOCK = '/tmp/claude-1000/browser.lock.' + process.pid, ME = 'lunch-shots';
for (let i = 0; ; i++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (i % 12 === 0) console.log('waiting for the browser lock'); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => process.exit(1));
const GLOCK = '/tmp/claude-1000/gpu.lock'; let gpu = false;
try { fs.mkdirSync(GLOCK); fs.writeFileSync(GLOCK + '/owner', ME); gpu = true; } catch {}
process.on('exit', () => { if (!gpu) return; try { if (fs.readFileSync(GLOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(GLOCK, { recursive: true, force: true }); } catch {} });
const gl = gpu ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

const b = await chromium.launch({ headless: true, args: [...gl, '--autoplay-policy=no-user-gesture-required'] });
const t0 = Date.now();
const all = [];
for (const run of RUNS.split(',')) {
  const who = run.replace(/\d/g, ''), reply = +run.replace(/\D/g, '');
  const p = await b.newPage({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, isMobile: +W < 700 });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (/lunch:/.test(m.text())) errs.push('console: ' + m.text()); });
  let n = 0;
  await p.exposeFunction('__shot', async (name) => { await p.screenshot({ path: path.join(out, `${run}-${String(++n).padStart(2, '0')}-${name}.jpg`), type: 'jpeg', quality: 80 }); });
  await p.addInitScript(([who, reply]) => {
    const L = window.__lu = { shots: [], done: false, nodes: [] };
    const hook = () => {
      const g = window.__game; if (!g || !g.runner || !g.ui || !g.place || g.place.name !== 'office') return setTimeout(hook, 50);
      g.flagsRef.hamada_friend = true;
      const zoneOf = (x, z) => { for (const [k, f] of Object.entries(g.place.zones)) if (f(x, z)) return k; return '?'; };
      const where = (r) => { if (!r || !r.root) return null; const q = r.root.position; return { x: +q.x.toFixed(2), z: +q.z.toFixed(2), zone: zoneOf(q.x, q.z), seated: !!r.seated, visible: r.root.visible }; };
      const food = () => Object.entries(g.place.lunch?.food || {}).filter(([, o]) => o.visible).map(([k, o]) => `${k}@${o.position.x.toFixed(2)},${o.position.y.toFixed(2)},${o.position.z.toFixed(2)}`);
      const shot = async (name, text) => {
        g.paused = true;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        L.shots.push({ name, node: g.runner.trace?.at(-1), text: text ? String(text).slice(0, 80) : undefined, eric: where(g.player), mio: where(g.place.people.mio), mori: where(g.place.people.mori), food: food() });
        await window.__shot(name);
        g.paused = false;
      };
      const run = g.runner.run.bind(g.runner);
      g.runner.run = async (node) => { L.nodes.push(node); return run(node); };
      const say = g.ui.say.bind(g.ui);
      const want = [
        [/sit on the floor|Norway|ノルウェー/, 'first-line'],
        [/Why B2|pickles|The station asked|Upstairs you have|stick the landing|fill his cup/, 'reply'],
        [/not now|seven cups on the tray/, 'bond'],
        [/crackers round/, 'crackers'],
        [/corn soup/, 'afternoon'],
      ];
      g.ui.say = (sp, text, o = {}) => {
        const pr = say(sp, text, o);
        const t = String(text);
        const hit = want.find(([re]) => re.test(t));
        if (hit && L.nodes.some((x) => /^lunch_/.test(x))) { shot(hit[1], t).then(() => { if (hit[1] === 'afternoon') L.done = true; }); }
        return pr;
      };
      // the lunch choice and the reply: pick this run's branch, with a frame of the reply chips first
      g.ui.autoPick = (chips) => {
        const h = chips.map((c) => c.html).join(' | ');
        if (/Lunch with Mio/.test(h)) return who === 'mio' ? 0 : 1;
        if (/Why B2|ski-jump/.test(h)) { shot('choice'); return Math.min(reply, chips.length - 1); }
        return 0;
      };
    };
    hook();
  }, [who, reply]);
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0&place=office`);
  await p.waitForFunction(() => window.__lu && window.__lu.done, null, { timeout: 420000 }).catch(() => errs.push('timeout before the afternoon line'));
  await p.waitForTimeout(400);
  const L = await p.evaluate(() => window.__lu);
  all.push({ run, errs, nodes: L.nodes.filter((x) => /lunch|mio_|mori_|b2|doors|quiet|landing|pour|cups/.test(x)), shots: L.shots });
  console.log(`${run}: ${L.shots.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s${errs.length ? '  ERR ' + errs.slice(0, 3).join(' | ') : ''}`);
  for (const s of L.shots) console.log(`  ${s.name.padEnd(10)} eric ${s.eric.zone}${s.eric.seated ? ' seated' : ''} (${s.eric.x},${s.eric.z})  mio ${s.mio?.zone}${s.mio?.seated ? ' seated' : ''}  mori ${s.mori?.zone}${s.mori?.seated ? ' seated' : ''}  food ${JSON.stringify(s.food)}`);
  await p.close();
}
await b.close();
const logF = path.join(out, 'log.json');
let prev = []; try { prev = JSON.parse(fs.readFileSync(logF, 'utf8')).filter((r) => !all.some((a) => a.run === r.run)); } catch {}
fs.writeFileSync(logF, JSON.stringify([...prev, ...all].sort((a, b) => a.run.localeCompare(b.run)), null, 1));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s (${gpu ? 'gpu' : 'swiftshader'}) -> ${path.relative(path.dirname(G), out)}`);
