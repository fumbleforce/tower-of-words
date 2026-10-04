"""Blender (background): Kuro round 3's UV layout for the texture pass (kuro-meshy-orig-3/uv_bl.py), with the face
window as options, for reviews/aoi-meshy-1 and emi-meshy-1.

Kuro's script takes the face from polygons above 0.58 of her height, seeded at 0.70: right for Kuro round 3, whose
chin is at 0.59 of her height. Aoi's and Emi's heads are bigger (chins near 0.50), so that window cut off their lower
faces and started in the bangs (7 and 10 polygons, 3-4 % of the atlas against Kuro's 14 %). Here the window is
zmin (bottom of the face, a fraction of the height), seed (a point in the middle of the face) and half_w (half the
face width, a fraction of the height); the rest is Kuro's: the front of the face is one front-projected island at
face_scale times the texel density of the rest, everything else is Smart UV Project, then all islands are packed.
Geometry is untouched. debug=<png> also writes a front picture with the face island in red.

  blender -b -P uv_bl.py -- <shape.glb> <out.glb> [face_scale=3] [zmin=0.58] [seed=0.70] [half_w=0.16] [ny=-0.35] [debug=<png>]
"""
import bpy, bmesh, math, sys

src, out, *rest = sys.argv[sys.argv.index('--') + 1:]
opt = dict(r.split('=', 1) for r in rest)
FACE_SCALE = float(opt.get('face_scale', 3))
ZMIN, SEED, HALF_W, NY = (float(opt.get(k, d)) for k, d in (('zmin', 0.58), ('seed', 0.70), ('half_w', 0.16), ('ny', -0.35)))

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

bm = bmesh.new()
bm.from_mesh(mesh)
bm.faces.ensure_lookup_table()
face_ids = set()
for f in bm.faces:
    c = mw @ f.calc_center_median()
    n = (mw.to_3x3() @ f.normal).normalized()
    if c.z > z0 + H * ZMIN and n.y < NY and abs(c.x - xc) < H * HALF_W:
        face_ids.add(f.index)
mid = lambda i: mw @ bm.faces[i].calc_center_median()


def piece(start):
    got, todo = {start}, [start]
    while todo:
        f = bm.faces[todo.pop()]
        for e in f.edges:
            for g in e.link_faces:
                if g.index in face_ids and g.index not in got:
                    got.add(g.index); todo.append(g.index)
    return got


pieces, left = [], set(face_ids)
while left:
    p = piece(next(iter(left)))
    left -= p
    pieces.append(p)
area = lambda p: sum(bm.faces[i].calc_area() for i in p)
pieces.sort(key=area, reverse=True)
for p in pieces[:6]:
    zz = [(mid(i).z - z0) / H for i in p]
    print('piece', len(p), 'polygons, area %.4f, height %.2f-%.2f, front y %.3f' % (area(p), min(zz), max(zz), min(mid(i).y for i in p)))
if 'seed' in opt:      # Kuro's rule: the piece around a point in the middle of the face
    keep = piece(min(face_ids, key=lambda i: abs(mid(i).x - xc) + abs(mid(i).z - (z0 + H * SEED))))
else:                  # the largest front-facing piece in the window
    keep = pieces[0]
print('face polygons', len(keep), 'of', len(bm.faces), '(candidates', len(face_ids), ')')
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

uv = mesh.uv_layers.active.data


def uv_area(p):
    pts = [uv[li].uv for li in p.loop_indices]
    return sum(abs((pts[i] - pts[0]).cross(pts[i + 1] - pts[0])) / 2 for i in range(1, len(pts) - 1))


rest_polys = [p for p in mesh.polygons if p.index not in keep]
dens = (sum(uv_area(p) for p in rest_polys) / sum(p.area for p in rest_polys)) ** 0.5
k = dens * FACE_SCALE
for p in mesh.polygons:
    if p.index in keep:
        for li in p.loop_indices:
            co = mw @ mesh.vertices[mesh.loops[li].vertex_index].co
            uv[li].uv = ((co.x - xc) * k + 5, co.z * k + 5)

bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.pack_islands(rotate=False, scale=True, margin=0.006)
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_yup=True)
print('WROTE', out)

if opt.get('debug'):
    # a front picture of the head, face island red, the rest grey, flat colours (Cycles on the CPU)
    red, grey = (bpy.data.materials.new(n) for n in ('face', 'rest'))
    for m, col in ((red, (0.9, 0.1, 0.1, 1)), (grey, (0.75, 0.75, 0.75, 1))):
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes['Principled BSDF'].inputs['Base Color'].default_value = col
    mesh.materials.clear()
    mesh.materials.append(grey); mesh.materials.append(red)
    for p in mesh.polygons:
        p.material_index = 1 if p.index in keep else 0
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16
    sc.render.resolution_x = sc.render.resolution_y = 768
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = H * 0.6
    ys = [(mw @ v.co).y for v in mesh.vertices]
    cam.location = (xc, min(ys) - 5, z0 + H * 0.72); cam.rotation_euler = (math.pi / 2, 0, 0)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(60), 0, math.radians(-20))
    sc.render.filepath = opt['debug']
    bpy.ops.render.render(write_still=True)
    print('DEBUG', opt['debug'])
