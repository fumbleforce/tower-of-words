#!/usr/bin/env node
// The live assets: what the game loads, from an explicit registry, and the tools that change it. The rules and the
// reasons are in notes/asset-lifecycle.md.
//
//   node tools/assets/live.mjs check [--local] [--quiet]   the registry against the disk and the game's references
//                                                          (public half in npm run check; --local adds the local-only one)
//   node tools/assets/live.mjs promote <src> <dest> --round <round> [--review <id>] [--replace] [--note <text>]
//   node tools/assets/live.mjs retire <live path>... [--from <file of paths>] [--by <new live path>] [--note <text>]
//   node tools/assets/live.mjs list [--local]                every live file, one per line, with its unit's flags
//
// Two registries, one format: tools/assets/live.json (public, committed) and the local-only one, which lives in the
// local-only game folder (LOCAL_REGISTRY below) and is never committed. Paths are repo-relative. A unit is a file, a
// folder (every file under it) or a list (a JSON array of keys in a file, each key one file). Nothing here walks the
// game code to decide what is live: the check reads the code only to prove it matches the registry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const PUBLIC_REGISTRY = 'tools/assets/live.json';
export const LOCAL_REGISTRY = 'island/private/game/live.json';
const NEVER = 'island/private/user'; // never listed, read or written, whatever a registry says

let mainRoot;
function mainCheckout() {
  if (mainRoot !== undefined) return mainRoot;
  const r = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' });
  mainRoot = r.status === 0 ? path.dirname(r.stdout.trim()) + '/' : ROOT;
  return mainRoot;
}
// island/private is never in a worktree: its paths always mean the main checkout's files.
const LOCAL = 'island/private/';
export const abs = (p) => path.join(p.startsWith(LOCAL) ? mainCheckout() : ROOT, p);
const exists = (p) => fs.existsSync(abs(p));
const rel = (p) => {
  const full = path.resolve(p);
  const local = path.join(mainCheckout(), LOCAL);
  if (full.startsWith(local)) return LOCAL + path.relative(local, full).split(path.sep).join('/');
  const r = path.relative(ROOT, full).split(path.sep).join('/');
  return r.startsWith('..') ? full : r; // a file outside the repo (a scratch folder) keeps its absolute path
};
export const readJson = (p) => JSON.parse(fs.readFileSync(abs(p), 'utf8'));
const guard = (p) => {
  if (p === NEVER || p.startsWith(NEVER + '/')) throw new Error(`refused: ${NEVER} is never touched`);
  return p;
};

// ---------- globs ----------
const globCache = new Map();
export function globRe(glob) {
  if (globCache.has(glob)) return globCache.get(glob);
  let re = '';
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') { depth++; re += '(?:'; }
    else if (c === '}') { depth--; re += ')'; }
    else if (c === ',' && depth) re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  const out = new RegExp('^' + re + '$');
  globCache.set(glob, out);
  return out;
}
export const matchAny = (p, globs = []) => globs.some((g) => globRe(g).test(p));

// Every file under a folder (repo-relative), following links (worktrees link their binaries to main's).
export function walk(dir, out = []) {
  guard(dir.replace(/\/$/, ''));
  if (!exists(dir)) return out;
  for (const e of fs.readdirSync(abs(dir), { withFileTypes: true })) {
    const p = (dir.endsWith('/') ? dir : dir + '/') + e.name;
    if (p === NEVER) continue;
    const st = fs.statSync(abs(p), { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) walk(p + '/', out);
    else out.push(p);
  }
  return out;
}

// ---------- registries ----------
export function loadRegistry(which = 'public') {
  const file = which === 'public' ? PUBLIC_REGISTRY : LOCAL_REGISTRY;
  if (!exists(file)) return null;
  const reg = readJson(file);
  reg._file = file;
  reg.units ??= {};
  reg.log ??= [];
  return reg;
}
export function saveRegistry(reg) {
  const { _file, ...data } = reg;
  data.units = Object.fromEntries(Object.entries(data.units).sort(([a], [b]) => a.localeCompare(b)));
  const tmp = abs(_file) + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  fs.renameSync(tmp, abs(_file));
}

// A unit's files: [{file, unit}] plus the problems found while expanding it.
export function unitFiles(reg, key) {
  const u = reg.units[key];
  guard(key.replace(/\/$/, ''));
  if (u.list) {
    if (!exists(u.list)) return { files: [], problems: [`${key}: its list ${u.list} is missing`] };
    const keys = readJson(u.list);
    const files = keys.map((k) => u.each.replace('{}', k));
    return { files, problems: files.filter((f) => !exists(f)).map((f) => `${f}: listed in ${u.list}, missing on disk`) };
  }
  if (key.endsWith('/')) {
    const files = walk(key).filter((f) => !matchAny(f, reg.source));
    return { files, problems: files.length ? [] : [`${key}: registered folder is missing or empty`] };
  }
  return { files: [key], problems: exists(key) ? [] : [`${key}: registered, missing on disk`] };
}

// Map of live file -> unit key, with every expansion problem.
export function expand(reg) {
  const byFile = new Map();
  const problems = [];
  for (const key of Object.keys(reg.units)) {
    const r = unitFiles(reg, key);
    problems.push(...r.problems);
    for (const f of r.files) {
      if (byFile.has(f) && byFile.get(f) !== key) problems.push(`${f}: in two units (${byFile.get(f)}, ${key})`);
      byFile.set(f, key);
    }
  }
  return { byFile, problems };
}

const listKey = (u, file) => {
  const [pre, post] = u.each.split('{}');
  return file.startsWith(pre) && file.endsWith(post) ? file.slice(pre.length, file.length - post.length) : null;
};
export function unitOf(reg, file) {
  const keys = Object.entries(reg.units).filter(([k, u]) => {
    if (u.list) {
      const key = listKey(u, file);
      return key != null && !key.includes('/') && exists(u.list) && readJson(u.list).includes(key);
    }
    return k === file || (k.endsWith('/') && file.startsWith(k));
  });
  return keys.map(([k]) => k).sort((a, b) => b.length - a.length)[0] ?? null;
}

// ---------- the game's references ----------
// Every string or template literal in the code that names a file under a live root, resolved against the file it is
// in. A template's ${...} becomes a wildcard. Returns [{ref, from}], ref a glob ('/' at the end: a folder).
export function codeRefs(codeFiles, roots, { base = 'game3d/' } = {}) {
  const out = new Map();
  const lit = /(['"`])((?:(?!\1)[^\n\\]|\\.)*?)\1/g;
  for (const f of codeFiles) {
    const src = fs.readFileSync(abs(f), 'utf8');
    for (const m of src.matchAll(lit)) {
      let s = m[2];
      if (!/(assets|audio|fonts)\//.test(s) || /^(https?:|data:)/.test(s)) continue;
      s = s.replace(/\$\{[^}]*\}/g, '*').replace(/\*+/g, '*').replace(/[?#].*$/, '');
      if (!/^\.{0,2}\//.test(s) && !/^(assets|audio|fonts)\//.test(s)) continue;
      const r = path.posix.normalize(path.posix.join(s.startsWith('.') ? path.posix.dirname(f) : base.replace(/\/$/, ''), s));
      if (!roots.some((root) => (r + '/').startsWith(root) || root.startsWith(r.replace(/\*.*$/, '')))) continue;
      if (/\.(js|mjs|css|html)$/.test(r)) continue;
      const ref = r.endsWith('/*') ? r + '*' : r; // a template that ends in a folder name (assets/${dir}): anything under it
      if (!out.has(ref)) out.set(ref, f);
    }
  }
  return [...out].map(([ref, from]) => ({ ref, from }));
}
const refRe = (ref) => (ref.endsWith('/') ? globRe(ref + '**') : globRe(ref));

// ---------- the public half ----------
export function publicCode(reg) {
  const files = [];
  for (const g of reg.code.include) {
    const fixed = g.replace(/[*?{].*$/, '');
    const dir = fixed.endsWith('/') ? fixed : path.posix.dirname(fixed) + '/';
    for (const f of exists(fixed) && !fixed.endsWith('/') ? [fixed] : walk(dir)) if (globRe(g).test(f)) files.push(f);
  }
  return [...new Set(files)].filter((f) => !matchAny(f, reg.code.exclude)).sort();
}

async function dataRefs() {
  // Faces the dialogue asks for, from the game's own data (js/ui/portrait-data.js and data/mc/*.json), so the
  // portrait wildcards in the code (listed under `coarse`) don't hide a face nobody shows.
  const refs = [];
  // the game's modules have no package type; Node says so on every import, which is noise in npm run check
  const warn = process.emitWarning;
  process.emitWarning = (w, ...rest) => (String(w).includes('Reparsing as ES module') ? undefined : warn.call(process, w, ...rest));
  const { PORTRAITS, TEXT_PORTRAITS } = await import(pathToFileURL(abs('game3d/js/ui/portrait-data.js')));
  const faces = { ...PORTRAITS };
  process.emitWarning = warn;
  for (const f of fs.readdirSync(abs('game3d/data/mc'))) {
    const mc = readJson('game3d/data/mc/' + f);
    faces[mc.portrait.set] = mc.portrait.faces;
  }
  for (const [who, list] of Object.entries(faces)) for (const face of list) refs.push({ ref: `game3d/assets/portraits/${who}-${face}.webp`, from: 'game3d/js/ui/portrait-data.js' });
  for (const [, [who, face]] of Object.entries(TEXT_PORTRAITS ?? {})) refs.push({ ref: `game3d/assets/portraits/${who}-${face}.webp`, from: 'game3d/js/ui/portrait-data.js' });
  return refs;
}

// The keys a refs file plays: an array of keys, or every `key` or `id` string in its entries, at any depth.
function playedKeys(data) {
  if (Array.isArray(data) && data.every((e) => typeof e === 'string')) return data;
  const out = [];
  const walkJson = (o) => {
    if (Array.isArray(o)) o.forEach(walkJson);
    else if (o && typeof o === 'object') {
      for (const k of ['key', 'id']) if (typeof o[k] === 'string') out.push(o[k]);
      Object.values(o).forEach(walkJson);
    }
  };
  walkJson(data);
  return out;
}

// The checks both halves share. refs: [{ref, from}] (coarse refs only prove existence); returns {errors, warnings}.
export function compare(reg, refs, { label }) {
  const errors = [], warnings = [];
  const { byFile, problems } = expand(reg);
  errors.push(...problems);
  // 1. every file in a live root is registered (or is a source file kept beside what it makes)
  for (const root of reg.roots) for (const f of walk(root)) if (!byFile.has(f) && !matchAny(f, reg.source)) errors.push(`${f}: in a live folder but not in ${reg._file} (promote it, or move it to the generated area)`);
  // 2. every reference names something registered; 3. every unit is referenced
  const referenced = new Set();
  const coarse = Object.keys(reg.coarse ?? {});
  const files = [...byFile.keys()];
  for (const { ref, from } of refs) {
    const re = refRe(ref);
    const hits = files.filter((f) => re.test(f));
    if (!hits.length && !matchAny(ref, reg.planned ?? [])) errors.push(`${ref}: ${from} asks for it, nothing registered matches`);
    if (coarse.includes(ref)) continue;
    for (const f of hits) referenced.add(byFile.get(f));
  }
  for (const [key, u] of Object.entries(reg.units)) {
    if (referenced.has(key)) continue;
    if (u.loaded_by) {
      const [file, token] = u.loaded_by.split('#');
      if (!exists(file)) errors.push(`${key}: loaded_by ${file}, which is missing`);
      else if (token && !fs.readFileSync(abs(file), 'utf8').includes(token)) errors.push(`${key}: loaded_by ${file}, which no longer mentions '${token}'`);
      continue;
    }
    errors.push(`${key}: registered, but nothing in the game references it (retire it: node tools/assets/live.mjs retire ${key})`);
  }
  // a list unit with `refs` (the voice clips and audio/manifest.json, which the story generates): every key is played
  for (const u of Object.values(reg.units)) {
    const refFiles = [u.refs ?? []].flat();
    if (!u.list || !refFiles.length || !exists(u.list) || !refFiles.every(exists)) continue;
    const played = new Set();
    for (const id of refFiles.flatMap((f) => playedKeys(readJson(f)))) for (const v of u.variants ?? ['']) played.add(id + v);
    const stale = readJson(u.list).filter((k) => !played.has(k));
    for (const k of stale) errors.push(`${u.each.replace('{}', k)}: in ${u.list} but ${u.refs} has no line that plays it (retire it)`);
  }
  for (const c of coarse) if (!refs.some((r) => r.ref === c)) warnings.push(`${reg._file}: coarse reference ${c} no longer appears in the code`);
  return { errors, warnings, label };
}

export async function checkPublic() {
  const reg = loadRegistry('public');
  const code = publicCode(reg);
  const scanned = code.filter((f) => !matchAny(f, reg.code.not_scanned ?? []));
  const refs = [...codeRefs(scanned, reg.roots), ...(await dataRefs())];
  const result = compare(reg, refs, { label: 'public' });
  // live roots are uploaded: each must be a root in sync.json
  const sync = readJson('tools/assets/sync.json');
  for (const r of reg.roots) if (!sync.roots.includes(r)) result.errors.push(`${r}: a live root that is not a root in tools/assets/sync.json`);
  for (const u of Object.values(reg.units)) if (u.flavor && u.flavor !== 'adult') result.errors.push(`unknown flavor ${u.flavor}`);
  return result;
}

// ---------- the local-only half ----------
// The local registry names its own entry points (`entries`: the plugin files the game loads by name) and, for the
// references, the plugin code to read (`code`) with the base folder its relative picture paths are under (`bases`).
export function localCode(reg) {
  return publicCodeLike(reg.code ?? []);
}
function publicCodeLike(globs) {
  return globs.flatMap((g) => walk(path.posix.dirname(g.replace(/[*?{].*$/, 'x')) + '/').filter((f) => globRe(g).test(f)));
}
export function localRefs(reg) {
  const refs = [];
  const lit = /(['"`])([^'"`\n]*?\.(?:webp|png|jpg|glb|json|mp3))\1/g;
  for (const f of localCode(reg)) {
    // a dev plugin's references count too: `dev` decides what ships, not what is used
    const src = fs.readFileSync(abs(f), 'utf8');
    for (const m of src.matchAll(lit)) {
      const s = m[2];
      if (/\$\{|^\.|^\//.test(s)) continue; // templates and module paths: covered by loaded_by
      const base = Object.entries(reg.bases ?? {}).find(([prefix]) => s.startsWith(prefix));
      if (base) refs.push({ ref: base[1] + s, from: f });
    }
    // the plugins it imports (statically, or through import()/new URL for one it loads when it exists)
    for (const m of src.matchAll(/(?:from|import\(|new URL\()\s*['"`](\.\/[\w.-]+\.js)['"`]/g)) refs.push({ ref: path.posix.join(path.posix.dirname(f), m[1]), from: f });
  }
  return refs;
}
export function checkLocal() {
  const reg = loadRegistry('local');
  if (!reg) return { errors: [], warnings: [`no local registry (${LOCAL_REGISTRY}); local-only check skipped`], label: 'local' };
  const refs = localRefs(reg);
  const result = compare(reg, refs, { label: 'local' });
  // every plugin a live plugin imports is registered and not dev
  for (const f of localCode(reg)) {
    if (reg.units[f]?.dev || !reg.units[f]) continue;
    const src = fs.readFileSync(abs(f), 'utf8');
    for (const m of src.matchAll(/(?:from|import\(|new URL\()\s*['"`](\.\/[\w.-]+\.js)['"`]/g)) {
      const dep = path.posix.join(path.posix.dirname(f), m[1]);
      if (!reg.units[dep]) result.errors.push(`${f} imports ${dep}, which is not registered`);
      else if (reg.units[dep].dev) result.errors.push(`${f} imports ${dep}, which is marked dev (never shipped)`);
    }
  }
  return result;
}

// ---------- promote and retire ----------
const today = () => new Date().toISOString().slice(0, 10);
function registryFor(livePath) {
  for (const which of ['public', 'local']) {
    const reg = loadRegistry(which);
    // a live root, or a folder the registry's picture bases point into (the local pictures before they had a root)
    const places = reg ? [...reg.roots, ...Object.entries(reg.bases ?? {}).map(([prefix, base]) => base + prefix)] : [];
    if (places.some((r) => livePath.startsWith(r)) || (reg && unitOf(reg, livePath))) return reg;
  }
  return null;
}
function rename(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try { fs.renameSync(from, to); }
  catch (e) { if (e.code !== 'EXDEV') throw e; fs.copyFileSync(from, to); fs.unlinkSync(from); }
}
// The main checkout (an agent worktree's binaries are links into a read-only store there: tools/assets/worktree_links.py).
// A retired file always lands in the main checkout's generated area (a worktree's goes when it is removed), and in a
// worktree main's own copy leaves its live folder at once, so main never keeps a file the landed registry dropped.
function moveFile(src, dest) {
  const m = mainCheckout();
  const inMain = path.join(m, src);
  if (path.resolve(m) !== path.resolve(ROOT)) {
    if (fs.existsSync(inMain)) rename(inMain, path.join(m, dest));
    else if (fs.existsSync(abs(src))) { fs.mkdirSync(path.dirname(path.join(m, dest)), { recursive: true }); fs.copyFileSync(fs.realpathSync(abs(src)), path.join(m, dest)); }
    if (fs.lstatSync(abs(src), { throwIfNoEntry: false })) fs.unlinkSync(abs(src));
    return;
  }
  rename(abs(src), abs(dest));
}

export function retire(livePath, { by = null, note = '', reg = registryFor(livePath), dryRun = false, log = true } = {}) {
  guard(livePath);
  if (!reg) throw new Error(`${livePath}: not under a live root of either registry`);
  const key = unitOf(reg, livePath.replace(/\/$/, '')) ?? unitOf(reg, livePath);
  if (!key) throw new Error(`${livePath}: not registered`);
  const isDir = livePath.endsWith('/');
  const files = isDir ? walk(livePath) : [livePath];
  if (!files.length || files.some((f) => !exists(f))) throw new Error(`${livePath}: missing on disk`);
  // retired/<date>/<original path>; a second retire of the same path that day goes to retired/<date>-2/ and so on
  let date = today();
  for (let n = 2; files.some((f) => fs.existsSync(path.join(mainCheckout(), `${reg.generated}retired/${date}/${f}`))); n++) date = `${today()}-${n}`;
  const to = `${reg.generated}retired/${date}/${livePath}`;
  if (!dryRun) {
    for (const f of files) moveFile(f, `${reg.generated}retired/${date}/${f}`);
    // the unit goes when it is the retired path or inside it; a file leaving a folder unit leaves the folder registered
    for (const k of Object.keys(reg.units)) if (k === livePath || (isDir && k.startsWith(livePath))) delete reg.units[k];
    const u = reg.units[key];
    if (u?.list) {
      // a list unit (the voice clips): the key leaves the list too
      const keys = readJson(u.list).filter((k) => k !== listKey(u, livePath));
      fs.writeFileSync(abs(u.list), '[' + keys.map((k) => JSON.stringify(k)).join(', ') + ']'); // as tools/voice/export.py writes it
    }
    if (log) reg.log.push({ date, action: 'retire', path: livePath, to, ...(by && { by }), ...(note && { note }) });
    saveRegistry(reg);
  }
  return { to, files: files.length };
}

export function promote(src, dest, { round, review = null, note = '', replace = false, dryRun = false } = {}) {
  guard(src); guard(dest);
  if (!round) throw new Error('--round is required: the round (folder) the pick came from');
  if (!exists(src) || fs.statSync(abs(src)).isDirectory()) throw new Error(`${src}: not a file`);
  const reg = registryFor(dest);
  if (!reg) throw new Error(`${dest}: not under a live root of either registry (${PUBLIC_REGISTRY}, ${LOCAL_REGISTRY})`);
  if (reg.roots.some((r) => src.startsWith(r)) || unitOf(reg, src)) throw new Error(`${src}: already live; promote from the generated area`);
  if (exists(dest)) {
    if (!replace) throw new Error(`${dest}: exists; pass --replace to retire it first`);
    if (!dryRun) {
      const kept = reg.units[dest]; // the replaced file's unit (and its flags) stays for the new version
      retire(dest, { by: dest, note: `replaced by ${src}`, reg });
      if (kept) reg.units[dest] = kept;
    }
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(abs(dest)), { recursive: true });
    fs.copyFileSync(fs.realpathSync(abs(src)), abs(dest));
    if (!unitOf(reg, dest)) reg.units[dest] = { note: note || `from ${round}` };
    reg.log.push({ date: today(), action: 'promote', path: dest, from: src, round, ...(review && { review }), ...(note && { note }) });
    saveRegistry(reg);
  }
  return { reg: reg._file, unit: unitOf(reg, dest) ?? dest };
}

// ---------- CLI ----------
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      out[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    } else out._.push(a);
  }
  return out;
}
function report({ errors, warnings, label }, quiet) {
  for (const w of warnings) if (!quiet) console.log(`note (${label}): ${w}`);
  for (const e of errors.slice(0, 60)) console.log(`FAIL (${label}): ${e}`);
  if (errors.length > 60) console.log(`FAIL (${label}): ... ${errors.length - 60} more`);
  if (!errors.length && !quiet) console.log(`live ${label}: ok`);
  return errors.length;
}
async function main() {
  const a = args(process.argv.slice(2));
  const [cmd, ...rest] = a._;
  if (cmd === 'check') {
    let bad = report(await checkPublic(), a.quiet);
    if (a.local) bad += report(checkLocal(), a.quiet);
    process.exitCode = bad ? 1 : 0;
  } else if (cmd === 'promote') {
    const [src, dest] = rest.map(rel);
    const r = promote(src, dest, { round: a.round, review: a.review, note: a.note, replace: !!a.replace, dryRun: !!a['dry-run'] });
    console.log(`promoted ${src} -> ${dest} (unit ${r.unit}, ${r.reg})`);
    if (r.reg === PUBLIC_REGISTRY) console.log('next: python3 tools/assets/sync.py push, then commit tools/assets/live.json and the lock file');
  } else if (cmd === 'retire') {
    const named = [...rest, ...(a.from ? fs.readFileSync(a.from, 'utf8').split('\n').filter(Boolean) : [])];
    const paths = named.map((x) => (x.endsWith('/') ? rel(x) + '/' : rel(x)));
    const many = paths.length > 1;
    let to;
    for (const p of paths) {
      const r = retire(p, { by: a.by, note: a.note, dryRun: !!a['dry-run'], log: !many });
      to = r.to.slice(0, r.to.length - p.length);
      if (!a.quiet) console.log(`retired ${p} -> ${r.to} (${r.files} file${r.files === 1 ? '' : 's'})`);
    }
    if (many && !a['dry-run']) {
      // one log entry for a batch: the paths, each now under `to`
      const reg = registryFor(paths[0]);
      reg.log.push({ date: today(), action: 'retire', paths, to, ...(a.by && { by: a.by }), ...(a.note && { note: a.note }) });
      saveRegistry(reg);
    }
    if (!a['dry-run'] && paths.some((p) => p.startsWith('game3d/'))) {
      // the lock file drops what left the live folders (tools/assets/sync.py forget), so the commit carries both
      const r = spawnSync('python3', ['tools/assets/sync.py', 'forget', ...paths], { cwd: ROOT, stdio: 'inherit' });
      if (r.status) process.exitCode = 1;
    }
    console.log(`${paths.length} retired; commit ${PUBLIC_REGISTRY} (or nothing, for local-only files) with the lock file`);
  } else if (cmd === 'list') {
    const reg = loadRegistry(a.local ? 'local' : 'public');
    for (const [f, key] of expand(reg).byFile) console.log(f, JSON.stringify(reg.units[key]));
  } else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^#!.*\n/, '').replace(/^\/\/ ?/gm, ''));
    process.exitCode = cmd ? 1 : 0;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(`live: ${e.message}`); process.exitCode = 1; });
}
