// Mic-level test: does a normal speaking voice get through? Plays level/speech-40..-10.wav (and a louder room with
// nobody talking) into Chromium's fake microphone, one browser per file, and runs each slot through the game's own
// capture path and judge(). Clips come from level-clips.py. About 4 minutes (ONLY=regex picks files).
//   [IMPL=before] node game3d/tools/speech/level.mjs [label]
// IMPL=before loads js/speech-before.js instead (copy an older speech.js there for a before/after; not kept in git).   -> results/level-<label>.json
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '../../..');
const label = process.argv[2] || 'now';
const plan = JSON.parse(readFileSync(join(here, 'level/plan.json'), 'utf8'));
const LOCK = '/tmp/claude-1000/browser.lock', ME = 'voice-level';
async function takeLock() {
  for (;;) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'owner'), `${ME} ${new Date().toISOString()}\n`); return; }
    catch { 0 && console.error('browser lock held by', (() => { try { return readFileSync(join(LOCK, 'owner'), 'utf8').trim(); } catch { return '?'; } })(), '- waiting'); await new Promise((r) => setTimeout(r, 500)); }
  }
}
const dropLock = () => { try { if (readFileSync(join(LOCK, 'owner'), 'utf8').startsWith(ME)) rmSync(LOCK, { recursive: true }); } catch { /* not ours */ } };
process.on('SIGINT', () => { dropLock(); process.exit(1); });

const port = +(process.env.PORT || 18781);
const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
let files = [...plan.levels.map((l) => [`speech${l}`, plan.slots]), ...plan.fresh.map((l) => [`fresh${l}`, 'kite']), ...[-60, -50].map((l) => [`warm${l}`, 'kite']), ['noise', [null, null, null]]];
if (process.env.ONLY) files = files.filter(([n]) => new RegExp(process.env.ONLY).test(n));
const results = {};
await takeLock();
try {
  for (const [name, slots] of files) {
    const ctx = await chromium.launchPersistentContext('/tmp/claude-1000/voice-level-profile', { headless: true, args: [
      '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${join(here, 'level', name + '.wav')}%noloop`, '--autoplay-policy=no-user-gesture-required'] });
    await ctx.grantPermissions(['microphone']);
    const page = ctx.pages()[0] || await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.error('page:', m.text()); });
    await page.goto(`http://127.0.0.1:${port}/game3d/tools/speech/level.html${process.env.IMPL ? '?impl=' + process.env.IMPL : ''}`);
    await page.waitForFunction(() => window.levelReady);
    results[name] = typeof slots === 'string' ? await page.evaluate((o) => window.runFresh(o), { id: slots, wait: name.startsWith('warm') ? 1.75 : 0 })
      : await page.evaluate((o) => window.runLevel(o), { slots, slot: plan.slot, lead: plan.lead });
    await ctx.close();
    const r = results[name], words = r.filter((x) => !/nobody/.test(x.slot));
    console.log(`${name}: ${words.filter((x) => x.hit).length}/${words.length} words, empty slots passed as words: ${r.filter((x) => x.slot === '(nobody)' && x.hit).length}`);
    for (const x of r) console.log(`  ${x.slot.padEnd(15)}${x.peakAt != null ? ' @' + x.peakAt + 's' : ''} rms ${String(x.rmsDb).padStart(6)} peak ${String(x.peakDb).padStart(6)} meter ${x.meterMax.toFixed(2)} tap ${String(x.tapFrames).padStart(3)} ${x.speech ? 'speech' : 'quiet '} ${x.hit ? 'HIT ' : 'miss'} ${x.text}`);
  }
} finally { srv.kill(); dropLock(); }
mkdirSync(join(here, 'results'), { recursive: true });
writeFileSync(join(here, 'results', `level-${label}.json`), JSON.stringify(results, null, 1));
