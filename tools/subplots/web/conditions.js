const {document}=globalThis;
import {esc} from './common.js';
export const humanize = value => String(value ?? '').replace(/^d(\d+)[-_]/, 'Day $1 · ').replace(/[_:/-]+/g, ' ').replace(/\b\w/g, c=>c.toUpperCase());
// A deliberately small condition grammar. Never evaluate authored expressions in the browser.
export function parseCondition(source) {
  if (!source?.trim()) return {all:[]};
  const tokens=source.match(/\s*(?:(&&|\|\||===|!==|==|!=|>=|<=|[!()<>])|([A-Za-z_]\w*)|(-?\d+(?:\.\d+)?)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"))/gy);
  if (!tokens || tokens.join('').trim()!==source.trim()) return {preserved:source};
  const ts=tokens.map(t=>t.trim());let at=0;
  function primary(){
    if(ts[at]==='('){at++;const n=or();if(ts[at++]!==')')throw Error();return n;}
    if(ts[at]==='!'){at++;return {not:primary()};}
    const field=ts[at++];if(!/^[A-Za-z_]\w*$/.test(field||''))throw Error();
    const op=ts[at];if(!['==','!=','===','!==','>=','<=','>','<'].includes(op))return {field,op:'true'};
    at++;const t=ts[at++];if(t===undefined)throw Error();
    let value;if(/^['"]/.test(t))value=t.slice(1,-1).replace(/\\(['"\\])/g,'$1');else if(t==='true'||t==='false')value=t==='true';else if(!Number.isNaN(Number(t)))value=Number(t);else throw Error();
    return {field,op:op.replace('===','==').replace('!==','!='),value};
  }
  function and(){const xs=[primary()];while(ts[at]==='&&'){at++;xs.push(primary());}return xs.length===1?xs[0]:{all:xs};}
  function or(){const xs=[and()];while(ts[at]==='||'){at++;xs.push(and());}return xs.length===1?xs[0]:{any:xs};}
  try{const n=or();return at===ts.length?n:{preserved:source};}catch{return {preserved:source};}
}
export function writeCondition(n){
  if(n.preserved!==undefined)return n.preserved;
  if(n.not){const inner=writeCondition(n.not);return inner?`!(${inner})`:'';}
  if(n.all||n.any){const xs=n.all||n.any;return xs.map(x=>writeCondition(x)).filter(Boolean).map(x=>`(${x})`).join(n.all?' && ':' || ');}
  return n.op==='true'?n.field:n.op==='false'?`!${n.field}`:`${n.field} ${n.op} ${JSON.stringify(n.value)}`;
}
export function selectHTML(options,value,empty){
  const xs=options.map(o=>typeof o==='string'?{value:o,label:humanize(o)}:{value:o.value??o.id,label:o.label??o.name??humanize(o.value??o.id)});
  if(value!==undefined&&value!==null&&value!==''&&!xs.some(o=>String(o.value)===String(value)))xs.unshift({value,label:humanize(value)});
  return `${empty!==undefined?`<option value="">${esc(empty)}</option>`:''}${xs.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(value)?'selected':''}>${esc(o.label)}</option>`).join('')}`;
}
export function conditionEditor(host,source,variables,change){
  let tree=parseCondition(source);
  const defs=()=>variables?.length?variables:[{id:'day',label:'Story day',type:'number'}];
  const blank=()=>({field:defs()[0].id,op:defs()[0].type==='boolean'?'true':'==',value:defs()[0].type==='number'?1:defs()[0].options?.[0]?.value??''});
  function paint(){host.replaceChildren();draw(tree,host,n=>{tree=n;commit();});}
  function commit(){change(writeCondition(tree));paint();}
  function draw(n,parent,replace){
    const el=document.createElement('div');el.className='condition-rule';parent.append(el);
    if(n.preserved!==undefined){el.innerHTML='<p class="hint">This scene has a custom availability rule. It will be kept when you save.</p><button type="button">Replace with conditions</button>';el.querySelector('button').onclick=()=>replace({all:[blank()]});return;}
    if(n.all||n.any){
      const xs=n.all||n.any;el.innerHTML=`<label>Available when<select aria-label="Match conditions"><option value="all" ${n.all?'selected':''}>All conditions match</option><option value="any" ${n.any?'selected':''}>Any condition matches</option></select></label><div class="condition-children"></div><button type="button">Add condition</button>`;
      el.querySelector('select').onchange=e=>replace({[e.target.value]:xs});
      const children=el.querySelector('.condition-children');if(!xs.length)children.innerHTML='<p class="hint">Always available</p>';
      xs.forEach((c,i)=>{const row=document.createElement('div');children.append(row);draw(c,row,v=>{xs[i]=v;commit();});const rm=document.createElement('button');rm.className='small';rm.textContent='Remove condition';rm.onclick=()=>{xs.splice(i,1);commit();};row.append(rm);});
      el.querySelector(':scope > button').onclick=()=>{xs.push(blank());commit();};return;
    }
    if(n.not){el.innerHTML='<span class="hint">Must not match</span>';draw(n.not,el,v=>{n.not=v;commit();});return;}
    const def=defs().find(d=>d.id===n.field)||{id:n.field,label:humanize(n.field),type:typeof n.value==='number'?'number':n.value===undefined?'boolean':'text'};
    el.innerHTML=`<label>Requirement<select data-rule="field">${selectHTML(defs().map(d=>({value:d.id,label:d.label})),n.field)}</select></label><label>Is this true?<select data-rule="op">${selectHTML(def.type==='boolean'?[{value:'true',label:'Yes'},{value:'false',label:'No'}]:[{value:'==',label:'Is'},{value:'!=',label:'Is not'},{value:'>=',label:'At least'},{value:'<=',label:'At most'},{value:'>',label:'After'},{value:'<',label:'Before'}],n.op)}</select></label>`;
    el.querySelector('[data-rule=field]').onchange=e=>{const d=defs().find(x=>x.id===e.target.value);replace({field:d.id,op:d.type==='boolean'?'true':'==',value:d.type==='number'?1:d.options?.[0]?.value??''});};
    el.querySelector('[data-rule=op]').onchange=e=>{n.op=e.target.value;commit();};
    if(!['true','false'].includes(n.op)){
      const label=document.createElement('label');label.textContent='Value';const field=document.createElement(def.type==='number'?'input':'select');
      if(def.type==='number'){field.type='number';field.value=n.value??1;}else field.innerHTML=selectHTML(def.options||[{value:n.value,label:humanize(n.value)}],n.value);
      field.onchange=()=>{n.value=def.type==='number'?Number(field.value):field.value;commit();};label.append(field);el.append(label);
    }
    const more=document.createElement('button');more.type='button';more.className='small';more.textContent='Add another requirement';more.onclick=()=>replace({all:[n,blank()]});el.append(more);
  }
  paint();
}
