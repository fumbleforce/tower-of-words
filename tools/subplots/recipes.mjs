// Adapter for authored scene recipes. Helper calls stay intact when dialogue is edited.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseSource,staticValue,visitSource} from '../lib/source-data.mjs';
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
function helper(n,source){
  if(n?.type!=='CallExpression'||n.callee.type!=='Identifier')return {$expression:slice(source,n)};
  const h=n.callee.name,args=n.arguments,original={$recipe:slice(source,n)},d=dialogueArgs[h];
  if(h==='n'&&typeof literal(args[0])==='string')return {narration:literal(args[0]),...original};
  if(d&&typeof literal(args[d.say])==='string'&&typeof literal(args[d.text])==='string')return {say:literal(args[d.say]),text:literal(args[d.text]),emo:typeof literal(args[d.emo])==='string'?literal(args[d.emo]):'',deliveryEditable:!args[d.emo]||typeof literal(args[d.emo])==='string',...original};
  if(h==='choice'&&Array.isArray(literal(args[0])))return {choice:literal(args[0]),...original};
  if(h==='seq'&&args[1]?.type==='ArrayExpression')return {sequence:decode(args[1],source),label:literal(args[0])||'Picture sequence',...original};
  if(['iff','cond'].includes(h)&&typeof literal(args[0])==='string'&&args[1]?.type==='ArrayExpression'&&(!args[2]||args[2].type==='ArrayExpression'))return {if:literal(args[0]),then:decode(args[1],source)||[],else:decode(args[2],source)||[],...original};
  if(h==='duo'&&args[0]?.type==='CallExpression'&&typeof literal(args[1])==='string'){
    const inner=helper(args[0],source);
    if(inner.say)return {say:inner.say,text:literal(args[1]),emo:typeof literal(property(args[2],'emo')?.value)==='string'?literal(property(args[2],'emo')?.value):'',deliveryEditable:(!args[2]||args[2].type==='ObjectExpression')&&(!property(args[2],'emo')||typeof literal(property(args[2],'emo').value)==='string'),...original};
  }
  if(['pic','shot'].includes(h)&&args.length>1&&typeof literal(args[1])==='string')return {narration:literal(args[1]),image:slice(source,args[0]),...original};
  return {$expression:slice(source,n)};
}
function decode(array,source){return array?.type==='ArrayExpression'?array.elements.map(n=>helper(n,source)):null;}
function replaceArguments(raw,edits){let s=raw;for(const e of edits.sort((a,b)=>b.range[0]-a.range[0]))s=s.slice(0,e.range[0])+(e.raw??JSON.stringify(e.value))+s.slice(e.range[1]);return s;}
function encode(step, helpers=new Set()){
  const child=s=>encode(s,helpers);
  if(typeof step==='string')return `n(${JSON.stringify(step)})`;
  if(step?.$expression){parseSource(`const steps=[${step.$expression}];`);return step.$expression;}
  if(step?.$recipe){
    const raw=step.$recipe,ast=parseSource(raw),call=ast.body[0]?.expression;
    if(call?.type!=='CallExpression')throw Error('Invalid recipe step');
    const args=call.arguments,fn=call.callee.name;
    if(fn==='choice')return replaceArguments(raw,[{range:args[0].range,value:step.choice}]);
    if(fn==='seq')return raw.slice(0,args[1].range[0])+`[${step.sequence.map(child).join(',\n')}]`+raw.slice(args[1].range[1]);
    if(['iff','cond'].includes(fn))return `${fn}(${JSON.stringify(step.if)}, [${step.then.map(child).join(',\n')}], [${(step.else||[]).map(child).join(',\n')}])`;
    if(fn==='n'||['pic','shot'].includes(fn))return replaceArguments(raw,[{range:args[fn==='n'?0:1].range,value:step.narration??''}]);
    if(dialogueArgs[fn]||fn==='duo'){
      const inner=fn==='duo'?args[0]:call,positions=dialogueArgs[inner.callee?.name];
      if(!positions)throw Error('Unsupported dialogue helper');
      const edits=[{range:inner.arguments[positions.say].range,value:step.say},{range:(fn==='duo'?args[1]:args[positions.text]).range,value:step.text}];
      if(fn==='duo'){
        const options=args[2];
        if(options&&options.type!=='ObjectExpression'&&step.emo)throw Error('Edit delivery in Source for this computed dialogue variant');
        const emotion=property(options,'emo');
        if(emotion){if(typeof literal(emotion.value)==='string')edits.push({range:emotion.value.range,value:step.emo||''});else if(step.emo)throw Error('This delivery is computed. Edit its helper in Source.');}
        else if(step.emo){
          const position=options?options.range[1]-1:call.range[1]-1;
          const addition=options?`${options.properties.length?', ':''}emo: ${JSON.stringify(step.emo)}`:`, {emo:${JSON.stringify(step.emo)}}`;
          edits.push({range:[position,position],raw:addition});
        }
      }else if(args[positions.emo]){
        if(typeof literal(args[positions.emo])==='string')edits.push({range:args[positions.emo].range,value:step.emo||''});
        else if(step.emo)throw Error('This delivery is computed. Edit its helper in Source.');
      }
      else if(step.emo){
        const missing=Array(Math.max(0,positions.emo-args.length)).fill('undefined');
        edits.push({range:[call.range[1]-1,call.range[1]-1],raw:', '+[...missing,JSON.stringify(step.emo)].join(', ')});
      }
      return replaceArguments(raw,edits);
    }
    throw Error('Unsupported recipe step');
  }
  if(step?.if!==undefined){const fn=helpers.has('iff')?'iff':helpers.has('cond')?'cond':null;if(!fn)throw Error('This recipe has no condition helper. Use Source.');return `${fn}(${JSON.stringify(step.if)}, [${(step.then||[]).map(child).join(',')}], [${(step.else||[]).map(child).join(',')}])`;}
  if(step?.do&&helpers.has('raw'))return `raw(${JSON.stringify(step)})`;
  if(step?.choice)return `choice(${JSON.stringify(step.choice)})`;
  if(step?.say)return `s(${JSON.stringify(step.say)}, ${JSON.stringify(step.text)}, ${JSON.stringify(step.emo||'')})`;
  if(step?.narration!==undefined)return `n(${JSON.stringify(step.narration)})`;
  throw Error('Use Source for this recipe action. Existing helper calls are preserved.');
}
function imageSlots(source, sequence) {
  const ast=parseSource(source),ds=ast.body.flatMap(n=>(n.declaration||n).declarations||[]);
  const resolve=(n,seen=new Set())=>{
    const v=literal(n);if(v!==undefined)return v;
    if(n?.type==='Identifier'&&!seen.has(n.name)){seen.add(n.name);return resolve(ds.find(d=>d.id.name===n.name)?.init,seen);}
    if(n?.type==='BinaryExpression'&&n.operator==='+'){const a=resolve(n.left,new Set(seen)),b=resolve(n.right,new Set(seen));if(typeof a==='string'&&typeof b==='string')return a+b;}
    return undefined;
  };
  const pics=ds.find(d=>d.id.name==='PICS')?.init,slots=new Map();
  visitSource(sequence,n=>{
    if(n.type!=='CallExpression'||!['pic','picWhenReady','shot','said'].includes(n.callee.name))return;
    const value=resolve(n.arguments[0]);if(typeof value!=='string')return;
    const p=property(property(pics,value)?.value,'file');
    const file=p?resolve(p.value):value;
    if(typeof file!=='string'||!file.match(/\.(webp|png|jpe?g)$/i))return;
    const node=p?.value||n.arguments[0],key=node.range[0],id=slots.get(key)?.id||`image:${slots.size}`;
    slots.set(key,{id,label:value,file,range:node.range,url:'/island/private/game/'+file.replace(/^.*?(encounters\/)/,'$1')});
  });return [...slots.values()];
}
export function recipe(source,config,request){
  const scenes=model(source), rows=[];
  for(const scene of scenes){
    const id=literal(property(scene,'id')?.value);if(!id)continue;
    const nodes=property(scene,'nodes')?.value;
    const sequences=nodes?.properties||['steps','leave'].map(k=>property(scene,k)).filter(Boolean);
    for(const p of sequences){const node=name(p);if(!node)continue;rows.push({scene,sequence:p,id:`local:${config.key}:${id}:${node}`,sceneId:id,node});}
  }
  if(request.action==='catalog')return {scenes:rows.map(r=>({id:r.id,provider:'local',title:`${r.sceneId.replaceAll('_',' ')} · ${r.node}`,node:r.node,group:config.label,count:r.sequence.value.elements?.length??null})),errors:[]};
  const row=rows.find(r=>r.id===request.id);if(!row)throw Error('Scene not found');
  const {scene,sequence}=row;
  const images=imageSlots(source,sequence.value);
  if(request.action==='read')return {id:row.id,provider:'local',title:`${row.sceneId.replaceAll('_',' ')} · ${row.node}`,node:row.node,group:config.label,revision:digest(source),steps:decode(sequence.value,source),raw:slice(source,sequence.value),entries:[],routesEditable:false,metadata:{},placement:{place:literal(property(scene,'place')?.value)??null,day:literal(property(scene,'day')?.value)??null,condition:literal(property(scene,'show')?.value)??null},previewUrl:`/game3d/index.html?scene=${encodeURIComponent(row.sceneId)}`,recipe:true,images:images.map(({range,...image})=>image)};
  if(request.action==='prepare'){
    if(request.revision!==digest(source))throw Error('CONFLICT: The recipe changed. Reload this scene.');
    const helpers=new Set(parseSource(source).body.flatMap(n=>(n.declaration||n).declarations||[]).map(d=>d.id.name));
    const expression=request.steps?`[\n${request.steps.map(s=>encode(s,helpers)).join(',\n')}\n]`:request.raw;
    if(typeof expression!=='string')throw Error('Missing scene sequence');
    const edits=[{range:sequence.value.range,text:expression}];
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
      const restoredScene=model(changed).find(s=>literal(property(s,'id')?.value)===row.sceneId);
      const restoredSequence=property(property(restoredScene,'nodes')?.value,row.node)||property(restoredScene,row.node);
      const currentSlots=imageSlots(changed,restoredSequence.value),replacements=[];
      for(let i=0;i<request.restoreImages.length;i++){
        const prior=request.restoreImages[i];
        const next=currentSlots.find(s=>s.label===prior.label)||currentSlots[i];
        if(!next)throw Error('This revision’s image slot is no longer available');
        if(next.file!==prior.file)replacements.push({range:next.range,value:prior.file});
      }
      changed=replaceArguments(changed,replacements);
    }
    if(request.imageReplacement){
      const prior=(request.restoreImages||images).find(i=>i.id===request.imageReplacement.slot);if(!prior)throw Error('The image slot changed. Reload the scene.');
      const editedScene=model(changed).find(s=>literal(property(s,'id')?.value)===row.sceneId);
      const editedSequence=property(property(editedScene,'nodes')?.value,row.node)||property(editedScene,row.node);
      const matches=imageSlots(changed,editedSequence.value).filter(i=>i.label===prior.label&&i.file===prior.file);
      const occurrence=(request.restoreImages||images).filter(i=>i.label===prior.label&&i.file===prior.file).findIndex(i=>i.id===prior.id);
      const next=matches[occurrence];if(!next)throw Error('Save the changed sequence before replacing this image');
      changed=changed.slice(0,next.range[0])+JSON.stringify(request.imageReplacement.file)+changed.slice(next.range[1]);
    }
    parseSource(changed);return {source,changed,revision:digest(changed)};
  }
  throw Error('Unsupported recipe operation');
}
if(process.argv[1]===new URL(import.meta.url).pathname){try{const chunks=[];for await(const c of process.stdin)chunks.push(c);const input=JSON.parse(Buffer.concat(chunks));const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const configs=config.sources;const selected=input.action==='catalog'?configs:configs.filter(c=>input.id.startsWith(`local:${c.key}:`));const data=selected.map(c=>recipe(fs.readFileSync(c.file,'utf8'),c,input));console.log(JSON.stringify(input.action==='catalog'?{scenes:data.flatMap(d=>d.scenes),errors:[]}:data[0]||{error:'Unknown scene'}));}catch(e){console.log(JSON.stringify({error:e.message}));process.exitCode=1;}}
