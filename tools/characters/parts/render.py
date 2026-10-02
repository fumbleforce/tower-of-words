"""Turnaround stills for the parts round (reviews/char-mio-parts-1). Blender, run with -t 8:

  blender -b -t 8 -P tools/characters/parts/render.py -- <model.glb|.blend> <outdir> [size=1024]

Same camera and light for every attempt and for meshy-single, so they compare: a 50 mm camera at chest height,
front, her left three-quarter (image right side turned to us), her left side, back, and a face close-up (front and
three-quarter). EEVEE, soft sky light plus one sun from above her right (image left), Standard view transform so the
textures keep their colours. The model is scaled to 1.6 m and stood on the floor first.
"""
import bpy, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
size = int(opt.get('size', 1024))
os.makedirs(out, exist_ok=True)

if src.endswith('.blend'):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type in ('CAMERA', 'LIGHT'): bpy.data.objects.remove(o)
meshes = [o for o in sc.objects if o.type == 'MESH' and not o.hide_render]

# stand on the floor at 1.6 m (only rescale if this is not already an assembled model)
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
for o in sc.objects:
    if o.parent is None and o is not root: o.parent = root
f = 1.6 / (hi.z - lo.z)
root.scale = (f, f, f)
root.location = (-(lo.x + hi.x) / 2 * f, -(lo.y + hi.y) / 2 * f, -lo.z * f)

sc.render.engine = 'BLENDER_EEVEE'
sc.render.resolution_x = sc.render.resolution_y = size
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 1.6
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50


def shot(name, yaw_deg, target, dist):
    """yaw 0 = in front of her (Blender -Y), positive yaw walks the camera round to her left (+X)."""
    a = math.radians(yaw_deg)
    cam.location = Vector((target.x + math.sin(a) * dist, target.y - math.cos(a) * dist, target.z))
    d = target - cam.location
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(out, name + '.png')
    bpy.ops.render.render(write_still=True)


body_c = Vector((0, 0, 0.8))
for name, yaw in (('front', 0), ('l45', 45), ('l90', 90), ('back', 180), ('r45', -45)):
    shot(name, yaw, body_c, 2.6)
face_c = Vector((0, 0, float(opt.get('face_z', 1.38))))
shot('face', 0, face_c, 0.9)
shot('face-l40', 40, face_c, 0.9)
print('RENDERED', out)
