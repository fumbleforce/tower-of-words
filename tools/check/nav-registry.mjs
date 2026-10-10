// Each tool and nav entry is defined in one place (Jørgen, 2026-10-10: "make sure every tool and item has one place they
// are defined"): ITEMS in tools/nav/nav.js for the public tools, the private registry (island/private/bible/nav.js,
// local only) for what private mode adds. Fails when
//  - an id, label or address appears twice across the two registries,
//  - a public tool page in ITEMS does not load the shared menu,
//  - any other page or script lists three or more of the tools' addresses (a second menu or hub),
//  - an old private menu bar or a second private registry turns up.
// notes/tools/README.md describes the pages. CPU only; part of npm run check.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const NAV = 'tools/nav/nav.js';
const PRIVATE_REG = 'island/private/bible/nav.js';
const problems = [];
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const entries = (src, where) => [...src.matchAll(/\{\s*id:\s*'([\w-]+)',\s*label:\s*'([^']+)',\s*href:\s*([^,]+),/g)]
  .map(([, id, label, href]) => ({ id, label, href: href.trim(), where }));
const pub = entries(read(NAV).split('const ITEMS = [')[1]?.split('];')[0] || '', NAV);
if (pub.length < 5) problems.push(`${NAV}: could not read ITEMS (found ${pub.length})`);
// the private registry lives in the main checkout only (git-ignored); a worktree checks it there when it can
const mainRoot = (() => {
  try { return path.dirname(execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim()); } catch { return root; }
})();
const privFile = [root, mainRoot].map((r) => path.join(r, PRIVATE_REG)).find((f) => fs.existsSync(f));
const priv = privFile ? entries(fs.readFileSync(privFile, 'utf8'), PRIVATE_REG) : [];

const all = [...pub, ...priv];
for (const key of ['id', 'label', 'href']) {
  const seen = new Map();
  for (const e of all) {
    if (seen.has(e[key])) problems.push(`${key} ${e[key]} is defined twice: ${seen.get(e[key])} and ${e.where}`);
    else seen.set(e[key], e.where);
  }
}

// every public tool page loads the shared menu (the bible through bible/app.js)
for (const e of pub) {
  const href = e.href.replace(/^'|'$/g, '').split('#')[0];
  if (/^https?:/.test(href) || e.id === 'game' || !href) continue;
  const file = href.endsWith('/') ? href + 'index.html' : href;
  const src = fs.existsSync(path.join(root, file)) ? read(file) : '';
  const viaApp = file === 'bible/index.html' && /nav\/nav\.js/.test(read('bible/app.js'));
  if (!src) problems.push(`${e.id}: ${file} is missing`);
  else if (!viaApp && (src.match(/nav\/nav\.js/g) || []).length !== 1) problems.push(`${file} must load ${NAV} exactly once`);
}

// no second menu: no other file names three or more tool addresses
const addresses = pub.map((e) => e.href.replace(/^'|'$/g, '').split('#')[0]).filter((h) => h && h !== 'bible/')
  .map((h) => h.replace(/^https?:\/\/127\.0\.0\.1:/, ':'));
const tracked = execFileSync('git', ['ls-files', '*.html', '*.js', '*.mjs'], { cwd: root, encoding: 'utf8' }).split('\n')
  .filter((f) => f && !/^(legacy|reviews|showcase|art\/candidates|node_modules)\//.test(f) && f !== NAV && f !== 'tools/check/nav-registry.mjs');
const privatePages = privFile ? ['bible', 'rewards'].flatMap((dir) => {
  const d = path.join(path.dirname(privFile), '..', dir);
  return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.(html|js)$/.test(f)).map((f) => path.join(d, f)) : [];
}).filter((f) => f !== privFile) : [];
for (const f of [...tracked.map((t) => path.join(root, t)), ...privatePages]) {
  let src;
  try { src = fs.readFileSync(f, 'utf8'); } catch { continue; }
  const hits = addresses.filter((a) => src.includes(a));
  const name = path.relative(root, f).replace(/^(\.\.\/)+/, '');
  if (hits.length >= 3) problems.push(`${name} lists ${hits.length} tool addresses (${hits.join(', ')}): a second menu; use ${NAV}`);
  if (privatePages.includes(f) && /\bpnav\b|AmakawaNav\.addPrivate|addPrivate\(/.test(src)) problems.push(`${name}: a second private menu or registry; only ${PRIVATE_REG}`);
}

if (problems.length) {
  console.error('nav registry:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`nav registry: ${pub.length} tools, ${priv.length} private entries, each defined once${privFile ? '' : ' (no private registry here)'}`);
