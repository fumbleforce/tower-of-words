import assert from 'node:assert/strict';
import { parseRecipe, recipeFile } from './recipe-file.js';
const slots = ['hair', 'head', 'top', 'bottom', 'shoes', 'hands'];
const parts = ['mio', 'eric'].flatMap(source => slots.map(slot => ({id: `${source}-${slot}`, slot})));
const lib = { sources: {mio: {}, eric: {}}, parts, byId: Object.fromEntries(parts.map(part => [part.id, part])) };
const recipe = {body:'eric',parts:Object.fromEntries(slots.map(slot=>[slot,`mio-${slot}`])),colours:{top:'#123456',skin:'#e8bfa3'},height:1.1,fit:{hair:{scale:.9,offset:[0,.01,-.02]}}};
assert.deepEqual(parseRecipe(recipeFile(recipe),lib),recipe);
assert.deepEqual(parseRecipe(JSON.stringify(recipe),lib),recipe);
const normalized = parseRecipe(JSON.stringify({...recipe,colours:{top:'#ABCDEF',skin:null}}),lib);
assert.deepEqual(normalized.colours,{top:'#abcdef'});
for (const [change, message] of [
  [r=>r.body='missing',/unavailable body/],
  [r=>r.parts.hair='eric-top',/hair part/],
  [r=>delete r.parts.hands,/hands part/],
  [r=>r.colours.top='blue',/six hex/],
  [r=>r.height=-1,/Height/],
  [r=>r.fit.hair.scale=0,/scale/],
  [r=>r.fit.hair.offset=[0,1],/three numbers/],
  [r=>r.fit.hair.offset[2]=1e200,/offset/],
]) {
 const bad=structuredClone(recipe);change(bad);
 assert.throws(()=>parseRecipe(JSON.stringify(bad),lib),message);
 assert.deepEqual(parseRecipe(recipeFile(recipe),lib),recipe); // A failed load cannot contaminate the next one.
}
for(const bad of ['{', 'null', '[]', '{"format":"amakawa-creator","version":2}', ' '.repeat(65537)]) assert.throws(()=>parseRecipe(bad,lib));
assert.throws(()=>parseRecipe(JSON.stringify(recipe).replace('"body":','"__proto__":{},"body":'),lib),/Unknown/);
console.log('PASS: file and copied JSON round trips preserve selections and fitting; unsupported, malformed and wrong-slot recipes are rejected.');
