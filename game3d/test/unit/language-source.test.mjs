import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { format } from 'prettier';
import { heardTextData, javascriptTextGroups, speechHintUsesKnownWord } from '../../../tools/lib/language-source.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const ui = fs.readFileSync(path.join(root, 'game3d/js/ui.js'), 'utf8');

test('heard-text declarations require data and survive quotes and wrapping', async () => {
  const expected = heardTextData(ui);
  assert.equal(expected.INTERJ.length, 15);
  assert.equal(expected.POOL.length, 111);
  assert.equal(expected.glossed, false);
  for (const singleQuote of [true, false])
    assert.deepEqual(heardTextData(await format(ui, { parser: 'babel', singleQuote, printWidth: 60 })), expected);
  assert.throws(() => heardTextData(ui.replace('const POOL =', 'const OTHER =')), /Missing binding POOL/);
  assert.throws(() => heardTextData("const POOL = 'あ'; const INTERJ = 42;"), /string array/);
  assert.equal(heardTextData(ui + '\n// INTERJ_GLOSS[key]').glossed, false);
});

test('unrendered metadata and other object rows cannot supply a translation', async () => {
  const source = `
    const rows = [{ ja: '未翻訳' }, { ja: '受付', en: 'RECEPTION' }];
    const data = { 'label': '未翻訳' };
    textTexture(g => { g.textAlign = 'start'; g.fillText('未翻訳', 0, 0); });
    const raw = String.raw\`\\u65e5\`;
  `;
  for (const input of [source, await format(source, { parser: 'babel' })]) {
    const groups = javascriptTextGroups(input).map(group => group.map(entry => entry.value));
    assert.equal(groups.filter(group => group.includes('未翻訳')).length, 3);
    for (const group of groups.filter(group => group.includes('未翻訳'))) assert.deepEqual(group, ['未翻訳']);
    assert.ok(groups.flat().includes('\\u65e5'));
    assert.ok(!groups.flat().includes('日'));
  }
});

test('text contexts keep translations together and unrelated labels apart', async () => {
  const source = `
    // ignored 日本
    const rows = [['機械室', 'MACHINE ROOM'], ['知らない', 2]];
    addPlate('階段', 1, { sub: 'STAIRS' });
    const a = textTexture(g => { g.fillText('受付', 0, 0); g.fillText('VISITORS', 0, 1); });
    const b = textTexture(g => { g.fillText('未翻訳', 0, 0); });
    const message = \`日本語\nmultiline\`;
    const escaped = '\\u65e5';
  `;
  const values = source => javascriptTextGroups(source).map(group => group.map(entry => entry.value));
  const expected = values(source);
  assert.ok(expected.some(group => group.includes('受付') && group.includes('VISITORS')));
  assert.ok(expected.some(group => group.includes('階段') && group.includes('STAIRS')));
  assert.ok(expected.some(group => group.length === 1 && group[0] === '未翻訳'));
  assert.ok(expected.some(group => group.length === 1 && group[0] === '日'));
  assert.ok(!expected.flat().includes('日本'));
  for (const singleQuote of [true, false])
    assert.deepEqual(values(await format(source, { parser: 'babel', singleQuote, printWidth: 40 })), expected);
  const filtered = javascriptTextGroups(ui, ['POOL', 'INTERJ']).flat().map(entry => entry.value);
  assert.ok(!filtered.includes(heardTextData(ui).POOL));
  assert.ok(!filtered.includes('えっと'));
  assert.equal(speechHintUsesKnownWord('// WORDS[k].ja known.has(k)'), false);
  assert.equal(speechHintUsesKnownWord("known['has'](id) && WORDS[id]['ja']"), true);
});

function normalizedReport(report) {
  const findings = new Map();
  for (const { n, where, ...finding } of report.findings) {
    const key = JSON.stringify({ ...finding, where: where.replace(/:\d+$/, '') });
    findings.set(key, (findings.get(key) || 0) + n);
  }
  return { words: report.words, findings: [...findings].sort(([a], [b]) => a.localeCompare(b)) };
}

test('the actual language audit preserves findings after formatting all runtime sources', async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-lang-format-'));
  const sources = fs.readdirSync(path.join(root, 'game3d/js'), { recursive: true })
    .filter(file => file.endsWith('.js')).map(file => path.join(root, 'game3d/js', file));
  const run = preload => {
    const args = [...(preload ? ['--import', preload] : []), 'game3d/tools/lang-audit.mjs', '--json'];
    const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 20000, maxBuffer: 4e6 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return normalizedReport(JSON.parse(result.stdout));
  };
  try {
    const expected = run();
    for (const singleQuote of [true, false]) {
      const formatted = {};
      for (const file of sources) formatted[file] = await format(fs.readFileSync(file, 'utf8'),
        { parser: 'babel', singleQuote, printWidth: 80 });
      const preload = path.join(scratch, 'formatted.mjs');
      fs.writeFileSync(preload, `import fs from 'node:fs';
        const formatted = ${JSON.stringify(formatted)};
        const original = fs.readFileSync;
        fs.readFileSync = function(file, options) {
          if (typeof file === 'string' && Object.hasOwn(formatted, file)) return formatted[file];
          return original.call(this, file, options);
        };`);
      assert.deepEqual(run(preload), expected, `singleQuote=${singleQuote}`);
    }
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
});
