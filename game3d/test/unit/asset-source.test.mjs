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
    train: { mio: 50, aoi: 3, bun: 2, music: 2, stander: 2, eric: 5, ann: 2, kuroda: 2, reader: 1 },
    gate: { worker_a: 1, worker_b: 1, commuter_1: 1, commuter_2: 1, commuter_3: 1, guard: 19, commuter: 1, eric: 4, gatev: 6, kuroda: 8, miotext: 1 },
    forecourt: { eric: 4, kuro: 10 },
    plaza: { eric: 1, canteen_worker: 3 },
    canteen: { canteen_worker: 12, eric: 23, canteen_shirt: 7, canteen_cardigan: 6, canteen_polo: 5 },
    office: { kenji: 28, mori: 18, mio: 46, eric: 5, emi: 3 },
    campus: {},
    print_shop: {},
    dorm_court: {},
    dorms: { eric: 3 },
    shotengai: { station_worker: 4, eric: 2 },
    izakaya: {},
    bakery: { bakery_clerk: 5 }, konbini: { konbini_clerk: 5 },
    karaoke: {},
    karaoke_booth: {},
    east_lane: {},
    east_coast: {},
    dorm_commons: {},
    sports: {},
    pool: {},
    gym: {},
    office_quarter: {},
    harbour: {},
    ferry_terminal: { eric: 16, ferry_reader: 4, ferry_staff: 4, ferry_traveller: 4 },
    works: {},
    transitions: { sales1: 2, sales2: 1 },
  });
  assert.equal(data.icons.length, 29); // 18th: the Photos chip (ui/finds-view.js); the ticket app (ui/tickets-view.js) has none; 19th: the phone's quick save chip (saves/actions.js); 20th and 21st: the dialogue box's row (ui/vn-controls.js) and the backlog (ui/backlog.js); the pins' symbols moved to ui/pin-tip.js with five new ones for the ways between places (door, arrow, stairs, lift, walk-to spot): 26; map goal, close and lock symbols: 29
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
    assert.ok(entries.get('piece/props/bench')?.used.length > 0 && entries.get('piece/outdoor/furniture/bench')?.used.length > 0);
    assert.ok(entries.get('model/chibi-rei')?.used.includes('B2 office'));
    assert.ok(entries.get('music/calm')?.used.includes('Background loop in Train'));
    assert.match(entries.get('icon/word-matte')?.svg || '', /<path/);
    assert.equal(entries.get('style/world-1')?.name, 'World look 1: Soft cel');
    assert.deepEqual(entries.get('room/ferry_terminal')?.view, { type: 'room', room: 'ferry_terminal' });
    assert.equal(entries.get('prop/ferry_terminal/ferry_landing_seat')?.view.room, 'ferry-terminal');
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
});

test('all asset metadata survives formatting of every runtime and story source in both quote modes', async () => {
  const expected = assetSourceData(read);
  // and day 2's and day 3's words, which lang.js spreads into WORDS
  const files = [...assetSourceFiles, ...STORY_FILES.map(name => `game3d/story/${name}.js`), 'game3d/story/day2/words.js',
    'game3d/story/day3/words.js', 'game3d/story/day4/words.js', 'game3d/story/conversations/station-worker.js'];
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
