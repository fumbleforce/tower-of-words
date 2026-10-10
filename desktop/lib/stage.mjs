// Release staging: the file list, a staged copy of it at the URL paths, build.json for it, and a check that no staged
// module imports a file the release left out.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const PRIVATE_ROOT = ['island', 'private'].join('/') + '/';

// [{src, dest}] from tools/release/files.mjs (#419; it names the full flavor 'adult'). It exits 1, and so does the build,
// when a listed file is missing or a shipped module imports a file the list doesn't hold.
export function fileList(root, flavor) {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/release/files.mjs'), '--json', '--flavor', flavor === 'full' ? 'adult' : flavor], {
    cwd: root,
    maxBuffer: 1 << 28,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const list = JSON.parse(out.toString('utf8'));
  for (const f of list) {
    const src = path.isAbsolute(f.src) ? f.src : path.join(root, f.src);
    f.src = src;
    if (f.dest.startsWith(PRIVATE_ROOT + 'user/')) throw new Error(`file list names Jørgen's own folder: ${f.dest}`);
    if (flavor === 'vanilla' && f.dest.startsWith(PRIVATE_ROOT)) throw new Error(`vanilla file list has optional content: ${f.dest}`);
    if (f.dest.split('/').includes('..') || f.dest.startsWith('/')) throw new Error(`bad dest: ${f.dest}`);
  }
  return list;
}

// Every file is copied, links dereferenced (asset files in a worktree are links into the main checkout or the shared
// asset store): nothing here writes, renames or deletes anywhere but the stage folder under dist/.
export function stage(list, dir) {
  if (!dir.split(path.sep).includes('dist')) throw new Error(`stage folder must be under dist/: ${dir}`);
  fs.rmSync(dir, { recursive: true, force: true });
  let bytes = 0;
  for (const f of list) {
    const out = path.join(dir, f.dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(fs.realpathSync(f.src), out, fs.constants.COPYFILE_FICLONE);
    bytes += fs.statSync(out).size;
  }
  return bytes;
}

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const abs = path.join(dir, e.name);
    return e.isDirectory() ? walk(abs, base) : [path.relative(base, abs).split(path.sep).join('/')];
  });
}

// game3d/build.json for exactly the staged modules (the page's import map; game3d/tools/stamp.py does the same)
export function stampBuild(dir, root) {
  const g = path.join(dir, 'game3d');
  const out = path.join(g, 'build.json');
  let commit = '';
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root }).toString().trim();
  } catch {
    /* not a checkout */
  }
  const files = ['js', 'story', 'data']
    .flatMap((d) => walk(path.join(g, d)).map((f) => `${d}/${f}`))
    .filter((f) => (f.startsWith('data/') ? f.endsWith('.json') : f.endsWith('.js')))
    .sort();
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const id = `${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${commit ? '-' + commit : ''}`;
  fs.rmSync(out, { force: true }); // may be a hard link to the checkout's own build.json
  fs.writeFileSync(out, JSON.stringify({ id, files }, null, 0));
  return id;
}

// every static import of a staged module must resolve to a staged file (a dev file left out must only be reached by
// a dynamic import behind a dev check)
export function checkImports(dir) {
  const missing = [];
  const re = /(?:^|[;\n}])\s*(?:import|export)\s+(?:[^'"`;]*?\sfrom\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;
  for (const f of walk(dir)) {
    if (!/\.(js|mjs)$/.test(f)) continue;
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of text.matchAll(re)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1].split('?')[0]));
      if (!fs.existsSync(path.join(dir, target))) missing.push(`${f} -> ${target}`);
    }
  }
  return missing;
}
