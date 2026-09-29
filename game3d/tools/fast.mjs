// Fast QA run: the whole day in test mode (?test=fast). node game3d/tools/fast.mjs [w] [h] [seconds]
// Prints PASS/FAIL, the places reached, the time taken and any page errors; saves the end screen.
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
    if (process.env.VOICE_WARN) { console.log('WARN unvoiced lines:\n' + out.split('\n').filter((l) => l.startsWith('NO CLIP')).join('\n')); if (esc.length) fails.push(esc.join('\n')); }
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
let gl = process.env.GL === 'gpu' ? ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
gl.push('--autoplay-policy=no-user-gesture-required');
// one headless browser at a time across all agents (GUIDE, Process): take /tmp/claude-1000/browser.lock, wait if held
const LOCK = '/tmp/claude-1000/browser.lock.' + process.pid, ME = process.env.LOCK_NAME || 'fast-test';
for (let tries = 0; ; tries++) {
  try { fs.mkdirSync(LOCK); fs.writeFileSync(LOCK + '/owner', ME + ' ' + new Date().toISOString()); break; }
  catch { if (tries % 12 === 0) console.log('waiting for the browser lock, held by', (() => { try { return fs.readFileSync(LOCK + '/owner', 'utf8'); } catch { return '?'; } })()); await new Promise((r) => setTimeout(r, 5000)); }
}
const unlock = () => { try { if (fs.readFileSync(LOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(LOCK, { recursive: true, force: true }); } catch {} };
process.on('exit', unlock); process.on('SIGINT', () => { unlock(); process.exit(130); }); process.on('SIGTERM', () => { unlock(); process.exit(143); });
// the real GPU is about 20x faster than SwiftShader: take the GPU lock if it's free (as game3d/qa/run.sh does)
const GLOCK = '/tmp/claude-1000/gpu.lock'; let gpuMine = false;
if (process.env.GL !== 'soft') { try { fs.mkdirSync(GLOCK); fs.writeFileSync(GLOCK + '/owner', ME + ' fast-test'); gpuMine = true; gl = ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist', '--enable-gpu']; } catch { /* busy: software */ } }
console.log('GL', gpuMine || process.env.GL === 'gpu' ? 'gpu' : 'swiftshader');
const unGpu = () => { if (!gpuMine) return; try { if (fs.readFileSync(GLOCK + '/owner', 'utf8').startsWith(ME)) fs.rmSync(GLOCK, { recursive: true, force: true }); } catch {} gpuMine = false; };
process.on('exit', unGpu);
const b = await chromium.launch({ headless: true, args: gl });
const p = await b.newPage({ viewport: { width: +W, height: +H } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
const t0 = Date.now();
await p.goto(`http://127.0.0.1:8771/${process.env.BASE || 'game3d'}/index.html?test=fast&q=0${process.env.ROUTE ? '&route=' + process.env.ROUTE : ''}${process.env.Q || ''}`); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
await p.waitForFunction(() => window.__test && window.__test.done, null, { timeout: +S * 1000 }).catch(() => {});
const r = await p.evaluate(() => ({ ...window.__test, ended: !!window.__ended, place: window.__game.place && window.__game.place.name, goal: window.__game.ui.goalText, voices: window.__voiceLog, heard: window.__test.heard, move: window.__moveCheck, bonds: window.__test.bonds, bondRoute: window.__test.bondRoute }));
await p.screenshot({ path: `/tmp/claude-1000/fast-${W}x${H}.png` });
// every check that can fail runs before the verdict line (movement adds to r.errors)
const mv = r.move || {}; const ov = (mv.overlaps || []).length ?? mv.overlaps, sp = (mv.spins || []).length ?? mv.spins;
console.log(`movement: ${mv.steps || 0} steps, ${ov || 0} overlaps, ${sp || 0} spins`); for (const l of [...(mv.overlaps || []), ...(mv.spins || [])].slice(0, 8)) console.log('  ', typeof l === 'string' ? l : JSON.stringify(l));
// MOVE_WARN=1: overlaps and spins warn instead of failing (while the feel agent fixes the scripted walks)
if ((ov || sp) && process.env.MOVE_WARN) console.log('WARN movement (MOVE_WARN)'); else if (ov || sp) r.errors.push(`movement: ${ov || 0} overlaps, ${sp || 0} spins`);
const pass = r.ended && !errs.length && !r.errors.length;
console.log(pass ? 'PASS' : 'FAIL', `${W}x${H}`, `${((Date.now() - t0) / 1000).toFixed(0)} s`, 'route:', r.route, 'places:', r.places.join(' > '), 'at:', r.place, '| goal:', r.goal);
console.log('practice prompts passed via Say:', r.practice || 0);
if (r.bondRoute || r.bonds) console.log('bonds:', r.bondRoute || '', JSON.stringify(r.bonds || {}).slice(0, 400));
console.log('voices:', JSON.stringify(r.voices), r.voices && r.voices.overlaps ? 'OVERLAP' : 'one at a time');
for (const h of (r.heard || []).filter((h) => /sumimasen|すみません/.test(h.text))) console.log('heard:', h.key, h.text, '| known', h.known.join(','), '| tokens', h.tokens.join(' '), h.garbledKnown.length ? 'GARBLED ' + h.garbledKnown : 'clear');
console.log('last steps:', r.log.slice(-8).join(' | '));
if (errs.length || r.errors.length) console.log('errors:', [...errs, ...r.errors].slice(0, 6).join(' | '));
await b.close();
unGpu(); unlock();
process.exitCode = pass ? 0 : 1;
