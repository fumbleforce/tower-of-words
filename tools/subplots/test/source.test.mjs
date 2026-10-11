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
  assert.ok(p.changed.indexOf("node:'other'")<p.changed.indexOf("node: 'hello'"));
  // only the entry that changed is written, in house style; the other one keeps its exact text
  assert.equal(p.changed.slice(0,p.changed.indexOf('nodes')),"export default {on:{'talk:a':[{if:'other',node:'other'},{ if: 'know_ohayo', node: 'hello', once: true }]},");
});
test('adding and removing entries keeps other scenes intact',t=>{
  const f=fixture(t),s=run(f.root,{action:'read',id:f.id});
  const p=run(f.root,{...s,action:'prepare',entries:[{event:'zone:door',condition:"period == 'evening'",once:false}]});
  fs.writeFileSync(f.file,p.changed);assert.equal(run(f.root,{action:'read',id:f.id}).entries[0].event,'zone:door');
  assert.ok(p.changed.includes("{if:'other',node:'other'}"));
  assert.match(p.changed,/'zone:door': \{ if: "period == 'evening'", node: 'hello' \}/);
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
 assert.ok(p.changed.indexOf('updated')<p.changed.indexOf('middle'));assert.ok(p.changed.indexOf('middle')<p.changed.indexOf('last'));assert.match(p.changed,/\{node:'hello',if:'updated',custom:true\}/);
});
test('edited dialogue drops its outdated explicit voice reference',t=>{
 const f=fixture(t,"export default {nodes:{hello:[{say:'a',text:'Old',voice:'old-take',face:'smile'}]}}");
 const s=run(f.root,{action:'read',id:f.id});s.steps[0].text='New';
 const p=run(f.root,{...s,action:'prepare'});assert.doesNotMatch(p.changed,/old-take/);assert.match(p.changed,/smile/);
});

test('a computed direction does not hide adjacent editable dialogue',t=>{
 const f=fixture(t,"const helper=()=>[]; export default {nodes:{hello:[...helper(),{say:'a',text:'Old',duration:getDuration()},'a: Later']}};");
 const s=run(f.root,{action:'read',id:f.id});assert.equal(s.steps[1].text,'Old');s.steps[1].text='New';
 const p=run(f.root,{...s,action:'prepare'});assert.match(p.changed,/\.\.\.helper\(\)/);assert.match(p.changed,/getDuration\(\)/);assert.match(p.changed,/New/);
});
test('a way in changed in a multi-line file touches its own entry only, comments stay',t=>{
 const text=`export default {
  on: {
    // the guard
    'talk:guard': [{ if: '!greeted_guard', node: 'guard_look' }, 'guard_again'],
    'near:tama': { node: 'cat_notice', once: true }, // the cat
  },
  nodes: { guard_look: ['a: Hi'], guard_again: [], cat_notice: [] },
};
`;
 const f=fixture(t,text);const id=f.id.replace('#hello','#guard_look');
 const s=run(f.root,{action:'read',id});
 assert.deepEqual(s.entries,[{event:'talk:guard',condition:'!greeted_guard',once:false}]);
 const p=run(f.root,{...s,action:'prepare',entries:[{event:'talk:guard',condition:"!greeted_guard && period == 'lunch'",once:true}]});
 assert.equal(p.changed,text.replace("{ if: '!greeted_guard', node: 'guard_look' }",`{ if: "!greeted_guard && period == 'lunch'", node: 'guard_look', once: true }`));
 const same=run(f.root,{...s,action:'prepare'});assert.equal(same.changed,text,'unchanged ways in write nothing');
});
