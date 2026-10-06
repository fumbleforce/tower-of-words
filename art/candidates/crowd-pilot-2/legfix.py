"""B's texture: Meshy painted thin dark streaks on her bare legs (seen behind the knee once the knee bends; the critic's
"dark seam or crease marks at the knee"). Within the leg pieces' own triangles, between the shoe tops and the skirt,
every texel much darker than the leg's skin is repainted in that skin colour, as Emi's dark jaw texels were in the
game. Nothing else in the texture changes. The texture as Meshy made it is kept as base-meshy.webp.
  python3 art/candidates/crowd-pilot-2/legfix.py <rigged.glb> <base.webp>
"""
import os, shutil, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb
from joints import pieces

glb, base = sys.argv[1:3]
keep = base.replace('base.webp', 'base-meshy.webp')
if not os.path.exists(keep):
    shutil.copy(base, keep)
g = Glb(glb)
V, lab, idx = pieces(g)
uv = g.acc(g.prim()['attributes']['TEXCOORD_0'])
im = Image.open(keep).convert('RGB')
W, H = im.size
y0 = V[:, 1].min(); Ht = V[:, 1].max() - y0
# the two leg pieces: the pieces reaching the floor (shoes and legs are one piece each on B)
legs = [k for k in range(lab.max() + 1) if (V[lab == k][:, 1].min() - y0) / Ht < 0.02 and (V[lab == k][:, 1].max() - y0) / Ht < 0.3]
mask = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(mask)
for t in idx:
    ys = (V[t, 1] - y0) / Ht
    if lab[t[0]] in legs and ys.min() > 0.06:
        d.polygon([(uv[i, 0] * W, uv[i, 1] * H) for i in t], fill=255)
A = np.asarray(im).astype(np.float32)
M = np.asarray(mask) > 0
lum = A @ np.array([0.2126, 0.7152, 0.0722])
skin = M & (A[..., 0] > A[..., 2] + 25)            # warm texels: skin
ref = np.median(A[skin], 0)
L = np.median(lum[skin])
dark = M & (lum < 0.8 * L)
A[dark] = ref
Image.fromarray(A.astype(np.uint8)).save(base, quality=90, method=6)
print('legs pieces', legs, 'texels in legs', int(M.sum()), 'repainted', int(dark.sum()), 'skin', ref.round())
