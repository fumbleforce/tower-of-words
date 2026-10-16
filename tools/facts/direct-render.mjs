// Still pictures go through the image service, not tools/comfy.py directly (#603, C-0692): the Image Gen page, the
// Scene Editor or node tools/subplots/compose.mjs <round>/recipes/<shot>.json. A script that calls comfy.run, or a still
// builder (comfy.anima, comfy.sdxl, comfy.sdxl_refine, comfy.lumina), for a picture is legacy. Part of npm run check;
// runs on its own too.
//
//   node tools/facts/direct-render.mjs              check
//   node tools/facts/direct-render.mjs --list       every script with a still call: counted, or exempt and its kind
//   node tools/facts/direct-render.mjs --baseline   rewrite the counts of the old callers from today's tree (read the diff)
//
// Counted: every tracked .py, .mjs and .js file (not island/private, not node_modules), on its code lines (a "#" or "//"
// comment and a Python docstring don't count). A call is comfy.<fn>( through the module's name, "comfy", or an alias from
// "import comfy as x", and <fn>( for a name taken "from comfy import <fn>".
// Not counted, and how they are recognised:
//   video: comfy.run_video, comfy.wan22_i2v, comfy.causal_forcing_i2v (tools/video2.py, tools/video_test.py). They make no
//          still call, so the count is zero. A video script that starts calling comfy.run or a still builder is counted.
//   audio and SFX: they submit their own graphs with comfy._post (music, YuE, SA3, karaoke). No still call either.
//   EXEMPT_PATHS: tools/comfy.py, the image service tools/imagegen/, and this check's own files.
// Blockout control and rembg scripts do make still calls, so the baseline's "exempt" map lists them by hand with their
// kind and count, as does the test of tools/comfy.py (tools/test_comfy_log.py). An exempt count can't grow either.
// A file that isn't in the baseline, or a listed one with more calls, fails. A listed file that is gone or makes fewer
// calls now is a note to prune it or lower its count.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = 'tools/facts/direct-render-baseline.json';
const STILL = ['run', 'anima', 'sdxl', 'sdxl_refine', 'lumina'];   // comfy.run saves a still; the others build still workflows
const EXEMPT_PATHS = ['tools/comfy.py', 'tools/imagegen/', 'tools/facts/direct-render.mjs', 'tools/facts/direct-render.test.mjs'];
const INSTEAD = 'render through node tools/subplots/compose.mjs <round>/recipes/<shot>.json instead';
const ABOUT = 'Scripts that still call tools/comfy.py for pictures, with their call counts, as the record of what ran; nothing new goes here (tools/facts/direct-render.mjs).';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exemptPath = (f) => EXEMPT_PATHS.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p));

// The still-picture calls on the code lines of one file.
export function stillCalls(text, file = '') {
  const aliases = ['comfy', ...[...text.matchAll(/\bimport\s+comfy\s+as\s+(\w+)/g)].map((m) => m[1])];
  const bare = new Map();   // a name used in this file -> the comfy function it is
  for (const m of text.matchAll(/\bfrom\s+comfy\s+import\s+([^\n;]+)/g)) {
    for (const part of m[1].replace(/[()]/g, '').split(',')) {
      const [fn, as] = part.trim().split(/\s+as\s+/);
      if (STILL.includes(fn)) bare.set(as || fn, fn);
    }
  }
  const dotted = new RegExp(`\\b(?:${aliases.map(esc).join('|')})\\.(?:${STILL.join('|')})\\s*\\(`, 'g');
  const plain = bare.size ? new RegExp(`(?<![\\w.])(?:${[...bare.keys()].map(esc).join('|')})\\s*\\(`, 'g') : null;
  const py = file.endsWith('.py');
  let n = 0, inDoc = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (py) {   // a triple-quoted block (a docstring) is prose: skip its lines and the lines that open or close it
      const quotes = (t.match(/"""|'''/g) || []).length;
      const wasDoc = inDoc;
      if (quotes % 2) inDoc = !inDoc;
      if (wasDoc || quotes) continue;
    }
    if (/^(#|\/\/|\*)/.test(t)) continue;
    n += [...t.matchAll(dotted)].length + (plain ? [...t.matchAll(plain)].length : 0);
  }
  return n;
}

// Every tracked script (git ls-files); outside a checkout (a commit check's snapshot), every file under the root.
export function scripts() {
  const git = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  const all = git.status === 0 ? git.stdout.split('\0') : walk('');
  return all.filter((f) => /\.(py|mjs|js)$/.test(f) && !f.startsWith('island/private/') && !f.includes('node_modules/')
    && fs.existsSync(path.join(ROOT, f)));
}
function walk(rel) {
  return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => {
    const r = path.posix.join(rel, e.name);
    if (['node_modules', '.git', '.claude'].includes(e.name) || r === 'island/private') return [];
    return e.isDirectory() ? walk(r) : [r];
  });
}

// file -> its still-picture calls, for every script that makes one (the service and the module itself left out).
export function countAll(files = scripts()) {
  const counts = {};
  for (const f of files) {
    if (exemptPath(f)) continue;
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (!text.includes('comfy')) continue;
    const n = stillCalls(text, f);
    if (n) counts[f] = n;
  }
  return counts;
}

// The rule: a file not in the baseline, or a listed one with more calls, is bad; fewer calls, or a listed file that
// makes none (or is gone), is a note.
export function checkRender(counts, base, bad, note) {
  const files = base.files || {}, exempt = base.exempt || {};
  const times = (n) => `${n} still-picture call${n === 1 ? '' : 's'}`;
  for (const [f, n] of Object.entries(counts)) {
    const ex = exempt[f];
    const rec = ex ? ex.calls : files[f];
    if (rec === undefined) bad(f, `${times(n)} through tools/comfy.py, not in ${BASELINE}: ${INSTEAD}.`);
    else if (n > rec) bad(f, `${times(n)}, ${rec} recorded${ex ? ` as ${ex.kind}` : ''} in ${BASELINE}: ${INSTEAD}.`);
    else if (n < rec) note(`${f} makes ${times(n)} now, ${rec} recorded: lower its count in ${BASELINE}`);
  }
  for (const f of [...Object.keys(files), ...Object.keys(exempt)]) {
    if (!(f in counts)) note(`${f} is in ${BASELINE} but makes no still-picture call now, or is gone: prune it`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const counts = countAll();
  const basePath = path.join(ROOT, BASELINE);
  const base = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : {};
  if (args.includes('--list')) {
    for (const [f, n] of Object.entries(counts).sort()) console.log(`${base.exempt?.[f] ? `exempt (${base.exempt[f].kind})` : 'counted'}\t${n}\t${f}`);
    process.exit(0);
  }
  if (args.includes('--baseline')) {   // keeps the hand-written exempt map; the files map is today's counts
    const exempt = base.exempt || {};
    const files = Object.fromEntries(Object.entries(counts).filter(([f]) => !(f in exempt)).sort());
    fs.writeFileSync(basePath, JSON.stringify({ about: ABOUT, files, exempt }, null, 1) + '\n');
    console.log(`${Object.keys(files).length} files, ${Object.values(files).reduce((a, b) => a + b, 0)} calls`);
    process.exit(0);
  }
  let problems = 0;
  const bad = (where, msg) => { problems++; console.log(`  ${where}: ${msg}`); };
  const note = (msg) => console.log(`  note: ${msg}`);
  checkRender(counts, base, bad, note);
  if (problems) { console.log(`direct render: FAILED, ${problems}`); process.exit(1); }
  console.log('direct render: ok');
}
