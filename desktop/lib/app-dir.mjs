// The folder electron-builder packs into app.asar: the shell code from desktop/app/, the content reader from
// desktop/pak/, the save-file API from desktop/saves/ when present, and the files written per build (package.json,
// config.json, the masked pack key). The full/ folder goes in only for the full flavor.
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const SHIPPED = (name) => /\.(mjs|cjs|js)$/.test(name) && !/\.test\.|bench|pack\.mjs$/.test(name);

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

// the pack key, XOR-masked so it isn't a plain string in the asar (this stops a grep, not a person; see the docs)
function keyModule(key) {
  const raw = Buffer.from(key, 'utf8');
  const mask = randomBytes(raw.length);
  const data = Buffer.from(raw.map((b, i) => b ^ mask[i]));
  return `const m = Buffer.from('${mask.toString('base64')}', 'base64');\nconst d = Buffer.from('${data.toString('base64')}', 'base64');\nexport const key = () => Buffer.from(d.map((b, i) => b ^ m[i])).toString('utf8');\n`;
}

export function writeAppDir({ desktop, out, flavor, identity, version, release, key, devResources }) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const f of ['main.mjs', 'serve.mjs']) fs.copyFileSync(path.join(desktop, 'app', f), path.join(out, f));
  fs.writeFileSync(path.join(out, 'preload.cjs'), preload(desktop));
  const pakSource = path.join(desktop, 'pak/source.mjs');
  if (fs.existsSync(pakSource)) copyModules(path.join(desktop, 'pak'), path.join(out, 'pak'));
  else {
    fs.mkdirSync(path.join(out, 'pak'), { recursive: true });
    fs.copyFileSync(path.join(desktop, 'app/source-dir-temp.mjs'), path.join(out, 'pak/source.mjs'));
  }
  copyModules(path.join(desktop, 'saves'), path.join(out, 'saves'));
  if (flavor === 'full') {
    fs.mkdirSync(path.join(out, 'full'), { recursive: true });
    for (const f of fs.readdirSync(path.join(desktop, 'app/full'))) fs.copyFileSync(path.join(desktop, 'app/full', f), path.join(out, 'full', f));
  }
  if (key) fs.writeFileSync(path.join(out, 'k.mjs'), keyModule(key));
  fs.writeFileSync(path.join(out, 'config.json'), JSON.stringify({ release, ...(devResources ? { devResources } : {}) }, null, 2) + '\n');
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
