"""Decimate a Meshy glb to a face budget (collapse; UVs and the texture are kept) so Meshy's auto-rig takes it
(limit 320,000 faces) and a browser can skin it. CPU only. Blender:

  blender -b -t 8 -P tools/characters/parts/decimate.py -- <in.glb> <out.glb> [faces=60000]
"""
import bpy, sys

argv = sys.argv[sys.argv.index('--') + 1:]
src, out = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
budget = int(opt.get('faces', 60000))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
total = sum(len(o.data.polygons) for o in meshes)
for o in meshes:
    mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = min(1.0, budget / total)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_image_quality=92)
print('DECIMATED', total, '->', sum(len(o.data.polygons) for o in meshes))
