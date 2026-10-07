import print_shop from './print_shop.js';
import campus from './campus.js';
import office_quarter from './office_quarter.js';
import harbour from './harbour.js';
// Opening-day stories keep their own dialogue; these completed pedestrian links are available on every day.
export function campusRoutes(stories) {
 const out={office_quarter:campusDistrict('office_quarter',!!stories.sports),harbour:campusDistrict('harbour'),...stories,campus,print_shop};
 for(const [place,targets] of Object.entries({forecourt:['campus'],office_quarter:['campus_shed','campus_quarter'],harbour:['campus']})) {
  const old=out[place],on={...old.on};
  for(const target of targets){on['talk:'+target]='to_campus';on['zone:'+target+'_exit']='to_campus';}
  out[place]={...old,on,nodes:{...old.nodes,to_campus:[{do:'trip',to:'campus'}]}};
 }
 return out;
}

// Keep each opening day's previous outer boundary: the completed loop does not unlock old works or a day-two club.
export function campusDistrict(id,sports=false) {
 const source=id==='harbour'?harbour:office_quarter;
 const blocked=new Set(Object.entries(source.nodes).filter(([,steps])=>steps.some(s=>s.do==='trip'&&(s.to==='works'||s.to==='sports'&&!sports))).map(([node])=>node));
 return {...source,start:'arrive',goal:{},on:Object.fromEntries(Object.entries(source.on).filter(([,node])=>!blocked.has(node))),nodes:{...Object.fromEntries(Object.entries(source.nodes).filter(([node])=>!blocked.has(node))),arrive:[]}};
}
