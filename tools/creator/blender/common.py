# Shared helpers for the Blender creator scripts (run inside Blender: blender -b --factory-startup -P <script> -- ...).
#
# Coordinates: everything stays in each original model's own space as Blender imports it (Z up, the character faces
# -Y, its left hand at +X). Eric's rig is the Meshy API rig (cm, armature scaled 0.01), Mio's the Mixamo rig; the
# new bodies keep those armatures untouched, so the game's clips (walk, the approved relaxed idle) play on them.
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
ORIGINAL = {'eric': 'game3d/assets/eric/walk.glb', 'mio': 'game3d/assets/mio/walk.glb'}
TEXTURE = {'eric': 'game3d/assets/eric/base.webp', 'mio': 'game3d/assets/mio/base-clean.webp'}
MIO_FACES = 'game3d/assets/mio/base-clean.json'
OUT = os.path.join(ROOT, 'art/parts/blender')


def args():
    return sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def srgb_to_linear(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgba(h, a=1.0):
    h = h.lstrip('#')
    return tuple(srgb_to_linear(int(h[i:i + 2], 16)) for i in (0, 2, 4)) + (a,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_original(body):
    """Import the game model; returns (armature, mesh). Removes the stray bone-shape icosphere."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, ORIGINAL[body]))
    arm = mesh = None
    for o in set(bpy.data.objects) - before:
        if o.type == 'ARMATURE':
            arm = o
        elif o.type == 'MESH' and o.parent is None and not o.vertex_groups:
            bpy.data.objects.remove(o)
        elif o.type == 'MESH':
            mesh = o
    # the import leaves the walk clip on the rig; stand it in its rest pose
    if arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    return arm, mesh


def bone_world(arm, name):
    """World head and tail of a bone in the rest pose."""
    b = arm.data.bones[name]
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local


def rig_names(body):
    """Our part names -> the rig's bone names."""
    if body == 'eric':
        base = {k: k for k in ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront']}
        sides = {s: {'Shoulder': f'{s}Shoulder', 'Arm': f'{s}Arm', 'ForeArm': f'{s}ForeArm', 'Hand': f'{s}Hand',
                     'UpLeg': f'{s}UpLeg', 'Leg': f'{s}Leg', 'Foot': f'{s}Foot', 'Toe': f'{s}ToeBase'} for s in ('Left', 'Right')}
    else:
        m = 'mixamorig:'
        base = {'Hips': m + 'Hips', 'Spine02': m + 'Spine', 'Spine01': m + 'Spine1', 'Spine': m + 'Spine2', 'neck': m + 'Neck',
                'Head': m + 'Head', 'head_end': m + 'HeadTop_End', 'headfront': 'headfront'}
        sides = {s: {'Shoulder': f'{m}{s}Shoulder', 'Arm': f'{m}{s}Arm', 'ForeArm': f'{m}{s}ForeArm', 'Hand': f'{m}{s}Hand',
                     'UpLeg': f'{m}{s}UpLeg', 'Leg': f'{m}{s}Leg', 'Foot': f'{m}{s}Foot', 'Toe': f'{m}{s}ToeBase'} for s in ('Left', 'Right')}
    names = dict(base)
    for s, d in sides.items():
        for k, v in d.items():
            names[s + k] = v
    return names


def joints(arm, body):
    """World positions of the joints the body is built on (shared names)."""
    names = rig_names(body)
    J = {k: bone_world(arm, v)[0] for k, v in names.items()}
    return J


def mio_palette_material(mesh):
    """Mio's original look: per-triangle palette colours (base-clean.json), the texture elsewhere (her eyes)."""
    data = json.load(open(os.path.join(ROOT, MIO_FACES)))
    me = mesh.data
    attr = me.color_attributes.new('palette', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        c = data['faces'][poly.index]
        rgba = (tuple(srgb_to_linear(x) for x in c) + (0.0,)) if c else (1, 1, 1, 1)
        for li in poly.loop_indices:
            attr.data[li].color = rgba
    return textured_material(TEXTURE['mio'], 'palette')


def textured_material(tex_path, palette_attr=None, name='original'):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 1.0
    bsdf.inputs['Specular IOR Level'].default_value = 0.0
    img = nt.nodes.new('ShaderNodeTexImage')
    img.image = bpy.data.images.load(os.path.join(ROOT, tex_path))
    if palette_attr:
        at = nt.nodes.new('ShaderNodeAttribute')
        at.attribute_name = palette_attr
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        nt.links.new(at.outputs['Alpha'], mix.inputs['Factor'])
        nt.links.new(at.outputs['Color'], mix.inputs[6])
        nt.links.new(img.outputs['Color'], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    else:
        nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def flat_material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = rgba
    bsdf.inputs['Roughness'].default_value = 1.0
    bsdf.inputs['Specular IOR Level'].default_value = 0.0
    mat.diffuse_color = rgba
    return mat


# ---------- rendering ----------

VIEWS = {  # name: (yaw from the front, towards the character's left, in degrees; pitch)
    'front': (0, 4), 'three-quarter': (40, 6), 'side': (90, 3), 'back': (180, 4),
}


def setup_render(engine='BLENDER_EEVEE', size=(640, 800)):
    sc = bpy.context.scene
    sc.render.engine = engine
    if engine == 'CYCLES':
        sc.cycles.device = 'CPU'
        sc.cycles.samples = 24
        sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    world = bpy.data.worlds.new('w')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.72, 0.76, 0.8, 1)
    bg.inputs['Strength'].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 2.6
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.type = 'ORTHO'
    sc.collection.objects.link(cam)
    sc.camera = cam
    return cam


def aim(cam, target, yaw_deg, pitch_deg, span, dist=10.0):
    """Orthographic camera looking at target from yaw (0 = front, the character faces -Y; 90 = from its left, +X)."""
    y, p = math.radians(yaw_deg), math.radians(pitch_deg)
    d = Vector((math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)))
    cam.location = target + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = span
    cam.data.clip_end = dist * 3


def render(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def height(mesh):
    """The model's standing height: the top of its highest vertex (feet at z = 0)."""
    return max((mesh.matrix_world @ v.co).z for v in mesh.data.vertices)


def world_bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
