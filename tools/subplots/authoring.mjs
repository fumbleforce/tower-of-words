// Read the same public sources as bible/live.js without importing story or runtime modules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource, staticValue, visitSource } from '../lib/source-data.mjs';

const nameOf = p => p?.type === 'Property' && !p.computed ? p.key.name ?? p.key.value : null;
const prop = (node, name) => node?.properties?.find(p => nameOf(p) === name)?.value;
const value = node => { try { return staticValue(node); } catch { return undefined; } };
export const humanize = id => String(id).replace(/^d(\d+)[_-]/, 'Day $1 · ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
function properties(node) {
  return (node?.properties || []).flatMap(p => nameOf(p) === null ? [] : [[nameOf(p), p.value]]);
}
function binding(ast, name) {
  let result;
  visitSource(ast, node => { if (node.type === 'VariableDeclarator' && node.id.name === name) result = node.init; });
  return result;
}
function storyFiles(root) {
  const out = [];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.js')) out.push(file);
    }
  };
  walk(path.join(root, 'game3d/story'));
  return out.sort();
}
export function catalog(root) {
  const warnings = [], sources = new Set();
  const read = file => {
    const full = path.join(root, file);
    // Only explicitly public inputs. Do not follow source symlinks out of the checkout.
    if (!fs.existsSync(full)) return '';
    const relative = path.relative(fs.realpathSync(root), fs.realpathSync(full));
    if (!relative.startsWith('game3d/') && !relative.startsWith('docs/game/')) return '';
    sources.add(file);
    return fs.readFileSync(full, 'utf8');
  };
  const ast = file => { try { return parseSource(read(file)); } catch { warnings.push(`Could not read ${file}`); return parseSource(''); } };
  const cast = read('docs/game/cast.md').split(/^## Everyone\s*$/m)[1]?.split(/^## /m)[0] || '';
  const characters = [...cast.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/gm)].map(([,id,name,description]) => ({id,name:name.trim(),description:description.trim(),portrait:null,faces:[],bible:'/bible/#character/'+id}));
  const names = Object.fromEntries(characters.map(c => [c.id,c.name]));
  const portraits = ast('game3d/js/ui/portrait-data.js');
  for (const [id, facesNode] of properties(binding(portraits,'PORTRAITS'))) {
    const character = characters.find(c=>c.id===id);
    if (!character) continue;
    character.faces = (value(facesNode)||[]).map(id=>({id,label:humanize(id)}));
    if (character.faces.length) character.portrait = `/game3d/assets/portraits/${id}-${character.faces[0].id}.webp`;
  }
  for (const [id, reference] of properties(binding(portraits,'TEXT_PORTRAITS'))) {
    const [who,face] = value(reference)||[], character=characters.find(c=>c.id===id);
    if(character && who && face) character.portrait=`/game3d/assets/portraits/${who}-${face}.webp`;
  }
  // Protagonist portrait is selected by the runtime. The canonical default is its data file.
  const mcSource = read('game3d/data/mc/eric.json');
  if(mcSource) { try {
    const mc=JSON.parse(mcSource), character=characters.find(c=>c.id==='eric');
    if(character && mc.portrait?.set) {
      character.faces=(mc.portrait.faces||['neutral']).map(id=>({id,label:humanize(id)}));
      character.portrait=`/game3d/assets/portraits/${mc.portrait.set}-${character.faces[0].id}.webp`;
    }
  } catch { warnings.push('Could not read the protagonist portrait'); } }
  // Name colours, as the game's dialogue box shows them (the player's entry has a computed key).
  for (const p of binding(ast('game3d/js/narrative/speakers.js'),'DEFAULT_SPEAKERS')?.properties || []) {
    const id = p.computed ? 'eric' : nameOf(p), color = value(prop(p.value,'color'));
    const character = characters.find(c=>c.id===id);
    if (character && typeof color==='string') character.color = color;
  }
  const definitions=ast('game3d/js/places/definitions.js');
  const placeDocs=read('docs/game/places.md');
  const placeTitles=Object.fromEntries([...placeDocs.matchAll(/^## (.+?) \(`([a-z0-9_]+)`\)\s*$/gm)].map(([,title,id])=>[id,title]));
  const places=properties(binding(definitions,'PLACE_NAMES')).map(([id,node])=>({id,name:value(node)||placeTitles[id]||humanize(id),image:fs.existsSync(path.join(root,`bible/shots/places/${id}.webp`))?`/bible/shots/places/${id}.webp`:null,bible:'/bible/#place-map/'+id}));
  const periods=properties(binding(ast('game3d/js/sim.js'),'PERIOD_NAMES')).map(([valueId,node])=>({value:valueId,label:value(node)||humanize(valueId)}));
  const words=new Map(), observed=new Map(), events=new Map(), deliveries=new Set(), nodes=[];
  const observe=(id, val) => {
    if(!id || ['true','false','undefined','null'].includes(id)) return;
    if(!observed.has(id)) observed.set(id,new Set());
    if(['string','number','boolean'].includes(typeof val)) observed.get(id).add(val);
  };
  const condition = expression => {
    if(typeof expression!=='string') return;
    try { visitSource(parseSource(`(${expression});`), node=>{
      if(node.type==='Identifier') observe(node.name);
      if(node.type==='BinaryExpression') {
        if(node.left.type==='Identifier') observe(node.left.name,value(node.right));
        if(node.right.type==='Identifier') observe(node.right.name,value(node.left));
      }
    }); } catch { /* An unsupported expression is preserved by the source adapter. */ }
  };
  const files=[...storyFiles(root).map(f=>path.relative(root,f)), 'game3d/js/lang.js', 'game3d/js/tickets/words.js'];
  for(const file of [...new Set(files)]) {
    const tree=ast(file);
    const day=file.match(/\/day(\d+)\//)?.[1]; if(day) observe('day',Number(day));
    for(const [id,node] of properties(binding(tree,'WORDS'))) {
      const word={id,ja:value(prop(node,'ja')),en:value(prop(node,'en')),reading:value(prop(node,'ro'))};
      if(word.ja && word.en) words.set(id,word);
    }
    visitSource(tree,node=>{
      if(node.type!=='ObjectExpression') return;
      for(const [id,val] of properties(prop(node,'set'))) observe(id,value(val));
      for(const field of ['if','show']) condition(value(prop(node,field)));
      for(const [,val] of properties(prop(node,'goal'))) condition(value(val));
      const emotion=value(prop(node,'emo')); if(typeof emotion==='string') deliveries.add(emotion);
      for(const [event] of properties(prop(node,'on'))) {
        if(!events.has(event)) events.set(event,{id:event,label:'',sources:[]});
        const record=events.get(event); if(!record.sources.includes(file)) record.sources.push(file);
      }
      for(const [id] of properties(prop(node,'nodes'))) nodes.push({id:`public:${file}#${id}`,node:id,title:humanize(id),file});
    });
  }
  const personOrThing=id=>names[id]||places.find(p=>p.id===id)?.name||humanize(id);
  for(const event of events.values()) {
    const [action,target,who]=event.id.split(':');
    const word=words.get(target);
    const spoken=word ? `${word.ja} (${word.en})` : humanize(target||'');
    event.label=action==='talk'?`Talk to ${personOrThing(target)}`:action==='say'?`Say ${spoken}${who?' to '+personOrThing(who):''}`:action==='zone'?`Enter ${personOrThing(target)}`:action==='idle'?`Chat with ${personOrThing(target)}, when nothing else is on`:action==='near'?`Walk up to ${personOrThing(target)}`:action==='give'?`Give ${target==='*'?'something':humanize(target)} to ${personOrThing(who)}`:action==='ask'?`Ask ${personOrThing(target)} something`:action==='look'?`Look at ${personOrThing(target)}`:action==='act'?`Use ${personOrThing(target)}`:action==='event'?`${personOrThing(target)} happens`:humanize(event.id.replaceAll(':',' '));
  }
  const variables=[
    {id:'day',label:'Story day',type:'number',options:[...new Set([1,...(observed.get('day')||[])].filter(x=>typeof x==='number'))].sort((a,b)=>a-b).map(value=>({value,label:`Day ${value}`}))},
    {id:'period',label:'Time of day',type:'enum',options:periods},
    {id:'place',label:'Current place',type:'enum',options:places.map(p=>({value:p.id,label:p.name}))},
  ];
  for(const word of words.values()) observe('know_'+word.id,true);
  // everyone in the cast can be met (the engine sets met_<id>), so "Has met" is offered for each of them
  // (one per name: Mio's text messages are a speaker of their own, miotext, but she is met once)
  const metNames=new Set();
  for(const c of characters) if(c.id!=='eric'&&!metNames.has(c.name)&&(metNames.add(c.name),true)) observe('met_'+c.id,true);
  for(const [id,values] of observed) {
    if(['day','period','place'].includes(id)) continue;
    const word=id.startsWith('know_')&&words.get(id.slice(5));
    const person=id.startsWith('met_')&&names[id.slice(4)];
    const label=word?`Knows ${word.ja} (${word.en})`:person?`Has met ${person}`:humanize(id);
    const strings=[...values].filter(x=>typeof x==='string');
    const numbers=[...values].filter(x=>typeof x==='number');
    const type=strings.length?'enum':numbers.length?'number':'boolean';
    const options=type==='enum'?strings.sort().map(value=>({value,label:humanize(value)})):type==='boolean'?[{value:true,label:'Yes'},{value:false,label:'No'}]:[];
    variables.push({id,label,type,options,group:word?'Language':person?'People':'Story progress'});
  }
  return {characters,places,variables,events:[...events.values()].sort((a,b)=>a.label.localeCompare(b.label)),deliveries:[{id:'',label:'Natural'},...[...deliveries].sort().map(id=>({id,label:humanize(id)}))],words:[...words.values()],nodes,sources:[...sources],warnings};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  try { process.stdout.write(JSON.stringify(catalog(process.env.SUBPLOTS_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')))); }
  catch(error) { process.stderr.write(error.stack+'\n'); process.exitCode=1; }
}
