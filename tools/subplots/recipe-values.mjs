// Resolve only authored data. Never run a recipe or invoke its helpers.
import {parseSource, staticValue} from '../lib/source-data.mjs';
export const field=(node,key)=>node?.properties?.find(p=>(p.key?.name??p.key?.value)===key);
export function recipeValues(source){
  const declarations=parseSource(source).body.flatMap(n=>(n.declaration||n).declarations||[]);
  const binding=name=>declarations.find(d=>d.id.name===name)?.init;
  function resolve(node, locals={}, seen=new Set()){
    try{return staticValue(node);}catch{}
    if(node?.type==='Identifier'){
      if(Object.hasOwn(locals,node.name))return locals[node.name];
      if(seen.has(node.name))return undefined;
      return resolve(binding(node.name),locals,new Set([...seen,node.name]));
    }
    if(node?.type==='TemplateLiteral'){
      const values=node.expressions.map(n=>resolve(n,locals,seen));
      if(values.some(v=>typeof v!=='string'&&typeof v!=='number'))return undefined;
      return node.quasis.map((q,i)=>q.value.cooked+(values[i]??'')).join('');
    }
    if(node?.type==='BinaryExpression'&&node.operator==='+'){
      const a=resolve(node.left,locals,seen),b=resolve(node.right,locals,seen);
      if(['string','number'].includes(typeof a)&&['string','number'].includes(typeof b))return a+b;
    }
    if(node?.type==='ObjectExpression')return Object.fromEntries(node.properties.filter(p=>p.type==='Property'&&!p.computed).map(p=>[p.key.name??p.key.value,resolve(p.value,locals,seen)]));
    return undefined;
  }
  return {binding,resolve};
}
