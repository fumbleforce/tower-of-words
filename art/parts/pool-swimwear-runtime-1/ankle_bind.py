"""Trial4: Eric right ankle depth aligned to his left, preserving neutral geometry.
One joint translation, inverse bind, compensated toe translation and position tracks.
No geometry, UV, texture, vertex weights, hierarchy or rotation-track changes.
"""
from pathlib import Path
import json,struct,shutil,hashlib,sys
import numpy as np
from skin_diagnostics import Rig,ROOT
OUT=Path(__file__).parent/(sys.argv[1] if len(sys.argv)>1 else 'ankle-bind-4')
IDS=sys.argv[2:] or ['eric']
if OUT.exists():raise SystemExit('Refusing to overwrite an attempt')

def repair(r):
 world=r.world();foot=r.names['RightFoot'];toe=r.names['RightToeBase'];left=r.names['LeftFoot']
 target=world[foot,:3,3].copy();target[2]=world[left,2,3]
 parent=r.parents[foot];local=(np.linalg.inv(world[parent])@np.r_[target,1])[:3]
 delta=local-np.array(r.j['nodes'][foot]['translation'])
 r.j['nodes'][foot]['translation']=local.tolist()
 changedworld=r.world();toelocal=(np.linalg.inv(changedworld[foot])@np.r_[world[toe,:3,3],1])[:3]
 dt=toelocal-np.array(r.j['nodes'][toe]['translation']);r.j['nodes'][toe]['translation']=toelocal.tolist()
 index=r.joints.index(foot);r.ib[index]=np.linalg.inv(r.world()[foot])
 diffs={foot:delta,toe:dt}
 for anim in r.j.get('animations',[]):
  for c in anim['channels']:
   t=c['target']
   if t['node'] in diffs and t['path']=='translation':
    a=r.acc(anim['samplers'][c['sampler']]['output']);a[:]+=diffs[t['node']]
 return {'RightFoot':delta,'RightToeBase':dt},world[foot,:3,3],target

def write(r,p):
 j=json.dumps(r.j,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 data=bytes(r.bin);data+=b'\0'*((-len(data))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data)
report={}
for id in ['eric','carina','emi','kuro-b']:
 src=ROOT/'art/parts/pool-swimwear-1/game'/id;dest=OUT/id;dest.mkdir(parents=True)
 if id not in IDS:
  for name in ['walk.glb','run.glb','idle.json','sit.json','base.webp']:shutil.copyfile(src/name,dest/name)
  continue
 for kind in ['walk','run']:
  r=Rig(src/(kind+'.glb'));oldneutral=r.posed(None);deltas,old,target=repair(r);newneutral=r.posed(None)
  assert np.max(np.abs(newneutral-oldneutral))<1e-6
  write(r,dest/(kind+'.glb'))
  report[id+'-'+kind]={'old_ankle':old.tolist(),'new_ankle':target.tolist(),'neutral_max_delta_m':float(np.max(np.abs(newneutral-oldneutral))),'local_deltas':{k:v.tolist() for k,v in deltas.items()}}
 for name in ['idle','sit']:
  clip=json.loads((src/(name+'.json')).read_text())
  for t in clip['tracks']:
   bone,kind=t['name'].rsplit('.',1)
   if kind=='position' and bone in deltas:t['values']=(np.array(t['values']).reshape(-1,3)+deltas[bone]).reshape(-1).tolist()
  (dest/(name+'.json')).write_text(json.dumps(clip,separators=(',',':')))
 shutil.copyfile(src/'base.webp',dest/'base.webp')
(OUT/'report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
