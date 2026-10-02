import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { loadLive } from '../../../bible/live.js';
import { ensureBuild } from '../../../tools/lib/build-stamp.mjs';
import { checkRegistrations } from '../../../tools/check/registrations.mjs';
import { assetRuntimeData } from '../../../tools/assets/runtime-data.mjs';
import { PLACE_FILES } from '../../js/places/definitions.js';
import declarations from '../fixtures/declarations-before.json' with { type: 'json' };
import propsBefore from '../fixtures/asset-props-before.json' with { type: 'json' };
import propsAdded from '../fixtures/asset-props-added.json' with { type: 'json' };
const root = new URL('../../../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');

test('actual bible loader preserves the complete portrait table', async () => {
  ensureBuild(); // generated file; the review server stamps it when the bible fetches it
  const originalFetch = globalThis.fetch, originalLocation = globalThis.location;
  const requested = [];
  globalThis.location = { href: new URL('bible/index.html', root).href };
  // Only public source files are provided; no directory traversal or network requests.
  globalThis.fetch = async url => {
    requested.push(String(url));
    assert.ok(!String(url).includes('/private/'));
    const parsed = new URL(url);
    const file = parsed.protocol === 'file:' && String(url).startsWith(root.href) ? fileURLToPath(parsed) : null;
    const text = file && /\.(md|js|json)$/.test(file) ? fs.readFileSync(file, 'utf8') : '{}';
    return { ok: true, text: async () => text, json: async () => JSON.parse(text) };
  };
  try {
    const live = await loadLive('../', {});
    assert.equal(Object.keys(live.portraits).length, 9);
    assert.deepEqual(live.portraits, declarations.PORTRAITS);
    assert.equal(live.ok['game3d/js/ui/portrait-data.js'], true);
    assert.equal(live.errors.length, 0, live.errors.join('\n'));
    assert.ok(requested.length > 0);
  } finally { globalThis.fetch = originalFetch; globalThis.location = originalLocation; }
});

test('actual asset scanner preserves portraits and all previous prop labels and previews', () => {
  const result = spawnSync('python3', ['tools/assets/scan.py', '--runtime-data'],
    { cwd: fileURLToPath(root), encoding: 'utf8', timeout: 40000 });
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.deepEqual(data.portraits, declarations.PORTRAITS);
  assert.equal(propsBefore.length, 63);
  const actual = new Map(data.props.map(prop => [prop.id_, prop]));
  for (const prop of propsBefore) assert.deepEqual(actual.get(prop.id_), prop);
  // Four quoted labels and two nested anchor expressions were missed by the old regex.
  const added = data.props.filter(prop => !propsBefore.some(old => old.id_ === prop.id_)).sort((a, b) => a.id_.localeCompare(b.id_));
  assert.deepEqual(added, propsAdded);

});

test('real factory mutations fail CPU registration checks', () => {
  checkRegistrations();
  const mutations = [
    ['game3d/js/places/office.js', 'lunchSit:', 'lunchSit2:'],
    ['game3d/js/places/train.js', 'by_aoi:', 'missing_spot:'],
    ['game3d/js/main.js', "lobbyPlace as gate } from './places/lobby.js'", "lobbyPlace as gate } from './places/forecourt.js'"],
    ['game3d/js/places/train.js', '...PLACE_DETAILS.train.things.cup', '...PLACE_DETAILS.train.things.rack'],
  ];
  for (const [file, before, after] of mutations) {
    assert.ok(read(file).includes(before), `mutation target ${before}`);
    assert.throws(() => checkRegistrations(path => path === file ? read(path).replace(before, after) : read(path)), /differ|wrong metadata/);
  }
});

test('factory checks and asset reads survive mechanical formatting', async () => {
  const files = {};
  for (const file of [...Object.values(PLACE_FILES), 'game3d/js/main.js']) files[file] = await format(read(file), { parser: 'babel', printWidth: 120 });
  const formattedRead = file => files[file] ?? read(file);
  checkRegistrations(formattedRead);
  // Coordinate expression whitespace is immaterial to the Python numeric reader.
  const normalize = data => JSON.parse(JSON.stringify(data), (key, value) =>
    (key === 'args' || key === 'at') && Array.isArray(value) ? value.map(v => v.replace(/\s/g, '')) : value);
  assert.deepEqual(normalize(assetRuntimeData(formattedRead)), normalize(assetRuntimeData()));
});
