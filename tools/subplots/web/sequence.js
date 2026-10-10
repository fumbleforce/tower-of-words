const {document,structuredClone} = globalThis;
import {$,esc,api,guarded,notice} from './common.js';
import {humanize,selectHTML,conditionEditor} from './conditions.js';
let authoring={characters:[],places:[],variables:[],events:[],deliveries:[]},nodes=[],imageFocus=()=>{};
export function configureSequence(data,catalog,focus){authoring={...authoring,...data};nodes=catalog;imageFocus=focus;}
const translationKey=(say,text)=>{let h=2166136261;for(const c of say+'\n'+text)h=Math.imul(h^c.charCodeAt(0),16777619);return 'line-'+(h>>>0).toString(36);};
const name=id=>authoring.characters.find(c=>c.id===id)?.name||humanize(id);
const destinations=scene=>nodes.filter(n=>scene.id?.startsWith('local:')?n.id.slice(0,n.id.lastIndexOf(':'))===scene.id.slice(0,scene.id.lastIndexOf(':')):n.id.split('#')[0]===scene.id.split('#')[0]).map(n=>({value:n.node,label:humanize(n.title)}));
function dropdown(host,label,options,value,change,empty){
  const el=document.createElement('label');el.innerHTML=`${esc(label)}<select>${selectHTML(options,value,empty)}</select>`;
  $('select',el).onchange=e=>change(e.target.value);host.append(el);return $('select',el);
}
function number(host,label,value,change,{min=0,max=100,step=1}={}){
 const el=document.createElement('label');el.innerHTML=`${esc(label)}<input type="number" min="${min}" max="${max}" step="${step}" value="${esc(value)}">`;
 $('input',el).onchange=e=>change(Number(e.target.value));host.append(el);
}
function picture(host,step,scene){
 const slot=(scene.images||[]).find(i=>i.id===step.imageSlot),selected=scene.metadata?.images?.[step.imageSlot]||(scene.metadata?.image?.slot===step.imageSlot?scene.metadata.image:null);
 const url=selected?.url||slot?.url||step.imageUrl;if(!url&&!slot)return;
 const figure=document.createElement('figure');figure.className='shot-picture';
 figure.innerHTML=`${slot?.available===false&&!selected?'<div class="missing-picture"><span>Image not available yet</span><p>Choose an existing render or compose a new picture for this shot.</p></div>':`<img src="${esc(url)}" alt="Scene illustration" loading="lazy">`}<figcaption><span>${selected?'Selected replacement':'Scene image'}</span><button type="button">Edit image</button></figcaption>`;
 $('button',figure).onclick=()=>imageFocus(step.imageSlot||slot?.id);if(!step.imageSlot&&!slot){$('button',figure).disabled=true;$('button',figure).textContent='Save to edit this image';}if($('img',figure))$('img',figure).onerror=e=>{e.target.hidden=true;figure.insertAdjacentHTML('afterbegin','<p class="hint">This scene image could not be loaded.</p>');};host.append(figure);
}
function dialogue(box,step,scene,i,changed){
 const short=typeof step==='string',split=short&&/^([\w]+): (.*)$/s.exec(step);
 const say=split?split[1]:short?'':step.say||'',text=split?split[2]:short?step:step.narration??step.text??'';
 const japanese=/[\u3040-\u30ff\u3400-\u9fff]/.test(text);
 const stored=scene.metadata?.translations?.[translationKey(say,text)]||{};
 const ja=step.ja??stored.ja??(japanese?text:''),en=step.en??stored.en??(!japanese?text:'');
 const person=authoring.characters.find(c=>c.id===say);
 const row=document.createElement('div');row.className='speaker-row';
 if(person?.portrait)row.innerHTML=`<img class="speaker-portrait" src="${esc(person.portrait)}" alt="">`;
 const cast=[...(!scene.recipe||!say?[{value:'',label:'Narrator'}]:[]),...authoring.characters.map(c=>({value:c.id,label:c.name}))];
 for(const [id,info]of Object.entries(scene.speakers||{}))if(!cast.some(c=>c.value===id))cast.push({value:id,label:typeof info==='string'?info:info.name||name(id)});
 const speaker=dropdown(row,'Speaker',cast,say,()=>save());speaker.dataset.field='say';if(scene.recipe&&step.narration!==undefined)speaker.disabled=true;
 const emo=dropdown(row,'Delivery',[{value:'',label:'Natural'},...(authoring.deliveries?.length?authoring.deliveries:['curious','warm','quiet','firm','amused','surprised','hesitant','tired'])],step.emo||'',()=>save());emo.dataset.field='emo';emo.disabled=step.deliveryEditable===false;
 box.append(row);
 const language=!scene.recipe?dropdown(box,'Spoken language',[{value:'en',label:'English'},{value:'ja',label:'Japanese'}],japanese?'ja':'en',()=>save()):null;
 const pair=document.createElement('div');pair.className='bilingual';pair.innerHTML=`<label>English<textarea data-field="en" lang="en" rows="3" placeholder="English dialogue…">${esc(en)}</textarea></label><label>日本語 · Japanese<textarea data-field="ja" lang="ja" rows="3" placeholder="日本語の台詞…">${esc(ja)}</textarea></label>`;box.append(pair);
 function save(){
  const english=$('[data-field=en]',pair).value,jp=$('[data-field=ja]',pair).value;
  if(scene.recipe){
   if(short){scene.steps[i]=speaker.value?{say:speaker.value,text:jp||english,en:english,ja:jp}:english;}
   else if(step.narration!==undefined){step.narration=english||jp;}
   else{step.say=speaker.value||say;step.en=english;step.ja=jp;step.emo=emo.value;}
  }else{
   const spoken=language.value==='ja'?jp:english;
   const next=speaker.value?{...(short?{}:step),say:speaker.value,text:spoken}:spoken;
   scene.metadata||={};scene.metadata.translations||={};
   scene.metadata.translations[translationKey(speaker.value,spoken)]={en:english,ja:jp};
   if(typeof next==='object'){delete next.en;if(emo.value)next.emo=emo.value;else delete next.emo;}
   scene.steps[i]=next;
  }
  changed();
 }
 pair.querySelectorAll('textarea').forEach(el=>el.oninput=save);
 if(scene.recipe&&step.narration!==undefined){$('[data-field=ja]',pair).disabled=true;$('[data-field=ja]',pair).placeholder='Narration uses one language in this scene';}
}
function shotControls(box,step,changed){
 const shot=step.shot;const fields=document.createElement('details');fields.className='shot-controls';fields.innerHTML='<summary>Framing & timing</summary><div class="two"></div>';const grid=$('.two',fields);
 const update=(k,v)=>{shot[k]=v;changed();};
 if(!step.$recipe?.startsWith('...gap'))dropdown(grid,'Framing',[{value:'contain',label:'Show the whole image'},{value:'cover',label:'Fill the frame'}],shot.fit||'cover',v=>update('fit',v));
 dropdown(grid,'Focus point',[{value:shot.focus||'50% 50%',label:shot.focus&&!['50% 50%','50% 20%','50% 80%','25% 50%','75% 50%'].includes(shot.focus)?'Current focus position':'Center'},...['50% 50%','50% 20%','50% 80%','25% 50%','75% 50%'].map((v,i)=>({value:v,label:['Center','Upper area','Lower area','Left','Right'][i]}))],shot.focus||'50% 50%',v=>update('focus',v));
 number(grid,'Fade in · seconds',(shot.fade??700)/1000,v=>update('fade',Math.round(v*1000)),{max:10,step:.1});
 number(grid,'Slow zoom · %',(shot.push??0)*100,v=>update('push',v/100),{max:100,step:1});
 if(shot.width!==undefined)number(grid,'Opening width · %',shot.width*100,v=>update('width',v/100),{max:100,step:1});
 if(shot.at!==undefined)number(grid,'Opening position · %',shot.at*100,v=>update('at',v/100),{max:100,step:1});
 if(step.$recipe&&!/^\.\.\.gap|^shot/.test(step.$recipe)){fields.hidden=true;}
 const cue=document.createElement('label');cue.innerHTML=`Sound / atmosphere<textarea rows="2">${esc(shot.cue||'')}</textarea>`;$('textarea',cue).oninput=e=>update('cue',e.target.value);fields.append(cue);box.append(fields);
}
function actionCard(box,step,scene,changed){
 const kind=step.action||step.do||(step.go?'go':step.set?'set':step.unset?'unset':step.end?'end':'custom');
 if(kind==='go'||step.go){dropdown(box,'Continue with',destinations(scene),step.destination??step.go,v=>{if(step.action)step.destination=v;else step.go=v;changed();},'End this conversation');return;}
 if(kind==='game'&&step.details){actionCard(box,step.details,scene,changed);return;}
 if(['set','unset'].includes(kind)||step.set||step.unset){
  const field=step.action?'flag':step.set?'set':'unset';
  const options=authoring.variables.map(v=>({value:v.id,label:v.label}));
  if(step[field]&&typeof step[field]==='object'){
   for(const [key,value]of Object.entries(step[field])){
    const row=document.createElement('div');row.className='two';box.append(row);let current=key;
    dropdown(row,'Progress',options,key,v=>{if(v===current)return;step[field][v]=step[field][current];delete step[field][current];current=v;changed();});
    if(typeof value==='number')number(row,'Value',value,v=>{step[field][current]=v;changed();},{min:-100000,max:100000});
    else dropdown(row,'Value',typeof value==='boolean'?[{value:'true',label:'Yes'},{value:'false',label:'No'}]:(authoring.variables.find(v=>v.id===key)?.options||[{value,label:humanize(value)}]),String(value),v=>{step[field][current]=typeof value==='boolean'?v==='true':v;changed();});
   }
  }else dropdown(box,kind==='unset'?'Clear progress':'Record progress',options,step[field],v=>{step[field]=v;changed();});
  return;
 }
 if(kind==='cam'){
  dropdown(box,'Camera follows',[{value:'',label:'Return to normal camera'},...authoring.characters.map(c=>({value:c.id,label:c.name}))],typeof step.on==='string'?step.on:'',v=>{if(v){step.on=v;delete step.back;}else{step.back=true;delete step.on;}changed();});
  number(box,'Zoom',step.zoom||1,v=>{step.zoom=v;changed();},{min:.5,max:5,step:.1});return;
 }
 if(['end','hide','bye','fin'].includes(kind)){box.insertAdjacentHTML('beforeend',`<p class="action-summary">${{end:'Finish this conversation.',hide:'Fade out the current picture.',bye:'Return to the story.',fin:'Finish this encounter.'}[kind]}</p>`);return;}
 if(['gesture','emote','face'].includes(kind)){
  dropdown(box,'Character',authoring.characters.map(c=>({value:c.id,label:c.name})),step.who,v=>{step.who=v;changed();});
  dropdown(box,kind==='gesture'?'Gesture':'Expression',kind==='gesture'?['nod','point','wave','shake','bow']:['smile','surprised','heart','?','…','♪'],step.kind,v=>{step.kind=v;changed();});return;
 }
 box.insertAdjacentHTML('beforeend',`<p class="action-summary">${kind==='custom'?'Existing scene direction':humanize(kind)}</p><p class="hint">Kept with the scene. You can move or remove this direction.</p>`);
}
export function duplicateStep(step){
 const copy=structuredClone(step);
 const clear=s=>{if(!s||typeof s!=='object')return;delete s.imageSlot;for(const key of ['sequence','then','else'])for(const child of s[key]||[])clear(child);};
 clear(copy);return copy;
}
export function shotTemplates(steps){return (steps||[]).flatMap(s=>s.shot?[s]:['sequence','then','else'].flatMap(k=>shotTemplates(s[k])));}
export function renderSteps(scene,changed,root=$('#sequence'),parentScene=scene){
 root.replaceChildren();
 if(!scene.steps){root.innerHTML='<p class="hint">This sequence is assembled by the game. Its existing direction is preserved.</p>';return;}
 scene.steps.forEach((step,i)=>{
 const box=document.createElement('article');box.className='beat';box.dataset.number=String(i+1).padStart(2,'0');
 const isDialogue=typeof step==='string'||!!step.say||step.narration!==undefined;
 const type=step.shot?'Shot':isDialogue?'Dialogue':step.choice?'Player choice':step.if!==undefined?'Story branch':step.sequence?'Scene sequence':'Direction';
 box.innerHTML=`<div class="beat-head"><span class="beat-type">${type}</span><div class="beat-tools"><button data-op="up" aria-label="Move step ${i+1} up" ${i===0?'disabled':''}>↑</button><button data-op="down" aria-label="Move step ${i+1} down" ${i===scene.steps.length-1?'disabled':''}>↓</button><button data-op="copy" aria-label="Duplicate step ${i+1}">⧉</button><button data-op="remove" aria-label="Remove step ${i+1}">×</button></div></div>`;
 picture(box,step,parentScene);
 if(step.shot)shotControls(box,step,changed);
 if(isDialogue)dialogue(box,step,scene,i,changed);
 else if(step.sequence||step.if!==undefined){
  if(step.if!==undefined){const host=document.createElement('div');box.append(host);conditionEditor(host,step.if,authoring.variables,v=>{step.if=v;changed();});}
  for(const [key,label]of step.sequence?[['sequence','Within this scene']]:[['then','When this matches'],['else','Otherwise']]){
   if(!Array.isArray(step[key]))continue;
   const branch=document.createElement('section');branch.className='branch';branch.innerHTML=`<h3>${esc(label)}</h3><div class="branch-steps"></div><button type="button">Add dialogue</button>`;
   const child={...scene,steps:step[key]};renderSteps(child,changed,$('.branch-steps',branch),parentScene);
   $(':scope > button',branch).onclick=()=>{step[key].push({say:'eric',text:''});changed();renderSteps(scene,changed,root,parentScene);};box.append(branch);
  }
 }else if(step.choice){
  step.choice.forEach((choice,j)=>{
   const row=document.createElement('div');row.className='choice-row';row.innerHTML=`<label>Option ${j+1}<textarea rows="2">${esc(choice.text)}</textarea></label>`;
   $('textarea',row).oninput=e=>{choice.text=e.target.value;changed();};
   dropdown(row,'Continue with',destinations(parentScene),choice.go||'',v=>{choice.go=v;changed();},'Stay in this scene');
   const conditions=document.createElement('details');conditions.innerHTML='<summary>When this option is available</summary><div></div>';conditionEditor($('div',conditions),choice.if||'',authoring.variables,v=>{if(v)choice.if=v;else delete choice.if;changed();});row.append(conditions);
   const remove=document.createElement('button');remove.textContent='Remove option';remove.onclick=()=>{step.choice.splice(j,1);changed();renderSteps(scene,changed,root,parentScene);};row.append(remove);box.append(row);
  });
  const add=document.createElement('button');add.textContent='Add option';add.onclick=()=>{step.choice.push({text:'',go:''});changed();renderSteps(scene,changed,root,parentScene);};box.append(add);
 }else if(!step.shot)actionCard(box,step,parentScene,changed);
 box.querySelectorAll(':scope > .beat-head [data-op]').forEach(b=>b.onclick=()=>{
  if(b.dataset.op==='remove')scene.steps.splice(i,1);
  if(b.dataset.op==='copy')scene.steps.splice(i+1,0,duplicateStep(step));
  if(b.dataset.op==='up')[scene.steps[i-1],scene.steps[i]]=[scene.steps[i],scene.steps[i-1]];
  if(b.dataset.op==='down')[scene.steps[i+1],scene.steps[i]]=[scene.steps[i],scene.steps[i+1]];
  changed();renderSteps(scene,changed,root,parentScene);
 });root.append(box);
 });
}
export function renderEntries(scene,changed){
 const host=$('#entries');host.replaceChildren();$('#addEntry').disabled=!scene.routesEditable;$('#addEntry').hidden=!scene.routesEditable;
 if(scene.placement){
  if(scene.placement.place!==null)dropdown(host,'Location',authoring.places,scene.placement.place,v=>{scene.placement.place=v;changed();});
  if(scene.placement.day!==null)dropdown(host,'Story day',Array.from({length:10},(_,i)=>({value:i+1,label:`Day ${i+1}`})),scene.placement.day,v=>{scene.placement.day=Number(v);changed();});
  if(scene.placement.condition!==null){const field=document.createElement('div');host.append(field);conditionEditor(field,scene.placement.condition,authoring.variables,v=>{scene.placement.condition=v;changed();});}
  if(Object.values(scene.placement).every(v=>v===null))host.innerHTML='<p class="hint">This scene follows the opening story. Its position is kept when you save.</p>';
  return;
 }
 for(const [i,entry]of scene.entries.entries()){
  const row=document.createElement('div');row.className='entry';host.append(row);
  dropdown(row,'Start this scene when',authoring.events,entry.event,v=>{entry.event=v;changed();},'Choose an event');
  const rules=document.createElement('div');row.append(rules);conditionEditor(rules,entry.condition,authoring.variables,v=>{entry.condition=v;changed();});
  const label=document.createElement('label');label.className='check';label.innerHTML=`<input type="checkbox" ${entry.once?'checked':''}> Play only once`;$('input',label).onchange=e=>{entry.once=e.target.checked;changed();};row.append(label);
  const remove=document.createElement('button');remove.textContent='Remove starting point';remove.onclick=()=>{scene.entries.splice(i,1);changed();renderEntries(scene,changed);};row.append(remove);
 }
 if(!scene.entries.length)host.innerHTML='<p class="hint">Other scenes can lead here through a choice or a continuation.</p>';
}
export function readingPreview(scene){
 let previewScene=scene,flat=[],at=0;
 const collect=xs=>xs.flatMap(s=>s.sequence?collect(s.sequence):[s]);
 function load(next){previewScene=next;flat=collect(next.steps||[]);at=0;paint();}
 async function follow(node){
  const target=nodes.find(n=>n.node===node&&destinations(previewScene).some(d=>d.value===node)&&
   (previewScene.recipe?n.id.slice(0,n.id.lastIndexOf(':'))===previewScene.id.slice(0,previewScene.id.lastIndexOf(':')):n.id.split('#')[0]===previewScene.id.split('#')[0]));
  if(!target){notice('This continuation is handled by the game.');return;}
  if(target.id===scene.id)load(scene);else load(await api('read?id='+encodeURIComponent(target.id)));
 }
 function button(label,action){const b=document.createElement('button');b.textContent=label;b.onclick=guarded(action);$('#previewBody').append(b);}
 function paint(){
  const s=flat[at];$('#previewBody').replaceChildren();if(s)picture($('#previewBody'),s,previewScene);
  const stored=previewScene.metadata?.translations?.[translationKey(s?.say||'',s?.text||'')]||{};
  const english=s?.en||stored.en,jp=s?.ja||stored.ja;
  const body=typeof s==='string'?s:english||s?.text||s?.narration||s?.shot?.cue||(s?.choice?'Choose how to continue.':s?.if?'Try either branch.':'Scene direction');
  $('#previewBody').insertAdjacentHTML('beforeend',`<div class="preview-line">${s?.say?`<span class="preview-speaker">${esc(name(s.say))}</span>`:''}${esc(body)}${jp&&jp!==body?`<p lang="ja">${esc(jp)}</p>`:''}</div>`);
  if(s?.choice)for(const c of s.choice)button(c.text,()=>c.go?follow(c.go):(at=Math.min(at+1,flat.length-1),paint()));
  if(s?.if!==undefined)for(const [key,title]of [['then','Conditions match'],['else','Conditions do not match']])button(title,()=>{flat.splice(at+1,0,...collect(s[key]||[]));at=Math.min(at+1,flat.length-1);paint();});
  if(s?.go||s?.destination)button('Continue to next scene',()=>follow(s.go||s.destination));
  $('#previewPosition').textContent=`${flat.length?at+1:0} / ${flat.length}`;$('#prevBeat').disabled=at===0;$('#nextBeat').disabled=at>=flat.length-1;
 }
 $('#prevBeat').onclick=()=>{at--;paint();};$('#nextBeat').onclick=()=>{at++;paint();};load(scene);$('#previewDialog').showModal();
}
