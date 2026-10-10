#!/usr/bin/env node
// Every file a release bundle holds, from the two live-asset registries and game3d/build.json alone
// (notes/asset-lifecycle.md, "The release file list").
//
//   node tools/release/files.mjs [--flavor vanilla|adult] [--json] [--excluded]
//
// --flavor   vanilla (default): the public game only. adult: plus the local-only content and public units marked
//            flavor "adult". Vanilla never holds a local-only file and its dest paths pass a word scan.
// --json     the list as JSON on stdout, [{src, dest, size, part}], the size summary on stderr. dest is the URL path
//            the game requests (game3d/..., island/private/...), src the file on disk (absolute). part is code,
//            asset or local. Every entry ships; nothing in the list is dev-only.
// --excluded also list what was left out on purpose (dev units, source files), with the reason, on stderr.
//
// Exit 1, with every problem, when a listed file is missing, a shipped module imports a file the list doesn't
// hold, a registry check fails, or a vanilla dest path names the optional content. The local server's
// /api/plugins (the plugin names, tools/review_server.py) is the list's island/private/plugins/<name>.js entries.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, abs, loadRegistry, expand, publicCode, matchAny, checkPublic, checkLocal, readJson } from '../assets/live.mjs';

const VANILLA_WORDS = /adult|private|reward|nsfw|skimpy|discreet|explicit/i;
const arg = (name) => process.argv.includes('--' + name);
const opt = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};

function stamp() {
  // build.json is generated (game3d/tools/stamp.py): whatever serves the game stamps it first
  const r = spawnSync('python3', ['game3d/tools/stamp.py', '--if-stale'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status) throw new Error('game3d/tools/stamp.py failed: ' + r.stderr);
  return readJson('game3d/build.json').files.map((f) => 'game3d/' + f);
}

// the import maps the pages set up (game3d/index.html builds its own; the opening page has a static one)
function bareMap() {
  const map = {};
  const index = fs.readFileSync(abs('game3d/index.html'), 'utf8').match(/const imports = (\{[^;]*\});/);
  if (index) for (const [k, v] of Object.entries(Function(`return ${index[1]}`)())) map[k] = path.posix.join('game3d', v);
  return map;
}
function resolveImport(from, spec, bare) {
  if (spec.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  if (bare[spec]) return bare[spec];
  const prefix = Object.keys(bare).find((k) => k.endsWith('/') && spec.startsWith(k));
  return prefix ? bare[prefix] + spec.slice(prefix.length) : null;
}
// every literal static or dynamic import of a shipped module must be shipped too; a dynamic import of a file the
// registry excludes on purpose (a dev page behind a query flag, js/shell-qa.js) is allowed
function importProblems(dests, devGlobs) {
  const bare = bareMap();
  const problems = [];
  const re = /(?:^|[\s;}])(?:import|export)\s[^'"`]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"`$]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;
  for (const dest of dests) {
    if (!dest.endsWith('.js')) continue;
    const src = fs.readFileSync(abs(dest), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(re)) {
      const spec = m[1] || m[2] || m[3];
      if (/^(node:|https?:|data:)/.test(spec)) continue;
      const target = resolveImport(dest, spec.replace(/[?#].*$/, ''), bare);
      if (!target || dests.has(target) || (m[2] && matchAny(target, devGlobs))) continue;
      problems.push(`${dest} imports ${spec} (${target}), which the list doesn't hold`);
    }
  }
  return problems;
}

async function build(flavor) {
  const problems = [], excluded = [];
  const pub = loadRegistry('public');
  const entries = new Map();
  const add = (dest, part) => {
    if (!entries.has(dest)) entries.set(dest, { src: abs(dest), dest, part });
  };
  // code: build.json's modules and the page shell, minus what the registry excludes
  const modules = stamp();
  const code = new Set(publicCode(pub));
  for (const m of modules) if (!matchAny(m, pub.code.exclude)) code.add(m);
  for (const f of [...code].sort()) {
    // code.adult: modules only the optional content uses (#423); the vanilla bundle leaves them out
    if (flavor !== 'adult' && matchAny(f, pub.code.adult ?? [])) excluded.push(`${f}: adult flavor only`);
    else add(f, 'code');
  }
  // public assets: every unit file, except dev units and, in vanilla, units for the optional content
  const { byFile, problems: p1 } = expand(pub);
  problems.push(...p1);
  for (const [file, key] of byFile) {
    const u = pub.units[key];
    if (u.dev) excluded.push(`${file}: dev (${u.dev})`);
    else if (u.flavor === 'adult' && flavor !== 'adult') excluded.push(`${file}: adult flavor only`);
    else add(file, 'asset');
  }
  // local-only content: adult only, and only what its registry lists
  if (flavor === 'adult') {
    const loc = loadRegistry('local');
    if (!loc) problems.push('adult flavor: no local registry (island/private/game/live.json)');
    else {
      const { byFile: lb, problems: p2 } = expand(loc);
      problems.push(...p2);
      for (const [file, key] of lb) {
        if (loc.units[key].dev) excluded.push(`${file}: dev (${loc.units[key].dev})`);
        else add(file, 'local');
      }
    }
  }
  const list = [...entries.values()].sort((a, b) => a.dest.localeCompare(b.dest));
  for (const e of list) {
    if (e.dest === 'island/private/user' || e.dest.startsWith('island/private/user/')) problems.push(`${e.dest}: never shipped`);
    const st = fs.statSync(e.src, { throwIfNoEntry: false });
    if (!st || !st.isFile()) problems.push(`${e.dest}: missing on disk`);
    else e.size = st.size;
    if (flavor === 'vanilla' && (e.part === 'local' || e.dest.startsWith('island/'))) problems.push(`${e.dest}: a local-only file in the vanilla list`);
    if (flavor === 'vanilla' && VANILLA_WORDS.test(e.dest)) problems.push(`${e.dest}: the vanilla list may not name the optional content`);
  }
  problems.push(...importProblems(new Set(list.map((e) => e.dest)), pub.code.exclude));
  return { list, problems, excluded };
}

function summary(flavor, list) {
  const mb = (n) => (n / 1e6).toFixed(1) + ' MB';
  const parts = {};
  for (const e of list) {
    parts[e.part] ??= { n: 0, size: 0 };
    parts[e.part].n++;
    parts[e.part].size += e.size || 0;
  }
  const total = list.reduce((s, e) => s + (e.size || 0), 0);
  const rows = Object.entries(parts).map(([k, v]) => `${k} ${v.n} files ${mb(v.size)}`);
  return `${flavor}: ${list.length} files, ${mb(total)} (${rows.join(', ')})`;
}

async function main() {
  const flavor = opt('flavor', 'vanilla');
  if (!['vanilla', 'adult'].includes(flavor)) throw new Error(`--flavor is vanilla or adult, not ${flavor}`);
  const checks = [await checkPublic(), ...(flavor === 'adult' ? [checkLocal()] : [])];
  const { list, problems, excluded } = await build(flavor);
  for (const c of checks) problems.push(...c.errors.map((e) => `live ${c.label}: ${e}`));
  const out = arg('json') ? process.stderr : process.stdout;
  if (arg('json')) process.stdout.write(JSON.stringify(list.map(({ src, dest, size, part }) => ({ src, dest, size, part })), null, 1) + '\n');
  else for (const e of list) console.log(e.dest);
  if (arg('excluded')) for (const x of excluded) process.stderr.write(`excluded ${x}\n`);
  out.write(summary(flavor, list) + '\n');
  if (flavor === 'adult') out.write(summary('vanilla', (await build('vanilla')).list) + '\n');
  else if (loadRegistry('local')) out.write(summary('adult', (await build('adult')).list) + '\n');
  if (problems.length) {
    for (const p of problems.slice(0, 80)) process.stderr.write(`FAIL ${p}\n`);
    if (problems.length > 80) process.stderr.write(`FAIL ... ${problems.length - 80} more\n`);
    process.exitCode = 1;
  }
}
main().catch((e) => {
  console.error(`release files: ${e.message}`);
  process.exitCode = 1;
});
