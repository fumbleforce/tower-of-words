import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three')
      return next(new URL('../../vendor/three/three.module.js', import.meta.url).href, context);
    if (specifier.startsWith('three/addons/'))
      return next(new URL('../../vendor/' + specifier.slice(13), import.meta.url).href, context);
    return next(specifier, context);
  },
});
Object.assign(globalThis, {
  location: { search: '' },
  window: {},
  addEventListener() {},
  innerWidth: 1366,
  innerHeight: 860,
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    body: { classList: { contains: () => false, toggle() {} } },
    documentElement: { style: { setProperty() {} } },
  },
});
const ctx = new Proxy({measureText:t=>({width:String(t).length*8}), createRadialGradient:()=>({addColorStop(){}}), createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
globalThis.document.createElement = () => ({width:128,height:128,getContext:()=>ctx,style:{}});
import { createHash } from 'node:crypto';
const {shipsSteps}=await import('../../js/scenes/harbour/ships.js');
const {quaySteps}=await import('../../js/scenes/harbour/quay.js');
function fingerprint(ships,quay){
 const hash=createHash('sha256'),record=(...args)=>hash.update(JSON.stringify(args));
 const parts=name=>({box(...args){record(name,'box',args);},geo(color,g,options){record(name,'geo',color,options);for(const key of Object.keys(g.attributes)){record(key);hash.update(Buffer.from(g.attributes[key].array.buffer));}if(g.index)hash.update(Buffer.from(g.index.array.buffer));g.dispose();}});
 for(const _ of ships({p:parts('ship'),glass:parts('glass'),lit:parts('lit')},{board:(...args)=>record('board',args)}))void _;
 for(const _ of quay({field:(...args)=>record('paving',args)},parts('quay'),parts('water')))void _;
 return hash.digest('hex');
}
test('extracting the terminal window builders preserves every original outdoor ship/quay primitive and paving call',()=>{
 assert.equal(fingerprint(shipsSteps,quaySteps),'10e7462df371b698268c9792877f7d08d56cec0096ca59580da8d4727718164f');
});
process.on('exit',()=>hooks.deregister());
