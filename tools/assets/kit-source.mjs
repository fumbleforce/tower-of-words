// The world kit as the source has it today, for the Asset library (tools/assets/kit.json says which files are kit
// files and how each piece is shown): every exported builder in those files with its line, its parameters as
// written and the comment above it, and every place in game3d/js that uses it. "Used in" follows the imports
// (named, renamed, namespace and re-exports), so bench from props.js and bench from outdoor/furniture.js are
// told apart. No renderer, no DOM: it only parses the source.
//   node tools/assets/kit-source.mjs     prints the library as JSON (scan.py reads it into assets.json)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSource, visitSource, staticValue } from '../lib/source-data.mjs';

const JS = 'game3d/js/';
const norm = (parts) => {
  const out = [];
  for (const s of parts) if (s === '..') out.pop(); else if (s && s !== '.') out.push(s);
  return out.join('/');
};
// an import specifier from `file` to a repo path (only relative imports: 'three' and its addons are not ours)
const resolve = (file, spec) => (spec.startsWith('.') ? norm([...file.split('/').slice(0, -1), ...spec.split('/')]) : null);
const COLOR = /^#[0-9a-f]{3,8}$/i;

// a palette: an object (or object of arrays) whose values are all colours
function palette(node) {
  let v;
  try { v = staticValue(node); } catch { return null; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const flat = Object.entries(v).flatMap(([k, c]) => (Array.isArray(c) ? c.map((x, i) => [`${k} ${i + 1}`, x]) : [[k, c]]));
  return flat.length && flat.every(([, c]) => typeof c === 'string' && COLOR.test(c)) ? Object.fromEntries(flat) : null;
}

export function kitSourceData(read, files, kitFiles) {
  const src = new Map(files.map((f) => [f, read(f)]));
  const asts = new Map();
  const ast = (f) => {
    if (!asts.has(f)) asts.set(f, parseSource(src.get(f)));
    return asts.get(f);
  };
  // the comment right above a node (blank lines allowed in between, nothing else)
  const docOf = (f, node) => {
    const before = ast(f).comments.filter((c) => c.range[1] <= node.range[0]);
    const lines = [];
    let end = node.range[0];
    for (let i = before.length - 1; i >= 0; i--) {
      const c = before[i];
      if (src.get(f).slice(c.range[1], end).trim()) break;
      lines.unshift(c.value.trim());
      end = c.range[0];
    }
    return lines.join(' ').replace(/\s+/g, ' ').trim();
  };
  const paramsOf = (f, fn) => (fn.params.length ? src.get(f).slice(fn.params[0].range[0], fn.params.at(-1).range[1]) : '')
    .replace(/\s+/g, ' ').replace(/,\s*}/g, ' }').replace(/{\s+/g, '{ ');

  // exports of every file: own declarations, and re-exports pointing at another file
  const exportsOf = new Map();
  for (const f of files) {
    const own = {}, again = {};
    for (const n of ast(f).body) {
      if (n.type === 'ExportNamedDeclaration' && n.source) {
        const from = resolve(f, n.source.value);
        for (const s of n.specifiers) again[s.exported.name] = { file: from, name: s.local.name };
      } else if (n.type === 'ExportNamedDeclaration' && n.declaration) {
        const d = n.declaration;
        if (d.type === 'ClassDeclaration') {
          const ctor = d.body.body.find((m) => m.kind === 'constructor');
          own[d.id.name] = { kind: 'class', node: d, fn: ctor ? ctor.value : null };
        } else if (d.type === 'FunctionDeclaration') {
          own[d.id.name] = { kind: d.generator ? 'generator' : 'function', node: d, fn: d };
        } else if (d.type === 'VariableDeclaration') {
          for (const v of d.declarations) {
            if (v.id.type !== 'Identifier') continue;
            const init = v.init;
            const fn = init && /FunctionExpression$/.test(init.type) ? init : null;
            own[v.id.name] = { kind: fn ? 'function' : 'const', node: n, fn, init };
          }
        }
      }
    }
    exportsOf.set(f, { own, again });
  }
  const origin = (file, name, depth = 0) => {
    const e = exportsOf.get(file);
    if (!e || depth > 8) return null;
    if (e.own[name]) return `${file}#${name}`;
    if (e.again[name]) return origin(e.again[name].file, e.again[name].name, depth + 1);
    return null;
  };

  const kit = new Set(kitFiles.map((f) => JS + f));
  const pieces = {};
  for (const f of kit) {
    if (!exportsOf.has(f)) continue;
    for (const [name, d] of Object.entries(exportsOf.get(f).own)) {
      const id = `${f.slice(JS.length)}#${name}`;
      pieces[id] = {
        file: f, name, line: d.node.loc.start.line, kind: d.kind,
        params: d.fn ? paramsOf(f, d.fn) : null,
        doc: docOf(f, d.node).slice(0, 600),
        palette: d.kind === 'const' && d.init?.type === 'ObjectExpression' ? palette(d.init) : null,
        used: [],
      };
    }
  }

  // every reference to a piece, through the file's imports (or in its own file)
  for (const f of files) {
    const names = new Map(), spaces = new Map();
    for (const n of ast(f).body) {
      if (n.type !== 'ImportDeclaration') continue;
      const from = resolve(f, n.source.value);
      if (!from) continue;
      for (const s of n.specifiers) {
        if (s.type === 'ImportNamespaceSpecifier') spaces.set(s.local.name, from);
        else if (s.type === 'ImportSpecifier') names.set(s.local.name, origin(from, s.imported.name));
        else if (s.type === 'ImportDefaultSpecifier') names.set(s.local.name, origin(from, 'default'));
      }
    }
    if (exportsOf.has(f)) for (const name of Object.keys(exportsOf.get(f).own)) if (!names.has(name)) names.set(name, `${f}#${name}`);
    const seen = new Set();
    visitSource(ast(f), (node, anc) => {
      const parent = anc.at(-1);
      let key = null;
      if (node.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && spaces.has(node.object.name)) {
        key = origin(spaces.get(node.object.name), node.property.name);
      } else if (node.type === 'Identifier' && names.has(node.name)) {
        if (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
        if (parent?.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand) return;
        if (/^Import|^Export/.test(parent?.type || '')) return;
        if (parent && (parent.id === node) && /Declaration$|Declarator$/.test(parent.type)) return;
        if (parent?.type === 'FunctionDeclaration' || parent?.type === 'FunctionExpression' || parent?.type === 'ArrowFunctionExpression') {
          if (parent.params?.includes(node)) return;
        }
        key = names.get(node.name);
      }
      if (!key) return;
      const piece = pieces[key.slice(JS.length)];
      if (!piece) return;
      const line = node.loc.start.line;
      const call = parent?.type === 'CallExpression' && parent.callee === node;
      const tag = `${key}|${line}`;
      if (seen.has(tag)) return;
      seen.add(tag);
      piece.used.push({ file: f, line, call });
    });
  }
  return pieces;
}

// ------------------------------------------------------------------ the library, ready for scan.py
// Everything the Asset library shows about each piece: kit.json's grouping and variants laid over what the source
// says. Pieces are ids like 'outdoor/furniture/bench' (the file under game3d/js without scenes/ and .js, then the
// export's name), which is also the bible's #asset/<id>.
const slug = (key) => key.replace(/^scenes\//, '').replace(/\.js#/, '/');
export const placeOf = (file) => {
  const p = file.replace(/^game3d\/js\//, '').replace(/\.js$/, '').split('/');
  const name = (p[0] === 'scenes' || p[0] === 'places') && p.length > 1 ? p[1] : p[0];
  return name === 'outdoor' ? 'outdoor kit' : name;
};
// each top-level parameter has a default, so the builder can be called with nothing
const allDefaults = (params) => {
  let depth = 0, cur = '';
  const parts = [];
  for (const ch of params) {
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.every((x) => /=/.test(x) && !/^\s*\[/.test(x));
};
function defaultArgs(piece, family) {
  if (piece.kind !== 'function' || ['helpers', 'materials', 'lighting'].includes(family)) return null;
  const s = piece.params ?? '';
  if (/^p, x, z\b/.test(s)) return ['$p', 0, 0];
  if (/^p, a, b\b/.test(s)) return ['$p', [-1.2, 0], [1.2, 0]];
  if (/^p, (\[x0|rect)\b/.test(s)) return ['$p', [-1, 1, -0.6, 0.6]];
  if (!s || allDefaults(s)) return [];
  return null;
}

// street style or old faceted (kit.json `looks`): the file's look unless the piece sets its own; a faceted file's
// helpers and materials are not marked. A street piece says whether it has a lighter phone version (kit.json
// `phone`, else a phone, lighter, cover or budget parameter); a faceted one what the street style has for it.
const PHONE_ARG = /\b(phone|lighter|cover|budget)\b/g;
function lookOf(looks, key, s, c, family) {
  if (!looks) return {};
  const file = key.split('#')[0];
  const fromFile = Object.entries(looks.files).find(([f]) => (f.endsWith('/') ? file.startsWith(f) : file === f))?.[1];
  let look = c.look || fromFile || null;
  if (look === 'faceted' && !c.look && (['helpers', 'materials'].includes(family) || s.kind === 'const')) look = null;
  if (!look || look === 'none') return {};
  const out = { look };
  if (c.scope) out.scope = c.scope;
  if (c.note) out.note = c.note;
  if (look === 'street') {
    const args = [...new Set((s.params || '').match(PHONE_ARG) || [])];
    out.phone = c.phone || (args.length ? `takes ${args.map((a) => `\`${a}\``).join(', ')} for the phone's lighter build` : null);
  }
  if (look === 'faceted' && c.street) out.street = { key: c.street[0], note: c.street[1] };
  return out;
}

export function kitLibrary(read, files, catalog) {
  const kitFiles = Object.keys(catalog.files);
  const extraFiles = [...new Set(catalog.extra.map(([f]) => f))];
  const src = kitSourceData(read, files, [...kitFiles, ...extraFiles]);
  const extra = new Map(catalog.extra.map(([f, n, fam]) => [`${f}#${n}`, fam]));
  const pieces = [];
  const byKey = {};
  // kit.json lines the source no longer matches (a piece renamed or moved): reported, never fatal, so ./start runs
  const stale = [];
  for (const [key, s] of Object.entries(src)) {
    const file = key.split('#')[0];
    if (!kitFiles.includes(file) && !extra.has(key)) continue;
    if (catalog.skip.includes(key) || catalog.fold[key]) continue;
    const c = catalog.pieces[key] || {};
    const family = c.family || extra.get(key) || catalog.files[file];
    const auto = defaultArgs(s, family);
    const variants = (c.variants || (auto ? [{ name: 'default', args: auto }] : [])).map((v) => {
      const [vfile, vfn] = (v.call || key).split('#');
      const view = { type: 'piece', file: vfile, fn: vfn };
      for (const k of ['args', 'then', 'nook', 'surface', 'color', 'street']) if (v[k] !== undefined) view[k] = v[k];
      return { name: v.name, view };
    });
    const piece = {
      id: slug(key), key, name: s.name, label: c.label || s.name, family, file: s.file, line: s.line, kind: s.kind,
      call: s.kind === 'const' ? s.name : `${s.kind === 'class' ? 'new ' : ''}${s.name}(${s.params ?? ''})`,
      doc: s.doc, palette: s.palette, variants, used: s.used.filter((u) => u.file !== s.file),
      usedSelf: s.used.filter((u) => u.file === s.file).length, places: [], also: [], dupes: [],
      ...lookOf(catalog.looks, key, s, c, family),
    };
    pieces.push(piece);
    byKey[key] = piece;
  }
  for (const [from, to] of Object.entries(catalog.fold)) {
    const s = src[from], piece = byKey[to];
    if (!s || !piece) { stale.push(`fold: ${!s ? from : to} is not an export of a kit file`); continue; }
    piece.also.push({ name: s.name, file: s.file, line: s.line, call: `${s.name}(${s.params ?? ''})` });
    for (const u of s.used) if (u.file !== s.file && u.file !== piece.file) piece.used.push(u);
  }
  // a nook kit is named in a place's plan ({ kit: 'vending' }) and built by outdoor/nooks.js: those plan lines are
  // where it is used
  for (const [key, c] of Object.entries(catalog.pieces)) {
    const kit = c.variants?.[0]?.nook?.kit;
    if (!kit || !byKey[key]) continue;
    const re = new RegExp(`\\bkit: '${kit}'`);
    for (const f of files) {
      read(f).split('\n').forEach((l, i) => { if (re.test(l)) byKey[key].used.push({ file: f, line: i + 1, call: false }); });
    }
  }
  for (const key of Object.keys(catalog.pieces)) {
    if (!byKey[key] && !catalog.fold[key]) stale.push(`pieces: ${key} is not an export of a kit file`);
  }
  // the audit's families of things built more than once; a copy's line follows its function when it has a name
  const dupes = catalog.dupes.map((d) => {
    for (const k of d.shared) {
      if (byKey[k]) byKey[k].dupes.push(d.id);
      else stale.push(`dupes ${d.id}: ${k} is not a listed piece`);
    }
    const copies = d.copies.map(([f, line, fn, note]) => {
      const file = JS + f, text = read(file);
      if (!text) stale.push(`dupes ${d.id}: no file ${file}`);
      if (fn) {
        const at = text.split('\n').findIndex((l) => new RegExp(`(function\\*?\\s+${fn}\\b|\\b(const|let)\\s+${fn}\\s*=)`).test(l));
        if (at >= 0) line = at + 1;
      }
      return { file, line, fn, note, place: placeOf(file) };
    });
    return { id: d.id, title: d.title, lines: d.lines, shared: d.shared.filter((k) => byKey[k]).map((k) => byKey[k].id), copies };
  });
  for (const p of pieces) {
    if (!p.street) continue;
    if (byKey[p.street.key]) p.street.id = byKey[p.street.key].id;
    else stale.push(`street ${p.key}: ${p.street.key} is not a listed piece`);
    delete p.street.key;
  }
  for (const p of pieces) {
    p.used.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    p.places = [...new Set(p.used.map((u) => placeOf(u.file)))].sort();
  }
  return { families: catalog.families, looks: catalog.looks?.kinds || [], pieces, dupes, stale };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = new URL('../../', import.meta.url);
  const read = (f) => { try { return fs.readFileSync(new URL(f, root), 'utf8'); } catch { return ''; } };
  const files = fs.readdirSync(new URL(JS, root), { recursive: true }).filter((f) => f.endsWith('.js')).map((f) => JS + f).sort();
  const lib = kitLibrary(read, files, JSON.parse(read('tools/assets/kit.json')));
  for (const s of lib.stale) console.error('tools/assets/kit.json is out of date:', s);
  console.log(JSON.stringify(lib));
}
