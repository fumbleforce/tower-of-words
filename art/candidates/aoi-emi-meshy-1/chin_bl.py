"""Blender (background): flat-colour close-ups of the face from below the chin (front, and each three-quarter), to look
for dark smudges or discolouration under the cheeks like Kuro round 3's (Jørgen: "black discoloration under her
cheek"). Texture colours only, no light. For reviews/aoi-meshy-1 and emi-meshy-1.

  blender -b -P chin_bl.py -- <model.glb> <out prefix> [chin=0.57]    (chin: the chin's height as a fraction)
Writes <out prefix>-front.png, -left.png (her left, image right), -right.png.
"""
import bpy, math, sys
from mathutils import Vector

src, out, *rest = sys.argv[sys.argv.index('--') + 1:]
opt = dict(r.split('=', 1) for r in rest)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
H = hi.z - lo.z
for o in meshes:
    for mat in o.data.materials:
        nt = mat.node_tree
        outn = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
        img = [n for n in nt.nodes if n.type == 'TEX_IMAGE']
        em = nt.nodes.new('ShaderNodeEmission')
        if img: nt.links.new(img[0].outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], outn.inputs['Surface'])
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 8
sc.render.resolution_x = sc.render.resolution_y = 768
sc.view_settings.view_transform = 'Standard'
sc.render.film_transparent = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
face = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z + H * (float(opt.get('chin', 0.57)) + 0.08)))
for name, yaw in (('front', 0), ('left', 40), ('right', -40)):
    a = math.radians(yaw)
    d = H * 0.75
    # glTF import: she faces -Y; her left is +X (image right from the front)
    cam.location = face + Vector((math.sin(a) * d, -math.cos(a) * d, -H * 0.28))
    cam.rotation_euler = (face - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = f'{out}-{name}.png'
    bpy.ops.render.render(write_still=True)
print('WROTE', out)
