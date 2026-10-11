// Adapter for authored scene recipes. Helper calls stay intact when dialogue is edited.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseSource,staticValue,visitSource} from '../lib/source-data.mjs';
import {recipeValues} from './recipe-values.mjs';
import {quote,alignSteps,writeList} from './encode.mjs';
import path from 'node:path';
// The recipe file, relative to the project, so the editor can say where a scene lives.
const where=config=>config.file?path.relative(process.cwd(),config.file).split(path.sep).join('/'):'';
const name=p=>p?.key?.name??p?.key?.value;
const property=(o,key)=>o?.properties?.find(p=>name(p)===key);
const literal=n=>{try{return staticValue(n);}catch{return undefined;}};
const slice=(source,n)=>source.slice(...n.range);
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function model(source){
  const ast=parseSource(source),bindings=ast.body.flatMap(n=>(n.declaration||n).declarations||[]),list=bindings.find(d=>d.id.name==='SCENES')?.init;
  if(list?.type!=='ArrayExpression')throw Error('This recipe has no SCENES list');
  return list.elements.map(e=>e.type==='Identifier'?bindings.find(d=>d.id.name===e.name)?.init:e).filter(n=>n?.type==='ObjectExpression');
}
const dialogueArgs={s:{say:0,text:1,emo:2},line:{say:0,text:1,emo:2},said:{say:1,text:2,emo:3},cw:{say:1,text:2,emo:4},sw:{say:1,text:2,emo:4},gs:{say:1,text:2,emo:4}};
const japanese = text => /[\u3040-\u30ff\u3400-\u9fff]/u.test(text||'');
const shotFields = ['width','at','focus','push','fade','cue','fit','delay','ms','mask','kb'];
function helper(node,source,context){
  const spread=node?.type==='SpreadElement', n=spread?node.argument:node;
  const original={$recipe:slice(source,node)};
  if(spread&&n.type==='ArrayExpression')return {sequence:decode(n,source,context),label:'Picture sequence',...original};
  if(n?.type!=='CallExpression'||n.callee.type!=='Identifier')return {$expression:slice(source,node)};
  const h=n.callee.name,args=n.arguments,d=dialogueArgs[h];
  const image=context.images.find(i=>i.calls.includes(n.range[0]));
  const picture=image?{imageSlot:image.id,imageUrl:image.url}:{};
  if(h==='n'&&typeof literal(args[0])==='string')return {narration:literal(args[0]),...original};
  if(d&&typeof literal(args[d.say])==='string'&&typeof literal(args[d.text])==='string'){
    const text=literal(args[d.text]), translated=['cw','sw','gs'].includes(h);
    const options=args[d.emo+2], translation=translated?literal(args[3]):literal(property(options,'en')?.value);
    return {say:literal(args[d.say]),text,ja:translated||japanese(text)?text:literal(property(options,'ja')?.value)||'',en:translated||japanese(text)?translation||'':text,
      emo:typeof literal(args[d.emo])==='string'?literal(args[d.emo]):'',deliveryEditable:!args[d.emo]||typeof literal(args[d.emo])==='string',...picture,...original};
  }
  if(h==='choice'&&Array.isArray(literal(args[0])))return {choice:literal(args[0]),...original};
  if(h==='seq'&&args[1]?.type==='ArrayExpression')return {sequence:decode(args[1],source,context),label:literal(args[0])||'Picture sequence',...original};
  if(['iff','cond'].includes(h)&&typeof literal(args[0])==='string'&&args[1]?.type==='ArrayExpression'&&(!args[2]||args[2].type==='ArrayExpression'))return {if:literal(args[0]),then:decode(args[1],source,context)||[],else:decode(args[2],source,context)||[],...original};
  if(h==='duo'&&args[0]?.type==='CallExpression'&&typeof literal(args[1])==='string'){
    const inner=helper(args[0],source,context);
    if(inner.say)return {say:inner.say,text:literal(args[1]),en:literal(args[1]),ja:inner.text,
      emo:typeof literal(property(args[2],'emo')?.value)==='string'?literal(property(args[2],'emo')?.value):'',deliveryEditable:(!args[2]||args[2].type==='ObjectExpression')&&(!property(args[2],'emo')||typeof literal(property(args[2],'emo').value)==='string'),
      ...(inner.imageSlot?{imageSlot:inner.imageSlot,imageUrl:inner.imageUrl}:{}),...original};
  }
  if(['pic','picWhenReady','shot','gap'].includes(h)){
    const value=context.resolve(args[1]),options=value&&typeof value==='object'?value:{}, shot={};
    for(const key of shotFields)if(options[key]!==undefined)shot[key]=options[key];
    if(h==='gap'){shot.mask='gap';if(options.w!==undefined)shot.width=options.w;}
    return {shot,$staging:structuredClone(shot),...picture,...(typeof literal(args[1])==='string'?{narration:literal(args[1])}:{}),...original};
  }
  if(['hide','go','bye','end','fin'].includes(h))return {action:h,...(h==='go'?{destination:literal(args[0])}:{}),...(h==='end'?{flag:literal(args[0])}:{}),...(h==='fin'?{keep:literal(args[0]),complete:literal(args[1])??literal(args[0])}:{}),...original};
  if(h==='raw'&&literal(args[0]))return {action:'game',details:literal(args[0]),...original};
  return {$expression:slice(source,node),summary:'Scene action'};
}
function decode(array,source,context){return array?.type==='ArrayExpression'?array.elements.map(n=>helper(n,source,context)):null;}
// A new value for a literal in the style the source wrote it: single quotes, a template, or JSON.
function styled(original,value){
  if(typeof value!=='string')return JSON.stringify(value);
  if(original.startsWith("'"))return quote(value);
  if(original.startsWith('`')&&!/[`\\\n]|\$\{/.test(value))return '`'+value+'`';
  return JSON.stringify(value);
}
// Edit one argument only when its value changed, so an unchanged call keeps its exact text.
function change(node,value,edits){if(node&&JSON.stringify(literal(node))!==JSON.stringify(value))edits.push({range:node.range,value});}
function replaceArguments(raw,edits){
  let s=raw;
  for(const e of edits.sort((a,b)=>b.range[0]-a.range[0])){
    const options=e.options?Object.entries(e.options).map(([key,value])=>`${key}: ${JSON.stringify(value)}`).join(', '):null;
    const appended=e.arguments?Array.from({length:Math.max(...Object.keys(e.arguments).map(Number))-e.start+1},(_,i)=>Object.hasOwn(e.arguments,i+e.start)?JSON.stringify(e.arguments[i+e.start]):'undefined').join(', '):null;
    const replacement=appended!==null?', '+appended:options!==null?e.prefix+options+e.suffix:e.raw??styled(s.slice(e.range[0],e.range[1]),e.value);
    s=s.slice(0,e.range[0])+replacement+s.slice(e.range[1]);
  }
  return s;
}
function appendArgument(call,index,value,edits){
  const position=call.range[1]-1;
  let insertion=edits.find(e=>e.arguments&&e.range[0]===position);
  if(!insertion){insertion={range:[position,position],arguments:{},start:call.arguments.length};edits.push(insertion);}
  insertion.arguments[index]=value;
}
function patchOption(raw,call,index,key,value,edits){
  const options=call.arguments[index], existing=property(options,key);
  if(existing){change(existing.value,value,edits);return;}
  if(options&&options.type!=='ObjectExpression')throw Error('This staging value is inherited and cannot be replaced here.');
  if(!options){
    const insertion=edits.find(e=>e.arguments&&e.range[0]===call.range[1]-1);
    appendArgument(call,index,{...(insertion?.arguments[index]||{}),[key]:value},edits);return;
  }
  const position=options.range[0]+1;
  let insertion=edits.find(e=>e.options&&e.range[0]===position);
  if(!insertion){
    insertion={range:[position,position],options:{},prefix:'',suffix:options.properties.length?', ':''};
    edits.push(insertion);
  }
  insertion.options[key]=value;
}
function encodeShot(raw,call,step){
  const fn=call.callee.name, edits=[],original=step.$staging||{};
  if(typeof step.narration==='string'&&typeof literal(call.arguments[1])==='string')change(call.arguments[1],step.narration,edits);
  // Unchanged computed values remain authored references such as GW.
  for(const key of shotFields){
    if(!Object.hasOwn(step.shot||{},key)||JSON.stringify(step.shot[key])===JSON.stringify(original[key]))continue;
    if(fn==='gap'&&key==='mask')continue;
    if(!['shot','gap'].includes(fn))continue;
    patchOption(raw,call,1,fn==='gap'&&key==='width'?'w':key,step.shot[key],edits);
  }
  return replaceArguments(raw,edits);
}
function encode(step, helpers=new Set()){
  const child=s=>encode(s,helpers);
  if(step?.newPicture){if(!step.$newCall)throw Error('A new picture beat has no picture yet. Pick or make one for it, or delete the beat.');return step.$newCall;}
  if(typeof step==='string')return `n(${JSON.stringify(step)})`;
  if(step?.$expression){parseSource(`const steps=[${step.$expression}];`);return step.$expression;}
  if(step?.$recipe){
    const raw=step.$recipe,wrapped=raw.startsWith('...'),ast=parseSource(wrapped?`[${raw}]`:raw),element=wrapped?ast.body[0].expression.elements[0]:ast.body[0]?.expression;
    if(wrapped)visitSource(element,n=>{n.range=n.range.map(v=>v-1);});
    const call=wrapped?element.argument:element;
    if(call?.type==='ArrayExpression'&&step.sequence)return `...[${raw.includes('/* subplot-gap */')?'/* subplot-gap */':''}${step.sequence.map(child).join(',\n')}]`;
    if(call?.type!=='CallExpression')throw Error('Invalid recipe step');
    const args=call.arguments,fn=call.callee.name;
    if(fn==='choice'){const edits=[];change(args[0],step.choice,edits);return replaceArguments(raw,edits);}
    if(fn==='seq')return raw.slice(0,args[1].range[0])+`[${step.sequence.map(child).join(',\n')}]`+raw.slice(args[1].range[1]);
    if(['iff','cond'].includes(fn))return `${fn}(${JSON.stringify(step.if)}, [${step.then.map(child).join(',\n')}], [${(step.else||[]).map(child).join(',\n')}])`;
    if(['pic','picWhenReady','shot','gap'].includes(fn))return encodeShot(raw,call,step);
    if(['hide','bye'].includes(fn))return raw;
    if(fn==='raw'){const edits=[];change(args[0],step.details,edits);return replaceArguments(raw,edits);}
    if(fn==='go'||fn==='end'){const edits=[];change(args[0],fn==='go'?step.destination:step.flag,edits);return replaceArguments(raw,edits);}
    if(fn==='fin'){const edits=[];change(args[0],step.keep,edits);if(args[1])change(args[1],step.complete,edits);else if(step.complete!==step.keep)appendArgument(call,1,step.complete,edits);return replaceArguments(raw,edits);}
    if(fn==='n'){const edits=[];change(args[0],step.narration??'',edits);return replaceArguments(raw,edits);}
    if(dialogueArgs[fn]||fn==='duo'){
      const inner=fn==='duo'?args[0]:call,positions=dialogueArgs[inner.callee?.name];
      if(!positions)throw Error('Unsupported dialogue helper');
      const originalText=literal(fn==='duo'?args[1]:args[positions.text]);
      const isTranslated=['cw','sw','gs'].includes(fn), mainLanguage=fn==='duo'?'en':isTranslated||japanese(originalText)?'ja':'en';
      const text=step[mainLanguage]!==undefined&&step[mainLanguage]!==originalText?step[mainLanguage]:step.text;
      const edits=[];change(inner.arguments[positions.say],step.say,edits);change(fn==='duo'?args[1]:args[positions.text],text,edits);
      if(fn==='duo'&&step.ja!==undefined)change(inner.arguments[positions.text],step.ja,edits);
      if(isTranslated&&step.en!==undefined&&args[3])change(args[3],step.en,edits);
      if(fn!=='duo'&&!isTranslated){
        const translationField=mainLanguage==='ja'?'en':'ja', translation=step[translationField];
        const options=args[positions.emo+2], prior=literal(property(options,translationField)?.value)||'';
        if(translation!==undefined&&translation!==prior)patchOption(raw,call,positions.emo+2,translationField,translation,edits);
      }
      if(fn==='duo'){
        const options=args[2];
        if(options&&options.type!=='ObjectExpression'&&step.emo)throw Error('Edit delivery in Source for this computed dialogue variant');
        const emotion=property(options,'emo');
        if(emotion){if(typeof literal(emotion.value)==='string')change(emotion.value,step.emo||'',edits);else if(step.emo)throw Error('This delivery is computed. Edit its helper in Source.');}
        else if(step.emo)patchOption(raw,call,2,'emo',step.emo,edits);
      }else if(args[positions.emo]){
        if(typeof literal(args[positions.emo])==='string')change(args[positions.emo],step.emo||'',edits);
        else if(step.emo)throw Error('This delivery is computed. Edit its helper in Source.');
      }
      else if(step.emo){
        appendArgument(call,positions.emo,step.emo,edits);
      }
      return replaceArguments(raw,edits);
    }
    throw Error('Unsupported recipe step');
  }
  if(step?.if!==undefined){const fn=helpers.has('iff')?'iff':helpers.has('cond')?'cond':null;if(!fn)throw Error('This recipe has no condition helper. Use Source.');return `${fn}(${JSON.stringify(step.if)}, [${(step.then||[]).map(child).join(',')}], [${(step.else||[]).map(child).join(',')}])`;}
  if(step?.do&&helpers.has('raw'))return `raw(${JSON.stringify(step)})`;
  if(step?.choice)return `choice(${JSON.stringify(step.choice)})`;
  if(step?.say){
    const en=step.en||'',ja=step.ja||'',emotion=JSON.stringify(step.emo||'');
    const line=text=>`s(${JSON.stringify(step.say)}, ${JSON.stringify(text)}, ${emotion})`;
    if(en&&ja&&helpers.has('duo'))return `duo(${line(ja)}, ${JSON.stringify(en)})`;
    if(en&&ja)return `s(${JSON.stringify(step.say)}, ${JSON.stringify(ja)}, ${emotion}, undefined, {en:${JSON.stringify(en)}})`;
    return line(ja||en||step.text||'');
  }
  if(step?.narration!==undefined)return `n(${JSON.stringify(step.narration)})`;
  throw Error('Use Source for this recipe action. Existing helper calls are preserved.');
}
// A sequence written back with the fewest changes: an unchanged beat keeps its exact text wherever it moved, an edited
// one is edited in place (only its changed arguments, nested beats the same way), a new one is written fresh, and the
// comments and spacing between beats stay. `original` is the sequence as decoded from `array` in `source`.
function encodeArray(steps,original,array,source,helpers){
  const recipeKey=s=>s&&typeof s==='object'?s.$recipe??s.$expression:undefined;
  const nodes=array.elements.filter(Boolean);
  const rows=alignSteps(steps,original||[],{keys:[recipeKey]}).map(({from,exact},j)=>{
    if(from<0)return {text:encode(steps[j],helpers)};
    const node=nodes[from];
    return {from,text:exact?slice(source,node):encodeChanged(steps[j],original[from],node,source,helpers)};
  });
  return writeList(array,source,rows);
}
// An edited beat that holds beats of its own (a picture sequence, seq, iff/cond) keeps its call and edits each list.
function encodeChanged(step,prior,node,source,helpers){
  const call=node.type==='SpreadElement'?node.argument:node;
  const splice=(parts)=>{let out=slice(source,node);for(const [range,text] of parts.sort((a,b)=>b[0][0]-a[0][0]))out=out.slice(0,range[0]-node.range[0])+text+out.slice(range[1]-node.range[0]);return out;};
  if(Array.isArray(step.sequence)&&call.type==='ArrayExpression')return splice([[call.range,encodeArray(step.sequence,prior.sequence,call,source,helpers)]]);
  if(call.type==='CallExpression'&&call.callee.type==='Identifier'){
    const fn=call.callee.name,args=call.arguments;
    if(fn==='seq'&&Array.isArray(step.sequence)&&args[1]?.type==='ArrayExpression')return splice([[args[1].range,encodeArray(step.sequence,prior.sequence,args[1],source,helpers)]]);
    if(['iff','cond'].includes(fn)&&args[1]?.type==='ArrayExpression'){
      const parts=[];
      if(step.if!==prior.if)parts.push([args[0].range,styled(slice(source,args[0]),step.if)]);
      parts.push([args[1].range,encodeArray(step.then||[],prior.then,args[1],source,helpers)]);
      if(args[2]?.type==='ArrayExpression')parts.push([args[2].range,encodeArray(step.else||[],prior.else,args[2],source,helpers)]);
      else if((step.else||[]).length){const at=args[1].range[1];parts.push([[at,at],`, [${step.else.map(s=>encode(s,helpers)).join(', ')}]`]);}
      return splice(parts);
    }
  }
  return encode(step,helpers);
}
// The pictures of a sequence, one slot per shot. A shot is known by its picture, not its place, so its id survives
// beats being added, moved and deleted around it: `pic:<PICS key>` or `file:<file>`, with #2, #3 for a picture shown
// more than once. `ids` ({that picture: id}, kept by the provider) holds the shots whose picture has changed since
// their id was given, so a shot keeps its id (and its versions) when a new picture is picked for it.
function imageSlots(source, sequence, values=recipeValues(source), ids={}) {
  const {resolve,binding}=values,pics=binding('PICS'),slots=new Map(),locations=new Map();
  function locate(node,path='sequence'){
    if(!node?.type)return;locations.set(node.range[0],path);
    for(const [key,value] of Object.entries(node)){
      if(['loc','range','comments'].includes(key))continue;
      if(Array.isArray(value))value.forEach((child,index)=>locate(child,`${path}.${key}.${index}`));
      else if(value?.type)locate(value,`${path}.${key}`);
    }
  }
  locate(sequence);
  visitSource(sequence,(n,ancestors)=>{
    if(n.type!=='CallExpression'||!['pic','picWhenReady','shot','said','gap'].includes(n.callee.name))return;
    const gap=n.callee.name==='gap';
    const value=resolve(n.arguments[0]);if(typeof value!=='string')return;
    const p=property(property(pics,value)?.value,'file');
    let file=p?resolve(p.value):value;
    if(gap){
      const definition=binding('gap'), first=definition?.body?.elements?.[0];
      if(first?.callee?.name!=='shot')return;
      file=resolve(first.arguments[0],{[definition.params[0].name]:value});
    }
    if(typeof file!=='string'||!file.match(/\.(webp|png|jpe?g)$/i))return;
    const group=ancestors.find(a=>a.type==='SpreadElement'&&a.argument?.type==='ArrayExpression'&&source.slice(a.range[0],a.argument.range[0]+24).includes('/* subplot-gap */'));
    const parent=ancestors.at(-1),node=group|| (gap?(parent?.type==='SpreadElement'?parent:n):n.arguments[0]);
    const key=node.range[0],existing=slots.get(key);
    slots.set(key,{label:value,file,location:group?`${locations.get(group.range[0])}.argument`:locations.get(n.range[0]),range:group?n.arguments[0].range:node.range,...(group?{pairedRanges:[...(existing?.pairedRanges||[]),n.arguments[0].range]}:{}),...(p?{table:{keys:pics.properties.map(name),trailingComma:source.slice(pics.properties.at(-1).range[1],pics.range[1]-1).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'').includes(','),range:pics.range,entry:slice(source,property(pics,value).value),fileRange:p.value.range.map(v=>v-property(pics,value).value.range[0])}}:{}),calls:[...(existing?.calls||[]),n.range[0]],
      ...(gap?{gap:true,options:resolve(n.arguments[1])}:{}),url:'/island/private/game/'+file.replace(/^.*?(encounters\/)/,'$1')});
  });
  const list=[...slots.values()],seen=new Map(),taken=new Set();
  for(const slot of list){const base=slot.table?`pic:${slot.label}`:`file:${slot.file}`,n=(seen.get(base)||0)+1;seen.set(base,n);slot.picture=n>1?`${base}#${n}`:base;}
  for(const slot of list){const id=ids[slot.picture];if(typeof id==='string'&&!taken.has(id)){slot.id=id;taken.add(id);}}
  for(const slot of list){if(slot.id)continue;let id=slot.picture,n=2;while(taken.has(id))id=`${slot.picture}~${n++}`;slot.id=id;taken.add(id);}
  return list;
}
function imageEdit(slot,file){
  if(slot.pairedRanges)return slot.pairedRanges.map(range=>({range,value:file}));
  if(slot.table){
    const table=slot.table,base=`${slot.label}__editor_${digest(file).slice(0,10)}`;
    let key=base,suffix=1;while(table.keys.includes(key))key=`${base}_${suffix++}`;
    const entry=replaceArguments(table.entry,[{range:table.fileRange,value:file}]);
    return [{range:slot.range,value:key},{range:[table.range[1]-1,table.range[1]-1],raw:`${table.keys.length&&!table.trailingComma?',':''}\n${JSON.stringify(key)}: ${entry}\n`}];
  }
  if(!slot.gap)return [{range:slot.range,value:file}];
  // A derived image has two presentations. Give this occurrence its own shots,
  // leaving the shared gap helper and every other use of it untouched.
  const o=slot.options;
  if(!o||!Object.values(o).every(v=>v!==undefined))throw Error('Save the scene staging before replacing this derived image');
  const first={mask:'gap',width:+(o.w*0.55).toFixed(3)};
  for(const key of ['at','focus','push','fade','cue'])if(o[key]!==undefined)first[key]=o[key];
  const second={mask:'gap',width:o.w,ms:600,delay:450,_skipList:true};
  return [{range:slot.range,raw:`...[/* subplot-gap */shot(${JSON.stringify(file)}, ${JSON.stringify(first)}), shot(${JSON.stringify(file)}, ${JSON.stringify(second)})]`}];
}
function slotsByAuthoredStep(steps,array,slots,result=new Map()){
  for(let index=0;index<(steps||[]).length;index++){
    const step=steps[index],node=array?.elements?.[index];if(!node)continue;
    if(step.imageSlot){
      const slot=slots.find(s=>s.calls.some(call=>call>=node.range[0]&&call<node.range[1]));
      if(slot)result.set(step.imageSlot,slot);
    }
    const call=node.type==='SpreadElement'?node.argument:node;
    if(step.sequence)slotsByAuthoredStep(step.sequence,call.type==='ArrayExpression'?call:call.arguments?.[1],slots,result);
    if(step.then)slotsByAuthoredStep(step.then,call.arguments?.[1],slots,result);
    if(step.else)slotsByAuthoredStep(step.else,call.arguments?.[2],slots,result);
  }
  return result;
}
// How a recipe shows a picture: an inline shot(file) call, or pic(key) into its PICS table; false when it has neither.
function pictureHelper(values){return values.binding('shot')?'shot':values.binding('pic')&&values.binding('PICS')?.type==='ObjectExpression'?'pic':false;}
// A picture beat added in the editor ({shot, newPicture, file}; local.py sets the file of the render picked for it) becomes
// shot("<file>", {}), or pic("<scene>.<n>") with a new PICS entry: the file, the beat's narration as its caption and the
// scene's first picture's level and people, so the briefs and checks the generator writes still have them.
function newPictures(steps,source,values,sceneId,edits){
  const found=[];const walk=xs=>(xs||[]).forEach(st=>{if(st?.newPicture)found.push(st);if(st&&typeof st==='object')for(const k of['then','else','sequence'])walk(st[k]);});
  walk(steps);if(!found.length)return;
  const how=pictureHelper(values);if(!how)throw Error('This recipe has no picture helper, so a picture beat cannot be added here.');
  const table=values.binding('PICS'),keys=how==='pic'?table.properties.map(name):[];
  const own=keys.filter(k=>String(k).startsWith(sceneId+'.'));
  const first=own.length?values.resolve(property(table,own[0]).value)||{}:{};
  let next=Math.max(0,...own.map(k=>parseInt(String(k).split('.')[1],10)).filter(Number.isFinite))+1;
  const added=[];
  for(const st of found){
    if(!st.file)continue; // encode says what is missing
    if(how==='shot'){st.$newCall=`shot(${JSON.stringify(st.file)}, {})`;continue;}
    const key=`${sceneId}.${next++}`;
    const entry={file:st.file,cap:st.narration||'Added in the scene editor.',...Object.fromEntries(['level','who'].filter(k=>typeof first[k]==='string').map(k=>[k,first[k]]))};
    added.push(`${JSON.stringify(key)}: ${JSON.stringify(entry)}`);st.$newCall=`pic(${JSON.stringify(key)})`;
  }
  if(!added.length)return;
  const trailing=source.slice(table.properties.at(-1)?.range[1]??table.range[0]+1,table.range[1]-1).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'').includes(',');
  const at=table.range[1]-1;
  edits.push({range:[at,at],text:`${table.properties.length&&!trailing?',':''}\n  ${added.join(',\n  ')},\n`});
}
export function recipe(source,config,request){
  const scenes=model(source), rows=[];
  for(const scene of scenes){
    const id=literal(property(scene,'id')?.value);if(!id)continue;
    const nodes=property(scene,'nodes')?.value;
    const sequences=nodes?.properties||['steps','leave'].map(k=>property(scene,k)).filter(Boolean);
    for(const p of sequences){const node=name(p);if(!node)continue;rows.push({scene,sequence:p,id:`local:${config.key}:${id}:${node}`,sceneId:id,node});}
  }
  // the picture files each part uses, for the scene list's status (local.py status)
  if(request.action==='status'){const values=recipeValues(source);return {scenes:rows.map(r=>{let files=[];try{files=imageSlots(source,r.sequence.value,values).map(i=>i.file).filter(Boolean);}catch{/* a part whose pictures can't be read shows no picture status */}return {id:r.id,scene:r.sceneId,files};}),errors:[]};}
  if(request.action==='catalog')return {scenes:rows.map(r=>({id:r.id,provider:'local',title:`${r.sceneId.replaceAll('_',' ')} · ${r.node}`,node:r.node,group:config.label,where:where(config),scene:r.sceneId,count:r.sequence.value.elements?.length??null})),errors:[]};
  const row=rows.find(r=>r.id===request.id);if(!row)throw Error('Scene not found');
  const {scene,sequence}=row;
  const known=request.slotIds&&typeof request.slotIds==='object'?request.slotIds:{};
  const values=recipeValues(source), images=imageSlots(source,sequence.value,values,known),context={...values,images};
  if(request.action==='read')return {id:row.id,provider:'local',title:`${row.sceneId.replaceAll('_',' ')} · ${row.node}`,node:row.node,group:config.label,where:where(config),scene:row.sceneId,revision:digest(source),steps:decode(sequence.value,source,context),raw:slice(source,sequence.value),entries:[],routesEditable:false,metadata:{},placement:{place:literal(property(scene,'place')?.value)??null,day:literal(property(scene,'day')?.value)??null,condition:literal(property(scene,'show')?.value)??null},previewUrl:`/game3d/index.html?scene=${encodeURIComponent(row.sceneId)}`,recipe:true,capabilities:{camera:!!values.binding('raw'),picture:pictureHelper(values)},images:images.map(({range,calls,gap,options,table,pairedRanges,picture,...image})=>image)};
  if(request.action==='prepare'){
    if(request.revision!==digest(source))throw Error('CONFLICT: The recipe changed. Reload this scene.');
    const helpers=new Set(parseSource(source).body.flatMap(n=>(n.declaration||n).declarations||[]).map(d=>d.id.name));
    const edits=[];
    if(request.steps)newPictures(request.steps,source,values,row.sceneId,edits);
    const expression=!request.steps?request.raw:sequence.value.type==='ArrayExpression'?encodeArray(request.steps,decode(sequence.value,source,context),sequence.value,source,helpers)
      :`[\n${request.steps.map(s=>encode(s,helpers)).join(',\n')}\n]`;
    if(typeof expression!=='string')throw Error('Missing scene sequence');
    edits.push({range:sequence.value.range,text:expression});
    if(request.placement){for(const [key,field]of[['place','place'],['day','day'],['show','condition']]){
      const p=property(scene,key);if(!p||request.placement[field]===null)continue;
      const value=request.placement[field];
      if(key==='day'&&(!Number.isInteger(value)||value<1))throw Error('Story day must be a positive integer');
      if(key!=='day'&&typeof value!=='string')throw Error('Invalid scene placement');
      if(key==='show'&&value){if(!/^[\w\s!&|()<>=.'"+-]*$/.test(value))throw Error('Unsupported condition characters');parseSource(`(${value});`);}
      if(literal(p.value)!==value)edits.push({range:p.value.range,text:JSON.stringify(value)});
    }}
    let changed=source;for(const e of edits.sort((a,b)=>b.range[0]-a.range[0]))changed=changed.slice(0,e.range[0])+e.text+changed.slice(e.range[1]);
    if(request.restoreImages?.length){
      for(let i=0;i<request.restoreImages.length;i++){
        const currentScene=model(changed).find(s=>literal(property(s,'id')?.value)===row.sceneId);
        const currentSequence=property(property(currentScene,'nodes')?.value,row.node)||property(currentScene,row.node);
        const currentSlots=imageSlots(changed,currentSequence.value), prior=request.restoreImages[i];
        const authoredSlots=request.steps?slotsByAuthoredStep(request.steps,currentSequence.value,currentSlots):null;
        const next=authoredSlots?authoredSlots.get(prior.id):currentSlots.find(s=>s.location===prior.location)||currentSlots[i];
        if(!next){if(authoredSlots)continue;throw Error('This revision’s image slot is no longer available');}
        if(next.file!==prior.file)changed=replaceArguments(changed,imageEdit(next,prior.file));
      }
    }
    for(const replacement of request.imageReplacements||[request.imageReplacement].filter(Boolean)){
      const prior=(request.restoreImages||images).find(i=>i.id===replacement.slot);if(!prior)throw Error('The image slot changed. Reload the scene.');
      const editedScene=model(changed).find(s=>literal(property(s,'id')?.value)===row.sceneId);
      const editedSequence=property(property(editedScene,'nodes')?.value,row.node)||property(editedScene,row.node);
      const currentSlots=imageSlots(changed,editedSequence.value);
      const authoredSlots=request.steps?slotsByAuthoredStep(request.steps,editedSequence.value,currentSlots):null;
      const next=authoredSlots?authoredSlots.get(replacement.slot):currentSlots.find(i=>i.location===prior.location);
      if(!request.steps&&request.raw!==slice(source,sequence.value))throw Error('Save the changed sequence before replacing this image');
      if(!next)throw Error('Save the changed sequence before replacing this image');
      changed=replaceArguments(changed,imageEdit(next,replacement.file));
    }
    parseSource(changed);
    const finalScene=model(changed).find(s=>literal(property(s,'id')?.value)===row.sceneId);
    const finalSequence=property(property(finalScene,'nodes')?.value,row.node)||property(finalScene,row.node);
    // Each shot of the saved sequence keeps the id of the beat it came from, wherever it moved and whatever picture it
    // now shows; `slotIds` is what the provider keeps for the next read, `shots` every id the sequence still has.
    const finalSlots=imageSlots(changed,finalSequence.value,recipeValues(changed),known);
    const owners=new Map(request.steps?[...slotsByAuthoredStep(request.steps,finalSequence.value,finalSlots)].map(([id,slot])=>[slot,id]):[]);
    const slotIds={},shots=[];
    for(const slot of finalSlots){const id=owners.get(slot)??slot.id;shots.push(id);if(id!==slot.picture)slotIds[slot.picture]=id;}
    return {source,changed,revision:digest(changed),slotIds,shots};
  }
  throw Error('Unsupported recipe operation');
}
if(process.argv[1]===new URL(import.meta.url).pathname){try{const chunks=[];for await(const c of process.stdin)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks));const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const configs=config.sources;const all=input.action==='catalog'||input.action==='status';const selected=all?configs:configs.filter(c=>input.id.startsWith(`local:${c.key}:`));const data=selected.map(c=>recipe(fs.readFileSync(c.file,'utf8'),c,input));console.log(JSON.stringify(all?{scenes:data.flatMap(d=>d.scenes),errors:[]}:data[0]||{error:'Unknown scene'}));}catch(e){console.log(JSON.stringify({error:e.message}));process.exitCode=1;}}
