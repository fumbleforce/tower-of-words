"""Close-ups of one part of Carina's model, for the carina-2 round 2 fixes (reviews/carina-meshy-1): the waist seam,
the head and the trousers, before and after. Blender, Cycles on the CPU (run through the GPU queue, as GUIDE requires for Blender), the parts round's
light (tools/characters/parts/render.py: sky plus a sun from above her right, image left), Standard view transform.
The model is not rescaled unless fit= is given: metres as in the file (her feet at y = 0, about 1.1 tall), front
+z in glTF (-y here). fit: stand her at that height first, as the game and viewers do.

  blender -b -t 8 -P art/candidates/carina-meshy-1/closeup_bl.py -- <model.glb> <out dir> \
      [z=0.42] [dist=0.45] [lens=50] [x=0] [yaws=0,45,-45,180] [frame=<n>] [fit=<height>] [size=640] [prefix=]

z: the height looked at (metres); yaw 0 is in front of her, positive yaw walks round to her left (image right).
frame: pose the first clip at that frame (the walk) instead of the rest pose.
"""
import bpy, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
size = int(opt.get('size', 640))
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
if 'frame' in opt:
    for o in sc.objects:
        if o.type == 'ARMATURE' and o.animation_data and o.animation_data.action is None and bpy.data.actions:
            o.animation_data.action = bpy.data.actions[0]
    sc.frame_set(int(opt['frame']))
else:
    for o in sc.objects:
        if o.type == 'ARMATURE':
            if o.animation_data:
                o.animation_data.action = None
            for pb in o.pose.bones:
                pb.matrix_basis.identity()
if 'fit' in opt:
    # stand her at this height, as the game and the viewers do with every model (feet on the floor, centred)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    pts = [o.matrix_world @ v.co for o in sc.objects if o.type == 'MESH' and o.parent
           for v in o.evaluated_get(dg).to_mesh().vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
    for o in list(sc.objects):
        if o.parent is None and o is not root:
            o.parent = root
    f = float(opt['fit']) / (hi.z - lo.z)
    root.scale = (f, f, f)
    root.location = (-(lo.x + hi.x) / 2 * f, -(lo.y + hi.y) / 2 * f, -lo.z * f)
    bpy.context.view_layer.update()

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = int(opt.get('samples', 32))
sc.render.resolution_x = sc.render.resolution_y = size
sc.render.film_transparent = False
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.92, 0.93, 0.95, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 1.6
sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = float(opt.get('lens', 50))

z, dist = float(opt.get('z', 0.42)), float(opt.get('dist', 0.45))
x0 = float(opt.get('x', 0))
target = Vector((x0, 0, z))
for yaw in [int(v) for v in opt.get('yaws', '0,45,-45,180').split(',')]:
    a = math.radians(yaw)
    cam.location = Vector((target.x + math.sin(a) * dist, target.y - math.cos(a) * dist, target.z))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = os.path.join(out, f"{opt.get('prefix', '')}y{yaw}.png")
    bpy.ops.render.render(write_still=True)
print('RENDERED', out)
