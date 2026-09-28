// Voice-input bench: plays our own clips into the on-device recogniser in Chromium and scores the matcher.
//   node game3d/tools/speech/bench.mjs [model=base] [device=wasm|webgpu|auto] [cpu=1] [label]
// cpu=4 slows the page's CPU four times over (Chrome DevTools throttling) as a rough mid-range phone.
// Clips come from clips.sh. Writes results/<label>.raw.json (transcripts) and results/<label>.json (scores).
import { chromium } from '/home/jorgen/ai/opening/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { readdirSync, writeFileSync, mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchWord, scoreHit, SCORE_RULE } from '../../js/speech-match.js';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '../../..');
const [model = 'base', device = 'wasm', cpu = '1', label = `${model}-${device}-cpu${cpu}`] = process.argv.slice(2);
const WORDS = ['matte', 'akete', 'kite', 'ugoite', 'irete', 'dashite', 'tomatte', 'ohayo', 'yoroshiku', 'sumimasen'];
const RO = { ohayo: 'ohayō gozaimasu', yoroshiku: 'yoroshiku onegaishimasu', tsugiwa: 'tsugi wa' };
mkdirSync(join(here, 'results'), { recursive: true });
const rawPath = join(here, 'results', label + '.raw.json');

// only one headless browser at a time across all agents (GUIDE, Process): /tmp/claude-1000/browser.lock
const LOCK = '/tmp/claude-1000/browser.lock', ME = 'voice-input';
async function takeBrowserLock() {
  for (;;) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'owner'), `${ME} ${new Date().toISOString()}\n`); return; }
    catch { console.error('browser lock held by', (() => { try { return readFileSync(join(LOCK, 'owner'), 'utf8').trim(); } catch { return '?'; } })(), '- waiting'); await new Promise((r) => setTimeout(r, 15000)); }
  }
}
function dropBrowserLock() { try { if (readFileSync(join(LOCK, 'owner'), 'utf8').startsWith(ME)) rmSync(LOCK, { recursive: true }); } catch { /* not ours */ } }
process.on('SIGINT', () => { dropBrowserLock(); process.exit(1); });

let raw;
if (process.env.RESCORE && existsSync(rawPath)) raw = JSON.parse(readFileSync(rawPath, 'utf8'));
else {
  const port = +(process.env.PORT || 18779);
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/`); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
  const args = device === 'webgpu' ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=native', '--use-angle=vulkan', '--ignore-gpu-blocklist'] : [];
  await takeBrowserLock();
  const browser = await chromium.launch({ headless: true, args, ...(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.error('page:', m.text()); });
    if (+cpu > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu }); }
    await page.goto(`http://127.0.0.1:${port}/game3d/tools/speech/bench.html`);
    await page.waitForFunction(() => window.benchReady);
    const clips = readdirSync(join(here, 'clips')).filter((f) => f.endsWith('.wav') && (!process.env.ONLY || f.includes('.' + process.env.ONLY + '.'))).sort().map((f) => `clips/${f}`);
    raw = await page.evaluate((o) => window.runBench(o), { model, device, clips, score: !!process.env.SCORE });
    raw.model = model; raw.cpu = +cpu;
    writeFileSync(rawPath, JSON.stringify(raw, null, 1));
  } finally { await browser.close(); srv.kill(); dropBrowserLock(); }
}

// ---------- scoring ----------
// two policies: the transcript matcher alone, and the matcher plus the forced-decoding score (when the run has scores)
const hasScores = raw.out.some((r) => r.scores);
const RULE = { ...SCORE_RULE, ...(process.env.RULE ? JSON.parse(process.env.RULE) : {}) };
function evaluate(useScore) {
  const judgeHit = (r, w) => r.speech && (matchWord(r.text, w, RO[w]).hit || (useScore && scoreHit(r, w, RULE)));
  const pos = {}, variants = {}; let negTried = 0, negHit = 0; const falseHits = [];
  for (const r of raw.out) {
    const name = r.clip.split('/').pop().replace('.wav', ''), [src, variant] = name.split('.');
    const [who, ...rest] = src.split('-'), id = rest.join('-');
    // neg-mori-design really does say おはようございます; it's not a negative for that word
    const trueSays = who === 'neg' && /mori/.test(id) ? ['ohayo'] : [];
    if (who === 'neg') {
      for (const w of WORDS) { if (trueSays.includes(w)) continue; negTried++; if (judgeHit(r, w)) { negHit++; falseHits.push(`${name} as ${w}: ${r.text}`); } }
      continue;
    }
    const hit = judgeHit(r, id);
    (pos[id] ||= { word: 0, eric: 0, wordN: 0, ericN: 0, misses: [] });
    pos[id][who + 'N']++; if (hit) pos[id][who]++; else pos[id].misses.push(`${who}.${variant}: ${r.text || '(no speech)'}`);
    (variants[variant] ||= [0, 0]); variants[variant][1]++; if (hit) variants[variant][0]++;
    // the same clip judged as every other word: a hit there is a false accept
    for (const w of WORDS) if (w !== id) { negTried++; if (judgeHit(r, w)) { negHit++; falseHits.push(`${name} as ${w}: ${r.text}`); } }
  }
  let h = 0, n = 0; for (const p of Object.values(pos)) { h += p.word + p.eric; n += p.wordN + p.ericN; }
  return {
    perWord: Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { native: `${p.word}/${p.wordN}`, eric: `${p.eric}/${p.ericN}`, misses: p.misses }])),
    perVariant: Object.fromEntries(Object.entries(variants).map(([v, [a, b]]) => [v, `${a}/${b}`])),
    total: `${h}/${n} (${Math.round((100 * h) / n)}%)`, falseAccepts: `${negHit}/${negTried}`, falseHits,
  };
}
const ms = raw.out.filter((r) => r.ms).map((r) => r.ms).sort((a, b) => a - b);
const med = (k) => { const v = raw.out.filter((r) => r[k]).map((r) => r[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const summary = {
  label, model: raw.model, device: raw.load.device, cpu: raw.cpu, loadMs: raw.load.ms,
  recogniseMs: { median: ms[Math.floor(ms.length / 2)], p90: ms[Math.floor(ms.length * 0.9)], max: ms.at(-1), textMedian: med('textMs'), scoreMedian: med('scoreMs') },
  textOnly: evaluate(false), ...(hasScores ? { withScore: evaluate(true), rule: RULE } : {}),
};
writeFileSync(join(here, 'results', label + '.json'), JSON.stringify(summary, null, 1));
console.log(`${label}: load ${summary.loadMs} ms on ${summary.device}, recognise median ${summary.recogniseMs.median} ms (p90 ${summary.recogniseMs.p90}; transcript ${summary.recogniseMs.textMedian ?? '-'} ms, scores ${summary.recogniseMs.scoreMedian ?? '-'} ms)`);
for (const k of ['textOnly', 'withScore']) {
  const e = summary[k]; if (!e) continue;
  console.log(`[${k}] hits ${e.total}, false accepts ${e.falseAccepts}`);
  for (const [id, p] of Object.entries(e.perWord)) console.log(`  ${id.padEnd(10)} native ${p.native}  eric ${p.eric}   ${p.misses.slice(0, 4).join(' | ')}`);
  console.log('  by variant:', JSON.stringify(e.perVariant));
  if (e.falseHits.length) console.log('  false hits:', e.falseHits.slice(0, 8).join(' | '));
}
