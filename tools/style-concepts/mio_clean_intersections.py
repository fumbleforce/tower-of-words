"""Compare strict local triangle crossings before/after the eye correction (CPU only).

Shared-edge contacts and coplanar overlaps are excluded. This is a local regression check,
not a watertightness or global self-intersection certification of the generated source mesh.
"""
import runpy
import sys
from pathlib import Path
import json
import numpy as np

q=runpy.run_path(str(Path(__file__).with_name('mio_clean_audit.py')))
base,_,ba=q['load'](q['ROOT']/'raw/meshy-single/norm.glb')
name = sys.argv[1] if len(sys.argv) > 1 else '05-safe'
_,_,ca=q['load'](q['ROOT']/'clean'/name/'mio.glb')
p=ba(0).astype(float);p2=ca(0).astype(float);f=ba(3).reshape(-1,3)
scale=base['nodes'][1]['scale'][0];shift=np.array(base['nodes'][1]['translation']);p=p*scale+shift;p2=p2*scale+shift
changed=np.any(p!=p2,axis=1);touched=changed[f].any(axis=1)
t=p[f];lo=t.min(1);hi=t.max(1)
region=(hi[:,0]>-.09)&(lo[:,0]<.09)&(hi[:,1]>1.06)&(lo[:,1]<1.10)&(hi[:,2]>.035)
ids=np.flatnonzero(region);cells={};pitch=.002
for i in ids:
    a=np.floor(lo[i,:2]/pitch).astype(int);b=np.floor(hi[i,:2]/pitch).astype(int)
    for x in range(a[0],b[0]+1):
        for y in range(a[1],b[1]+1):cells.setdefault((x,y),[]).append(i)
pairs=set()
for bucket in cells.values():
    for n,i in enumerate(bucket):
        for k in bucket[n+1:]:
            if not(touched[i] or touched[k]):continue
            if (hi[i,:2]<lo[k,:2]).any() or (hi[k,:2]<lo[i,:2]).any():continue
            pairs.add((i,k) if i<k else(k,i))
pairs=np.array(sorted(pairs));print('candidate pairs',len(pairs),flush=True)
# Vectorised Moller-Trumbore segment/triangle test, strict interiors in all barycentric dimensions.
def edge_hits(a,b):
    result=np.zeros(len(a),dtype=bool)
    e1=b[:,1]-b[:,0];e2=b[:,2]-b[:,0]
    for j in range(3):
        origin=a[:,j];direction=a[:,(j+1)%3]-origin
        h=np.cross(direction,e2);det=np.einsum('ij,ij->i',e1,h);valid=abs(det)>1e-16
        inv=np.divide(1.,det,out=np.zeros_like(det),where=valid)
        s=origin-b[:,0];u=inv*np.einsum('ij,ij->i',s,h);r=np.cross(s,e1)
        v=inv*np.einsum('ij,ij->i',direction,r);dist=inv*np.einsum('ij,ij->i',e2,r)
        result |= valid&(u>1e-6)&(v>1e-6)&(u+v<1-1e-6)&(dist>1e-6)&(dist<1-1e-6)
    return result

def hits(points,pairs):
    result=[]
    for batch in np.array_split(pairs,max(1,len(pairs)//50000)):
        a=points[f[batch[:,0]]];b=points[f[batch[:,1]]]
        result.append(edge_hits(a,b)|edge_hits(b,a))
    return np.concatenate(result)
before=hits(p,pairs);after=hits(p2,pairs)
report={'attempt':name,'candidate_triangle_pairs':len(pairs),'source_strict_crossings':int(before.sum()),
        'candidate_strict_crossings':int(after.sum()),'new_strict_crossings':int((after&~before).sum()),
        'new_triangle_pairs':pairs[after&~before].tolist(),
        'scope':'Eye-region strict edge/triangle crossings. Coplanar overlap and shared-edge contacts excluded.'}
(q['ROOT']/'clean'/name/'intersection-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='new_triangle_pairs'},indent=2))
