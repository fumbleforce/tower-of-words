import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { format } from 'prettier';
import { assetSourceData, assetSourceFiles } from '../../../tools/assets/source-data.mjs';
import { STORY_FILES } from '../../js/places/definitions.js';
import { WORDS } from '../../js/lang.js';

const root = new URL('../../../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');

test('asset source data includes the actual words, cast, music, sounds and style metadata', () => {
  const data = assetSourceData(read);
  assert.deepEqual(data.words, WORDS);
  assert.equal(Object.keys(data.people).length, 12);
  assert.deepEqual(data.people.rei.used, ['gate', 'office', 'train']);
  assert.match(data.people.rei.comments[0], /Sales: long silver-grey hair/);
  assert.equal(data.people.mori.comments[0], 'portrait: grey hair, no glasses, brown-grey suit, navy tie');
  assert.deepEqual(data.music, { train: 'calm', gate: 'lively', office: 'office' });
  assert.equal(data.beds.gate, 'bed_lobby');
  assert.ok(data.events.office.some(event => event.f === 'phone_far'));
  assert.deepEqual(data.sfx.clack.f, ['clack-1', 'clack-2', 'clack-3']);
  assert.ok(data.sfxCalls.includes('word'));
  assert.equal(data.styles[1].name, 'Soft cel');
  assert.ok(data.icons.some(icon => icon.label === 'MIC_SVG'));
  assert.ok(data.wordIcons.matte.includes('<path'));
  assert.ok(data.stories.office.speakers.mio > 0);
  assert.deepEqual(Object.fromEntries(Object.entries(data.stories).map(([place, story]) => [place, story.speakers])), {
    train: { mio: 50, aoi: 3, bun: 2, youth: 2, music: 2, stander: 2, eric: 7, ann: 2, kuroda: 2, reader: 1 },
    gate: { guard: 19, commuter: 2, eric: 4, gatev: 6, kuroda: 8, miotext: 1 },
    forecourt: { eric: 1, kuro: 5 },
    plaza: { eric: 1, canteen_worker: 1 },
    office: { kenji: 17, mori: 19, mio: 45, eric: 5, emi: 3 },
    dorm_court: {},
    dorms: { eric: 3 },
    transitions: { sales1: 2, sales2: 1 },
  });
  assert.equal(data.icons.length, 18); // 18th: the Photos chip (ui/finds-view.js)
});

test('the full public scanner registers parsed metadata and preserves existing icon IDs', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-public-assets-'));
  try {
    const output = path.join(scratch, 'assets.json');
    const result = spawnSync('python3', ['game3d/test/support/public-asset-scan.py', output],
      { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const entries = new Map(JSON.parse(fs.readFileSync(output, 'utf8')).assets.map(entry => [entry.id, entry]));
    assert.equal(entries.get('icon/say-a-word-c34e06')?.name, 'Say a word');
    assert.ok(entries.get('prop/kit/bench')?.used.length > 0);
    assert.ok(entries.get('model/chibi-rei')?.used.includes('B2 office'));
    assert.ok(entries.get('music/calm')?.used.includes('Background loop in Train'));
    assert.match(entries.get('icon/word-matte')?.svg || '', /<path/);
    assert.equal(entries.get('style/world-1')?.name, 'World look 1: Soft cel');
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
});

test('all asset metadata survives formatting of every runtime and story source in both quote modes', async () => {
  const expected = assetSourceData(read);
  const files = [...assetSourceFiles, ...STORY_FILES.map(name => `game3d/story/${name}.js`)];
  for (const singleQuote of [true, false]) {
    const formatted = {};
    for (const file of files) formatted[file] = await format(read(file), { parser: 'babel', singleQuote, printWidth: 80 });
    assert.deepEqual(assetSourceData(file => formatted[file]), expected, `singleQuote=${singleQuote}`);
  }
});

test('missing and dynamic asset tables fail visibly and computed cast calls are recognized', () => {
  assert.throws(() => assetSourceData(file => read(file).replace('const MUSIC =', 'const NOT_MUSIC =')), /Missing binding MUSIC/);
  assert.throws(() => assetSourceData(file => read(file).replace("train: 'calm'", 'train: chooseMusic()')), /Expected static data/);
  const changed = assetSourceData(file => read(file).replace('PEOPLE.rei()', "PEOPLE['rei']()"));
  assert.deepEqual(changed.people.rei.used, ['gate', 'office', 'train']);
  const quoted = assetSourceData(file => file === 'game3d/js/style/index.js'
    ? read(file).replaceAll('name:', "'name':").replaceAll('note:', "'note':") : read(file));
  assert.deepEqual(quoted.styles, changed.styles);
});
