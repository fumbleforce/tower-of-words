const { document, confirm, window } = globalThis;
import {$,esc,api,notice,guarded,clone} from './common.js';
import {renderSteps,renderEntries,readingPreview} from './sequence.js';
import {installImages} from './images.js';
let catalog=[],scene=null,baseline=null,dirty=false,scope='public',view='sequence',loading=0,busy=false;
const imageEditor=installImages(()=>scene,changed);
async function locked(operation){
  if(busy)return;busy=true;document.querySelector('.workspace').inert=true;
  for(const id of ['save','draft','undo'])$('#'+id).disabled=true;
  try{return await operation();}finally{busy=false;document.querySelector('.workspace').inert=false;if(scene){$('#save').disabled=false;$('#draft').disabled=false;$('#undo').disabled=!dirty;}}
}
function changed(){dirty=true;$('#saveState').textContent='Unsaved changes';$('#undo').disabled=false;}
function body(){
  const invalid=[...document.querySelectorAll('textarea,input')].find(el=>!el.checkValidity());
  if(invalid){invalid.reportValidity();throw Error('Finish the highlighted field before saving.');}
  return {id:scene.id,revision:scene.revision,steps:scene.steps,raw:scene.raw,entries:scene.entries,placement:scene.placement,metadata:scene.metadata,restoreVersion:scene.restoreVersion};
}
function paintList(){
  const query=$('#search').value.toLowerCase(),rows=catalog.filter(s=>(s.title+' '+s.group+' '+s.node).toLowerCase().includes(query));
  $('#sceneCount').textContent=rows.length;let group='';
  $('#sceneList').innerHTML=rows.map(s=>{let heading='';if(group!==s.group){group=s.group;heading=`<div class="group-name">${esc(group)}</div>`;}return heading+`<button class="scene-link" data-id="${esc(s.id)}" aria-current="${s.id===scene?.id}">${esc(s.title)}<small>${s.count===null?'Source expression':`${s.count} steps`}</small></button>`;}).join('') || '<p class="hint">No matching scenes.</p>';
  $('#sceneList').querySelectorAll('[data-id]').forEach(b=>b.onclick=guarded(()=>open(b.dataset.id)));
}
async function loadCatalog(){
  const request=++loading;$('#sceneList').innerHTML='<p class="hint">Reading scene sources…</p>';
  try{const data=await api('catalog?scope='+scope);if(request!==loading)return;catalog=data.scenes||[];paintList();if(data.errors?.length)notice(`${data.errors.length} source files could not be read. Other scenes are available.`);}
  catch(e){if(request===loading){catalog=[];paintList();notice(e.message,true);}}
}
async function open(id){
  if(dirty&&!confirm('Discard the changes to this scene? Save a draft first if you want to keep them.'))return;
  return locked(async()=>{
  const request=++loading,loaded=await api('read?id='+encodeURIComponent(id));if(request!==loading)return;
  scene=loaded;baseline=clone(loaded);dirty=false;
  if(loaded.draft&&confirm('Restore the local draft for this scene?')){
    Object.assign(scene,loaded.draft);dirty=true;
  }
  scene.metadata||={};scene.entries||=[];render();paintList();notice('');
  });
}
function render(){
  $('#empty').hidden=!!scene;$('#sceneEditor').hidden=!scene;
  if(!scene)return;
  $('#sceneTitle').textContent=scene.metadata.title||scene.title;$('#sceneSource').textContent=`${scene.group||scene.file} · ${scene.node}`;
  $('#saveState').textContent=dirty?'Unsaved changes':'Saved';$('#save').disabled=false;$('#draft').disabled=false;$('#undo').disabled=!dirty;
  $('#notes').disabled=false;$('#notes').value=scene.metadata.notes||'';
  $('#sceneNodes').innerHTML=catalog.filter(s=>s.group===scene.group).map(s=>`<option value="${esc(s.node)}">`).join('');
  $('#stepCount').textContent=scene.steps?`${scene.steps.length} steps`:'Source expression';
  $('#rawSource').value=scene.steps?JSON.stringify(scene.steps,null,2):scene.raw;
  $('#insertBar').hidden=!scene.steps;renderSteps(scene,changed);renderEntries(scene,changed);imageEditor.render();
  setView(scene.steps?view:'source');
}
function setView(next){view=next;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',b.dataset.view===view);
  $('#sequence').hidden=view!=='sequence';$('#sourceView').hidden=view!=='source';$('#historyView').hidden=view!=='history';$('#insertBar').hidden=view!=='sequence'||!scene?.steps;
  if(view==='sequence'&&scene)renderSteps(scene,changed);
  if(view==='source'&&scene)$('#rawSource').value=scene.steps?JSON.stringify(scene.steps,null,2):scene.raw;
  if(view==='history')renderHistory();
}
function renderHistory(){
  $('#historyView').innerHTML=(scene.history||[]).map(v=>`<div class="revision"><span>${esc(new Date(Number(v.replace('.json',''))/1e6).toLocaleString())}</span><button data-version="${esc(v)}">Restore to editor</button></div>`).join('')||'<p class="hint">A revision is kept each time you save to the story.</p>';
  $('#historyView').querySelectorAll('button').forEach(b=>b.onclick=guarded(async()=>{
    if(dirty&&!confirm('Replace the current edits with this revision?'))return;
    await locked(async()=>{
    const old=await api('history?id='+encodeURIComponent(scene.id)+'&version='+b.dataset.version);
    if(!old)throw Error('This revision is unavailable');
    Object.assign(scene,{steps:old.steps,raw:old.raw,entries:old.entries,metadata:old.metadata||{},placement:old.placement});scene.images=old.images||scene.images;scene.restoreVersion=b.dataset.version;changed();view='sequence';render();
    });
  }));
}
$('#search').oninput=paintList;
$('#scope').querySelectorAll('button').forEach(b=>b.onclick=guarded(async()=>{
  if(dirty&&!confirm('Discard the current edits before changing libraries?'))return;
  scope=b.dataset.scope;dirty=false;scene=null;baseline=null;$('#empty').hidden=false;$('#sceneEditor').hidden=true;$('#entries').replaceChildren();
  for(const id of ['save','draft','undo','addEntry','notes'])$('#'+id).disabled=true;
  $('#scope').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));await loadCatalog();
}));
$('#notes').oninput=e=>{scene.metadata.notes=e.target.value;changed();};
$('#rawSource').oninput=e=>{if(!scene)return;scene.raw=e.target.value;scene.steps=null;try{const parsed=JSON.parse(scene.raw);if(Array.isArray(parsed))scene.steps=parsed;}catch{/* retain source expression */}changed();};
$('#undo').onclick=()=>{if(scene&&confirm('Restore the scene as it was when opened?')){scene=clone(baseline);dirty=false;render();}};
$('#draft').onclick=guarded(()=>{const payload=body();return locked(async()=>{await api('draft',payload);$('#saveState').textContent='Draft saved · story unchanged';notice('Draft saved.');});});
$('#save').onclick=guarded(()=>{
  const payload=body();return locked(async()=>{
    $('#saveState').textContent='Saving and rebuilding…';
    const saved=await api('save',payload);scene=saved;baseline=clone(saved);dirty=false;render();
    notice('Saved to the story. The previous version is in Revisions.'+(saved.warnings?.length?' '+saved.warnings.join(' '):''));
  });
});
$('#addEntry').onclick=()=>{scene.entries.push({event:'',condition:'',once:false});changed();renderEntries(scene,changed);};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
for(const b of document.querySelectorAll('[data-inspect]'))b.onclick=()=>{
  document.querySelectorAll('[data-inspect]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#conditions').hidden=b.dataset.inspect!=='conditions';$('#images').hidden=b.dataset.inspect!=='images';
};
for(const b of document.querySelectorAll('[data-insert]'))b.onclick=()=>{
  const step={dialogue:{say:'eric',text:''},choice:{choice:[{text:'',go:''}]},condition:{if:'',then:[]},action:{do:'cam',back:true}}[b.dataset.insert];scene.steps.push(step);changed();renderSteps(scene,changed);
};
$('#preview').onclick=()=>readingPreview(scene);$('#closePreview').onclick=()=>$('#previewDialog').close();
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
await loadCatalog();
