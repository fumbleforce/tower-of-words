# Render only the original's hair (and Eric's stubble patch), to see the shapes the new hair must match.
#   sh tools/creator/blender/bl.sh render_hair_ref.py <body> <outdir>
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402
import reference as R  # noqa: E402
import views  # noqa: E402

body, outdir = C.args()[:2]
C.reset()
arm, mesh = C.import_original(body)
mat = C.mio_palette_material(mesh) if body == 'mio' else C.textured_material(C.TEXTURE['eric'])
mesh.data.materials.clear()
mesh.data.materials.append(mat)
hair = R.copy_polys(mesh, R.hair_polys(body, mesh) + R.stubble_polys(body, mesh), 'hair-ref')
hair.data.materials.clear()
hair.data.materials.append(mat)
mesh.hide_render = True
views.shoot(body, arm, [mesh], outdir, 'hairref', 'CYCLES', ['face', 'face-3q', 'side', 'back', 'top'])
