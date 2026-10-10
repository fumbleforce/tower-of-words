const { document, structuredClone, Event } = globalThis;
import {$,esc} from './common.js';
export function renderSteps(scene, changed, root=$('#sequence')) {
  root.replaceChildren();
  if (!scene.steps) {root.innerHTML='<p class="hint">This scene uses helper functions. Open Source to edit it without losing those calls.</p>';return;}
  scene.steps.forEach((step,i)=>{
    const box=document.createElement('article');box.className='beat';box.dataset.number=String(i+1).padStart(2,'0');
    const short=typeof step==='string', split=short && /^([\w]+): (.*)$/s.exec(step);
    const dialogue=short || !!step.say || step.narration!==undefined, type=dialogue?'Dialogue':step.choice?'Choice':step.if!==undefined?'Condition':step.sequence?'Picture sequence':step.do||'Story action';
    box.innerHTML=`<div class="beat-head"><span class="beat-type">${esc(type)}</span><div class="beat-tools"><button data-op="up" aria-label="Move step ${i+1} up" ${i===0?'disabled':''}>↑</button><button data-op="down" aria-label="Move step ${i+1} down" ${i===scene.steps.length-1?'disabled':''}>↓</button><button data-op="copy" aria-label="Duplicate step ${i+1}">⧉</button><button data-op="remove" aria-label="Remove step ${i+1}">×</button></div></div>`;
    if(dialogue){
      box.insertAdjacentHTML('beforeend',`<div class="two"><label>Speaker<input data-field="say" value="${esc(split?split[1]:short?'':step.say)}" placeholder="Narration"></label><label>Delivery<input data-field="emo" ${step.deliveryEditable===false?'readonly':''} value="${esc(short?'':step.emo||'')}" placeholder="Natural"></label></div><label><span class="sr">Dialogue text</span><textarea data-field="text" rows="3">${esc(split?split[2]:short?step:step.narration??step.text)}</textarea></label>`);
      box.querySelectorAll('input,textarea').forEach(el=>el.oninput=()=>{
        const sayField=$('[data-field=say]',box),say=sayField.value,text=$('[data-field=text]',box).value,emo=$('[data-field=emo]',box).value;
        if(!short&&step.say&&!say){sayField.setCustomValidity('Keep a speaker for this line. Add a narration step separately.');changed();return;}
        sayField.setCustomValidity('');
        scene.steps[i]=say?{...(short?{}:step),say,text,...(emo?{emo}:{})}:step?.$recipe&&step.narration!==undefined?{...step,narration:text}:text;
        if(say&&!emo)delete scene.steps[i].emo;
        changed();
      });
    } else if (step.sequence || step.if!==undefined) {
      if(step.if!==undefined){
        const field=document.createElement('label');field.innerHTML=`When<input value="${esc(step.if)}" placeholder="Condition">`;$('input',field).oninput=e=>{step.if=e.target.value;changed();};box.append(field);
      }
      const branches=step.sequence?[['sequence',step.label||'Steps']]:[['then','If true'],['else','Otherwise']];
      for(const [key,label]of branches){
        step[key]||=[];const branch=document.createElement('section');branch.className='branch';branch.innerHTML=`<h3>${esc(label)}</h3><div class="branch-steps"></div><button>Add dialogue</button>`;
        const child={steps:step[key]};renderSteps(child,changed,$('.branch-steps',branch));
        $(':scope > button',branch).onclick=()=>{step[key].push({say:'eric',text:''});changed();renderSteps(scene,changed,root);};box.append(branch);
      }
    } else if (step.choice) {
      const choices=document.createElement('div');
      step.choice.forEach((choice,j)=>{
        const row=document.createElement('div');row.className='choice-row';
        row.innerHTML=`<label>Option ${j+1}<input data-choice="text" value="${esc(choice.text)}"></label><div class="two"><label>Continue at<input data-choice="go" value="${esc(choice.go||'')}" list="sceneNodes" placeholder="Scene name"></label><label>Available when<input data-choice="if" value="${esc(choice.if||'')}" placeholder="Always"></label></div><button class="small" aria-label="Remove option ${j+1}">Remove option</button>`;
        row.querySelectorAll('input').forEach(el=>el.oninput=()=>{if(el.value)choice[el.dataset.choice]=el.value;else if(el.dataset.choice==='text')choice.text='';else delete choice[el.dataset.choice];changed();});
        $('button',row).onclick=()=>{step.choice.splice(j,1);changed();renderSteps(scene,changed,root);};choices.append(row);
      });
      const add=document.createElement('button');add.textContent='Add an option';add.onclick=()=>{step.choice.push({text:'',go:''});changed();renderSteps(scene,changed,root);};choices.append(add);box.append(choices);
    } else {
      box.insertAdjacentHTML('beforeend',`<label>${step.choice?'Choices and destinations':step.if?'Condition and branches':'Action details'}<textarea class="code" rows="${Math.min(14,JSON.stringify(step,null,2).split('\n').length+1)}">${esc(JSON.stringify(step,null,2))}</textarea></label><span class="hint validation"></span>`);
      $('textarea',box).oninput=e=>{try{scene.steps[i]=JSON.parse(e.target.value);e.target.setCustomValidity('');$('.validation',box).textContent='';changed();}catch{e.target.setCustomValidity('Check this step’s JSON');$('.validation',box).textContent='Finish the JSON before saving.';changed();}};
    }
    box.querySelectorAll(':scope > .beat-head [data-op]').forEach(b=>b.onclick=()=>{
      const op=b.dataset.op;
      if(op==='remove')scene.steps.splice(i,1);
      if(op==='copy')scene.steps.splice(i+1,0,structuredClone(scene.steps[i]));
      if(op==='up')[scene.steps[i-1],scene.steps[i]]=[scene.steps[i],scene.steps[i-1]];
      if(op==='down')[scene.steps[i+1],scene.steps[i]]=[scene.steps[i],scene.steps[i+1]];
      changed();renderSteps(scene,changed,root);
    });root.append(box);
  });
}
export function renderEntries(scene,changed) {
  const host=$('#entries');host.replaceChildren();let selected=null;
  $('#addEntry').disabled=!scene.routesEditable;
  $('#conditionBuilder').hidden=!scene.routesEditable;
  if(scene.placement){
    host.innerHTML='<h3>Story placement</h3>';
    for(const [key,label]of[['place','Place'],['day','Story day'],['condition','Available when']]){
      if(scene.placement[key]===null)continue;
      const field=document.createElement('label');field.innerHTML=`${label}<input value="${esc(scene.placement[key])}" ${key==='day'?'type="number" min="1"':''}>`;
      $('input',field).oninput=e=>{scene.placement[key]=key==='day'?Number(e.target.value):e.target.value;changed();};host.append(field);
    }
    if(Object.values(scene.placement).every(v=>v===null))host.insertAdjacentHTML('beforeend','<p class="hint">This sequence is placed by its existing story hook.</p>');
    return;
  }
  if(!scene.routesEditable){host.innerHTML='<p class="hint">This source computes its entries in code. Its adapter must preserve that routing.</p>';return;}
  if(!scene.entries.length)host.innerHTML='<p class="hint">No direct event entry. Another scene may call this one.</p>';
  scene.entries.forEach((entry,i)=>{
    const row=document.createElement('div');row.className='entry';
    row.innerHTML=`<button aria-label="Remove entry ${i+1}">×</button><label>Event<input data-entry="event" value="${esc(entry.event)}" placeholder="talk:kuro"></label><label>When<input data-entry="condition" value="${esc(entry.condition)}" placeholder="Always"></label><label class="check"><input type="checkbox" ${entry.once?'checked':''}>Once only</label>`;
    row.querySelectorAll('[data-entry]').forEach(el=>el.oninput=()=>{entry[el.dataset.entry]=el.value;changed();});
    $('[data-entry=condition]',row).onfocus=e=>{selected=e.target;$('#conditionTarget').textContent=`Editing ${entry.event||'this entry'}`;};
    $('input[type=checkbox]',row).onchange=e=>{entry.once=e.target.checked;changed();};
    $('button',row).onclick=()=>{scene.entries.splice(i,1);changed();renderEntries(scene,changed);};host.append(row);
  });
  $('#appendCondition').onclick=()=>{
    if(!selected){$('#conditionTarget').textContent='Select a condition field first.';return;}
    const flag=$('#flag').value.trim(),op=$('#operator').value,value=$('#flagValue').value.trim();
    if(!/^[A-Za-z_]\w*$/.test(flag)){ $('#conditionTarget').textContent='Use a flag name such as know_ohayo.';return; }
    const clause=op==='!'?'!'+flag:op?`${flag} ${op} ${value}`:flag;
    selected.value += (selected.value?' && ':'')+clause;selected.dispatchEvent(new Event('input'));selected.focus();
  };
}
export function readingPreview(scene) {
  let at=0;const steps=scene.steps||[];
  function paint(){
    const s=steps[at];let html='';
    if(typeof s==='string')html=`<div class="preview-line">${esc(s)}</div>`;
    else if(s?.say)html=`<div class="preview-line"><span class="preview-speaker">${esc(s.name||s.say)}</span>${esc(s.text)}</div>`;
    else html=`<pre class="preview-action">${esc(JSON.stringify(s||'This scene uses source expressions. Preview it in the game.',null,2))}</pre>`;
    $('#previewBody').innerHTML=html;$('#previewPosition').textContent=`${steps.length?at+1:0} / ${steps.length}`;
    $('#prevBeat').disabled=at===0;$('#nextBeat').disabled=at>=steps.length-1;
  }
  $('#prevBeat').onclick=()=>{at--;paint();};$('#nextBeat').onclick=()=>{at++;paint();};paint();$('#previewDialog').showModal();
}
