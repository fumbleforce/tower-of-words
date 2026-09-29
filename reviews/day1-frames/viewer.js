import { lineHTML } from '../../game3d/js/lang.js';
import { PORTRAITS } from '../../game3d/js/ui/portrait-data.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = 'day1-frames', draftKey = 'review-frames:' + id;
const names = { eric:'Eric', mio:'Mio', miotext:'Mio · message', guard:'Ishibashi', kuroda:'Hamada', mori:'Mori', kenji:'Kenji', kuro:'Receptionist', gatev:'Gate', commuter:'Commuter', sales1:'Colleague', sales2:'Colleague', emi:'Emi' };
let sections, all, section = 0, passage = 0, version = 'before', frame = 0;
let draft = { choices:{}, comments:{} }, revision = 0, saving = false;
const current = () => sections[section].changes[passage];
const frames = () => current()[version];
const applyLabel = change => ({remove:'Remove this line',merge:'Use merged lines',flow:'Use shorter sequence',replace:'Use revised line'}[change.kind] || 'Use revision');
function status(text) { $('#status').textContent = text; }
function remember() {
  revision++;
  try { localStorage.setItem(draftKey, JSON.stringify({...draft, updated:Date.now()})); status('Draft saved in this browser. Save decisions to send it.'); }
  catch { status('Browser storage is unavailable. Use Save decisions before leaving.'); }
  renderDecision();
}
function portrait(f) {
  const who = f.speaker === 'miotext' ? 'mio' : f.speaker;
  if (!PORTRAITS[who] || ['action','choice','prompt'].includes(f.kind)) return '';
  const face = PORTRAITS[who].includes(f.face) ? f.face : 'neutral';
  return `<img src="../../game3d/assets/portraits/${who}-${face}.webp" alt="${esc(names[who] || who)}">`;
}
function content(f) {
  return `<p class="frame-text">${lineHTML((f.text || '').replace(/^>\s*/,''))}</p>${f.options?.length ? `<ul class="choice-list">${f.options.map(o => `<li>${lineHTML(typeof o === 'string' ? o : o.text)}</li>`).join('')}</ul>` : ''}`;
}
function renderFrame() {
  const list=frames(); frame=Math.min(Math.max(frame,0),list.length-1);
  const f=list[frame], img=portrait(f), label=names[f.speaker] || f.speaker || ({action:'Action',choice:'Your choice',prompt:'Your turn'}[f.kind] || 'Narration');
  $('#frame').className = (img ? '' : 'no-portrait ') + (f.focus ? 'focus' : '');
  $('#frame').innerHTML = `${img}<div><div class="speaker">${esc(label)}</div>${content(f)}<div class="frame-tag">${f.focus ? (version==='before' ? 'Passage under review' : 'Proposed change') : 'Context'}</div></div>`;
  $('#frame-count').textContent = `${frame+1} / ${list.length}`;
  $('#back-frame').disabled=frame===0; $('#next-frame').disabled=frame===list.length-1;
  document.querySelectorAll('[data-version]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.version===version)));
  $('#transcript').innerHTML=list.map(f=>`<li class="${f.focus?'focused':''}"><b>${esc(names[f.speaker] || f.speaker || ({action:'Action',choice:'Your choice',prompt:'Your turn'}[f.kind] || 'Narration'))}</b>${content(f)}</li>`).join('');
}
function renderDecision() {
  const choice=draft.choices[current().id];
  $('#keep').setAttribute('aria-pressed',String(choice==='keep'));
  $('#apply').setAttribute('aria-pressed',String(choice==='apply'));
  $('#apply').textContent=applyLabel(current());
  $('#decision').textContent=choice==='keep'?'Keep original':choice==='apply'?applyLabel(current()):'Undecided';
  $('#progress').textContent=`${all.filter(c=>draft.choices[c.id]).length} of ${all.length} passages decided`;
}
function render() {
  $('#sections').innerHTML=sections.map((s,i)=>`<button data-section="${i}" aria-pressed="${i===section}">${esc(s.title)}</button>`).join('');
  $('#passages').innerHTML=sections[section].changes.map((c,i)=>`<option value="${i}" ${i===passage?'selected':''}>${i+1}. ${esc(c.title)}</option>`).join('');
  $('#position').textContent=`${sections[section].title} · ${passage+1} of ${sections[section].changes.length}`;
  $('#title').textContent=current().title; $('#summary').textContent=current().summary;
  $('#comment').value=draft.comments[current().id] || '';
  $('#previous').disabled=section===0 && passage===0;
  $('#next').disabled=section===sections.length-1 && passage===sections[section].changes.length-1;
  renderFrame(); renderDecision();
}
function select(s,p) { section=s; passage=p; frame=0; version='before'; render(); }
function move(delta) {
  let s=section,p=passage+delta;
  if(p<0 && s>0){s--;p=sections[s].changes.length-1;}
  if(p>=sections[s].changes.length && s<sections.length-1){s++;p=0;}
  if(p>=0 && p<sections[s].changes.length)select(s,p);
}
async function save() {
  if(saving)return;
  const snapshot=JSON.parse(JSON.stringify(draft)), sentRevision=revision;
  const body={picked:all.filter(c=>snapshot.choices[c.id]==='apply').map(c=>c.id),options:{},comment:'Frame review: picked = apply the shown revision; reject = keep the original; absent = undecided.'};
  for(const c of all){ const choice=snapshot.choices[c.id],comment=snapshot.comments[c.id]||''; if(choice || comment)body.options[c.id]={star:false,reject:choice==='keep',comment}; }
  saving=true; $('#save').disabled=true;status('Saving…');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
    const response=await fetch('/api/review/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});
    const result=await response.json(); if(!response.ok || !result.ok)throw Error(result.error || 'Could not save');
    if(sentRevision===revision){try{localStorage.removeItem(draftKey);}catch{} status('Saved. You can revise any choice and save again.');}
    else status('Saved the previous choices. Newer changes are still a draft.');
  }catch(error){status(`Could not save. Your choices are still here. ${error.name==='AbortError'?'The server took too long.':error.message}`);}
  finally{clearTimeout(timer);saving=false;$('#save').disabled=false;}
}
async function init(){
  const response=await fetch('./frames.json');if(!response.ok)throw Error('Could not load passages');
  ({sections}=await response.json()); all=sections.flatMap(s=>s.changes);
  if(!all.length || all.some(c=>!c.before?.length || !c.after?.length))throw Error('A passage is missing its context');
  let feedback=null;
  try {const r=await fetch('./feedback.json',{cache:'no-store'});if(r.ok)feedback=await r.json();}catch{}
  if(feedback){for(const c of all){if(feedback.picked?.includes(c.id))draft.choices[c.id]='apply';else if(feedback.options?.[c.id]?.reject)draft.choices[c.id]='keep'; draft.comments[c.id]=feedback.options?.[c.id]?.comment || '';}}
  let local=null;try{local=JSON.parse(localStorage.getItem(draftKey));}catch{}
  if(local?.choices && local?.comments && (!feedback?.sent || local.updated>Date.parse(feedback.sent))){draft=local;status('Restored your unsent draft.');}else status(feedback?'Loaded your saved decisions.':'No decisions saved yet.');
  $('#sections').onclick=e=>{const b=e.target.closest('[data-section]');if(b)select(Number(b.dataset.section),0);};
  $('#passages').onchange=e=>select(section,Number(e.target.value));
  $('#previous').onclick=()=>move(-1);$('#next').onclick=()=>move(1);
  $('#back-frame').onclick=()=>{frame--;renderFrame();};$('#next-frame').onclick=()=>{frame++;renderFrame();};
  document.querySelectorAll('[data-version]').forEach(b=>b.onclick=()=>{version=b.dataset.version;frame=0;renderFrame();});
  $('#keep').onclick=()=>{draft.choices[current().id]='keep';remember();};
  $('#apply').onclick=()=>{draft.choices[current().id]='apply';remember();};
  $('#clear').onclick=()=>{delete draft.choices[current().id];remember();};
  $('#comment').oninput=e=>{draft.comments[current().id]=e.target.value;remember();};$('#save').onclick=save;
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='ArrowRight' && frame<frames().length-1){frame++;renderFrame();e.preventDefault();}if(e.key==='ArrowLeft' && frame>0){frame--;renderFrame();e.preventDefault();}});
  render();window.__framesReady=true;
}
init().catch(e=>{status(e.message);$('#title').textContent='Review could not load';$('#save').disabled=true;});
