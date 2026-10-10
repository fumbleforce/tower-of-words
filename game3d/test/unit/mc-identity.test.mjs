// The protagonist config (js/mc.js, data/mc/) must not change anything Eric's game shows: the fixture holds what the
// code and story showed for Eric before the config existed (#251). The save side is in save-restore.test.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import was from '../fixtures/mc-eric.json' with { type: 'json' };
import { MC, PROTAGONISTS, PLAYER_ID, expandText, migrateMc, pickMc, playerClip, tokens } from '../../js/mc.js';
import { DEFAULT_SPEAKERS } from '../../js/narrative/speakers.js';
import { NAMES, WORDS } from '../../js/lang.js';
import { PLACE_NAMES } from '../../js/places/definitions.js';
import { PORTRAITS } from '../../js/ui/portrait-data.js';
import { defaultCast, personFor, setRole } from '../../js/roles.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const eric = PROTAGONISTS.eric;

function strings(v, out = [], seen = new Set()) {
  if (typeof v === 'string') out.push(v);
  else if (v && typeof v === 'object' && !seen.has(v)) {
    seen.add(v);
    for (const k of Object.keys(v)) strings(v[k], out, seen);
  }
  return out;
}
const storyFiles = (dir = path.join(root, 'game3d/story')) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? storyFiles(f) : f.endsWith('.js') ? [f] : [];
  });

test('Eric is the default and the player id stays eric', () => {
  assert.equal(MC.id, 'eric');
  assert.equal(PLAYER_ID, 'eric');
  assert.equal(pickMc(null, null), 'eric');
  assert.equal(pickMc('carina', 'eric'), 'carina', '?mc= wins for the visit');
  assert.equal(pickMc(null, 'carina'), 'carina', 'else the autosave decides');
  assert.equal(pickMc('nobody', 'nobody'), 'eric');
});

test("the engine's own strings for Eric are what they were", () => {
  assert.equal(DEFAULT_SPEAKERS[PLAYER_ID].name, was.speaker);
  assert.ok(NAMES.some((n) => n.ja === was.name.ja && n.en === was.name.en));
  for (const [id, key] of Object.entries(was.voices)) {
    assert.equal(WORDS[id].voice, key, id);
    assert.equal(playerClip(key, eric), key, id);
  }
  assert.equal(playerClip('eric-ohayo', { voice: { words: 'carina' } }), 'carina-ohayo');
  assert.equal(playerClip('word-ohayo', { voice: { words: 'carina' } }), 'word-ohayo');
  assert.equal(PLACE_NAMES.dorms, was.room);
  assert.deepEqual(PORTRAITS[eric.portrait.set], was.portrait.faces);
  assert.equal(eric.portrait.set, was.portrait.set);
  assert.deepEqual(eric.portrait.crop, was.portrait.crop);
  assert.deepEqual({ dir: eric.model.id, height: eric.model.height, chibi: eric.model.chibi }, was.model);
  assert.equal(eric.voice.lines, was.lineVoice);
  for (const c of was.code) {
    const src = fs.readFileSync(path.join(root, c.file), 'utf8');
    assert.ok(src.includes(c.code), `${c.file} no longer has ${c.code}`);
    assert.deepEqual(new Function('MC', `return ${c.expr}`)(eric), c.was, c.file);
  }
});

test('every story line that named Eric renders the same for Eric', async () => {
  const { expandMc } = await import('../../js/mc.js');
  for (const [file, lines] of Object.entries(was.story)) {
    const mod = await import(pathToFileURL(path.join(root, file)).href);
    const shown = new Set(strings(expandMc(mod, eric)));
    for (const line of lines) assert.ok(shown.has(line), `${file}: Eric no longer sees ${JSON.stringify(line)}`);
  }
});

test('every {mc.*} token in the story resolves for every protagonist', async () => {
  for (const f of storyFiles()) {
    const mod = await import(pathToFileURL(f).href);
    for (const s of strings(mod))
      for (const mc of Object.values(PROTAGONISTS)) {
        const out = expandText(s, mc);
        assert.ok(!out.includes('{mc.'), `${path.relative(root, f)}: ${mc.id} leaves ${out}`);
      }
  }
});

test('protagonist configs have the same fields as Eric', () => {
  const shape = (o) =>
    Object.entries(o)
      .filter(([k]) => k !== 'orientation')
      .map(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) && k !== 'text' && k !== 'by' ? [k, shape(v)] : k));
  for (const mc of Object.values(PROTAGONISTS)) {
    assert.deepEqual(shape(mc), shape(eric), mc.id);
    assert.deepEqual(Object.keys(tokens(mc)).sort(), Object.keys(tokens(eric)).sort(), mc.id);
  }
  const carina = PROTAGONISTS.carina;
  assert.equal(expandText('{mc.name}, {mc.called}, {mc.they}', carina), 'Carina, カリーナさん, she');
  assert.equal(expandText('{mc.called.kenji}', carina), 'カリーナさん', 'a person with no address of their own');
});

test('old saves play Eric with the default cast', () => {
  const old = { v: 1, day: 1 };
  assert.deepEqual(migrateMc(old), { v: 1, day: 1, mc: 'eric', cast: defaultCast() });
  assert.equal(migrateMc({ v: 1, mc: 'carina' }).mc, 'carina');
  assert.equal(migrateMc({ v: 1, mc: 'gone' }).mc, 'eric');
  const cast = defaultCast();
  assert.equal(personFor(cast, 'team_lead'), 'emi');
  assert.equal(personFor(cast, 'gate_guard'), 'guard');
  assert.throws(() => setRole(cast, 'programmer', 'emi'), /fixed/);
  assert.equal(personFor(setRole(cast, 'receptionist', 'rei'), 'receptionist'), 'rei');
});
