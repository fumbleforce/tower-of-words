"""Small indexed surface builder. Coordinates and weights are in original height units."""
import math
import bmesh
import bpy
from mathutils import Vector
import common as C
from shapes import chain_weights, frame

X,Y,Z = Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))

class Mesh:
    def __init__(self): self.v=[]; self.f=[]; self.w=[]; self.tags=[]
    def vertex(self,p,w):
        self.v.append(Vector(p)); self.w.append(w); return len(self.v)-1
    def face(self,ids,tag='skin'): self.f.append(list(ids)); self.tags.append(tag)
    def ring(self,c,rx,ry,n=16,w=None,u=X,v=Y,phase=0):
        return [self.vertex(Vector(c)+u*(rx*math.cos((i+phase)*2*math.pi/n))+v*(ry*math.sin((i+phase)*2*math.pi/n)),w or {}) for i in range(n)]
    def bridge(self,a,b,tag='skin',skip=()):
        assert len(a)==len(b)
        for i in range(len(a)):
            if i not in skip: self.face([a[i],a[(i+1)%len(a)],b[(i+1)%len(b)],b[i]],tag)
    def aligned(self,a,b):
        options=[]
        for order in (b,list(reversed(b))):
            for k in range(len(b)):
                q=order[k:]+order[:k]
                options.append((sum((self.v[x]-self.v[y]).length_squared for x,y in zip(a,q)),q))
        return min(options,key=lambda x:x[0])[1]
    def cap(self,a,tag='skin'): self.face(list(reversed(a)),tag)
    def tube(self,points,radii,wfun,tag='skin',n=12,closed=True):
        rings=[]
        for i,(p,r) in enumerate(zip(points,radii)):
            d=points[min(i+1,len(points)-1)]-points[max(i-1,0)]
            u,v=frame(d,Y)
            rr=(r,r) if isinstance(r,(int,float)) else r
            ring=self.ring(p,*rr,n,wfun(p),u,v)
            if rings: self.bridge(rings[-1],ring,tag)
            rings.append(ring)
        if closed:self.cap(rings[0],tag); self.cap(rings[-1],tag)
        return rings
    def object(self,name,H,arm,body,materials,smooth=False):
        me=bpy.data.meshes.new(name); me.from_pydata([v*H for v in self.v],[],self.f); me.update()
        bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
        ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob)
        for mat in materials.values(): me.materials.append(mat)
        keys=list(materials)
        for p,tag in zip(me.polygons,self.tags):p.material_index=keys.index(tag) if tag in keys else 0;p.use_smooth=smooth
        names=C.rig_names(body)
        for i,ws in enumerate(self.w):
            total=sum(ws.values()) or 1
            for bone,w in ws.items():
                if w<.0001:continue
                n=names.get(bone,bone);g=ob.vertex_groups.get(n) or ob.vertex_groups.new(name=n);g.add([i],w/total,'REPLACE')
        ob.parent=arm;ob.matrix_parent_inverse=arm.matrix_world.inverted();mod=ob.modifiers.new('Original skeleton','ARMATURE');mod.object=arm
        return ob

def solidify(ob,thickness,H):
    mod=ob.modifiers.new('Closed cloth rim','SOLIDIFY');mod.thickness=thickness*H;mod.offset=-1;mod.use_rim=True;inner=next((m for m in ob.data.materials if 'lining' in m.name or 'inside' in m.name),ob.data.materials[0]);ob.data.materials.append(inner);mod.material_offset=len(ob.data.materials)-1;mod.material_offset_rim=len(ob.data.materials)-1
    with bpy.context.temp_override(object=ob,active_object=ob,selected_objects=[ob]):bpy.ops.object.modifier_apply(modifier=mod.name)
