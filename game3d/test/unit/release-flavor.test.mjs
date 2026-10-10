// The vanilla release transform and word scan (tools/release/flavor.mjs, scan.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { flavor, exportNames, STUBS } from '../../../tools/release/flavor.mjs';
import { scan } from '../../../tools/release/scan.mjs';

const read = (p) => fs.readFileSync(p, 'utf8');

test('every vanilla stub exports exactly what the module it replaces exports', () => {
  for (const [rel, stub] of Object.entries(STUBS)) {
    const real = exportNames(read(path.join('game3d', rel)));
    assert.deepEqual(exportNames(read(path.join('tools/release', stub))), real, `${stub} vs game3d/${rel}`);
  }
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'flavor-'));
  const g = path.join(dir, 'game3d');
  fs.mkdirSync(path.join(g, 'js'), { recursive: true });
  fs.writeFileSync(path.join(g, 'index.html'), '<!-- the private build -->\n<p>Amakawa</p>\n');
  fs.writeFileSync(path.join(g, 'js/main.js'), "import './full.js';\nimport { installViewer } from './plugins.js';\n");
  fs.copyFileSync('game3d/js/full.js', path.join(g, 'js/full.js'));
  fs.copyFileSync('game3d/js/plugins.js', path.join(g, 'js/plugins.js'));
  fs.writeFileSync(
    path.join(g, 'js/opt.js'),
    "import './full.js';\n// adult scenes\nexport const D = { a: 1, ...(__FULL__ ? { privateMode: true } : {}) };\n" +
      "export function f() { if (__FULL__) return 'reward'; return 'plain'; }\n",
  );
  fs.writeFileSync(path.join(g, 'data.json'), JSON.stringify({ name: 'x' }, null, 2));
  return dir;
}

test('the vanilla transform drops full-only branches, comments and the loader', async () => {
  const dir = fixture();
  try {
    const before = await scan(dir);
    assert.ok(before.findings.length > 0, 'the fixture starts with findings');
    const { stubs } = await flavor({ flavor: 'vanilla', dir });
    assert.deepEqual(stubs.sort(), ['game3d/js/full.js', 'game3d/js/plugins.js']);
    const opt = read(path.join(dir, 'game3d/js/opt.js'));
    assert.doesNotMatch(opt, /private|reward|adult|__FULL__/i);
    assert.match(opt, /plain/);
    assert.doesNotMatch(read(path.join(dir, 'game3d/js/plugins.js')), /island|fetch|import\(/);
    const after = await scan(dir);
    assert.deepEqual(after.findings, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a stage holding a symlink is refused before anything is written', async () => {
  const dir = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'shared.json'), '{\n  "a": 1\n}');
    fs.symlinkSync(path.join(outside, 'shared.json'), path.join(dir, 'game3d/linked.json'));
    const src = read(path.join(dir, 'game3d/js/opt.js'));
    await assert.rejects(flavor({ flavor: 'vanilla', dir }), /symlink/);
    assert.equal(read(path.join(outside, 'shared.json')), '{\n  "a": 1\n}');
    assert.equal(read(path.join(dir, 'game3d/js/opt.js')), src);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('a hard-linked file in the stage is replaced, never written through', async () => {
  const dir = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'));
  try {
    const shared = path.join(outside, 'shared.json');
    fs.writeFileSync(shared, '{\n  "a": 1\n}');
    fs.linkSync(shared, path.join(dir, 'game3d/hard.json'));
    await flavor({ flavor: 'vanilla', dir });
    assert.equal(read(shared), '{\n  "a": 1\n}');
    assert.equal(read(path.join(dir, 'game3d/hard.json')), '{"a":1}');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('the full flavor leaves the files as they are', async () => {
  const dir = fixture();
  try {
    const src = read(path.join(dir, 'game3d/js/opt.js'));
    await flavor({ flavor: 'full', dir });
    assert.equal(read(path.join(dir, 'game3d/js/opt.js')), src);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the scan reads file names, JSON keys and values, and skips 18 in arithmetic', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-'));
  try {
    fs.writeFileSync(path.join(dir, 'rewards.png'), '');
    fs.writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ skimpyOutfit: 1, note: 'for 18+ only' }));
    fs.writeFileSync(path.join(dir, 'b.js'), 'const x=0.18+y,z=18+n;');
    const { findings } = await scan(dir);
    const words = findings.map((f) => f.match(/"([^"]+)"/)[1]).sort();
    assert.deepEqual(words, ['18+', 'reward', 'skimpy']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
