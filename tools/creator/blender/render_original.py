# Render an original game model (Mio or Eric) at the review cameras, for side-by-side checks.
#   blender -b --factory-startup -P tools/creator/blender/render_original.py -- <body> <outdir> [engine] [frame]
# engine: BLENDER_EEVEE (default) or CYCLES (CPU). frame: a walk frame to pose (default: bind pose).
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import views  # noqa: E402

body, outdir = C.args()[:2]
engine = C.args()[2] if len(C.args()) > 2 else 'BLENDER_EEVEE'
frame = C.args()[3] if len(C.args()) > 3 else None
C.reset()
arm, mesh = C.import_original(body)
mat = C.mio_palette_material(mesh) if body == 'mio' else C.textured_material(C.TEXTURE['eric'])
mesh.data.materials.clear()
mesh.data.materials.append(mat)
if body == 'mio':
    for p in mesh.data.polygons:
        p.use_smooth = False
views.pose(arm, frame)
views.shoot(body, arm, [mesh], outdir, 'original', engine)
