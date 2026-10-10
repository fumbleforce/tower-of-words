#!/usr/bin/env node
// The word scan over a finished, unpacked vanilla bundle: it fails if any file name or file content mentions the
// optional content or the local-only folders.
//
//   node tools/release/scan.mjs --flavor vanilla <dir>
//
// Read: text files (whole text), JSON (every key and string value, with its path), the JSON chunk of .glb models
// (node, mesh and material names). Binary files are checked by name only.
// Exits 1 with one line per finding (file, line or JSON path, the word, the text around it), 0 when clean.
// ALLOW lists the few real, unrelated uses; each entry has a reason. Fix findings at the source, not here.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// words, matched case-insensitively anywhere (so privateMode and Rewards count)
const WORDS = ['adult', 'private', 'reward', 'nsfw', 'skimpy', 'discreet', 'explicit', 'hentai', 'ecchi', 'lewd'];
// the local-only folders (island/PRIVATE.md, Layout): never named in a release
const FOLDERS = ['island/private', 'f95zone', 'imagegen'];
const PATTERNS = [
  ...WORDS.map((w) => ({ word: w, re: new RegExp(w, 'gi') })),
  ...FOLDERS.map((w) => ({ word: w, re: new RegExp(w.replace('/', '[\\\\/]'), 'gi') })),
  // "18+" as a rating, not arithmetic in minified code (0.18+x, 18+n, 18+(...))
  { word: '18+', re: /(?<![\w.$)\]])18\s?\+(?![\w$.([+\-!~])/g },
];

// Real, unrelated uses only. file: a RegExp on the path inside the bundle; text: a RegExp the match's context
// (40 characters either side) must contain.
const ALLOW = [
  // { file: /(^|\/)vendor\/some-lib\.js$/, text: /privateKey/, reason: 'the library's own API name' },
];

const TEXT = new Set([
  '.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.txt', '.md', '.svg', '.xml', '.glsl', '.vert', '.frag',
  '.webmanifest', '.yaml', '.yml', '.csv', '.tsv', '.map', '.ts',
]);
const SKIP_DIRS = new Set(['.git']);

async function* walk(dir) {
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) yield { p, dir: true };
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.isFile() || (ent.isSymbolicLink() && (await stat(p)).isFile())) yield { p, dir: false };
  }
}

const allowed = (rel, context) => ALLOW.some((a) => a.file.test(rel) && a.text.test(context));

function hits(text) {
  const out = [];
  for (const { word, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) out.push({ word, at: m.index, len: m[0].length });
  }
  return out;
}

function around(text, at, len) {
  return text.slice(Math.max(0, at - 40), at + len + 40).replace(/\s+/g, ' ');
}

function scanText(rel, text, where, findings) {
  for (const h of hits(text)) {
    const ctx = around(text, h.at, h.len);
    if (allowed(rel, ctx)) continue;
    const line = text.slice(0, h.at).split('\n').length;
    findings.push(`${rel}:${where ? where : line}: "${h.word}" in …${ctx}…`);
  }
}

function scanJson(rel, value, path, findings) {
  if (typeof value === 'string') {
    scanText(rel, value, path || '(value)', findings);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanJson(rel, v, `${path}[${i}]`, findings));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const p = path ? `${path}.${k}` : k;
      scanText(rel, k, `${p} (key)`, findings);
      scanJson(rel, v, p, findings);
    }
  }
}

function glbJson(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) return null; // 'glTF'
  const len = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) return null; // 'JSON'
  return buf.subarray(20, 20 + len).toString('utf8');
}

export async function scan(dir) {
  const findings = [];
  let files = 0;
  for await (const { p, dir: isDir } of walk(dir)) {
    const rel = relative(dir, p).split(sep).join('/');
    const name = rel.split('/').pop();
    scanText(rel, name, isDir ? '(folder name)' : '(file name)', findings);
    if (isDir) continue;
    files++;
    const ext = extname(name).toLowerCase();
    if (ext === '.json') {
      const text = await readFile(p, 'utf8');
      try {
        scanJson(rel, JSON.parse(text), '', findings);
      } catch {
        scanText(rel, text, '', findings);
      }
    } else if (ext === '.glb') {
      const json = glbJson(await readFile(p));
      if (json) {
        try {
          scanJson(rel, JSON.parse(json), '', findings);
        } catch {
          scanText(rel, json, '(glb json)', findings);
        }
      }
    } else if (TEXT.has(ext) || ext === '.gltf') {
      scanText(rel, await readFile(p, 'utf8'), '', findings);
    }
  }
  return { files, findings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  let flavor = null;
  const dirs = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--flavor') flavor = argv[++i];
    else if (argv[i].startsWith('--flavor=')) flavor = argv[i].slice(9);
    else dirs.push(argv[i]);
  }
  if (flavor !== 'vanilla' || dirs.length !== 1) {
    console.error('usage: node tools/release/scan.mjs --flavor vanilla <dir>  (only the vanilla bundle is scanned)');
    process.exit(2);
  }
  const { files, findings } = await scan(dirs[0]);
  for (const f of findings) console.log(f);
  if (findings.length) {
    console.log(`scan vanilla: FAIL, ${findings.length} findings in ${files} files`);
    process.exit(1);
  }
  console.log(`scan vanilla: PASS, ${files} files, no findings`);
}
