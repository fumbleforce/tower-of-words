import test from 'node:test';
import assert from 'node:assert/strict';
import { characterScale, characterHead } from '../../js/character-scale.js';

test('approved character scale is the default and invalid queries cannot bypass it', () => {
  for (const query of ['', '?day=2', '?charscale=0', '?charscale=0.67', '?charscale=no'])
    assert.equal(characterScale(query), 0.85);
  assert.equal(characterScale('?charscale=100'), 1);
  assert.equal(characterScale('?day=2&charscale=67&place=dorms'), 0.67);
  assert.equal(characterScale('?day=2&charscale=85&place=dorms'), 0.85);
});

test('pins follow replaced outfit heads and cache only the current model lookup', () => {
  const ordinary = { name: 'ordinary-head' },
    outfit = { name: 'swim-head' };
  const actor = { head: ordinary };
  assert.equal(characterHead(actor), ordinary);
  actor.head = outfit;
  assert.equal(characterHead(actor), outfit);
  actor.head = ordinary;
  assert.equal(characterHead(actor), ordinary);

  let traversals = 0;
  const makeModel = (bone) => ({
    traverse: (visit) => {
      traversals++;
      visit(bone);
    },
  });
  const oldBone = { isBone: true, name: 'mixamorigHead' },
    newBone = { isBone: true, name: 'Head' };
  const oldModel = makeModel(oldBone),
    newModel = makeModel(newBone);
  const mio = { model: oldModel };
  assert.equal(characterHead(mio), oldBone);
  assert.equal(characterHead(mio), oldBone);
  assert.equal(traversals, 1);
  mio.model = newModel;
  assert.equal(characterHead(mio), newBone);
  assert.equal(traversals, 2);
  mio.model = oldModel;
  assert.equal(characterHead(mio), oldBone);
  assert.equal(traversals, 2);
});
