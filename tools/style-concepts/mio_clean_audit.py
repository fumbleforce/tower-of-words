"""Geometry and byte-preservation audit for the bounded cleanup candidates; CPU only."""
import json
from pathlib import Path
import struct
import subprocess
import numpy as np

MAIN=Path(subprocess.check_output(['git','rev-parse','--path-format=absolute','--git-common-dir'],text=True).strip()).parent
ROOT=MAIN/'art/parts/style-concepts/claude-miogen3d'
def load(path):
    a=path.read_bytes();n=struct.unpack_from('<I',a,12)[0];doc=json.loads(a[20:20+n]);data=a[n+28:]
    def acc(i):
        q=doc['accessors'][i];v=doc['bufferViews'][q['bufferView']];width={'VEC3':3,'VEC2':2,'SCALAR':1}[q['type']]
        return np.frombuffer(data,dtype={5126:'<f4',5125:'<u4'}[q['componentType']],count=q['count']*width,offset=v.get('byteOffset',0)+q.get('byteOffset',0)).reshape(-1,width)
    return doc,data,acc
base,bd,ba=load(ROOT/'raw/meshy-single/norm.glb');p=ba(0).astype(np.float64);faces=ba(3).reshape(-1,3)
a=p[faces];old=np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]);oldarea=np.linalg.norm(old,axis=1)
rows=[]
for name in ['01-material','02-eyes','03-clean','04-border','05-safe']:
    doc,data,acc=load(ROOT/'clean'/name/'mio.glb');q=acc(0).astype(np.float64);changed=np.any(p!=q,axis=1);touched=changed[faces].any(axis=1)
    b=q[faces];new=np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0]);newarea=np.linalg.norm(new,axis=1)
    assert np.array_equal(p[:,:2],q[:,:2]);assert np.array_equal(ba(2),acc(2));assert np.array_equal(ba(3),acc(3))
    image=base['bufferViews'][base['images'][0]['bufferView']];lo=image.get('byteOffset',0);hi=lo+image['byteLength'];assert bd[lo:hi]==data[lo:hi]
    ok=(oldarea>1e-12)&touched
    row={'attempt':name,'vertices_moved':int(changed.sum()),'triangles_touched':int(touched.sum()),
         'new_degenerate_triangles':int(((oldarea>1e-12)&(newarea<=1e-12)).sum()),
         'normal_turn_over_90_degrees':int((np.sum(new*old,axis=1)[ok]<0).sum()),
         'min_touched_area_ratio':float((newarea[ok]/oldarea[ok]).min()) if ok.any() else 1.,
         'x_y_uv_indices_texture_unchanged':True,'outside_receipt_region_unchanged':True,
         'self_intersections':'Not exhaustively checked; original mesh may contain overlapping generated surfaces.'}
    if changed.any():
        w=p*base['nodes'][1]['scale'][0]+np.array(base['nodes'][1]['translation'])
        region=(abs(w[:,0])>.012)&(abs(w[:,0])<.088)&(w[:,1]>1.064)&(w[:,1]<1.099)&(w[:,2]>.04)
        assert not (changed&~region).any()
    rows.append(row)
(ROOT/'clean/geometry-audit.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps(rows,indent=2))
