// Scripts under art/ may only go down. Every tracked .py, .mjs, .js and .sh file there is counted, and the list of them as
// the rule was made is tools/facts/art-scripts-baseline.json. A file that isn't in that list fails: put reusable steps in
// tools/characters/steps/ and the model's settings in its recipe. A listed file that is gone is a note, and --baseline
// prunes the list. (--baseline also takes in whatever is in the tree, so read its diff.) Part of npm run check; runs on its
// own too. Still pictures have their own rule: direct-render.mjs.
//
//   node tools/facts/art-scripts.mjs              check
//   node tools/facts/art-scripts.mjs --list       every script under art/, baselined or new
//   node tools/facts/art-scripts.mjs --baseline   rewrite the list from today's tree (read the diff)
//
// Tracked files only (git ls-files). Outside a checkout (a commit check's snapshot), every file under art/.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = 'tools/facts/art-scripts-baseline.json';
const DIR = 'art';
const SCRIPT = /\.(py|mjs|js|sh)$/;
const INSTEAD = "put reusable steps in tools/characters/steps/ and the model's settings in its recipe";
const ABOUT = 'Scripts under art/ as they were when the rule was made. They can be deleted, never added (tools/facts/art-scripts.mjs).';

export const isScript = (f) => f.startsWith(`${DIR}/`) && SCRIPT.test(f);

function walk(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) return [];
  return fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).flatMap((e) => {
    const r = path.posix.join(rel, e.name);
    return e.isDirectory() ? walk(r) : [r];
  });
}

// Every tracked script under art/, sorted.
export function scripts() {
  const git = spawnSync('git', ['ls-files', '-z', '--', DIR], { cwd: ROOT, encoding: 'utf8' });
  const all = git.status === 0 ? git.stdout.split('\0') : walk(DIR);
  return all.filter((f) => isScript(f) && fs.existsSync(path.join(ROOT, f))).sort();
}

// The rule: a script that isn't in the baseline fails. A listed one that is gone is a note, to prune.
export function checkScripts(files, base, bad, note) {
  const listed = new Set(base.files || []);
  for (const f of files) if (!listed.has(f)) bad(f, `a new script under art/ (art scripts only go down): ${INSTEAD}.`);
  const now = new Set(files);
  for (const f of listed) if (!now.has(f)) note(`${f} is in ${BASELINE} but is gone: prune it (node tools/facts/art-scripts.mjs --baseline)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const files = scripts();
  const basePath = path.join(ROOT, BASELINE);
  const base = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : {};
  if (args.includes('--list')) {
    const listed = new Set(base.files || []);
    for (const f of files) console.log(`${listed.has(f) ? 'baselined' : 'new'}\t${f}`);
    process.exit(0);
  }
  if (args.includes('--baseline')) {
    fs.writeFileSync(basePath, JSON.stringify({ about: ABOUT, files }, null, 1) + '\n');
    console.log(`${files.length} scripts under art/`);
    process.exit(0);
  }
  let problems = 0;
  const bad = (where, msg) => { problems++; console.log(`  ${where}: ${msg}`); };
  const note = (msg) => console.log(`  note: ${msg}`);
  checkScripts(files, base, bad, note);
  if (problems) { console.log(`art scripts: FAILED, ${problems}`); process.exit(1); }
  console.log('art scripts: ok');
}
