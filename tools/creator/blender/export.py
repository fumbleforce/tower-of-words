# Export a built creator model (art/parts/blender/<body>.blend) to art/parts/blender/<body>.glb for the creator.
#   sh tools/creator/blender/bl.sh export.py <body>
# One GLB: the original rig (unchanged, so the game's clips play on it), the body, its hair, Eric's stubble and every
# garment as separately named meshes. No animation is exported. The face material carries the face picture as its
# base colour texture; the creator lays it over the skin colour by its alpha (Blender does the same with a Mix node).
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

body = C.args()[0]
bpy.ops.wm.open_mainfile(filepath=os.path.join(C.OUT, f'{body}.blend'))
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.parent is None:
        bpy.data.objects.remove(o)          # nothing loose (the import's bone-shape sphere)
for o in bpy.data.objects:
    if 'parts' in o.keys():
        del o['parts']
    if o.type == 'MESH':
        o.data.name = o.name
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    nt = mat.node_tree
    img = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
    bsdf = nt.nodes.get('Principled BSDF')
    if img and bsdf and mat.name == 'face':
        nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
out = os.path.join(C.OUT, f'{body}.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_skins=True,
                          export_yup=True, export_apply=False, export_extras=True, export_image_format='AUTO')
print('EXPORTED', out, os.path.getsize(out), 'bytes')
