// art/cast-looks.json against docs/game/cast.md, and no tool with its own copy of a cast look (Jørgen, 2026-10-09:
// "we should not have drift between the various tools"). Part of node tools/facts/check.mjs; runs on its own too.
//
//   node tools/facts/cast-looks.mjs              check
//   node tools/facts/cast-looks.mjs --stamp mio  after re-checking Mio's entry against her changed cast.md Look line
//   node tools/facts/cast-looks.mjs --baseline   rewrite the list of old round scripts that keep their own looks
//
// For each entry with cast_md: the age equals the "Age N" in that person's cast.md section; every colour word in the
// entry's hair, eyes and skin appears in their Look line; the portrait file exists; and the Look line is the one the
// entry was last checked against ("checked", a hash: when cast.md's line changes, the entry has to be looked at again).
// Tools: a quoted line in tools/ that names a cast member next to an age ("25-year-old") or "hair" is a copy of a look.
// Old round scripts, kept as the record of what ran, are listed with their counts in cast-looks-baseline.json; any other
// file, or a listed one with more, fails. Read looks through tools/cast_looks.py instead.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOOKS = 'art/cast-looks.json';
const CAST_MD = 'docs/game/cast.md';
const BASELINE = 'tools/facts/cast-looks-baseline.json';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const COLOURS = ['black', 'white', 'grey', 'gray', 'silver', 'blond', 'blonde', 'golden', 'brown', 'auburn', 'red', 'reddish', 'pink',
  'magenta', 'green', 'teal', 'blue', 'navy', 'tan', 'tanned', 'pale', 'fair', 'purple', 'violet', 'orange', 'yellow', 'honey',
  'chestnut', 'copper', 'mocha'];
const AGE_OR_HAIR = /\b\d{2}-year-old\b|\b\d{2} years old\b|\bhair\b/;
const OWN = new Set(['tools/cast_looks.py', 'tools/facts/cast-looks.mjs']);

export const hash = (s) => crypto.createHash('sha1').update(s.trim()).digest('hex').slice(0, 8);
const words = (s) => (s || '').toLowerCase().split(/[^a-z]+/).filter(Boolean);

// The "### Name (`id`)" section of cast.md, its "- <label>:" line and its "Age N".
function castSection(md, cid) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => /^###\s/.test(l) && l.includes(`(\`${cid}\`)`));
  if (i < 0) return null;
  let j = i + 1;
  while (j < lines.length && !/^#{1,3}\s/.test(lines[j])) j++;
  return lines.slice(i + 1, j);
}
export function castMdFacts(md, entry) {
  const sec = castSection(md, entry.cast_md);
  if (!sec) return { error: `no "### ... (\`${entry.cast_md}\`)" section` };
  const label = entry.look_line || 'Look';
  const look = sec.find((l) => l.startsWith(`- ${label}:`) || l.startsWith(`- ${label} and movement:`));
  const age = sec.map((l) => /\bAge (\d+)\b/.exec(l)).find(Boolean);
  return { look: look || null, label, age: age ? Number(age[1]) : null };
}

export function checkLooks(bad) {
  const data = JSON.parse(read(LOOKS));
  const md = read(CAST_MD);
  const seen = new Set();
  for (const e of data.cast) {
    const where = `${LOOKS} \`${e.id}\``;
    if (seen.has(e.id)) bad(LOOKS, `\`${e.id}\` is in the file twice`);
    seen.add(e.id);
    for (const k of ['name', 'gender', 'age', 'hair', 'build', 'short', 'portrait']) if (e[k] == null || e[k] === '') bad(where, `has no ${k}`);
    if (e.portrait && !fs.existsSync(path.join(ROOT, e.portrait))) bad(where, `portrait ${e.portrait} doesn't exist`);
    if (!e.age_words && !String(e.short).includes(String(e.age))) bad(where, `the short form "${e.short}" doesn't say the age ${e.age}`);
    if (e.age_words && !e.age_words.includes(String(e.age))) bad(where, `age_words don't say the age ${e.age}`);
    if (!e.cast_md) continue;
    const f = castMdFacts(md, e);
    if (f.error) { bad(CAST_MD, `${f.error} for ${where}`); continue; }
    if (!f.look) { bad(CAST_MD, `\`${e.cast_md}\` has no "- ${f.label}:" line for ${where}`); continue; }
    if (f.age !== e.age) bad(where, `age ${e.age}, cast.md says ${f.age == null ? 'no age' : `Age ${f.age}`}`);
    const what = f.label === 'Look' ? `${e.name}'s Look line` : `the "${f.label}" line`;
    const said = new Set(words(f.look));
    for (const k of ['hair', 'eyes', 'skin']) for (const w of words(e[k])) {
      if (COLOURS.includes(w) && !said.has(w)) bad(where, `${k} says "${w}", which ${what} in cast.md doesn't (fix the entry, or the cast.md line if the approved portrait shows it)`);
    }
    if (e.checked !== hash(f.look)) bad(where, `${what} in cast.md changed since this entry was checked against it: update the entry from it and the approved portrait, then run node tools/facts/cast-looks.mjs --stamp ${e.id}`);
  }
}

// Every quoted line in tools/ that names a cast member next to an age or "hair", per file.
function names() {
  const data = JSON.parse(read(LOOKS));
  const out = new Set();
  for (const e of data.cast) {
    out.add(e.name); out.add(e.name.replace(/^(Mr|Ms|Mrs|Dr)\. /, ''));
    for (const a of e.aliases || []) out.add(a);
  }
  return [...out];
}
// Committed files in tools/, plus the image gen dashboard's code (tools/imagegen/, kept out of git) where it is on disk.
function toolFiles() {
  const git = spawnSync('git', ['ls-files', '-z', 'tools'], { cwd: ROOT, encoding: 'utf8' });
  const tracked = git.status === 0 ? git.stdout.split('\0')   // outside a checkout (a commit check's snapshot): every file
    : fs.readdirSync(path.join(ROOT, 'tools'), { recursive: true }).map((f) => `tools/${f}`).filter((f) => !/node_modules|__pycache__/.test(f));
  const imagegen = fs.existsSync(path.join(ROOT, 'tools/imagegen'))
    ? fs.readdirSync(path.join(ROOT, 'tools/imagegen')).map((f) => `tools/imagegen/${f}`) : [];
  return [...new Set([...tracked, ...imagegen])].filter((f) => /\.(py|mjs|js|sh)$/.test(f) && !/\/testdata\//.test(f) && !OWN.has(f)
    && fs.existsSync(path.join(ROOT, f)));
}
export function copiesIn(text, who = names()) {
  const re = new RegExp(`\\b(${who.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  let n = 0;
  for (const l of text.split('\n')) {
    const t = l.trim();
    if (!/['"`]/.test(t) || /^(#|\/\/|\*)/.test(t)) continue;
    for (const m of t.matchAll(re)) {
      const around = t.slice(Math.max(0, m.index - 30), m.index + m[0].length + 80);
      if (AGE_OR_HAIR.test(around)) { n++; break; }
    }
  }
  return n;
}
export function toolCopies() {
  const who = names(), out = {};
  for (const f of toolFiles()) {
    const n = copiesIn(read(f), who);
    if (n) out[f] = n;
  }
  return out;
}
export function checkTools(bad) {
  const base = fs.existsSync(path.join(ROOT, BASELINE)) ? JSON.parse(read(BASELINE)).files : {};
  for (const [f, n] of Object.entries(toolCopies())) {
    if (!(f in base)) bad(f, `${n} line(s) with its own copy of a cast look (a name next to an age or hair): read it from art/cast-looks.json through tools/cast_looks.py`);
    else if (n > base[f]) bad(f, `${n} lines with its own cast looks, ${base[f]} before (${BASELINE}): read new ones through tools/cast_looks.py`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--stamp') {
    let text = read(LOOKS);
    const data = JSON.parse(text), md = read(CAST_MD);
    for (const cid of args.slice(1)) {
      const e = data.cast.find((x) => x.id === cid);
      if (!e || !e.cast_md) { console.error(`${cid}: no entry with cast_md`); process.exit(1); }
      const f = castMdFacts(md, e);
      if (!f.look) { console.error(`${cid}: no Look line in cast.md`); process.exit(1); }
      const head = `"id": "${cid}", `;
      text = text.replace(new RegExp(`${head}("checked": "[0-9a-f]*", )?`), `${head}"checked": "${hash(f.look)}", `);
      console.log(`${cid}: checked ${hash(f.look)}`);
    }
    fs.writeFileSync(path.join(ROOT, LOOKS), text);
    process.exit(0);
  }
  if (args[0] === '--baseline') {
    const files = Object.fromEntries(Object.entries(toolCopies()).sort());
    fs.writeFileSync(path.join(ROOT, BASELINE), JSON.stringify({ about: 'Old round scripts that keep their own cast looks, as the record of what ran; nothing new goes here (tools/facts/cast-looks.mjs).', files }, null, 1) + '\n');
    console.log(`${Object.keys(files).length} files`);
    process.exit(0);
  }
  let problems = 0;
  const bad = (where, msg) => { problems++; console.log(`  ${where}: ${msg}`); };
  checkLooks(bad); checkTools(bad);
  if (problems) { console.log(`cast looks: FAILED, ${problems}`); process.exit(1); }
  console.log('cast looks: ok');
}
