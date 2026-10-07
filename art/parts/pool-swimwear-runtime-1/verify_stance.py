"""Stance candidate changes only eight leg/foot rotation tracks; no pelvis lift or appearance changes."""
import json, os
from pathlib import Path
import numpy as np
from skin_diagnostics import Rig
root=Path(__file__).parent;rows=[];candidate=os.environ.get('ATTEMPT','stance-17')
allowed={side+bone for side in ['Left','Right'] for bone in ['UpLeg','Leg','Foot','ToeBase']}
for person in ['eric','carina','emi','kuro-b']:
 for kind in ['walk','run']:
  a=Rig(root/'ankle-bind-seat-8'/person/(kind+'.glb'));b=Rig(root/candidate/person/(kind+'.glb'))
  for key in ['nodes','meshes','skins','scenes','scene']:assert a.j.get(key)==b.j.get(key),(person,kind,key)
  for name,index in a.prim['attributes'].items():assert np.array_equal(a.acc(index),b.acc(b.prim['attributes'][name]))
  assert np.array_equal(a.ib,b.ib) and np.array_equal(a.faces,b.faces)
  assert np.max(np.abs(a.posed(None)-b.posed(None)))==0
  changed=[]
  for x,y in zip(a.j['animations'],b.j['animations']):
   assert x['channels']==y['channels']
   for channel in x['channels']:
    old=x['samplers'][channel['sampler']];new=y['samplers'][channel['sampler']]
    name=a.j['nodes'][channel['target']['node']]['name']
    if person in ['eric','carina'] and name in allowed and channel['target']['path']=='rotation':
     changed.append(name)
     q=b.acc(new['output']);assert np.max(np.abs(np.linalg.norm(q,axis=1)-1))<1e-5
    else:
     assert old==new,(person,kind,name)
     for key in ['input','output']:assert np.array_equal(a.acc(old[key]),b.acc(new[key]))
  rows.append({'id':person,'motion':kind,'neutral_exact':True,'body_face_uv_weights_bind_exact':True,'hips_and_other_tracks_exact':True,'changed_rotation_tracks':changed})
 for file in ['idle.json','sit.json','base.webp']:assert (root/'ankle-bind-seat-8'/person/file).read_bytes()==(root/candidate/person/file).read_bytes()
(root/candidate/'preservation.json').write_text(json.dumps({'rows':rows,'idle_sit_textures_exact':True},indent=2))
print('PASS stance candidate: geometry/weights/bind/hips/idle/sit exact; Eric/Carina eight lower-body quaternion tracks only')
