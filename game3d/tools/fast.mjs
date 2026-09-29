// Fast QA run: the whole day in test mode (?test=fast). node game3d/tools/fast.mjs [w] [h] [seconds]
// Prints PASS/FAIL, the places reached, the time taken and any page errors; saves the end screen.
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import { fastResult } from '../test/support/fast-result.mjs';
import { openGame } from '../test/support/open-game.mjs';
import { writePerf } from '../test/support/perf-report.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// Build checks first (fail the build): every spoken line has a voice clip, and no text in the story carries escape
// leftovers (a backslash, &quot; ...), in spoken lines, narration, choices or prompts alike.
{
  const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const fails = [];
  try { console.log(execFileSync('node', [path.join(G, 'tools/voice-manifest.mjs'), '--check'], { encoding: 'utf8' }).trim()); }
  catch (e) {
    const out = (e.stdout || '').trim() || 'voice check failed';
    // VOICE_WARN=1: missing clips warn instead of failing (a build shipped before the GPU is free); escapes still fail
    const esc = out.split('\n').filter((l) => l.startsWith('ESCAPE'));
    if (process.env.VOICE_WARN && !e.signal && e.status === 1 && out.split('\n').every(line => /^(NO CLIP|ESCAPE)/.test(line))) { console.log('WARN unvoiced lines:\n' + out.split('\n').filter((l) => l.startsWith('NO CLIP')).join('\n')); if (esc.length) fails.push(esc.join('\n')); }
    else fails.push(out);
  }
  const bad = [];
  const scan = (v, where) => {
    if (typeof v === 'string') { if (/\\|&quot;|&amp;|&#\d+;/.test(v)) bad.push(`${where}: ${v.slice(0, 90)}`); return; }
    if (Array.isArray(v)) v.forEach((x, i) => scan(x, where)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) scan(x, where);
  };
  for (const n of ['train', 'gate', 'office', 'transitions']) {
    const f = path.join(G, 'story', n + '.js'); if (!fs.existsSync(f)) continue;
    scan((await import(pathToFileURL(f).href + '?' + Date.now())).default, n);
  }
  if (bad.length) fails.push('ESCAPES in story text:\n' + bad.join('\n'));
  if (fails.length && process.env.SKIP_CHECKS) console.log('(build checks failing, skipped for this run: SKIP_CHECKS)');
  else if (fails.length) { console.log('FAIL build checks\n' + fails.join('\n')); process.exit(1); }
}
const [W = '1366', H = '860', S = '180'] = process.argv.slice(2);
const overrides = Object.fromEntries(['MOVE_WARN', 'VOICE_WARN', 'SKIP_CHECKS'].map(key => [key, !!process.env[key]]));
console.log('overrides:', Object.keys(overrides).filter(key => overrides[key]).join(', ') || 'none');
const output = fileURLToPath(new URL(`../shots/fast/${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`, import.meta.url));
fs.mkdirSync(output, { recursive: true });
const started = Date.now(), jobBudgetMs = 295000, captureReserveMs = 10000;
const errors = [];
let run = {}, result, pageErrors = [], perf = null;
try {
  if (![W, H, S].every(value => Number.isFinite(+value) && +value > 0)) throw new Error('Width, height and seconds must be positive numbers');
  await withBrowserJob('fast-test', async browser => {
    const url = `http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0${process.env.ROUTE ? '&route=' + encodeURIComponent(process.env.ROUTE) : ''}${process.env.Q || ''}`;
    const game = await openGame(browser, { viewport: { width: +W, height: +H }, mode: 'fast', url });
    const { page } = game;
    pageErrors = game.errors;
    // GUIDE caps the whole job at five minutes, including startup, capture and cleanup.
    const routeMs = Math.max(1, Math.min(+S * 1000, jobBudgetMs - (Date.now() - started) - captureReserveMs));
    if (routeMs < +S * 1000) console.log(`Route budget limited to ${(routeMs / 1000).toFixed(1)}s to reserve capture/cleanup within five minutes`);
    try { await page.waitForFunction(() => window.__test?.done, null, { timeout: routeMs }); }
    catch (error) { errors.push(`Route wait failed: ${error.message.split('\n')[0]}`); }
    run = await page.evaluate(() => ({
      ...window.__test, ended: !!window.__ended, place: window.__game.place?.name,
      goal: window.__game.ui.goalText, voices: window.__voiceLog, move: window.__moveCheck,
    }));
    // per-place frame times, draw calls and triangles (js/perf/metrics.js); written to perf.json below
    try { perf = await page.evaluate(() => window.__perfReport?.() ?? null); }
    catch (error) { console.log(`perf numbers unavailable: ${error.message.split('\n')[0]}`); }
    try {
      if (run.ended) await page.waitForFunction(() => {
        const end = document.querySelector('#end');
        return end && !end.hidden && Number(getComputedStyle(end).opacity) >= 0.99;
      }, null, { timeout: 2000 });
      await page.screenshot({ path: path.join(output, `${W}x${H}.png`), timeout: 5000 });
    }
    catch (error) { errors.push(`Capture failed: ${error.message.split('\n')[0]}`); }
  }, { timeoutMs: jobBudgetMs });
  // Print only after the entire lifecycle resolves: a late deadline/close failure cannot race a PASS.
  result = fastResult(run, [...errors, ...pageErrors], overrides);
  process.exitCode = result.pass ? 0 : 1;
} catch (error) {
  errors.push(error.message);
  if (error.code === 'LOAD_DEFERRED') {
    result = { pass: false, verdict: 'DEFERRED', errors, activeOverrides: Object.keys(overrides).filter(key => overrides[key]) };
    process.exitCode = 75;
  } else {
    result = fastResult(run, [...new Set([...errors, ...pageErrors])], overrides);
    process.exitCode = 1;
  }
}
fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ viewport: [+W, +H], run, ...result }, null, 2));
console.log(result.verdict, `${W}x${H}`, `${((Date.now() - started) / 1000).toFixed(0)} s`, 'route:', run.route,
  'places:', (run.places || []).join(' > '), 'at:', run.place, '| goal:', run.goal);
console.log(`movement: ${run.move?.steps || 0} steps, ${result.overlaps || 0} overlaps, ${result.spins || 0} spins`);
console.log('practice prompts passed via Say:', run.practice || 0);
if (run.bondRoute || run.bonds) console.log('bonds:', run.bondRoute || '', JSON.stringify(run.bonds || {}).slice(0, 400));
console.log('voices:', JSON.stringify(run.voices));
for (const heard of (run.heard || []).filter(entry => /sumimasen|すみません/.test(entry.text))) {
  console.log('heard:', heard.key, heard.text, '| known', heard.known.join(','), '| tokens', heard.tokens.join(' '),
    heard.garbledKnown.length ? 'GARBLED ' + heard.garbledKnown : 'clear');
}
console.log('last steps:', (run.log || []).slice(-8).join(' | '));
if (perf) {
  let build = '';
  try { build = JSON.parse(fs.readFileSync(new URL('../build.json', import.meta.url), 'utf8')).id; } catch { /* no build id */ }
  writePerf(output, perf, { build, pass: result.pass });
}
if (result.errors.length) console.log('errors:', result.errors.slice(0, 8).join(' | '));
console.log('artifacts:', output);
