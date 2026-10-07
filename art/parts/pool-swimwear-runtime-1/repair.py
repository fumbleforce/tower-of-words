"""Retained trial1: ankle weights only; no model, UV, texture, bind or clip edits."""
from pathlib import Path
import json, hashlib, shutil, sys
import numpy as np
from skin_diagnostics import Rig, ROOT
OUT=Path(__file__).parent/(sys.argv[1] if len(sys.argv)>1 else 'ankle-weights-1')
SOURCE=Path(__file__).parent/sys.argv[2] if len(sys.argv)>2 else ROOT/'art/parts/pool-swimwear-1/game'
if OUT.exists():raise SystemExit('Refusing to overwrite an attempt')
report={}
for id in ['eric','carina','emi','kuro-b']:
 src=SOURCE/id;dest=OUT/id;dest.mkdir(parents=True)
 r=Rig(src/'walk.glb');old=r.weights.copy();oldi=r.indices.copy()
 if id in ['eric','carina']:
  for side,sign in [('Left',1),('Right',-1)]:
   ids=[r.jointnames.index(side+s) for s in ['Leg','Foot','ToeBase']]
   use=(r.pos[:,0]*sign>0)&(r.pos[:,1]<.115)
   # Full calf at .105 m; full foot below .025 m. Smooth a single ankle ring.
   t=np.clip((r.pos[:,1]-.025)/.08,0,1);calf=t*t*(3-2*t)
   toe=np.where(r.indices==ids[2],r.weights,0).sum(1)
   toe*=1-calf
   r.indices[use]=[ids[0],ids[1],ids[2],0]
   r.weights[use]=np.column_stack([calf,1-calf-toe,toe,np.zeros(len(toe))])[use]
 changed=np.any(old!=r.weights,1)|np.any(oldi!=r.indices,1)
 output=r.raw[:len(r.raw)-len(r.bin)]+r.bin
 (dest/'walk.glb').write_bytes(output)
 for name in ['run.glb','base.webp','idle.json','sit.json']:shutil.copyfile(src/name,dest/name)
 report[id]={'changed_vertices':int(changed.sum()),'vertices':len(r.pos),'input_sha256':hashlib.sha256(r.raw).hexdigest(),'output_sha256':hashlib.sha256(output).hexdigest(),'posed':r.report(json.loads((src/'sit.json').read_text()))}
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print({id:{k:v for k,v in r.items() if k!='posed'} for id,r in report.items()})
