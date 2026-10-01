# char-mio-i2i: where the target picture shows hair on the head (ref/hair.png), for the hair sheet in mio_i2i.py.
# Skin is warm (red well above blue); the face's dark marks (brows, lashes, glasses) are closed into the skin. Below
# the chin only the hair beside the neck counts (the green underside and the side hair), not the hood.
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_hairmask.py [ref set]   (t1 or clean; default t1)
# Works at the target's 1024 px (a bigger reference is scaled down first).
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import mio_i2i_cam as C

src, sub = C.REFS[sys.argv[1] if len(sys.argv) > 1 else 't1']
a = np.asarray(Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)).astype(int)
fig = np.asarray(Image.open(os.path.join(C.OUT, sub, 'mask.png')).convert('L').resize((1024, 1024))) > 127
R, G, B = a[..., 0], a[..., 1], a[..., 2]
yy, xx = np.mgrid[:1024, :1024]
skin = (R > 110) & (R - B > 45) & fig & (yy < 300) & (xx > 430) & (xx < 600)
lab, n = ndimage.label(skin)
sizes = ndimage.sum(skin, lab, range(1, n + 1))
skin = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 300])
skin = ndimage.binary_fill_holes(ndimage.binary_closing(skin, structure=np.ones((3, 3)), iterations=7))
green = (G > R + 40) & (G > B)
hair = fig & ~skin & (yy >= 60) & (yy <= 295) & (xx > 400) & (xx < 620)
hair &= (yy <= 262) | (xx < 468) | (xx > 562) | green
Image.fromarray((hair * 255).astype(np.uint8)).save(os.path.join(C.OUT, sub, 'hair.png'))
out = np.zeros((1024, 1024, 3), np.uint8)
out[skin] = (240, 180, 150)
out[hair] = (30, 200, 120)
Image.fromarray(out).crop((380, 50, 640, 320)).save(os.path.join(C.OUT, sub, 'hair-check.png'))
