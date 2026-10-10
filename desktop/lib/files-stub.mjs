// TEMPORARY stand-in for `node tools/release/files.mjs --json --flavor <f>` (#419) until it lands: the files a
// release carries, as [{ src, dest }] (src: path on this disk, dest: the URL path under app://game/).
// Delete this file when tools/release/files.mjs is on main; build.mjs prefers it already.
//
// The game: the modules build.json lists (js/, story/, data/) minus the dev-only ones, the page, styles, fonts,
// vendor, audio, the opening, the minigames, and the assets/ folders the code names (as game3d/tools/deploy-pages.sh
// does). Left out: tools, tests, QA, shots, design notes, the showcase, scene viewer and VRM test pages, *.md.
// The full flavor adds the optional plugins, their clips and the pictures their scene data names; never user/.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEV_FILES = [
  /^js\/testmode[^/]*\.js$/,
  /^js\/shell-qa\.js$/,
  /^js\/feedback\.js$/,
  /^js\/map\/index\.js$/,
  /^js\/showcase\//,
  /^js\/viewer\//,
  /^js\/vrm\//,
];
const SKIP_PARTS = /(^|\/)(tools|test|tests|qa|design|ref|raw|work)(\/|$)|\.md$|\.blend$|(^|\/)check[^/]*\.(png|html)$/;

function walk(dir, base = dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    let isDir = ent.isDirectory();
    if (ent.isSymbolicLink()) {
      try {
        isDir = fs.statSync(abs).isDirectory();
      } catch {
        continue;
      }
    }
    if (isDir) out.push(...walk(abs, base));
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

export function releaseFiles({ root, flavor }) {
  const g = path.join(root, 'game3d');
  const add = new Map();
  const put = (rel) => add.set(rel, { src: path.join(root, rel), dest: rel });
  const used = new Set();
  for (const dir of ['js', 'opening']) {
    for (const f of walk(path.join(g, dir))) {
      if (!/\.(js|mjs)$/.test(f)) continue;
      const text = fs.readFileSync(path.join(g, dir, f), 'utf8');
      for (const m of text.matchAll(/assets\/([A-Za-z0-9_-]+)\//g)) used.add(m[1]);
    }
  }
  const keep = (rel) => !SKIP_PARTS.test(rel);
  for (const f of walk(path.join(g, 'js'))) if (/\.js$/.test(f) && !DEV_FILES.some((r) => r.test(`js/${f}`))) put(`game3d/js/${f}`);
  for (const f of walk(path.join(g, 'story'))) if (/\.js$/.test(f) && keep(f)) put(`game3d/story/${f}`);
  for (const f of walk(path.join(g, 'data'))) if (/\.json$/.test(f)) put(`game3d/data/${f}`);
  for (const d of ['css', 'fonts', 'vendor', 'audio', 'opening', 'minigames']) {
    for (const f of walk(path.join(g, d))) if (keep(f)) put(`game3d/${d}/${f}`);
  }
  for (const d of used) for (const f of walk(path.join(g, 'assets', d))) if (keep(f)) put(`game3d/assets/${d}/${f}`);
  put('game3d/index.html');
  if (flavor === 'full') {
    // local-only content lives in the main checkout; an agent worktree has none of its own
    let base = root;
    if (!fs.existsSync(path.join(root, 'island', 'private'))) {
      const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root }).toString().trim();
      base = path.dirname(common);
    }
    const p = path.join(base, 'island', 'private');
    const put = (rel) => add.set(rel, { src: path.join(base, rel), dest: rel });
    for (const f of walk(path.join(p, 'plugins'))) if (f.endsWith('.js') && f !== 'viewer.js') put(`island/private/plugins/${f}`);
    for (const f of walk(path.join(p, 'audio'))) put(`island/private/audio/${f}`);
    const rw = path.join(p, 'rewards');
    for (const j of ['sequences.json', 'manifest.json', 'lines.json', 'lines-days.json']) {
      if (!fs.existsSync(path.join(rw, j))) continue;
      put(`island/private/rewards/${j}`);
      const text = fs.readFileSync(path.join(rw, j), 'utf8');
      for (const m of text.matchAll(/"([^"]+\.(?:webp|png|jpg|mp4|webm|mp3))"/g)) {
        const rel = path.posix.normalize(m[1]);
        if (rel.startsWith('..') || rel.startsWith('/') || !fs.existsSync(path.join(rw, rel))) continue;
        put(`island/private/rewards/${rel}`);
      }
    }
  }
  return [...add.values()].filter((f) => !f.dest.includes('/user/') && fs.existsSync(f.src)).sort((a, b) => (a.dest < b.dest ? -1 : 1));
}
