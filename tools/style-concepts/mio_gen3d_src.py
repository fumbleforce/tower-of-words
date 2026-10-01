# char-mio-gen3d: source renders for the turnaround. A raw model's norm.glb (mio_gen3d_raw_render.py), painted as the
# tool returned it, from the clean picture's camera turned about her vertical axis, so every view shares the front's
# rows (head top, hem, soles). Writes claude-miogen3d/views/src-<name>/<tag>.png (RGBA, 1024).
#   ~/.local/bin/blender -b --factory-startup -t 8 -P tools/style-concepts/mio_gen3d_src.py -- <name>
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import kit  # noqa: E402
import mio_gen3d_paths as P  # noqa: E402
import mio_i2i_cam as C  # noqa: E402

name = sys.argv[sys.argv.index('--') + 1]
kit.reset()
bpy.ops.import_scene.gltf(filepath=os.path.join(P.RAW, name, 'norm.glb'))
cam = kit.setup_render(samples=24)
for o in bpy.context.scene.objects:
    if o.name == 'floor':
        o.hide_render = True  # no floor shadow: the img2img would paint it in
sc = bpy.context.scene
sc.render.threads_mode = 'FIXED'
sc.render.threads = 8
for tag, yaw in (('front', 0), ('l40', 40), ('l90', 90), ('back', 180), ('r90', -90), ('r40', -40)):
    kit.aim(cam, C.MID, yaw, C.PITCH, C.SPAN, fov=C.FOV)
    kit.render(os.path.join(P.VIEWS, 'src-' + name, tag + '.png'))
