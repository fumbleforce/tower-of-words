"""Blender (background): a straight-on orthographic picture of a rigged model in its rest pose, in the texture's own
colours (no light), scaled so the model's full height fills the frame. Used to measure the head-to-body ratio of the
in-game Eric and Mio against Kuro (measure.py).

  blender -b -P front_bl.py -- <model.glb> <out.png> [texture.webp] [px=1024] [hands=<scale>]
hands=: a rigged model with both hand bones scaled by that much, as the game does for Aoi (reviews/aoi-meshy-1, round 2).
"""
import bpy, math, sys
from mathutils import Vector

src, out, *rest = sys.argv[sys.argv.index('--') + 1:]
tex = next((r for r in rest if '=' not in r), None)
hands = float(next((r[6:] for r in rest if r.startswith('hands=')), 1))
px = int(next((r[3:] for r in rest if r.startswith('px=')), 1024))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for a in [o for o in bpy.data.objects if o.type == 'ARMATURE']:
    a.data.pose_position = 'REST'
    a.animation_data_clear()
    if hands != 1:
        a.data.pose_position = 'POSE'
        for b in a.pose.bones:
            b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
            b.scale = (hands,) * 3 if b.name in ('LeftHand', 'RightHand') else (1, 1, 1)
bpy.context.view_layer.update()
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
deps = bpy.context.evaluated_depsgraph_get()
pts = []
for o in meshes:
    ev = o.evaluated_get(deps)
    m = ev.to_mesh()
    pts += [o.matrix_world @ v.co for v in m.vertices]
    ev.to_mesh_clear()
lo = Vector([min(p[i] for p in pts) for i in range(3)])
hi = Vector([max(p[i] for p in pts) for i in range(3)])

for o in meshes:
    for mat in o.data.materials:
        nt = mat.node_tree
        outn = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
        img = [n for n in nt.nodes if n.type == 'TEX_IMAGE']
        if tex:
            if not img:
                img = [nt.nodes.new('ShaderNodeTexImage')]
            img[0].image = bpy.data.images.load(tex)
        em = nt.nodes.new('ShaderNodeEmission')
        if img:
            nt.links.new(img[0].outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], outn.inputs['Surface'])

sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = 8
sc.render.resolution_x = sc.render.resolution_y = px
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam)
sc.camera = cam
cam.data.type = 'ORTHO'
h = hi.z - lo.z
cam.data.ortho_scale = h
cam.data.clip_end = 100
cam.location = ((lo.x + hi.x) / 2, lo.y - 5, (lo.z + hi.z) / 2)
cam.rotation_euler = (math.pi / 2, 0, 0)
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('HEIGHT', h)
