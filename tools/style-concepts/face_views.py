# Face close-ups of one claude-facetface attempt in every expression (a texture swap, as the portraits change per
# line), front and three-quarter, plus each expression's texture exported next to the glb for the live viewer.
#   ~/.local/bin/blender -b --factory-startup -P tools/style-concepts/face_views.py -- facetface <attempt>
# Staging as build.py's face view: the head alone, camera level with the eyes, soft sky fill and one sun from her
# right-front-above (image left); front yaw 0, three-quarter 32 degrees toward her left (image right).
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import facetface as ff  # noqa: E402
import kit  # noqa: E402

attempt = kit.args()[1]
out = os.path.join(kit.OUT, 'claude-facetface', attempt)
kit.reset()
chars = {}
for ch in ('mio', 'eric'):
    coll = bpy.data.collections.new(ch)
    bpy.context.scene.collection.children.link(coll)
    arm, objs = ff.build(ch, coll)
    chars[ch] = (coll, arm, objs)
cam = kit.setup_render()
ff.prepare_render()
for ch, (coll, arm, objs) in chars.items():
    for c2, (cl2, _, _) in chars.items():
        cl2.hide_render = c2 != ch
    lo, hi = kit.bounds(objs)
    H = hi.z - lo.z
    for ex in ff.EXPRS[ch]:
        ff.set_face(ch, ex)
        shutil.copy(ff.tex_path(ch, ex), os.path.join(out, f'face-{ch}-{ex}.png'))
        for tag, yaw, pitch in (('face', 0, 3), ('face3q', 32, 5)):
            kit.aim(cam, ff.HEAD[ch], yaw, pitch, H * ff.HEAD_SPAN)
            kit.render(os.path.join(out, 'renders', f'x-{ch}-{tag}-{ex}.png'))
