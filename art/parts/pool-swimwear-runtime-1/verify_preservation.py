"""Exact scope audit for trial8: two ankle repairs and six seated lower-joint rotations."""
from pathlib import Path
import json,hashlib
import numpy as np
from skin_diagnostics import Rig,ROOT
BASE=ROOT/'art/parts/pool-swimwear-1/game';OUT=Path(__file__).parent/'ankle-bind-seat-8'
rows=[]
for id in ['eric','carina','emi','kuro-b']:
 changed=id in ['eric','carina']
 for motion in ['walk','run']:
  a=Rig(BASE/id/(motion+'.glb'));b=Rig(OUT/id/(motion+'.glb'))
  assert a.jointnames==b.jointnames and a.parents==b.parents
  assert np.array_equal(a.pos,b.pos) and np.array_equal(a.weights,b.weights) and np.array_equal(a.indices,b.indices)
  aa=a.prim['attributes'];ba=b.prim['attributes']
  for kind in aa:assert np.array_equal(a.acc(aa[kind]),b.acc(ba[kind])),(id,motion,kind)
  assert np.array_equal(a.faces,b.faces)
  allowed={a.names[n] for n in ['RightFoot','RightToeBase']} if changed else set()
  for i,(old,new) in enumerate(zip(a.j['nodes'],b.j['nodes'])):
   if i not in allowed:assert old==new,(id,motion,'node',i)
   else:assert {k:v for k,v in old.items() if k!='translation'}=={k:v for k,v in new.items() if k!='translation'}
  for old,new in zip(a.j.get('animations',[]),b.j.get('animations',[])):
   assert old==new,'animation structure unchanged'
   for c in old['channels']:
    idx=old['samplers'][c['sampler']]['output'];x=a.acc(idx);y=b.acc(idx)
    if c['target']['node'] not in allowed or c['target']['path']!='translation':assert np.array_equal(x,y),(id,motion,c['target'])
  same=np.array_equal(a.ib,b.ib)
  if not same:
   differing=np.flatnonzero(np.any(a.ib!=b.ib,axis=(1,2))).tolist();assert differing==[a.jointnames.index('RightFoot')]
  neutral=float(np.abs(a.posed(None)-b.posed(None)).max());assert neutral<1e-6
  rows.append({'id':id,'motion':motion,'vertices':len(a.pos),'neutral_max_delta_m':neutral,'model_attributes_exact':True,'weights_exact':True,'non_target_nodes_exact':True,'rotation_tracks_exact':True})
 for kind in ['idle','sit']:
  a=json.loads((BASE/id/(kind+'.json')).read_text());b=json.loads((OUT/id/(kind+'.json')).read_text())
  assert len(a['tracks'])==len(b['tracks'])
  for x,y in zip(a['tracks'],b['tracks']):
   name=x['name'];allowed=(changed and name in ['RightFoot.position','RightToeBase.position']) or (kind=='sit' and any(name==side+bone+'.quaternion' for side in ['Left','Right'] for bone in ['Leg','Foot','ToeBase']))
   if not allowed:assert x==y,(id,kind,name)
 assert hashlib.sha256((BASE/id/'base.webp').read_bytes()).digest()==hashlib.sha256((OUT/id/'base.webp').read_bytes()).digest()
p=Path(__file__).parent/'preservation-trial8.json';p.write_text(json.dumps({'rows':rows,'textures_exact':True,'body_face_uv_topology_weights_exact':True},indent=2));print('PASS exact preservation',len(rows),'native clip files; neutral maximum',max(x['neutral_max_delta_m'] for x in rows))
