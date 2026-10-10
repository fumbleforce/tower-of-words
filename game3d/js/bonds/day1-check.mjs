// Plays day 1 in the fast test mode both ways through the gate and checks the bonds at the end against
// day1.js EXPECT (sim.js does the check in the page; this prints the table and the People panel data).
// The fast driver takes the first reply, which at the jammed gate is 開けて, so for the social way this script
// sends すみません to the guard instead of letting it talk to Hamada.
// `mori` is the magic way with lunch in the kitchenette (the driver would pick Mio): the day's one real choice.
//   node game3d/js/bonds/day1-check.mjs [magic|social|mori|all] [w] [h]     GL=gpu for a faster run
// Takes the browser lock (GUIDE, Process) and serves nothing itself: needs http://127.0.0.1:8771/.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [which = 'all', W = '1366', H = '860'] = process.argv.slice(2);
const ways = which === 'all' ? ['magic', 'social', 'mori'] : [which];
const LOCK = '/tmp/claude-1000/browser.lock', ME = process.env.LOCK_NAME || 'bonds-check';
for (let tries = 0; ; tries++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (tries % 12 === 0) console.log('waiting for the browser lock, held by', (() => { try { return fs.readFileSync(LOCK + '/owner', 'utf8'); } catch { return '?'; } })()); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => { unlock(); process.exit(130); }); process.on('SIGTERM', () => { unlock(); process.exit(143); });

const gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let failed = 0;
for (const way of ways) {
  const b = await chromium.launch({ headless: true, args: gl });
  const p = await b.newPage({ viewport: { width: +W, height: +H } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:8771/game3d/index.html?test=fast&q=0&route=${way === 'social' ? 'social' : 'magic'}`);
  await p.waitForFunction(() => window.__game && window.__game.runner, null, { timeout: 60000 });
  if (way === 'social') {
    await p.evaluate(() => {
      const r = window.__game.runner, trig = r.trigger.bind(r);
      r.trigger = (key, o) => (key === 'talk:kuroda' && r.has('say:sumimasen:guard') ? trig('say:sumimasen:guard', o) : trig(key, o));
    });
  }
  if (way === 'mori') {
    await p.evaluate(() => {
      const r = window.__game.runner, choice = r.choice.bind(r);
      r.choice = (s) => choice(/lunch with/i.test(s.prompt || '') ? { ...s, choice: [...s.choice].reverse() } : s);
    });
  }
  await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: 300000 }).catch(() => {});
  const r = await p.evaluate(async () => {
    const sim = await import('/game3d/js/sim.js');
    return { ended: !!window.__ended, errors: window.__test.errors, bonds: window.__test.bonds, way: window.__test.bondRoute, people: sim.peopleData() };
  });
  const bondErrs = r.errors.filter((e) => e.startsWith('bonds'));
  const want = way === 'mori' ? 'magic+mori' : way;   // the EXPECT key sim.js used: magic, social or magic+mori
  const ok = r.ended && r.way === want && !bondErrs.length && !errs.length;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${way} (${((Date.now() - t0) / 1000).toFixed(0)} s)${r.way !== want ? ` but the day went ${r.way}` : ''}${r.ended ? '' : ' (day did not end)'}`);
  for (const [id, s] of Object.entries(r.bonds || {})) console.log(`  ${id.padEnd(7)} step ${s.step}  ${String(s.pts).padStart(2)} pts  remembers ${s.remembers.join(', ') || '-'}  | ${s.log.join('; ')}`);
  for (const e of [...bondErrs, ...errs]) console.log('  ! ' + e);
  if (process.env.PEOPLE) console.log(JSON.stringify(r.people, null, 1));
  await b.close();
}
unlock();
process.exit(failed ? 1 : 0);
