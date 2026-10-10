import test from 'node:test';import assert from 'node:assert/strict';import {recipe}from'../recipes.mjs';
const config={key:'sample',label:'Sample scenes'};
const source=`const n=x=>({t:'n',x}); const s=(who,x,emo)=>({t:'s',who,x,emo}); const duo=(ja,x)=>({...ja,x,adv:ja}); const pic=key=>({t:'pic',key}); const choice=opts=>({t:'choice',opts});
const PICS={room:{file:'encounters/room.webp'}};
const first={id:'first',day:2,place:'office',show:'office_open',nodes:{start:[s('colleague','Hello','warm'),duo(s('colleague','Japanese version','calm'),'English version'),pic('room'),choice([{text:'Continue',go:'next'}])],next:[n('The meeting ends.')]}};
export const SCENES=[first];`;
const id='local:sample:first:start';
test('reads recipe helpers into dialogue fields without executing',()=>{const r=recipe(source,config,{action:'read',id});assert.equal(r.steps[0].text,'Hello');assert.equal(r.steps[1].text,'English version');assert.equal(r.steps[2].imageSlot,'image:0');assert.deepEqual(r.steps[2].shot,{});assert.equal(r.images[0].file,'encounters/room.webp');});
test('edits dialogue but preserves advanced variants and helper calls',()=>{const r=recipe(source,config,{action:'read',id});r.steps[1].text='A new normal line';const out=recipe(source,config,{...r,action:'prepare'});assert.match(out.changed,/Japanese version/);assert.match(out.changed,/A new normal line/);assert.match(out.changed,/pic\('room'\)/);});
test('placement is written to the authored scene',()=>{const r=recipe(source,config,{action:'read',id});r.placement={place:'garden',day:3,condition:'knows_name'};const out=recipe(source,config,{...r,action:'prepare'});const next=recipe(out.changed,config,{action:'read',id});assert.deepEqual(next.placement,r.placement);});
test('selected image updates the picture table, retaining sequence and other data',()=>{const r=recipe(source,config,{action:'read',id});const out=recipe(source,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});assert.match(out.changed,/encounters\/new.webp/);assert.match(out.changed,/pic\("room__editor_/);});
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

const staged=`const SW='encounters/example-'; const GW=0.34;
const shot=(src,o={})=>({t:'shot',src,o});
const gap=(n,o)=>[shot(\`\${SW}\${n}.webp\`,{mask:'gap',width:+(o.w*.55).toFixed(3),at:o.at,focus:o.focus,push:o.push,fade:o.fade,cue:o.cue}),shot(\`\${SW}\${n}.webp\`,{mask:'gap',width:o.w,ms:600,delay:450,_skipList:true})];
const scene={id:'first',steps:[...gap('t01', { w: GW, at: 0.48, focus: '55% 42%', push: 0.06, fade: 1400, cue: 'Water lapping, the drip of a tap' }),shot(\`\${SW}second.webp\`,{}),duo(cw('a','friend','こんにちは','Hello','calm'),'Hello there')]};const SCENES=[scene];`;
const stagedId='local:sample:first:steps';
test('spread gap is a human shot with resolved image and editable staging',()=>{
 const r=recipe(staged,config,{action:'read',id:stagedId}),step=r.steps[0];
 assert.equal(step.$expression,undefined);assert.equal(step.shot.width,.34);assert.equal(step.shot.mask,'gap');
 assert.equal(step.imageUrl,'/island/private/game/encounters/example-t01.webp');assert.equal(r.steps[1].imageSlot,'image:1');
 const unchanged=recipe(staged,config,{...r,action:'prepare'}).changed;assert.match(unchanged,/w: GW/);
 step.shot.width=.5;step.shot.focus='60% 30%';const saved=recipe(staged,config,{...r,action:'prepare'});
 const next=recipe(saved.changed,config,{action:'read',id:stagedId});assert.equal(next.steps[0].shot.width,.5);assert.equal(next.steps[0].shot.focus,'60% 30%');assert.equal(next.steps[0].shot.cue,step.shot.cue);
});
test('both duo languages save independently without discarding the inner helper identity',()=>{
 const r=recipe(staged,config,{action:'read',id:stagedId});r.steps[2].ja='おはよう';r.steps[2].en='Good morning';
 const saved=recipe(staged,config,{...r,action:'prepare'}),next=recipe(saved.changed,config,{action:'read',id:stagedId});
 assert.equal(next.steps[2].ja,'おはよう');assert.equal(next.steps[2].en,'Good morning');assert.match(saved.changed,/cw\('a',"friend","おはよう",'Hello','calm'\)/);
});
test('bilingual helper translations and new shot properties roundtrip',()=>{
 const text=`const scene={id:'first',steps:[sw('line','person','おはよう','Morning'),shot('encounters/room.webp',{})]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});r.steps[0].ja='こんにちは';r.steps[0].en='Hello';r.steps[1].shot.fade=400;r.steps[1].shot.focus='50% 30%';
 const next=recipe(recipe(text,config,{...r,action:'prepare'}).changed,config,{action:'read',id:stagedId});
 assert.equal(next.steps[0].ja,'こんにちは');assert.equal(next.steps[0].en,'Hello');assert.equal(next.steps[1].shot.fade,400);assert.equal(next.steps[1].shot.focus,'50% 30%');
});
test('replacing a gap image preserves both presentations and other images',()=>{
 const r=recipe(staged,config,{action:'read',id:stagedId});
 const saved=recipe(staged,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});
 const next=recipe(saved.changed,config,{action:'read',id:stagedId});
 assert.equal(next.steps[0].sequence.length,2);assert.equal(next.steps[0].sequence[0].imageUrl,'/island/private/game/encounters/new.webp');
 assert.equal(next.steps[0].sequence[0].shot.width,.187);assert.equal(next.steps[0].sequence[1].shot.width,.34);assert.equal(next.steps[0].sequence[1].shot.ms,600);
 assert.equal(next.steps[1].imageUrl,'/island/private/game/encounters/example-second.webp');
 assert.doesNotThrow(()=>recipe(saved.changed,config,{...next,action:'prepare'}));
});
test('nontechnical actions preserve completion, destinations and hidden fields',()=>{
 const text=`const scene={id:'first',steps:[hide({fade:700}),go('next'),fin(false,true),...end('complete'),bye(),raw({do:'look',target:'door'})]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});assert.deepEqual(r.steps.map(s=>s.action),['hide','go','fin','end','bye','game']);
 const next=recipe(recipe(text,config,{...r,action:'prepare'}).changed,config,{action:'read',id:stagedId});assert.equal(next.steps[2].complete,true);assert.equal(next.steps[3].flag,'complete');
});

test('new bilingual dialogue uses available two-mode helper and remains editable',()=>{
 const r=recipe(source,config,{action:'read',id});r.steps.push({say:'eric',text:'',en:'Good morning',ja:'おはよう'});
 const next=recipe(recipe(source,config,{...r,action:'prepare'}).changed,config,{action:'read',id});
 assert.equal(next.steps.at(-1).en,'Good morning');assert.equal(next.steps.at(-1).ja,'おはよう');assert.match(next.steps.at(-1).$recipe,/^duo\(s/);
});
test('batch replacement changes each selected slot after gap expansion',()=>{
 const r=recipe(staged,config,{action:'read',id:stagedId});const images=r.images;
 const saved=recipe(staged,config,{...r,action:'prepare',imageReplacements:[{slot:images[0].id,file:'encounters/gap-new.webp'},{slot:images[1].id,file:'encounters/second-new.webp'}]});
 const next=recipe(saved.changed,config,{action:'read',id:stagedId});
 assert.deepEqual(next.images.map(i=>i.file),['encounters/gap-new.webp','encounters/second-new.webp']);
});
test('an English line can gain Japanese text without losing its English',()=>{
 const r=recipe(source,config,{action:'read',id});r.steps[0].ja='こんにちは';
 const next=recipe(recipe(source,config,{...r,action:'prepare'}).changed,config,{action:'read',id});assert.equal(next.steps[0].ja,'こんにちは');assert.equal(next.steps[0].en,'Hello');
});

test('adding delivery and translation together keeps the helper argument positions',()=>{
 const text=`const scene={id:'first',steps:[s('person','Hello')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});r.steps[0].ja='こんにちは';r.steps[0].emo='calm';
 const next=recipe(recipe(text,config,{...r,action:'prepare'}).changed,config,{action:'read',id:stagedId});assert.equal(next.steps[0].ja,'こんにちは');assert.equal(next.steps[0].en,'Hello');assert.equal(next.steps[0].emo,'calm');
});

test('identical inline images each accept their own batch replacement',()=>{
 const text=`const scene={id:'first',steps:[shot('encounters/shared.webp'),shot('encounters/shared.webp')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});
 const saved=recipe(text,config,{...r,action:'prepare',imageReplacements:r.images.map((i,n)=>({slot:i.id,file:`encounters/new-${n}.webp`}))});
 assert.deepEqual(recipe(saved.changed,config,{action:'read',id:stagedId}).images.map(i=>i.file),['encounters/new-0.webp','encounters/new-1.webp']);
});
test('a shared picture entry is copied for the selected shot without changing other scenes',()=>{
 const text=`const PICS={room:{file:'encounters/shared.webp',cap:'Room',level:'soft'}};const scene={id:'first',steps:[pic('room'),pic('room')]};const other={id:'other',steps:[pic('room')]};const SCENES=[scene,other];`;
 const r=recipe(text,config,{action:'read',id:stagedId});assert.equal(r.images.length,2);
 const saved=recipe(text,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});
 assert.deepEqual(recipe(saved.changed,config,{action:'read',id:stagedId}).images.map(i=>i.file),['encounters/new.webp','encounters/shared.webp']);
 assert.equal(recipe(saved.changed,config,{action:'read',id:'local:sample:other:steps'}).images[0].file,'encounters/shared.webp');assert.match(saved.changed,/cap:'Room',level:'soft'/);
});
test('raw game actions save their structured details',()=>{
 const text=`const scene={id:'first',steps:[raw({do:'look',target:'door'})]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});r.steps[0].details.target='window';
 const next=recipe(recipe(text,config,{...r,action:'prepare'}).changed,config,{action:'read',id:stagedId});assert.equal(next.steps[0].details.target,'window');
});

test('expanded gap keeps one image slot through repeat saves and replacement',()=>{
 const r=recipe(staged,config,{action:'read',id:stagedId});const saved=recipe(staged,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});
 const next=recipe(saved.changed,config,{action:'read',id:stagedId});assert.deepEqual(next.images.map(i=>i.id),r.images.map(i=>i.id));
 assert.equal(next.steps[0].sequence[0].imageSlot,next.steps[0].sequence[1].imageSlot);
 const again=recipe(saved.changed,config,{...next,action:'prepare',imageReplacement:{slot:next.images[0].id,file:'encounters/again.webp'}});
 const result=recipe(again.changed,config,{action:'read',id:stagedId});assert.equal(result.images.length,2);assert.equal(result.steps[0].sequence[1].imageUrl,'/island/private/game/encounters/again.webp');
});

test('picture-table cloning accepts a trailing comma and retains arbitrary metadata',()=>{
 const text=`const PICS={room:{file:'encounters/room.webp',metadata:COMPUTED}, /* trailing */};const scene={id:'first',steps:[pic('room')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});const saved=recipe(text,config,{...r,action:'prepare',imageReplacement:{slot:r.images[0].id,file:'encounters/new.webp'}});
 assert.equal(recipe(saved.changed,config,{action:'read',id:stagedId}).images[0].file,'encounters/new.webp');assert.match(saved.changed,/metadata:COMPUTED/);
});

test('moving a shot and replacing it in the same save follows the authored step',()=>{
 const text=`const scene={id:'first',steps:[shot('encounters/first.webp'),shot('encounters/second.webp')]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});r.steps.reverse();
 const saved=recipe(text,config,{...r,action:'prepare',imageReplacement:{slot:'image:0',file:'encounters/new-first.webp'}});
 assert.deepEqual(recipe(saved.changed,config,{action:'read',id:stagedId}).images.map(i=>i.file),['encounters/second.webp','encounters/new-first.webp']);
 assert.deepEqual(saved.imageRemap,{'image:1':'image:0','image:0':'image:1'});
});
test('new staging and delivery options work with trailing commas',()=>{
 const text=`const scene={id:'first',steps:[shot('encounters/first.webp',{fade:400,}),duo(s('person','Japanese'),'English',{variant:true,})]};const SCENES=[scene];`;
 const r=recipe(text,config,{action:'read',id:stagedId});r.steps[0].shot.focus='40% 30%';r.steps[1].emo='calm';
 const next=recipe(recipe(text,config,{...r,action:'prepare'}).changed,config,{action:'read',id:stagedId});assert.equal(next.steps[0].shot.focus,'40% 30%');assert.equal(next.steps[1].emo,'calm');
});

test('restoring a revision follows reordered step identities and skips removed shots',()=>{
 const text=`const scene={id:'first',steps:[shot('encounters/first.webp'),shot('encounters/second.webp')]};const SCENES=[scene];`;
 const old=recipe(text,config,{action:'read',id:stagedId});
 const changed=recipe(text,config,{...old,action:'prepare',imageReplacement:{slot:'image:0',file:'encounters/new-first.webp'}}).changed;
 const current=recipe(changed,config,{action:'read',id:stagedId});
 const reordered=recipe(changed,config,{...current,action:'prepare',steps:[old.steps[1],old.steps[0]],restoreImages:old.images});
 assert.deepEqual(recipe(reordered.changed,config,{action:'read',id:stagedId}).images.map(i=>i.file),['encounters/second.webp','encounters/first.webp']);
 const removed=recipe(changed,config,{...current,action:'prepare',steps:[old.steps[1]],restoreImages:old.images});
 assert.deepEqual(recipe(removed.changed,config,{action:'read',id:stagedId}).images.map(i=>i.file),['encounters/second.webp']);
});
