# char-mio-i2i: the Meshy comparison (meshy-01/mio.glb, as Meshy returned it) rendered at the same cameras as our
# attempts, scaled to our height (1.262 m), feet on the floor, facing -Y.
#   ~/.local/bin/blender -b --factory-startup -t 8 -P tools/style-concepts/mio_i2i_meshy_render.py
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402
import mio_i2i_cam as C  # noqa: E402

out = os.path.join(C.OUT, 'meshy-01')
kit.reset()
bpy.ops.import_scene.gltf(filepath=os.path.join(out, 'mio.glb'))
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
lo, hi = kit.bounds(objs)
k = 1.262 / (hi.z - lo.z)
root = bpy.data.objects.new('root', None)
bpy.context.scene.collection.objects.link(root)
for o in bpy.context.scene.objects:
    if o.parent is None and o is not root:
        o.parent = root
root.scale = (k, k, k)
bpy.context.view_layer.update()
lo, hi = kit.bounds(objs)
root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
bpy.context.view_layer.update()
cam = kit.setup_render(samples=32)
sc = bpy.context.scene
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
for tag, yaw in (('front', 0), ('l40', 40), ('l90', 90), ('back', 180), ('r40', -40), ('r90', -90)):
    kit.aim(cam, C.MID, yaw, C.PITCH, C.SPAN, fov=C.FOV)
    kit.render(os.path.join(out, 'renders', tag + '.png'))
for tag, yaw in (('face', 0), ('face-l32', 32)):
    kit.aim(cam, (0, -0.02, 1.09), yaw, 3, 0.32)
    kit.render(os.path.join(out, 'renders', tag + '.png'))
# a copy at our height with feet on the floor, for the game shot and the viewer (meshy-01n/mio.glb)
coll = bpy.data.collections.new('meshy')
sc.collection.children.link(coll)
for o in list(sc.collection.objects):
    if o.type in ('MESH', 'EMPTY', 'ARMATURE') and o.name not in ('floor',):
        sc.collection.objects.unlink(o)
        coll.objects.link(o)
kit.export(coll, os.path.join(C.OUT, 'meshy-01n', 'mio.glb'))
