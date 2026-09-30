# Build one character's creator model: the bare body with its face, its own hair, (Eric) stubble and the outfits,
# all on the original rig, then save art/parts/blender/<body>.blend and export art/parts/blender/<body>.glb.
#   sh tools/creator/blender/bl.sh build.py <body>
# Run face.py <body> first (it makes the face decal this reads).
import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import body as BODY  # noqa: E402
import clothes as CLOTHES  # noqa: E402
import common as C  # noqa: E402
import hair as HAIR  # noqa: E402

SKIN = {'eric': '#f6dccf', 'mio': '#f7e3d8'}


def face_material(body, obj):
    """Skin everywhere; on the front of the head the face decal (eyes, brows) over the skin colour."""
    info = json.load(open(os.path.join(C.OUT, f'{body}-face.json')))
    skin = C.hex_rgba(SKIN[body])
    plain = C.flat_material('skin', skin)
    mat = C.flat_material('face', skin)
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    img = nt.nodes.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(os.path.join(C.OUT, f'{body}-face.png'))
    img.image.alpha_mode = 'STRAIGHT'
    img.extension = 'CLIP'
    mixn = nt.nodes.new('ShaderNodeMix')
    mixn.data_type = 'RGBA'
    mixn.inputs[6].default_value = skin
    nt.links.new(img.outputs['Alpha'], mixn.inputs['Factor'])
    nt.links.new(img.outputs['Color'], mixn.inputs[7])
    nt.links.new(mixn.outputs[2], bsdf.inputs['Base Color'])
    me = obj.data
    me.materials.append(plain)
    me.materials.append(mat)
    uv = me.uv_layers.new(name='UVMap')
    parts = obj['parts']
    x0, z0, span = info['x0'], info['z0'], info['span']
    for p in me.polygons:
        front = parts[p.index] == 'head' and p.normal.y < -0.3
        p.material_index = 1 if front else 0
        for li, vi in zip(p.loop_indices, p.vertices):
            co = me.vertices[vi].co
            uv.data[li].uv = ((co.x - x0) / span, (co.z - z0) / span) if front else (0.0, 0.0)


def rig(obj, arm):
    obj.parent = arm
    obj.matrix_parent_inverse = arm.matrix_world.inverted()
    mod = obj.modifiers.new('rig', 'ARMATURE')
    mod.object = arm


def bake_modifiers():
    """Apply every modifier except the rig (Shrinkwrap, Solidify), in the rest pose, so the saved meshes are final
    and only the skeleton moves them."""
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        for m in [m for m in o.modifiers if m.type != 'ARMATURE']:
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
                bpy.ops.object.modifier_apply(modifier=m.name)


def main():
    body = C.args()[0]
    C.reset()
    arm, original = C.import_original(body)
    obj = BODY.build(body, arm, original)
    face_material(body, obj)
    rig(obj, arm)
    HAIR.build(body, original, obj, arm)
    CLOTHES.build(body, arm, obj, C.height(original))
    bpy.data.objects.remove(original)
    bake_modifiers()
    os.makedirs(C.OUT, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(C.OUT, f'{body}.blend'))
    print('BUILT', body, len(obj.data.vertices), 'verts', len(obj.data.polygons), 'faces')


main()
