# Render a built creator model (art/parts/blender/<body>.blend) at the review cameras.
#   blender -b --factory-startup -P tools/creator/blender/render_new.py -- <body> <outdir> <tag> [engine] [frame] [show]
# show: comma-separated object name parts to show besides the body (e.g. "hair,stubble,hoodie"); default: body only.
# Add the original model beside it with show containing "original" (it is imported and placed at the same spot).
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import views  # noqa: E402

a = C.args()
body, outdir, tag = a[:3]
engine = a[3] if len(a) > 3 else 'BLENDER_EEVEE'
frame = a[4] if len(a) > 4 and a[4] not in ('bind', 'rest') else None
show = a[5].split(',') if len(a) > 5 and a[5] else []
only = a[6].split(',') if len(a) > 6 and a[6] else None
bpy.ops.wm.open_mainfile(filepath=os.path.join(C.OUT, f'{body}.blend'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
objs = []
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    on = (o.name.endswith('-body') and 'nobody' not in show) or any(s in o.name for s in show)
    o.hide_render = not on
    if on:
        objs.append(o)
if frame is not None:
    # the walk clip from the original file
    bpy.ops.import_scene.gltf(filepath=os.path.join(C.ROOT, C.ORIGINAL[body]))
    for o in list(bpy.context.selected_objects):
        bpy.data.objects.remove(o)
views.pose(arm, frame)
views.shoot(body, arm, objs, outdir, tag, engine, only)
