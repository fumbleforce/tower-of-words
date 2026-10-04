"""Blender (background, no render): give Meshy's untextured smart-topology shape a UV layout in which her face is
one island, for the texture pass (reviews/kuro-meshy-orig-3).

Round 2's shape came with no UVs at all, so "enable_original_uv" had nothing to keep and Meshy cut the 1,092
triangles into 218 islands; the face was 66 triangles in 23 islands, and the eyes were split across island edges.
Here: the front of the head (polygons above the neck facing the camera) gets a straight front projection as a
single island, FACE_SCALE times the texel density of the rest; everything else is Smart UV Project; then all
islands are packed. Geometry is untouched.

  blender -b -P uv_bl.py -- <shape.glb> <out.glb> [face_scale=3]
"""
import bpy, bmesh, sys
from mathutils import Vector

src, out, *rest = sys.argv[sys.argv.index('--') + 1:]
opt = dict(r.split('=', 1) for r in rest)
FACE_SCALE = float(opt.get('face_scale', 3))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
me = [o for o in bpy.data.objects if o.type == 'MESH'][0]
bpy.context.view_layer.objects.active = me
me.select_set(True)
mesh = me.data
mw = me.matrix_world
zs = [(mw @ v.co).z for v in mesh.vertices]
z0, z1 = min(zs), max(zs)
H = z1 - z0
xs = [(mw @ v.co).x for v in mesh.vertices]
xc = (min(xs) + max(xs)) / 2

# the face: above the neck (the top 42 % of her height takes her head), facing front (-Y), near the middle
bm = bmesh.new()
bm.from_mesh(mesh)
bm.faces.ensure_lookup_table()
face_ids = set()
for f in bm.faces:
    c = mw @ f.calc_center_median()
    n = (mw.to_3x3() @ f.normal).normalized()
    if c.z > z0 + H * 0.58 and n.y < -0.35 and abs(c.x - xc) < H * 0.16:
        face_ids.add(f.index)
# keep only the connected piece around the middle of the face
start = min(face_ids, key=lambda i: abs((mw @ bm.faces[i].calc_center_median()).x - xc) +
            abs((mw @ bm.faces[i].calc_center_median()).z - (z0 + H * 0.70)))
keep, todo = {start}, [start]
while todo:
    f = bm.faces[todo.pop()]
    for e in f.edges:
        for g in e.link_faces:
            if g.index in face_ids and g.index not in keep:
                keep.add(g.index); todo.append(g.index)
print('face polygons', len(keep), 'of', len(bm.faces))
bm.free()

if not mesh.uv_layers:
    mesh.uv_layers.new(name='UVMap')
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for p in mesh.polygons:
    p.select = p.index not in keep
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.0, area_weight=0.0, scale_to_bounds=False)
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.average_islands_scale()
bpy.ops.object.mode_set(mode='OBJECT')

# texel density of the rest (UV area per m^2), then the face as a front projection at FACE_SCALE times that
uv = mesh.uv_layers.active.data


def uv_area(p):
    pts = [uv[li].uv for li in p.loop_indices]
    a = 0.0
    for i in range(1, len(pts) - 1):
        a += abs((pts[i] - pts[0]).cross(pts[i + 1] - pts[0])) / 2
    return a


rest_polys = [p for p in mesh.polygons if p.index not in keep]
dens = (sum(uv_area(p) for p in rest_polys) / sum(p.area for p in rest_polys)) ** 0.5   # UV units per metre
k = dens * FACE_SCALE
for p in mesh.polygons:
    if p.index in keep:
        for li in p.loop_indices:
            co = mw @ mesh.vertices[mesh.loops[li].vertex_index].co
            uv[li].uv = ((co.x - xc) * k + 5, co.z * k + 5)   # off to the side; packing moves it

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=False, scale=True, margin=0.006)
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True)
print('WROTE', out)
