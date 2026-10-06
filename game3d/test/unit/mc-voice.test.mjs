// Voice clips per protagonist (docs/game/systems.md, Protagonists): Eric's keys never change, and another
// protagonist gets its own keys for the player's lines, the player's words and any line a {mc.*} token changes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROTAGONISTS, ownClip, playerClip } from '../../js/mc.js';
import { manifestOf, voiceLines, mondayStandIns, standInKey } from '../../tools/voice-manifest.mjs';
import { heardKey, lineKey } from '../../tools/heardkey.mjs';

const { eric, carina } = PROTAGONISTS;
// a story with a plain line, a player line, an NPC line naming the player and an overheard one that does
const story = () => ({
  nodes: {
    a: [
      { say: 'mio', text: 'Morning.' },
      { say: 'eric', text: 'Hi. Um... good morning?' },
      { say: 'kenji', text: '{mc.name}-san? I am Kenji!' },
      { say: 'mori', overheard: true, text: '{mc.called}は、どちらがいいですか。' },
      'emi: You must be {mc.name}.',
    ],
  },
});
const sets = [{ day: 1, files: [{ name: 'test', load: async () => story() }] }];

test("Eric's manifest is the same with every protagonist in it as on its own", async () => {
  const all = await voiceLines();
  const alone = await voiceLines({ mcs: ['eric'] });
  assert.deepEqual(manifestOf({ eric: all.eric }), manifestOf(alone));
  assert.ok(all.eric.every((o) => !o.own && !o.key.includes('-carina') && !o.key.startsWith('carina-')));
  assert.ok(all.carina.some((o) => o.own), 'Carina has clips of her own');
});

test("Eric's keys are the old ones", async () => {
  const { eric: lines } = await voiceLines({ mcs: ['eric'], sets });
  const keys = new Map(lines.map((o) => [o.text, o.key]));
  assert.equal(keys.get('Hi. Um... good morning?'), lineKey('eric', 'Hi. Um... good morning?'));
  assert.equal(keys.get('Eric-san? I am Kenji!'), lineKey('kenji', 'Eric-san? I am Kenji!'));
  assert.equal(keys.get('You must be Eric.'), lineKey('emi', 'You must be Eric.'));
  assert.equal(keys.get('エリックさんは、どちらがいいですか。'), heardKey('エリックさんは、どちらがいいですか。'));
  assert.equal(keys.get('Morning.'), lineKey('mio', 'Morning.'));
  assert.ok(lines.some((o) => o.key === 'eric-matte' && o.speaker === 'eric'));
});

test('Carina gets her own keys for player lines, words and token lines, and shares the rest', async () => {
  const { eric: e, carina: c } = await voiceLines({ sets });
  const by = new Map(c.map((o) => [o.text, o]));
  const ericKeys = new Set(e.map((o) => o.key));
  // her own lines: the same text as Eric's, her own key and speaker
  const hi = by.get('Hi. Um... good morning?');
  assert.deepEqual([hi.key, hi.speaker, hi.own], [lineKey('eric', 'Hi. Um... good morning?') + '-carina', 'carina', true]);
  // the words she says
  assert.ok(c.some((o) => o.key === 'carina-matte' && o.speaker === 'carina'));
  assert.ok(!c.some((o) => o.key === 'eric-matte'));
  // lines that name her: the same speaker, a key of her own
  const kenji = by.get('Carina-san? I am Kenji!');
  assert.deepEqual([kenji.key, kenji.speaker], [lineKey('kenji', 'Carina-san? I am Kenji!') + '-carina', 'kenji']);
  assert.equal(by.get('You must be Carina.').key, lineKey('emi', 'You must be Carina.') + '-carina');
  const mori = by.get('カリーナさんは、どちらがいいですか。');
  assert.deepEqual([mori.key, mori.speaker, mori.overheard], [heardKey('カリーナさんは、どちらがいいですか。') + '-carina', 'mori', true]);
  // everything else is Eric's clip
  const morning = by.get('Morning.');
  assert.deepEqual([morning.key, morning.own], [lineKey('mio', 'Morning.'), false]);
  assert.ok(c.some((o) => o.key === 'word-matte' && !o.own), "Mio's slow words are shared");
  for (const o of c) assert.equal(ericKeys.has(o.key), !o.own, o.key);
  // one manifest holds both without a clash
  const m = manifestOf({ eric: e, carina: c });
  assert.equal(m.length, new Set(m.map((o) => o.key)).size);
  assert.equal(m.length, e.length + c.filter((o) => o.own).length);
});

test('the game picks the protagonist’s own clip, else the stand-in', () => {
  assert.equal(ownClip('ln-abc', eric), 'ln-abc');
  assert.equal(ownClip('eric-ohayo', eric), 'eric-ohayo');
  assert.equal(ownClip('ln-abc', carina), 'ln-abc-carina');
  assert.equal(ownClip('oh-abc', carina), 'oh-abc-carina');
  assert.equal(ownClip('eric-ohayo', carina), 'carina-ohayo');
  assert.equal(playerClip('eric-ohayo', carina, () => true), 'carina-ohayo');
  assert.equal(playerClip('eric-ohayo', carina, () => false), carina.voice.words + '-ohayo');
  assert.equal(playerClip('eric-ohayo', eric, () => true), 'eric-ohayo');
  assert.equal(playerClip('word-ohayo', carina, () => true), 'word-ohayo');
});


test('approved Carina casting uses own Monday lines and emits no Eric stand-in additions', async () => {
  const byMc = await voiceLines();
  const base = manifestOf({ eric: byMc.eric });
  assert.ok(PROTAGONISTS.carina.voice.ref);
  assert.deepEqual(mondayStandIns(byMc, base), []);
  const named = byMc.carina.filter(line => line.day === 5 && line.own && line.text.includes('Carina'));
  assert.ok(named.some(line => line.speaker === 'carina' && line.key.endsWith('-carina')));
  assert.ok(named.some(line => line.speaker === 'mio' && line.key.endsWith('-carina')));
  const all = manifestOf(byMc);
  assert.equal(new Set(all.map(line => line.key)).size, all.length);
});

test('stand-in validation preserves authored token hashes and overheard keys', () => {
  const standIn = { ...carina, voice: { ...carina.voice, lines: 'eric', words: 'eric', ref: null } };
  for (const key of [lineKey('eric', '{dashite}。'), heardKey('今日は{ohayo}。'), 'eric-dashite']) {
    const entry = { key: ownClip(key, carina), speaker: 'carina', text: 'Resolved text must not change the key' };
    assert.equal(standInKey(entry, standIn), key);
  }
});


test('collecting cached nested stories never consumes protagonist tokens', async () => {
  const shared = story();
  const original = structuredClone(shared);
  const cached = [{ day: 5, files: [
    { name: 'first', load: async () => ({ nodes: shared.nodes }) },
    { name: 'second', load: async () => ({ nodes: shared.nodes }) },
  ] }];
  const first = await voiceLines({ sets: cached });
  assert.deepEqual(shared, original);
  const again = await voiceLines({ mcs: ['carina', 'eric'], sets: cached });
  assert.deepEqual(again, first);
  assert.ok(first.carina.some(o => o.text === 'Carina-san? I am Kenji!' && o.own));
  assert.ok(first.carina.some(o => o.text === 'カリーナさんは、どちらがいいですか。' && o.own));
  assert.ok(first.eric.some(o => o.text === 'Eric-san? I am Kenji!' && !o.own));
  assert.deepEqual(shared, original);
});
