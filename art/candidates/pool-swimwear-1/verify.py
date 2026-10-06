"""Candidate preservation checks: UV work did not reshape models; native clips/pixels remain exact."""
from collections import Counter
from pathlib import Path
import hashlib,io,json,sys
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'art/candidates/rei-rig-1'))
from glbio import Glb
OUT=ROOT/'art/parts/pool-swimwear-1'
def triangles(g):
 p=g.j['meshes'][0]['primitives'][0];v=g.acc(p['attributes']['POSITION']);i=g.acc(p['indices']).ravel()
 return Counter(tuple(sorted(tuple(round(float(x),5) for x in xyz) for xyz in tri)) for tri in v[i].reshape(-1,3,3))
for id in ['kuro-b','emi','eric','carina']:
 folder=OUT/'meshy'/id;shape,uv=Glb(folder/'shape.glb'),Glb(folder/'shape-uv.glb')
 assert triangles(shape)==triangles(uv),(id,'UV unwrap changed geometry')
 coords=uv.acc(uv.j['meshes'][0]['primitives'][0]['attributes']['TEXCOORD_0'])
 assert np.isfinite(coords).all() and coords.min()>=0 and coords.max()<=1
 game=OUT/'game'/id
 for source,target in [('walking','walk'),('running','run')]:
  assert (folder/(source+'.glb')).read_bytes()==(game/(target+'.glb')).read_bytes(),(id,target)
 g=Glb(game/'walk.glb');p=g.j['meshes'][0]['primitives'][0];m=g.j['materials'][p['material']]
 tex=g.j['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']];im=g.j['images'][tex['source']];view=g.j['bufferViews'][im['bufferView']]
 raw=g.bin[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
 assert np.array_equal(np.asarray(Image.open(io.BytesIO(raw)).convert('RGB')),np.asarray(Image.open(game/'base.webp').convert('RGB')))
 for clip in ['idle','sit']:
  j=json.loads((game/(clip+'.json')).read_text());assert all(np.isfinite(t['values']).all() for t in j['tracks'])
 print(id,'PASS unchanged shape/UV bounds/native walk/run/texture pixels/finite rest clips')
