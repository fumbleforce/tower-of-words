"""Build independently authored geometry on the untouched original rig. No live creator writes."""
import json,os,sys
import bpy
import bmesh
import math
sys.path.insert(0,os.path.abspath('tools/creator/blender'))
import common as C
sys.path.insert(0,os.path.dirname(__file__))
import body as B
sys.path.insert(0,os.path.dirname(__file__))
import clothes as G
import hair as HAIR
from weights import normalize_four

body=C.args()[0];attempt=C.args()[1] if len(C.args())>1 else 'attempt-01'
C.OUT=os.path.abspath('art/parts/astra/'+attempt);os.makedirs(C.OUT,exist_ok=True)
C.reset();arm,original=C.import_original(body);H=C.height(original)
obj,mesh,J=B.build(body,arm,original,H)
print('JOINTS',body,{k:tuple(round(x,5) for x in v) for k,v in J.items()})
# Skin-colour face atlas is opaque and portable: no viewer-specific alpha shader is needed.
info=json.load(open(os.path.join(C.OUT,body+'-face.json')))
img=bpy.data.images.load(os.path.join(C.OUT,body+'-face-opaque.png'))
mat=C.flat_material('astra-face',(1,1,1,1));nt=mat.node_tree;tex=nt.nodes.new('ShaderNodeTexImage');tex.image=img;tex.extension='EXTEND';nt.links.new(tex.outputs['Color'],nt.nodes['Principled BSDF'].inputs['Base Color'])
obj.data.materials.append(mat);uv=obj.data.uv_layers.new(name='UVMap')
for p,tag in zip(obj.data.polygons,mesh.tags):
    front=tag=='head' and p.normal.y<-.28
    if front:p.material_index=len(obj.data.materials)-1
    for li,vi in zip(p.loop_indices,p.vertices):
        co=obj.data.vertices[vi].co;uv.data[li].uv=((co.x-info['x0'])/info['span'],(co.z-info['z0'])/info['span']) if front else (0,0)
HAIR.build(body,arm,original,H)
G.build(body,arm,H,J,obj,mesh)
bpy.data.objects.remove(original)
# Bake diagonals in bind pose, before skinning, exactly as the GLB runtime uses them.
# Otherwise Blender can choose different quad diagonals after deformation.
for o in bpy.data.objects:
    if o.type!='MESH':continue
    normalize_four(o)
    tri=o.modifiers.new('Fixed bind triangles','TRIANGULATE')
    tri.quad_method='SHORTEST_DIAGONAL'
    with bpy.context.temp_override(object=o,active_object=o,selected_objects=[o]):
        bpy.ops.object.modifier_move_to_index(modifier=tri.name,index=0)
        bpy.ops.object.modifier_apply(modifier=tri.name)
# Unused import materials/actions are deliberately not exported.
for o in bpy.data.objects:
    if o.type=='MESH':o.data.name=o.name
audit={}
for o in bpy.data.objects:
    if o.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(o.data)
    audit[o.name]={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'unweighted_vertices':sum(not v.groups for v in o.data.vertices),'finite':all(math.isfinite(c) for v in o.data.vertices for c in v.co)}
    bm.free()
json.dump(audit,open(os.path.join(C.OUT,body+'-geometry.json'),'w'),indent=2)
print('AUDIT',audit)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(C.OUT,body+'.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(C.OUT,body+'.glb'),export_format='GLB',export_animations=False,export_skins=True,export_yup=True,export_apply=False,export_extras=True)
print('BUILT',body,[(o.name,len(o.data.vertices),len(o.data.polygons)) for o in bpy.data.objects if o.type=='MESH'])
