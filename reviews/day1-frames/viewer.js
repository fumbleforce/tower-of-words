import { lineHTML, WORDS } from '../../game3d/js/lang.js';
import { PORTRAITS } from '../../game3d/js/ui/portrait-data.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = 'day1-frames', draftKey = 'review-frames:' + id;
const names = { eric:'Eric', mio:'Mio', miotext:'Mio · message', guard:'Ishibashi', kuroda:'Hamada', mori:'Mori', kenji:'Kenji', kuro:'Receptionist', gatev:'Gate', commuter:'Commuter', sales1:'Colleague', sales2:'Colleague', emi:'Emi' };
let sections, all, passage = 0, translations;
let draft = { choices:{}, comments:{} }, revision = 0, saving = false, savedDraft = {choices:{}, comments:{}};
const current = () => all[passage];
const versionTitles = change => change.kind==='remove' ? ['With the line','Without it'] : ['Original',({merge:'Merged',flow:'Shorter sequence',replace:'Revised'}[change.kind] || 'Revised')];
function status(text) { $('#status').textContent = text; $('#save-state').textContent = text; }
function renderSave() {
  const count=all.filter(c=>(draft.choices[c.id]||'')!==(savedDraft.choices[c.id]||'') || (draft.comments[c.id]||'')!==(savedDraft.comments[c.id]||'')).length;
  for(const button of [$('#save'),$('#save-top')]) {
    button.disabled=saving || count===0;
    button.textContent=saving ? 'Saving…' : count ? `Save ${count} change${count===1?'':'s'}` : 'Saved';
  }
}
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
function textContent(text) {
  const gloss = translations[text];
  const line = gloss ? esc(text.replace(/\{(\w+)\}/g, (_, id) => WORDS[id]?.ja || id)) : lineHTML(text.replace(/^>\s*/,''));
  return `<span class="wording">${line}</span>${gloss ? `<p class="reading">${esc(gloss[0])}</p><p class="translation">${esc(gloss[1])}</p>` : ''}`;
}
function content(f) {
  return `<div class="frame-text">${textContent(f.text || '')}</div>${f.options?.length ? `<ul class="choice-list">${f.options.map(o => `<li>${textContent(typeof o === 'string' ? o : o.text)}</li>`).join('')}</ul>` : ''}`;
}
// Match frames to highlight only the differences inside each complete version.
function compare(before, after) {
  const key = f => JSON.stringify([f.kind, f.speaker, f.text, f.options]);
  const a = before.map(key), b = after.map(key);
  const lengths = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--)
    lengths[i][j] = a[i]===b[j] ? 1+lengths[i+1][j+1] : Math.max(lengths[i+1][j],lengths[i][j+1]);
  const rows=[]; let i=0,j=0;
  while(i<a.length || j<b.length) {
    if(i<a.length && j<b.length && a[i]===b[j]) { rows.push({frame:before[i++],type:'context'}); j++; }
    else if(i<a.length && (j===b.length || lengths[i+1][j]>=lengths[i][j+1])) rows.push({frame:before[i++],type:'removed'});
    else rows.push({frame:after[j++],type:'added'});
  }
  return rows;
}
function passageHTML(frames, changed) {
  let branchOpen=false;
  const html=frames.map(f=>{
    if(f.kind==='action' && /^(If |Or, if |Otherwise:)/.test(f.text)) {
      const close=branchOpen ? '</div>' : '';branchOpen=true;
      return `${close}<div class="branch"><h4>${esc(f.text)}</h4>`;
    }
    const img=portrait(f), label=names[f.speaker] || f.speaker || ({action:'Action',choice:'Your choice',prompt:'Your turn'}[f.kind] || 'Narration');
    return `<div class="line ${f.kind} ${changed.has(f)?'changed':''} ${img?'':'no-portrait'}">${img}<div><div class="speaker">${esc(label)}</div>${content(f)}</div></div>`;
  }).join('');
  return html+(branchOpen?'</div>':'');
}
function renderPassage() {
  const change=current(), rows=compare(change.before,change.after), [original,revised]=versionTitles(change);
  $('#original-title').textContent=original;$('#revised-title').textContent=revised;
  $('#jump-original').textContent=original+' ↓';$('#jump-revised').textContent=revised+' ↓';
  $('#keep').setAttribute('aria-label','Use '+original.toLowerCase());
  $('#apply').setAttribute('aria-label','Use '+revised.toLowerCase());
  $('#original-passage').innerHTML=passageHTML(change.before,new Set(rows.filter(r=>r.type==='removed').map(r=>r.frame)));
  $('#revised-passage').innerHTML=passageHTML(change.after,new Set(rows.filter(r=>r.type==='added').map(r=>r.frame)));
}
function renderDecision() {
  const choice=draft.choices[current().id];
  $('#keep').setAttribute('aria-pressed',String(choice==='keep'));
  $('#apply').setAttribute('aria-pressed',String(choice==='apply'));
  $('#keep').textContent=choice==='keep'?'✓ Selected':'Use this';
  $('#apply').textContent=choice==='apply'?'✓ Selected':'Use this';
  $('#original-version').classList.toggle('selected',choice==='keep');
  $('#revised-version').classList.toggle('selected',choice==='apply');
  renderSave();
  $('#decision').textContent=choice ? '✓ '+versionTitles(current())[choice==='keep'?0:1] : 'Undecided';
  const count=all.filter(c=>draft.choices[c.id]).length;
  $('#progress').textContent=`${count} of ${all.length} decided`;
  $('#passages').innerHTML=sections.map(s=>`<optgroup label="${esc(s.title)}">${s.changes.map(c=>`<option value="${all.indexOf(c)}" ${c===current()?'selected':''}>${draft.choices[c.id]?'✓':'○'} ${all.indexOf(c)+1}. ${esc(c.title)}</option>`).join('')}</optgroup>`).join('');
}
function render() {
  const section=sections.find(s=>s.changes.includes(current()));
  $('#position').textContent=`${section.title} · ${passage+1} of ${all.length}`;
  $('#title').textContent=current().title;
  $('#summary').textContent=current().summary.split(/(?<=\.) /)[0];
  $('#comment').value=draft.comments[current().id] || '';
  $('#previous').disabled=passage===0;
  $('#next').disabled=passage===all.length-1;
  renderPassage(); renderDecision();
}
function select(index) { passage=index; render(); window.scrollTo(0,0); }
function move(delta) { const next=passage+delta;if(next>=0 && next<all.length)select(next); }
function decide(choice) {
  draft.choices[current().id]=choice;remember();
  for(let step=1;step<all.length;step++) {
    const next=(passage+step)%all.length;
    if(!draft.choices[all[next].id]) {select(next);return;}
  }
  status('All passages decided. Save decisions to send them.');
}
async function save() {
  if(saving)return;
  const snapshot=JSON.parse(JSON.stringify(draft)), sentRevision=revision;
  const body={picked:all.filter(c=>snapshot.choices[c.id]==='apply').map(c=>c.id),options:{},comment:'Frame review: picked = apply the shown revision; reject = keep the original; absent = undecided.'};
  for(const c of all){ const choice=snapshot.choices[c.id],comment=snapshot.comments[c.id]||''; if(choice || comment)body.options[c.id]={star:false,reject:choice==='keep',comment}; }
  saving=true; renderSave();status('Saving…');
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
    const response=await fetch('/api/review/'+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal});
    const result=await response.json(); if(!response.ok || !result.ok)throw Error(result.error || 'Could not save');
    savedDraft=snapshot;
    if(sentRevision===revision){try{localStorage.removeItem(draftKey);}catch{} status('Saved. You can revise any choice and save again.');}
    else status('Saved the previous choices. Newer changes are still a draft.');
  }catch(error){status(`Could not save. Your choices are still here. ${error.name==='AbortError'?'The server took too long.':error.message}`);}
  finally{clearTimeout(timer);saving=false;renderSave();}
}
async function init(){
  const response=await fetch('./frames.json');if(!response.ok)throw Error('Could not load passages');
  ({sections,translations={}}=await response.json()); all=sections.flatMap(s=>s.changes);
  if(!all.length || all.some(c=>!c.before?.length || !c.after?.length))throw Error('A passage is missing its context');
  let feedback=null;
  try {const r=await fetch('./feedback.json',{cache:'no-store'});if(r.ok)feedback=await r.json();}catch{}
  if(feedback){for(const c of all){if(feedback.picked?.includes(c.id))draft.choices[c.id]='apply';else if(feedback.options?.[c.id]?.reject)draft.choices[c.id]='keep'; draft.comments[c.id]=feedback.options?.[c.id]?.comment || '';}}
  savedDraft=JSON.parse(JSON.stringify(draft));
  let local=null;try{local=JSON.parse(localStorage.getItem(draftKey));}catch{}
  if(local?.choices && local?.comments && (!feedback?.sent || local.updated>Date.parse(feedback.sent))){draft=local;status('Restored your unsent draft.');}else status(feedback?'Loaded your saved decisions.':'No decisions saved yet.');
  $('#passages').onchange=e=>select(Number(e.target.value));
  $('#previous').onclick=()=>move(-1);$('#next').onclick=()=>move(1);
  $('#keep').onclick=()=>decide('keep');
  $('#apply').onclick=()=>decide('apply');
  $('#clear').onclick=()=>{delete draft.choices[current().id];remember();};
  $('#comment').oninput=e=>{draft.comments[current().id]=e.target.value;remember();};$('#save').onclick=save;$('#save-top').onclick=save;
  document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName))return;if(e.key==='ArrowRight'){move(1);e.preventDefault();}if(e.key==='ArrowLeft'){move(-1);e.preventDefault();}});
  new ResizeObserver(()=>document.documentElement.style.setProperty('--header-height',document.querySelector('header').getBoundingClientRect().height+'px')).observe(document.querySelector('header'));
  render();window.__framesReady=true;
}
init().catch(e=>{status(e.message);$('#title').textContent='Review could not load';$('#save').disabled=true;$('#save-top').disabled=true;});
