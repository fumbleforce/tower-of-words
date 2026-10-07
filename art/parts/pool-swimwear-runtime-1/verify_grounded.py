"""Audit grounded-10 against ankle-bind-seat-8; only the Hips translation sampler may change."""
import json, hashlib
from pathlib import Path
import numpy as np
from skin_diagnostics import Rig
root=Path(__file__).parent;rows=[]
for person in ['eric','carina','emi','kuro-b']:
 for kind in ['walk','run']:
  a=Rig(root/'ankle-bind-seat-8'/person/(kind+'.glb'));b=Rig(root/'grounded-10'/person/(kind+'.glb'))
  for key in ['nodes','meshes','skins','scenes','scene']:assert a.j.get(key)==b.j.get(key),(person,kind,key)
  for name,index in a.prim['attributes'].items():assert np.array_equal(a.acc(index),b.acc(b.prim['attributes'][name]))
  assert np.array_equal(a.ib,b.ib) and np.array_equal(a.faces,b.faces)
  assert np.max(np.abs(a.posed(None)-b.posed(None)))==0
  for x,y in zip(a.j['animations'],b.j['animations']):
   assert x['channels']==y['channels']
   for channel in x['channels']:
    index=channel['sampler'];old=x['samplers'][index];new=y['samplers'][index]
    if person in ['eric','carina'] and a.j['nodes'][channel['target']['node']]['name']=='Hips' and channel['target']['path']=='translation':
     ot=a.acc(old['input']).ravel();nt=b.acc(new['input']).ravel();op=a.acc(old['output']);np_=b.acc(new['output'])
     original=np.array([np.interp(nt,ot,op[:,d]) for d in range(3)]).T
     assert np.max(np.abs(original[:,[0,2]]-np_[:,[0,2]]))<1e-5
     assert np.min(np_[:,1]-original[:,1])>-1e-5  # float32 pelvis coordinates use centimetres
    else:
     assert old==new
     for key in ['input','output']:assert np.array_equal(a.acc(old[key]),b.acc(new[key]))
  rows.append({'id':person,'motion':kind,'neutral_exact':True,'model_uv_weights_bind_exact':True,'all_rotations_exact':True,'hips_xz_float32_within_1e5_raw':True})
 for file in ['idle.json','sit.json','base.webp']:
  assert (root/'ankle-bind-seat-8'/person/file).read_bytes()==(root/'grounded-10'/person/file).read_bytes()
(root/'grounded-10'/'preservation.json').write_text(json.dumps({'rows':rows,'idle_sit_textures_exact':True},indent=2))
print('PASS motion-only ground correction: 8 GLBs; only Eric/Carina Hips Y sampler differs')
