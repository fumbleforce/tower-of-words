import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {run} from '../source.mjs';
function fixture(t, text="export default {on:{'talk:a':[{if:'other',node:'other'},'hello']},nodes:{hello:['a: Hello'],other:['b: Bye']}};") {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'subplot-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'game3d/story'),{recursive:true});const file=path.join(root,'game3d/story/place.js');fs.writeFileSync(file,text);
  return {root,file,id:'public:game3d/story/place.js#hello'};
}
test('catalog and read use AST without executing story code',t=>{
  const f=fixture(t,"throw Error('must not execute'); export default {nodes:{hello:['a: Hello']}};");
  assert.equal(run(f.root,{action:'catalog'}).scenes.length,1);assert.deepEqual(run(f.root,{action:'read',id:f.id}).steps,['a: Hello']);
});
test('edit replaces only the node and preserves unrelated source',t=>{
  const f=fixture(t),before=fs.readFileSync(f.file,'utf8'),s=run(f.root,{action:'read',id:f.id});
  const p=run(f.root,{...s,action:'prepare',steps:[{say:'a',text:'Changed'}]});
  assert.ok(p.changed.includes("other:['b: Bye']"));assert.equal(fs.readFileSync(f.file,'utf8'),before);
});
test('route edit preserves unrelated priority and condition',t=>{
  const f=fixture(t),s=run(f.root,{action:'read',id:f.id});
  const p=run(f.root,{...s,action:'prepare',entries:[{event:'talk:a',condition:'know_ohayo',once:true}]});
  fs.writeFileSync(f.file,p.changed);const next=run(f.root,{action:'read',id:f.id});
  assert.deepEqual(next.entries,[{event:'talk:a',condition:'know_ohayo',once:true}]);
  assert.ok(p.changed.indexOf('"node": "other"')<p.changed.indexOf('"node": "hello"'));
});
test('adding and removing entries keeps other scenes intact',t=>{
  const f=fixture(t),s=run(f.root,{action:'read',id:f.id});
  const p=run(f.root,{...s,action:'prepare',entries:[{event:'zone:door',condition:"period == 'evening'",once:false}]});
  fs.writeFileSync(f.file,p.changed);assert.equal(run(f.root,{action:'read',id:f.id}).entries[0].event,'zone:door');
  assert.ok(p.changed.includes('"other"'));
});
test('source helpers remain editable without flattening calls',t=>{
  const f=fixture(t,"const make=()=>[]; export default {nodes:{hello:make(),other:['kept']}};");
  const s=run(f.root,{action:'read',id:f.id});assert.equal(s.steps,null);
  const p=run(f.root,{...s,action:'prepare',raw:'[...make(), "a: One more line"]'});assert.ok(p.changed.includes('...make()'));
});
test('reject stale source, malformed steps and executable conditions',t=>{
  const f=fixture(t),s=run(f.root,{action:'read',id:f.id});
  assert.throws(()=>run(f.root,{...s,action:'prepare',revision:'stale'}),/CONFLICT/);
  assert.throws(()=>run(f.root,{...s,action:'prepare',steps:[{say:'a'}]}),/needs text/);
  assert.throws(()=>run(f.root,{...s,action:'prepare',entries:[{event:'talk:a',condition:'alert(1)'}]}),/not run code/);
  assert.throws(()=>run(f.root,{...s,action:'prepare',entries:[{event:'talk:a',condition:'day % 2'}]}),/characters/);
});
test('reject a symlink escaping the public story root',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.root,'outside.js'),'export default {nodes:{hello:[]}}');
  fs.symlinkSync(path.join(f.root,'outside.js'),path.join(f.root,'game3d/story/escape.js'));
  assert.throws(()=>run(f.root,{action:'read',id:'public:game3d/story/escape.js#hello'}),/outside/);
});
test('interleaved routes keep their original first-match priority',t=>{
 const f=fixture(t,"export default {on:{talk:[{node:'hello',if:'first',custom:true},{node:'other',if:'middle'},{node:'hello',if:'last'}]},nodes:{hello:[],other:[]}}");
 const s=run(f.root,{action:'read',id:f.id});s.entries[0].condition='updated';
 const p=run(f.root,{...s,action:'prepare'});
 assert.ok(p.changed.indexOf('updated')<p.changed.indexOf('middle'));assert.ok(p.changed.indexOf('middle')<p.changed.indexOf('last'));assert.match(p.changed,/"custom": true/);
});
test('edited dialogue drops its outdated explicit voice reference',t=>{
 const f=fixture(t,"export default {nodes:{hello:[{say:'a',text:'Old',voice:'old-take',face:'smile'}]}}");
 const s=run(f.root,{action:'read',id:f.id});s.steps[0].text='New';
 const p=run(f.root,{...s,action:'prepare'});assert.doesNotMatch(p.changed,/old-take/);assert.match(p.changed,/smile/);
});
