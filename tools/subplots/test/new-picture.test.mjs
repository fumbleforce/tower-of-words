// A picture beat added in the scene editor, written into a recipe: pic() with its own table entry, or an inline shot().
import test from 'node:test';
import assert from 'node:assert/strict';
import { recipe } from '../recipes.mjs';

const config = { key: 'sample', label: 'Sample scenes' };
const table = `const n=x=>({t:'n',x}); const s=(who,x,emo)=>({t:'s',who,x,emo}); const pic=key=>({t:'pic',key});
const PICS={
  'first.1': {file:'encounters/room.webp', cap:'The room.', level:'soft', who:'A colleague'},
};
const first={id:'first',nodes:{start:[s('colleague','Hello','warm'),pic('first.1'),n('The meeting ends.')]}};
export const SCENES=[first];`;
const id = 'local:sample:first:start';

test('a new picture beat in a recipe with a picture table', () => {
  const r = recipe(table, config, { action: 'read', id });
  assert.equal(r.capabilities.picture, 'pic');
  r.steps.splice(2, 0, { shot: {}, newPicture: true, imageSlot: 'new:a', narration: 'She looks up.' });
  assert.throws(() => recipe(table, config, { ...r, action: 'prepare' }), /no picture yet/);
  r.steps[2].file = 'encounters/editor-1.webp';
  const out = recipe(table, config, { ...r, action: 'prepare' });
  assert.match(out.changed, /pic\("first\.2"\)/);
  assert.match(out.changed, /"first\.2": \{"file":"encounters\/editor-1\.webp","cap":"She looks up\.","level":"soft","who":"A colleague"\}/);
  const next = recipe(out.changed, config, { action: 'read', id });
  assert.deepEqual(next.images.map(i => i.file), ['encounters/room.webp', 'encounters/editor-1.webp']);
  assert.equal(out.imageRemap['new:a'], 'image:1');
});

test('a new picture beat in a recipe with inline shots', () => {
  const inline = `const shot=(src,o={})=>({t:'shot',src,o});const n=x=>({t:'n',x});const scene={id:'first',steps:[n('Hi')]};const SCENES=[scene];`;
  const q = recipe(inline, config, { action: 'read', id: 'local:sample:first:steps' });
  assert.equal(q.capabilities.picture, 'shot');
  q.steps.push({ shot: {}, newPicture: true, imageSlot: 'new:b', file: 'encounters/editor-2.webp' });
  const out = recipe(inline, config, { ...q, action: 'prepare' });
  assert.match(out.changed, /shot\("encounters\/editor-2\.webp", \{\}\)/);
  assert.equal(recipe(out.changed, config, { action: 'read', id: q.id }).images[0].file, 'encounters/editor-2.webp');
});
