"""face-uv: our UV layout on Meshy's untextured shape, the face one island at 3 times the density of the rest, so
Meshy's texture pass paints the face whole (face_uv_bl.py, lifted from art/candidates/aoi-emi-meshy-1/uv_bl.py).
Geometry is untouched. Writes build/uv.glb (and build/uv-face.png, the face island in red, with `debug: true`).

Settings (all optional, fractions of the height): face_scale (3), zmin (0.58), seed (Kuro's rule: the face is the
piece round this point; 0.70 for Kuro and the crowd), half_w (0.16), ny (-0.35), piece (without seed: the n-th
largest front piece; 1 where a hair shell is bigger than the face), also ([i, j]: more pieces painted with the face,
the guard's sunken eyes)."""
import os
from common import HERE, blender

KEYS = ('face_scale', 'zmin', 'seed', 'half_w', 'ny', 'piece')


def run(ctx, o):
    out = ctx.path('build', 'uv.glb')
    args = [ctx.files['shape'], out] + [f'{k}={o[k]}' for k in KEYS if k in o]
    if o.get('also'):
        args.append('also=' + ','.join(str(i) for i in o['also']))
    if o.get('debug'):
        args.append('debug=' + ctx.path('build', 'uv-face.png'))
    log = blender(os.path.join(HERE, 'face_uv_bl.py'), args, f'character-build-{ctx.id}')
    print('\n'.join(l for l in log.splitlines() if l.startswith(('piece', 'face polygons'))))
    ctx.files['uv'] = out
