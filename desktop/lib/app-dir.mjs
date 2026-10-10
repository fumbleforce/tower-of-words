// The folder electron-builder packs into app.asar. The main process (desktop/app/main.mjs with serve.mjs, the content
// reader from desktop/pak/ and this build's key shares) is bundled and minified into one main.mjs, so the shares and
// the code that joins them have no telling names (desktop/pak/FORMAT.md, "Keeping the key out of easy reach").
// Beside it: the preload, the save-file API from desktop/saves/ when present, config.json, package.json, and, for
// the full flavor only, full/ (bundled the same way).
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SHIPPED = (name) => /\.(mjs|cjs|js)$/.test(name) && !/\.test\.|bench|pack\.mjs$|key\.mjs$/.test(name);

function copyModules(from, to) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const name of fs.readdirSync(from)) {
    if (!SHIPPED(name) || !fs.statSync(path.join(from, name)).isFile()) continue;
    fs.copyFileSync(path.join(from, name), path.join(to, name));
    n++;
  }
  return n;
}

// a sandboxed preload can't require its own files: paste the storage API in, wrapped as a CommonJS module
function preload(desktop) {
  let text = fs.readFileSync(path.join(desktop, 'app/preload.cjs'), 'utf8');
  const api = path.join(desktop, 'saves/preload-api.cjs');
  if (fs.existsSync(api)) {
    const src = fs.readFileSync(api, 'utf8');
    const wrapped = `storageApi = (() => {\n  const module = { exports: {} };\n  const exports = module.exports;\n${src}\n  return module.exports.storageApi || module.exports;\n})();`;
    text = text.replace('// @storage-api', wrapped);
  }
  return text;
}

// the key as two random XOR shares in two modules (joined in main.mjs just before the pack is opened)
function keyShares(dir, key) {
  const a = randomBytes(key.length);
  const b = Buffer.from(key.map((x, i) => x ^ a[i]));
  fs.writeFileSync(path.join(dir, 'ka.mjs'), `export const a = Buffer.from('${a.toString('base64')}', 'base64');\n`);
  fs.writeFileSync(path.join(dir, 'kb.mjs'), `export const b = Buffer.from('${b.toString('base64')}', 'base64');\n`);
}

function bundle(entry, outfile) {
  require('esbuild').buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: ['electron'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning',
  });
}

// key: this build's 32-byte pack key (a Buffer), or null when the content is a plain folder
export function writeAppDir({ desktop, out, flavor, identity, version, release, key }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const src = path.join(out, '..', 'app-src');
  fs.rmSync(src, { recursive: true, force: true });
  fs.mkdirSync(src, { recursive: true });
  for (const f of ['main.mjs', 'serve.mjs']) fs.copyFileSync(path.join(desktop, 'app', f), path.join(src, f));
  copyModules(path.join(desktop, 'pak'), path.join(src, 'pak'));
  keyShares(src, key || randomBytes(32));
  bundle(path.join(src, 'main.mjs'), path.join(out, 'main.mjs'));
  if (flavor === 'full') {
    fs.mkdirSync(path.join(src, 'full'), { recursive: true });
    for (const f of fs.readdirSync(path.join(desktop, 'app/full'))) fs.copyFileSync(path.join(desktop, 'app/full', f), path.join(src, 'full', f));
    bundle(path.join(src, 'full/full.mjs'), path.join(out, 'full/full.mjs'));
    fs.copyFileSync(path.join(src, 'full/start.html'), path.join(out, 'full/start.html'));
  }
  fs.rmSync(src, { recursive: true, force: true });
  fs.writeFileSync(path.join(out, 'preload.cjs'), preload(desktop));
  copyModules(path.join(desktop, 'saves'), path.join(out, 'saves'));
  fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify({ release, content: key ? 'pak' : 'folder' }, null, 2) + '\n');
  const pkg = {
    name: identity.name,
    productName: identity.productName,
    version,
    description: identity.description,
    author: { name: 'fumbleforce', email: 'fumbleforce@users.noreply.github.com' },
    homepage: 'https://github.com/fumbleforce/tower-of-words',
    license: 'UNLICENSED',
    main: 'main.mjs',
    type: 'module',
  };
  fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}
