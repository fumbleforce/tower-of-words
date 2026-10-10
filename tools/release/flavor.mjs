#!/usr/bin/env node
// The flavor transform: turns a staged copy of the game into one flavor, in place, file by file.
//
//   node tools/release/flavor.mjs --flavor vanilla --in <staged dir>
//   node tools/release/flavor.mjs --flavor full --in <staged dir>     (nothing to do: full is the source as it is)
//
// desktop/build.mjs runs it on the staged files before packing; tools/release/scan.mjs checks the result.
// Vanilla, per file:
//   - the modules in STUBS are replaced by the neutral no-op stubs in tools/release/stubs/ (same exports, checked);
//   - every .js/.mjs is minified with esbuild, with the build constant __FULL__ defined as false, so `if (__FULL__)`
//     branches and the strings inside them are dropped, and comments go;
//   - .css is minified (comments go), .json is re-written compact, HTML comments are removed.
// Nothing is bundled: file names and the import graph stay as they are, so build.json and the import map still work.
// Safety: the stage must be a plain copy (rsync -aL / cp -L into dist/). A stage holding any symlink is refused before
// anything is written, every write stays inside the stage, and a file is replaced by writing a temp file next to it
// and renaming it over the old name, so a hard-linked file never changes its shared contents. Nothing is deleted.
// The flag in source code: game3d/js/full.js (dev and web builds set it true at runtime).

import { readFile, writeFile, readdir, rename, realpath } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));

// Paths are relative to the game folder (the one holding index.html and js/main.js).
export const STUBS = {
  'js/plugins.js': 'stubs/plugins.js',
  'js/full.js': 'stubs/full.js',
};

const SKIP_DIRS = new Set(['node_modules', '.git']);

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--flavor') out.flavor = argv[++i];
    else if (a === '--in') out.dir = argv[++i];
    else if (a.startsWith('--flavor=')) out.flavor = a.slice(9);
    else if (a.startsWith('--in=')) out.dir = a.slice(5);
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

async function* walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isSymbolicLink()) throw new Error(`${p} is a symlink: stage with dereferenced copies (rsync -aL, cp -L)`);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile()) yield p;
  }
}

// the stage's real path; every write is checked against it
let STAGE = null;
async function replaceFile(file, text) {
  const real = await realpath(file);
  if (!STAGE || !real.startsWith(STAGE + sep)) throw new Error(`${file} is outside the stage`);
  const tmp = `${real}.flavor-${process.pid}.tmp`;
  await writeFile(tmp, text, { flag: 'wx' });
  await rename(tmp, real);
}

// The game folders inside the staged dir: every folder with js/main.js and index.html (the dir itself, or game3d/).
async function gameRoots(dir) {
  const roots = [];
  for await (const f of walk(dir)) {
    if (f.endsWith(`${sep}js${sep}main.js`)) {
      const root = dirname(dirname(f));
      if (existsSync(join(root, 'index.html'))) roots.push(root);
    }
  }
  return roots;
}

// export names of an ES module, from its source (function, async function, const/let/class, and export lists)
export function exportNames(src) {
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

async function applyStubs(root) {
  const done = [];
  for (const [rel, stubRel] of Object.entries(STUBS)) {
    const target = join(root, rel);
    if (!existsSync(target)) continue;
    const real = await readFile(target, 'utf8');
    const stub = await readFile(join(HERE, stubRel), 'utf8');
    const want = exportNames(real).join(',');
    const have = exportNames(stub).join(',');
    if (want !== have) {
      throw new Error(`stub ${stubRel} exports [${have}] but ${rel} exports [${want}]: update the stub`);
    }
    await replaceFile(target, stub);
    done.push(rel);
  }
  return done;
}

const DEFINE = { __FULL__: 'false' };

async function transformFile(file) {
  const ext = extname(file).toLowerCase();
  if (ext === '.js' || ext === '.mjs') {
    const src = await readFile(file, 'utf8');
    const { code } = await transform(src, {
      loader: 'js',
      minify: true,
      define: DEFINE,
      legalComments: 'none',
      charset: 'utf8',
      sourcefile: file,
    });
    await replaceFile(file, code);
    return 'js';
  }
  if (ext === '.css') {
    const src = await readFile(file, 'utf8');
    const { code } = await transform(src, { loader: 'css', minify: true, legalComments: 'none', charset: 'utf8' });
    await replaceFile(file, code);
    return 'css';
  }
  if (ext === '.json') {
    const src = await readFile(file, 'utf8');
    try {
      await replaceFile(file, JSON.stringify(JSON.parse(src)));
      return 'json';
    } catch {
      return null; // not JSON after all: the scan still reads it as text
    }
  }
  if (ext === '.html' || ext === '.htm') {
    const src = await readFile(file, 'utf8');
    const out = src.replace(/<!--[\s\S]*?-->/g, '');
    if (out !== src) await replaceFile(file, out);
    return 'html';
  }
  return null;
}

export async function flavor({ flavor: name, dir }) {
  if (name !== 'vanilla' && name !== 'full') throw new Error('--flavor must be full or vanilla');
  if (!dir || !existsSync(dir)) throw new Error('--in <staged dir> is required and must exist');
  if (name === 'full') return { stubs: [], counts: {} };
  STAGE = await realpath(dir);
  const files = [];
  for await (const f of walk(dir)) files.push(f); // throws on any symlink before anything is written
  const roots = await gameRoots(dir);
  if (!roots.length) throw new Error(`no game folder (index.html + js/main.js) under ${dir}`);
  const stubs = [];
  for (const root of roots) for (const rel of await applyStubs(root)) stubs.push(relative(dir, join(root, rel)));
  const counts = {};
  // a bounded pool: esbuild is fast, the limit only keeps open files sane
  let next = 0;
  const work = async () => {
    while (next < files.length) {
      const f = files[next++];
      let kind;
      try {
        kind = await transformFile(f);
      } catch (err) {
        throw new Error(`${relative(dir, f)}: ${err.message}`);
      }
      if (kind) counts[kind] = (counts[kind] || 0) + 1;
    }
  };
  await Promise.all(Array.from({ length: 16 }, work));
  return { stubs, counts };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const opts = args(process.argv.slice(2));
    const { stubs, counts } = await flavor(opts);
    if (opts.flavor === 'full') console.log('flavor full: nothing to change');
    else {
      const c = Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ');
      console.log(`flavor vanilla: ${stubs.length} modules stubbed (${stubs.join(', ')}); transformed ${c}`);
    }
  } catch (err) {
    console.error(`flavor: ${err.message}`);
    process.exit(1);
  }
}
