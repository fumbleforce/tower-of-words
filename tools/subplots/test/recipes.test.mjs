import test from 'node:test';import assert from 'node:assert/strict';import {recipe}from'../recipes.mjs';
const config={key:'sample',label:'Sample scenes'};
const source=`const n=x=>({t:'n',x}); const s=(who,x,emo)=>({t:'s',who,x,emo}); const duo=(ja,x)=>({...ja,x,adv:ja}); const pic=key=>({t:'pic',key}); const choice=opts=>({t:'choice',opts});
const PICS={room:{file:'encounters/room.webp'}};
const first={id:'first',day:2,place:'office',show:'office_open',nodes:{start:[s('colleague','Hello','warm'),duo(s('colleague','Japanese version','calm'),'English version'),pic('room'),choice([{text:'Continue',go:'next'}])],next:[n('The meeting ends.')]}};
export const SCENES=[first];`;
const id='local:sample:first:start';
test('reads recipe helpers into dialogue fields without executing',()=>{const r=recipe(source,config,{action:'read',id});assert.equal(r.steps[0].text,'Hello');assert.equal(r.steps[1].text,'English version');assert.equal(r.steps[2].$expression,"pic('room')");assert.equal(r.images[0].file,'encounters/room.webp');});
test('edits dialogue but preserves advanced variants and helper calls',()=>{const r=recipe(source,config,{action:'read',id});r.steps[1].text='A new normal line';const out=recipe(source,config,{...r,action:'prepare'});assert.match(out.changed,/Japanese version/);assert.match(out.changed,/A new normal line/);assert.match(out.changed,/pic\('room'\)/);});
test('placement is written to the authored scene',()=>{const r=recipe(source,config,{action:'read',id});r.placement={place:'garden',day:3,condition:'knows_name'};const out=recipe(source,config,{...r,action:'prepare'});const next=recipe(out.changed,config,{action:'read',id});assert.deepEqual(next.placement,r.placement);});
test('selected image updates the picture table, retaining sequence and other data',()=>{const r=recipe(source,config,{action:'read',id});const out=recipe(source,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});assert.match(out.changed,/encounters\/new.webp/);assert.match(out.changed,/pic\('room'\)/);});
test('inline image replacement uses an AST range, not a textual first match',()=>{const text=`const PREFIX='encounters/';const first={id:'first',steps:[s('a','PREFIX is mentioned here'),shot(PREFIX+'old.webp'),s('b','Goodbye')]};export const SCENES=[first];`;const key='local:sample:first:steps',r=recipe(text,config,{action:'read',id:key});const out=recipe(text,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});assert.match(out.changed,/PREFIX is mentioned here/);assert.match(out.changed,/shot\("encounters\/new.webp"\)/);});
test('choice edits preserve helper form and unknown fields',()=>{const r=recipe(source,config,{action:'read',id});r.steps[3].choice[0].text='Go on';const out=recipe(source,config,{...r,action:'prepare'});assert.match(out.changed,/choice\(\[\{"text":"Go on","go":"next"\}\]\)/);});
test('recipe rejects stale revisions',()=>{const r=recipe(source,config,{action:'read',id});assert.throws(()=>recipe(source+'\n',config,{...r,action:'prepare'}),/CONFLICT/);});
test('computed condition branches remain source expressions on a no-op save',()=>{
 const text=`const scene={id:'first',steps:[cond('ready', existing, [n('No')])]}; const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:'local:sample:first:steps'});
 assert.equal(r.steps[0].$expression,"cond('ready', existing, [n('No')])");
 assert.match(recipe(text,config,{...r,action:'prepare'}).changed,/cond\('ready', existing, \[n\('No'\)\]\)/);
});
test('delivery can be added when optional arguments were absent',()=>{
 const text=`const scene={id:'first',steps:[s('person','Hello'),duo(s('person','Japanese'),'English')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:'local:sample:first:steps'});
 r.steps[0].emo='angry';r.steps[1].emo='calm';const out=recipe(text,config,{...r,action:'prepare'});
 const next=recipe(out.changed,config,{action:'read',id:r.id});assert.equal(next.steps[0].emo,'angry');assert.equal(next.steps[1].emo,'calm');
});
test('restoring a revision restores picture-table references too',()=>{
 const old=recipe(source,config,{action:'read',id});
 const changed=recipe(source,config,{...old,action:'prepare',imageReplacement:{slot:old.images[0].id,file:'encounters/new.webp'}}).changed;
 const current=recipe(changed,config,{action:'read',id});
 const restored=recipe(changed,config,{...current,action:'prepare',steps:old.steps,restoreImages:old.images});
 assert.equal(recipe(restored.changed,config,{action:'read',id}).images[0].file,'encounters/room.webp');
});
test('spread helpers and computed delivery survive a no-op save',()=>{
 const text=`const scene={id:'first',steps:[s('person','Hello',mood),...ending()]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:'local:sample:first:steps'});
 const result=recipe(text,config,{...r,action:'prepare'});
 assert.match(result.changed,/s\("person","Hello",mood\)/);assert.match(result.changed,/\.\.\.ending\(\)/);
});
test('inline image slots survive source reformatting',()=>{
 const text=`const scene={id:'first',steps:[s('person','Hello'),shot('encounters/old.webp')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:'local:sample:first:steps'});
 const changed=recipe(text,config,{...r,action:'prepare'}).changed;
 assert.equal(recipe(changed,config,{action:'read',id:r.id}).images[0].id,r.images[0].id);
});
test('computed variant delivery remains intact',()=>{
 const text=`const scene={id:'first',steps:[duo(s('person','Hello'),'Hi',{emo:DEFAULT_EMOTION})]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:'local:sample:first:steps'});
 assert.equal(r.steps[0].deliveryEditable,false);assert.match(recipe(text,config,{...r,action:'prepare'}).changed,/emo:DEFAULT_EMOTION/);
});
