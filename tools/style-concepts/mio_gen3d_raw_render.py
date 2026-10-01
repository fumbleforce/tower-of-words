# char-mio-gen3d: render one raw generated model (claude-miogen3d/raw/<name>/model.glb or .obj/.ply) as the tool
# returned it, from the clean picture's camera (mio_i2i_cam) and turned round her: front, l40, l90, back. Scaled to
# the picture's height (1.262 m), feet on the floor, centred. Two passes: as returned (texture or vertex colour if
# any) and clay (one grey, smooth as returned) so the shape reads without its paint. Also writes norm.glb (the same
# mesh, scaled and placed, untouched otherwise) for the viewer and as the rebuild's guide.
#   ~/.local/bin/blender -b --factory-startup -t 8 -P tools/style-concepts/mio_gen3d_raw_render.py -- <name> [yaw]
# yaw: degrees to turn the model about Z if the tool's front is not -Y.
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402
import mio_gen3d_paths as P  # noqa: E402
import mio_i2i_cam as C  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:]
name = argv[0]
yaw0 = float(argv[1]) if len(argv) > 1 else 0.0
d = os.path.join(P.RAW, name)
src = next(os.path.join(d, f) for f in ('model.glb', 'model.obj', 'model.ply') if os.path.exists(os.path.join(d, f)))
kit.reset()
if src.endswith('.glb'):
    bpy.ops.import_scene.gltf(filepath=src)
elif src.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=src)
else:
    bpy.ops.wm.ply_import(filepath=src)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
root = bpy.data.objects.new('root', None)
bpy.context.scene.collection.objects.link(root)
for o in bpy.context.scene.objects:
    if o.parent is None and o is not root:
        o.parent = root
root.rotation_euler = (0, 0, math.radians(yaw0))
bpy.context.view_layer.update()
lo, hi = kit.bounds(objs)
k = 1.262 / (hi.z - lo.z)
root.scale = (k, k, k)
bpy.context.view_layer.update()
lo, hi = kit.bounds(objs)
root.location = (root.location.x - (lo.x + hi.x) / 2, root.location.y - (lo.y + hi.y) / 2, root.location.z - lo.z)
bpy.context.view_layer.update()
tris = sum(len(o.data.polygons) for o in objs)
print('FACES', tris)
open(os.path.join(d, 'faces.txt'), 'w').write(str(tris))
cam = kit.setup_render(samples=24)
sc = bpy.context.scene
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
VIEWS = (('front', 0), ('l40', 40), ('l90', 90), ('back', 180))


def shoot(prefix):
    for tag, yaw in VIEWS:
        kit.aim(cam, C.MID, yaw, C.PITCH, C.SPAN, fov=C.FOV)
        kit.render(os.path.join(d, 'renders', f'{prefix}-{tag}.png'))


has_paint = any(o.data.materials and any(m and m.use_nodes and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes)
                                          for m in o.data.materials) for o in objs) or \
    any(o.data.color_attributes for o in objs)
if has_paint:
    if not any(o.data.materials for o in objs) or all(o.data.color_attributes for o in objs):
        # vertex colours only (local models): show them
        vm = bpy.data.materials.new('vcol')
        vm.use_nodes = True
        nt = vm.node_tree
        attr = nt.nodes.new('ShaderNodeVertexColor')
        nt.links.new(attr.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
        for o in objs:
            if o.data.color_attributes and not o.data.materials:
                o.data.materials.append(vm)
    shoot('tex')
clay = kit.mat('#b9bcc2', rough=0.8)
for o in objs:
    o.data.materials.clear()
    o.data.materials.append(clay)
shoot('clay')
coll = bpy.data.collections.new('raw')
sc.collection.children.link(coll)
for o in list(sc.collection.objects):
    if o.type in ('MESH', 'EMPTY') and o.name != 'floor':
        sc.collection.objects.unlink(o)
        coll.objects.link(o)
# the guide keeps the tool's own mesh and paint: reimport is cheaper than undoing the clay, so export from a fresh load
bpy.ops.wm.read_factory_settings(use_empty=True)
if src.endswith('.glb'):
    bpy.ops.import_scene.gltf(filepath=src)
elif src.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=src)
else:
    bpy.ops.wm.ply_import(filepath=src)
root = bpy.data.objects.new('root', None)
bpy.context.scene.collection.objects.link(root)
for o in bpy.context.scene.objects:
    if o.parent is None and o is not root:
        o.parent = root
root.rotation_euler = (0, 0, math.radians(yaw0))
root.scale = (k, k, k)
bpy.context.view_layer.update()
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
lo, hi = kit.bounds(objs)
root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
bpy.ops.export_scene.gltf(filepath=os.path.join(d, 'norm.glb'), export_format='GLB', export_apply=True,
                          export_yup=True)
print('DONE', name)
