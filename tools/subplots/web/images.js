const { setInterval } = globalThis;
import {$,esc,api,guarded,notice} from './common.js';
const POSES=['Standing naturally','Seated at a table','Walking','Leaning on a railing','Reaching for an object','Turning toward someone','Looking over a shoulder'];
const ANGLES=['Eye level','Low angle','High angle','Overhead','Side profile','Over the shoulder'];
const ENVIRONMENTS=['Office reception','Office interior','Station platform','Street','Café','Apartment','Garden','Swimming pool'];
const LIGHT=['Soft daylight','Morning light','Overcast daylight','Warm indoor light','Evening light','Night lighting'];
const field=(name,title,options,value)=>`<label>${esc(title)}<select data-compose="${name}"><option value="">Choose…</option>${options.map(o=>`<option value="${esc(o.id??o)}" ${(o.id??o)===value?'selected':''}>${esc(o.label??o)}</option>`).join('')}</select></label>`;
export function installImages(getScene,changed){
  let presets=null,jobs=[],history=[],poll=null,selected=[];
  const active=t=>(presets?.[t]||[]).filter(p=>!p.archived);
  const preset=(t,id)=>active(t).find(p=>p.id===id);
  const compose=()=>{const s=getScene();if(!s)return null;return s.metadata.composition ||= {characters:[],count:1,rating:'safe',pose:'Standing naturally',angle:'Eye level',environment:'',light:'Soft daylight',scene:'',seed:'',negative:''};};
  function read(){const c=compose();if(!c)return;$('#composition').querySelectorAll('[data-compose]').forEach(el=>c[el.dataset.compose]=el.type==='checkbox'?el.checked:el.value);changed();}
  function render(){
    const c=compose();if(!c){$('#composition').innerHTML='<p class="hint">Choose a scene first.</p>';return;}
    const opts=t=>active(t).map(p=>({id:p.id,label:p.data.name||p.data.title||p.id}));
    const selectedImage=getScene().metadata.image;
    const slots=getScene().images||[];
    if(slots.length&&!slots.some(s=>s.id===c.imageSlot))c.imageSlot=slots[0].id;
    $('#composition').innerHTML=`${slots.length?field('imageSlot','Replace scene image',slots.map(i=>({id:i.id,label:i.label})),c.imageSlot||slots[0].id):''}${slots.length?`<img class="selected-image" src="${esc((slots.find(i=>i.id===c.imageSlot)||slots[0]).url)}" alt="Current scene image">`:''}${selectedImage?`<img class="selected-image" src="${esc(selectedImage.url)}" alt="Selected scene image"><p class="hint">Selected image · ${esc(selectedImage.id||'')}</p>`:''}<h3>Characters</h3><div class="chips" id="castChoices">${active('character').map(p=>`<button data-char="${esc(p.id)}" aria-pressed="${c.characters.includes(p.id)}">${esc(p.data.name||p.id)}</button>`).join('')||'<span class="hint">Connect to load your presets.</span>'}</div><div class="two">${field('pose','Pose',POSES,c.pose)}${field('angle','Camera angle',ANGLES,c.angle)}</div>${field('environment','Environment',ENVIRONMENTS,c.environment)}<div class="two">${field('light','Lighting',LIGHT,c.light)}${field('framing','Framing',opts('framing'),c.framing)}</div><div class="two">${field('style','Style',opts('style'),c.style)}${field('camera','Camera preset',opts('camera'),c.camera)}</div><label>Scene direction<textarea data-compose="scene" rows="4" placeholder="Who is where, what they are doing, and what the camera sees.">${esc(c.scene)}</textarea></label><details><summary>Generation settings</summary>${field('model','Model',opts('model'),c.model)}<div class="two">${field('rating','Rating',['safe','sensitive','nsfw'],c.rating)}<label>Images<input data-compose="count" type="number" min="1" max="8" value="${esc(c.count)}"></label></div><label>Seed · leave blank for a new variation<input data-compose="seed" inputmode="numeric" value="${esc(c.seed)}"></label><label>Additional negative prompt<textarea data-compose="negative" rows="2">${esc(c.negative)}</textarea></label><label>Prompt override<textarea data-compose="override" rows="4" placeholder="Leave blank to compose from the controls above.">${esc(c.override||'')}</textarea></label></details><button id="generate" class="primary" ${presets?'':'disabled'}>Generate images</button><p class="hint">Uses your local image-generation queue. Existing pictures remain available.</p><details><summary>Composed prompt</summary><p id="assembled" class="hint"></p></details>`;
    $('#castChoices').querySelectorAll('button').forEach(b=>b.onclick=()=>{const id=b.dataset.char;c.characters=c.characters.includes(id)?c.characters.filter(x=>x!==id):[...c.characters,id];changed();render();});
    $('#composition').querySelectorAll('[data-compose]').forEach(el=>el.oninput=()=>{read();$('#assembled').textContent=assemble().positive;});
    $('#generate').onclick=guarded(generate);$('#assembled').textContent=assemble().positive;
    renderJobs();
  }
  function assemble(){
    const c=compose()||{}, chars=(c.characters||[]).map(id=>preset('character',id)).filter(Boolean),style=preset('style',c.style)?.data||{},camera=preset('camera',c.camera)?.data||{};
    const text=x=>x?.text||x?.prompt||'';
    const positive=[style.quality,style.anchors,...chars.map(p=>[p.data.name,p.data.age,p.data.look,p.data.signature,p.data.build,p.data.outfit].filter(Boolean).join(', ')),c.pose,c.angle,c.environment,c.light,text(camera),preset('framing',c.framing)?.data.prompt,style.suffix,c.scene].filter(Boolean).join('. ');
    const ranks=['safe','sensitive','nsfw'];let rating=c.rating||'safe';for(const p of chars){const cap=ranks.indexOf(p.data.rating_cap);if(cap>=0&&ranks.indexOf(rating)>cap)rating=ranks[cap];}
    const negative=[...active('negative').filter(p=>p.data.default).map(p=>text(p.data)),style.negative,...chars.map(p=>p.data.negative),c.negative,'child, loli'].filter(Boolean).join(', ');
    const md=preset('model',c.model)?.data||{},fr=preset('framing',c.framing)?.data||{};
    const ref=(type,id)=>{const p=preset(type,id);return p?{id:p.id,v:p.v}:null;};
    return {positive:c.override?.trim()||positive,negative,model_file:md.file,steps:md.steps||30,cfg:md.cfg||5,sampler:md.sampler||'euler_ancestral',scheduler:md.scheduler||'normal',w:fr.w||1152,h:fr.h||896,count:+c.count||1,seed_mode:c.seed===''?'random':'fixed',seed:+c.seed||0,rating,characters:c.characters||[],scene_text:c.scene||'',compose:{...c,subplotId:getScene()?.id},presets:{characters:(c.characters||[]).map(id=>ref('character',id)),model:ref('model',c.model),style:ref('style',c.style),framing:ref('framing',c.framing),cameras:c.camera?[ref('camera',c.camera)]:[]},autostart:true};
  }
  async function connect(){
    $('#imageStatus').textContent='Connecting…';presets=await api('image/api/presets');
    const c=compose();if(c){for(const t of ['model','style','framing'])if(!c[t])c[t]=active(t)[0]?.id||'';}
    $('#imageStatus').textContent='Connected to your image-generation service.';render();
    const runs=await api('image/api/history?limit=300');history=runs.flatMap(r=>(r.renders||[]).map(j=>({...r,...j,status:'done'})));
    await refresh();if(!poll)poll=setInterval(()=>refresh().catch(e=>{$('#imageStatus').textContent=e.message;}),3500);
  }
  async function generate(){
    const body=assemble();if(!body.model_file)throw Error('Choose a generation model first.');
    $('#generate').disabled=true;
    try{await api('image/api/generate',body);notice('Image job queued. You can keep editing while it runs.');await refresh();}
    finally{if($('#generate'))$('#generate').disabled=false;}
  }
  async function refresh(){jobs=await api('image/api/jobs');renderJobs();}
  function renderJobs(){
    const id=getScene()?.id;if(!id){$('#renders').replaceChildren();return;}
    const all=new Map(history.map(j=>[j.id,j]));for(const j of jobs)all.set(j.id,j);
    selected=[...all.values()].filter(j=>j.compose?.subplotId===id&&!j.deleted).slice(-16).reverse();
    $('#renders').innerHTML=selected.length?'<h3>Scene renders</h3><div class="render-grid">'+selected.map((j,i)=>`<article class="render-card">${j.thumb?`<img loading="lazy" src="/api/subplots/image/thumb/${esc(j.thumb)}" alt="Generated scene candidate">`:''}<small>${esc(j.status)}${j.status==='running'?` · ${Math.round((j.progress||0)*100)}%`:''}</small>${j.error?`<small>${esc(j.error)}</small>`:''}${j.file?`<button data-use="${i}">Use this image</button><a href="/api/subplots/image/out/${esc(j.file)}" target="_blank" rel="noopener">Full image ↗</a>`:''}</article>`).join('')+'</div>':'';
    $('#renders').querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const j=selected[+b.dataset.use];getScene().metadata.image={slot:compose().imageSlot||getScene().images?.[0]?.id,id:j.id,url:'/api/subplots/image/out/'+j.file,file:j.file,seed:j.seed,positive:j.positive};changed();render();notice('Image selected. Save the scene to keep the selection.');});
  }
  $('#loadPresets').onclick=guarded(connect);return {render};
}
