"""CPU-only GLB skin diagnostics. Original selected models are never overwritten."""
import json, struct
from pathlib import Path
import numpy as np
def rotation(q):
 x,y,z,w=np.array(q)/np.linalg.norm(q)
 return np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
ROOT = Path(__file__).resolve().parents[3]

class Rig:
 def __init__(self, path):
  self.raw=Path(path).read_bytes();jl=struct.unpack_from('<I',self.raw,12)[0]
  self.j=json.loads(self.raw[20:20+jl]);self.bin=bytearray(self.raw[28+jl:])
  self.names={n.get('name',str(i)):i for i,n in enumerate(self.j['nodes'])}
  self.parents={c:i for i,n in enumerate(self.j['nodes']) for c in n.get('children',[])}
  self.skin=self.j['skins'][0];self.joints=self.skin['joints']
  self.jointnames=[self.j['nodes'][i]['name'] for i in self.joints]
  self.ib=self.acc(self.skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
  self.prim=self.j['meshes'][0]['primitives'][0];a=self.prim['attributes']
  self.pos=self.acc(a['POSITION']);self.weights=self.acc(a['WEIGHTS_0']);self.indices=self.acc(a['JOINTS_0'])
  self.faces=self.acc(self.prim['indices']).reshape(-1,3)
 def acc(self,k):
  a=self.j['accessors'][k];v=self.j['bufferViews'][a['bufferView']]
  dt={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']]
  n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];s=np.dtype(dt).itemsize
  return np.ndarray((a['count'],n),dtype=dt,buffer=self.bin,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',s*n),s))
 def world(self,clip=None):
  tracks={}
  if clip:
   for t in clip['tracks']:
    name,kind=t['name'].rsplit('.',1);tracks[name,kind]=t['values'][:4 if kind=='quaternion' else 3]
  worlds={}
  def get(i):
   if i in worlds:return worlds[i]
   n=self.j['nodes'][i];name=n.get('name')
   if 'matrix' in n and not any(k[0]==name for k in tracks):m=np.array(n['matrix']).reshape(4,4).T
   else:
    m=np.eye(4);m[:3,:3]=rotation(tracks.get((name,'quaternion'),n.get('rotation',[0,0,0,1])))@np.diag(tracks.get((name,'scale'),n.get('scale',[1,1,1])))
    m[:3,3]=tracks.get((name,'position'),n.get('translation',[0,0,0]))
   if i in self.parents:m=get(self.parents[i])@m
   worlds[i]=m;return m
  return np.array([get(i) for i in range(len(self.j['nodes']))])
 def posed(self,clip):
  world=self.world(clip);skin=world[self.joints]@self.ib
  pts=np.column_stack([self.pos,np.ones(len(self.pos))]);out=np.zeros_like(pts)
  for c in range(4):out+=np.einsum('nij,nj->ni',skin[self.indices[:,c]],pts)*self.weights[:,c,None]
  return out[:,:3]
 def report(self,clip):
  p=self.posed(clip);edges=np.unique(np.sort(np.concatenate([self.faces[:,[0,1]],self.faces[:,[1,2]],self.faces[:,[2,0]]]),1),axis=0)
  lo=self.pos[edges].max(1)[:,1]<.24
  lengths=np.linalg.norm(p[edges[:,0]]-p[edges[:,1]],axis=1)
  rest=np.linalg.norm(self.pos[edges[:,0]]-self.pos[edges[:,1]],axis=1)
  ratio=lengths/np.maximum(rest,1e-8)
  order=np.argsort(np.where(lo,lengths-rest,-1))[-12:][::-1]
  return {'lower_leg_max_stretch':float(ratio[lo].max()),'max_edge_growth':float((lengths-rest)[lo].max()),'edges':[{'edge':e.tolist(),'rest':float(rest[k]),'posed':float(lengths[k]),'vertices':[{'id':int(v),'rest':self.pos[v].tolist(),'posed':p[v].tolist(),'weights':[(self.jointnames[j],float(w)) for j,w in zip(self.indices[v],self.weights[v]) if w>.001]} for v in e]} for k in order for e in [edges[k]]]}
if __name__=='__main__':
 out={}
 for id in ['eric','carina','emi','kuro-b']:
  src=ROOT/'art/parts/pool-swimwear-1/game'/id
  r=Rig(src/'walk.glb');out[id]=r.report(json.loads((src/'sit.json').read_text()))
 path=Path(__file__).parent/'original-diagnostics.json';path.write_text(json.dumps(out,indent=2))
 for id,r in out.items():
  print(id,'stretch',r['lower_leg_max_stretch'],'edge growth',r['max_edge_growth'])
  for e in r['edges'][:3]:print(e)
