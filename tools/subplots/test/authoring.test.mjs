import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {catalog} from '../authoring.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'authoring-catalog-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const write=(name,text)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
  write('docs/game/cast.md','## Everyone\n| `mio` | Mio | A programmer. |\n| `kuroda` | Mr. Hamada | Accounts. |\n## People\n');
  write('game3d/js/ui/portrait-data.js',"export const PORTRAITS={mio:['neutral','smile']}; throw Error('do not execute');");
  write('game3d/js/places/definitions.js',"export const PLACE_NAMES={office:'IT support, B2'}");
  write('game3d/js/sim.js',"export const PERIOD_NAMES={early:'Early morning',evening:'After work'};");
  write('game3d/js/lang.js',"export const WORDS={ohayo:{ja:'おはよう',en:'good morning',ro:'ohayo'}};");
  write('game3d/story/day4/place.js',`throw Error('never execute'); export default {
    on:{'talk:kuroda':{if:"day == 4 && period == 'evening' && met_mio && know_ohayo",node:'greeting'}},
    nodes:{greeting:[{say:'mio',text:'Hello',emo:'quiet',set:{visited:true,count:3,route:'friend'}}]}
  };`);
  return {root,write};
}
test('catalog reads canonical names, portraits, words and readable event labels without executing modules',t=>{
  const {root}=fixture(t),data=catalog(root);
  assert.equal(data.characters[1].name,'Mr. Hamada');
  assert.equal(data.characters[0].portrait,'/game3d/assets/portraits/mio-neutral.webp');
  assert.equal(data.events[0].label,'Talk to Mr. Hamada');
  assert.equal(data.deliveries.find(x=>x.id==='quiet').label,'Quiet');
  assert.equal(data.nodes[0].title,'Greeting');
  assert.equal(data.words[0].ja,'おはよう');
});
test('condition choices use observed types and canonical place and period names',t=>{
  const {root}=fixture(t),data=catalog(root),get=id=>data.variables.find(v=>v.id===id);
  assert.equal(get('count').type,'number');
  assert.equal(get('visited').type,'boolean');
  assert.deepEqual(get('route').options,[{value:'friend',label:'Friend'}]);
  assert.equal(get('met_mio').label,'Has met Mio');
  assert.equal(get('know_ohayo').label,'Knows おはよう (good morning)');
  assert.equal(get('period').options[1].label,'After work');
  assert.equal(get('place').options[0].label,'IT support, B2');
  assert.ok(get('day').options.some(x=>x.value===4));
});
test('public catalog does not follow a source symlink into private data',t=>{
  const {root,write}=fixture(t);
  write('outside/forbidden.js',"export default {nodes:{secret:[]}}");
  fs.symlinkSync(path.join(root,'outside/forbidden.js'),path.join(root,'game3d/story/linked.js'));
  assert.ok(!catalog(root).nodes.some(n=>n.node==='secret'));
});
