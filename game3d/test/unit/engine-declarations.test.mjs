import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ENGINE_WRITES, flagKeys } from '../../js/narrative/engine-flags.js';
import fs from 'node:fs';
import { format } from 'prettier';
import { checkDeclarations, declarationFiles } from '../../../tools/check/declarations.mjs';

const root = new URL('../../../', import.meta.url);
const sources = Object.fromEntries(declarationFiles.map(file => [file, fs.readFileSync(new URL(file, root), 'utf8')]));

test('named engine flags expose their declared strings and reject typos before a write', () => {
  for (const [owner, spec] of Object.entries(ENGINE_WRITES)) {
    const keys = flagKeys(owner);
    assert.equal(Object.isFrozen(keys), true);
    for (const key of spec.exact) assert.equal(keys[key], key);
    for (const prefix of spec.prefix) assert.equal(keys[prefix.slice(0, -1)], prefix);
    assert.throws(() => keys.not_declared, error => error.message.includes(owner) && error.message.includes('not_declared'));
    assert.throws(() => { keys.not_declared = 'typo'; }, TypeError);
  }
  assert.throws(() => flagKeys('missing-owner'), /Unknown flag owner/);
  assert.throws(() => flagKeys('game3d/js/sim.js').gift_reactoin, /gift_reactoin/);
});

test('actual engine writes and event calls agree with declarations', () => {
  checkDeclarations(file => sources[file]);
});

test('actual source mutations fail the declaration guard before the game runs', () => {
  for (const [file, before, after] of [
    ['game3d/js/saves/met.js', 'KEYS.met + id', 'KEYS.meet + id'],
    ['game3d/js/saves/met.js', 'save.flags || {}', 'arbitraryObject'],
    ['game3d/js/sim.js', 'ENGINE_KEYS.gift_reaction', 'ENGINE_KEYS.gift_reactoin'],
    ['game3d/js/gameplay/gifts.js', 'KEYS.gave', 'KEYS.gvae'],
    ['game3d/js/places/train.js', "eventId('train', 'chime')", "eventId('train', 'chim')"],
    ['game3d/js/places/train.js', "eventId('train', 'chime')", "'chim'"],
    ['game3d/js/sim.js', 'const ENGINE_KEYS =', 'const { gift_reactoin } = ENGINE_KEYS;\nconst ENGINE_KEYS ='],
    ['game3d/js/main.js', 'game.flagsRef = flags;', 'game.flagsRef = flags; game.flagsRef.newEngineFlag = true;'],
    ['game3d/js/places/lobby.js', 'st.cardOk = true;', 'st.cardOk = true; flags.newEngineFlag = true;'],
    ['game3d/js/places/lobby.js', 'st.cardOk = true;', 'st.cardOk = true; const f2 = flags; f2.newFlag = true;'],
    ['game3d/js/testmode.js', 'import ', 'flags.newFlag = true;\nimport '],
    ['game3d/js/testmode.js', 'import { flags }', 'import { flags as f2 }'],
    ['game3d/js/ui.js', 'F.say_tip = true;', 'F.unlisted_tip = true;'],
    ['game3d/js/places/lobby.js', "eventTrigger('gate', 'card_ok')", "'event:card_okk'"],
    ['game3d/js/places/lobby.js', "eventTrigger('gate', 'card_red')", "'event:card_rd'"],
    ['game3d/js/places/lobby.js', 'flags[ENGINE_KEYS.cardOk] = true;', ''],
    ['game3d/js/places/lobby.js', 'st.cardOk = true;', 'st.cardOk = true; flags[unknownKey] = true;'],
    ['game3d/js/places/lift.js', "import ", "flags.newLiftFlag = true;\nimport "],
    ['game3d/js/main.js', 'game.flagsRef = flags;', 'game.flagsRef = flags; Object.assign(flags, arbitraryObject);'],
  ]) {
    assert.ok(sources[file].includes(before), before);
    const changed = sources[file].replace(before, after);
    assert.throws(() => checkDeclarations(path => path === file ? changed : sources[path]),
      /Unknown flag key|Unknown event|differ from declarations|unresolved .*flag write|event emission must use|event trigger must use|flags aliases/, before);
  }
});

test('declaration guards survive formatting of all actual owner files', async () => {
  const formatted = Object.fromEntries(await Promise.all(Object.entries(sources).map(async ([file, source]) =>
    [file, await format(source, { parser: 'babel', printWidth: 120 })])));
  checkDeclarations(file => formatted[file]);
});
