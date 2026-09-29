import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run the loader itself with controllable network/texture failures, without GL.
const source = fs.readFileSync(new URL('./base.js', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('export async function loadBase'), source.indexOf('// the base body'));
let requests = 0, textures = 0, mode = 'http-error';
const THREE = {
  SRGBColorSpace: 'srgb', LinearFilter: 'linear',
  TextureLoader: class { async loadAsync() { textures++; if (mode === 'texture-error') throw Error('missing texture'); return {}; } },
};
const fetch = async () => {
  requests++;
  return { ok: mode !== 'http-error', status: 404, json: async () => ({id:'example',tex:'example.png'}) };
};
const load = new Function('fetch','THREE', `const cache={}; const ROOT='/art/parts/'; ${handler.replace('export ', '')}; return loadBase;`)(fetch,THREE);
await assert.rejects(load('retry'), /HTTP 404/);
assert.equal(textures,0);
mode='ok';
const [a,b] = await Promise.all([load('retry'),load('retry')]);
assert.equal(a,b); assert.equal(requests,2); assert.equal(textures,1);
assert.equal(a.tex.flipY,false); assert.equal(a.tex.colorSpace,'srgb');
mode='texture-error'; await assert.rejects(load('retry-texture'),/missing texture/);
mode='ok'; const recovered=await load('retry-texture');
assert.equal(recovered.d.id,'example'); assert.equal(requests,4); assert.equal(textures,3);
assert.equal(await load('retry'),a); assert.equal(requests,4);
console.log('PASS: HTTP/texture failures retry; simultaneous and completed loads share a cached asset.');
