"""Retained trial2: settle seated calves and flat feet in world space.
Only Leg/Foot/ToeBase quaternion tracks change; original skin and rig remain exact.
"""
from pathlib import Path
import json, shutil, sys
import numpy as np
from skin_diagnostics import Rig, ROOT, rotation
sys.path.insert(0,str(ROOT/'tools/characters'))
from retarget import mat_to_q
OUT=Path(__file__).parent/(sys.argv[1] if len(sys.argv)>1 else 'seat-calibration-2')
SOURCE=Path(__file__).parent/sys.argv[2] if len(sys.argv)>2 else ROOT/'art/parts/pool-swimwear-1/game'
if OUT.exists():raise SystemExit('Refusing to overwrite an attempt')
report={}
for id in ['eric','carina','emi','kuro-b']:
 src=SOURCE/id;dest=OUT/id;dest.mkdir(parents=True)
 r=Rig(src/'walk.glb');clip=json.loads((src/'sit.json').read_text());before=r.report(clip)
 bind=np.linalg.inv(r.ib)
 for side in ['Left','Right']:
  leg,foot,toe=[r.jointnames.index(side+s) for s in ['Leg','Foot','ToeBase']]
  d=bind[foot,:3,3]-bind[leg,:3,3];d/=np.linalg.norm(d);target=np.array([0,-1,.10]);target/=np.linalg.norm(target)
  delta=np.r_[np.cross(d,target),1+np.dot(d,target)];delta/=np.linalg.norm(delta)
  for j,desired in [(leg,rotation(delta)@bind[leg,:3,:3]),(foot,bind[foot,:3,:3]),(toe,bind[toe,:3,:3])]:
   node=r.joints[j];parent=r.parents[node];pw=r.world(clip)[parent,:3,:3]
   q=mat_to_q(np.block([[np.linalg.inv(pw)@desired,np.zeros((3,1))],[np.zeros((1,3)),np.ones((1,1))]]));q/=np.linalg.norm(q)
   t=next(t for t in clip['tracks'] if t['name']==r.jointnames[j]+'.quaternion');t['values']=q.tolist()*len(t['times'])
 (dest/'sit.json').write_text(json.dumps(clip,separators=(',',':')))
 for name in ['walk.glb','run.glb','base.webp','idle.json']:shutil.copyfile(src/name,dest/name)
 after=r.report(clip);report[id]={'before':before,'after':after}
 print(id,before['max_edge_growth'],after['max_edge_growth'])
(OUT/'report.json').write_text(json.dumps(report,indent=2))
