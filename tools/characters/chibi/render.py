"""Turnaround stills of the chibi kit (reviews/chibi-manual-1), lit like Jørgen's reference pictures: white studio,
one large soft key from the front above her right (image left), a fill, and a soft contact shadow. Cycles on the
CPU (no GPU lock needed), Standard view so the material colours stay as set. Blender, -t 8:

  blender -b -t 8 chibi.blend -P tools/characters/chibi/render.py -- <outdir> <set> [size=1024] [samples=64]

<set> is base (the bare body) or anything else for the whole figure (office for the reference woman, the person's
id for the cast); it also names the files.

Views: front, her left three-quarter (image right side turned to us), her left side, back, and a face close-up.
Writes <outdir>/<set>-<view>.png on white.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
out, which = argv[0], argv[1]
opt = dict(kv.split('=', 1) for kv in argv[2:])
size, samples = int(opt.get('size', 1024)), int(opt.get('samples', 64))
os.makedirs(out, exist_ok=True)
sc = bpy.context.scene
for c in bpy.data.collections:
    c.hide_render = which == 'base' and c.name != 'base'

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = samples
sc.cycles.use_denoising = True
sc.render.resolution_x = sc.render.resolution_y = size
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
sc.view_settings.exposure = float(opt.get('exposure', -0.25))

w = bpy.data.worlds.new('studio'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
w.node_tree.nodes['Background'].inputs['Strength'].default_value = float(opt.get('world', 0.5))

floor = bpy.data.objects.new('floor', bpy.data.meshes.new('floor'))
floor.data.from_pydata([(-5, -5, 0), (5, -5, 0), (5, 5, 0), (-5, 5, 0)], [], [(0, 1, 2, 3)])
floor.is_shadow_catcher = True
sc.collection.objects.link(floor)


def light(name, loc, energy, s):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = energy; L.size = s
    o = bpy.data.objects.new(name, L); o.location = loc
    d = Vector((0, 0, 0.55)) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.collection.objects.link(o)
    return o


rig = bpy.data.objects.new('lights', None); sc.collection.objects.link(rig)
for o in (light('key', (-1.2, -2.2, 2.4), float(opt.get('key', 70)), 2.5),
          light('fill', (1.8, -1.6, 1.0), float(opt.get('fill', 22)), 3.0),
          light('top', (0, 0.8, 3.0), float(opt.get('top', 30)), 3.0)):
    o.parent = rig

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
VIEWS = {'front': 0, 'l45': 45, 'l90': 90, 'back': 180}


def shoot(name, yaw, target, dist, lens):
    cam.data.lens = lens
    a = math.radians(yaw)                       # yaw > 0 swings the camera round to her left (+X)
    cam.location = Vector((math.sin(a) * dist, -math.cos(a) * dist, target.z + 0.03))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    rig.rotation_euler = (0, 0, a)              # the light turns with the camera, like a studio turntable shot
    sc.render.filepath = f'{out}/{which}-{name}.png'
    bpy.ops.render.render(write_still=True)


for n, y in VIEWS.items():
    shoot(n, y, Vector((0, 0, 0.58)), 3.3, 85)
shoot("face", 0, Vector((0, 0, 0.80)), 1.9, 85)
print('RENDERED', out, which)
