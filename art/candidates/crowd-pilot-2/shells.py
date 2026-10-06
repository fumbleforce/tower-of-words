"""Loose pieces of a Meshy shape (Review crowd-pilot-2): every connected piece with its vertex count, height and how
far its front sits ahead of the face behind it. Round 1's A had four small pieces (eyes, brows) floating in front of
his face; this checks a shape has none before paying for its texture.
  python3 art/candidates/crowd-pilot-2/shells.py <shape.glb> [...]
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb
from joints import pieces

for p in sys.argv[1:]:
    g = Glb(p)
    V, lab, idx = pieces(g)
    H = V[:, 1].max() - V[:, 1].min()
    n = lab.max() + 1
    print(os.path.basename(p), f'{len(V)} vertices, {len(idx)} triangles, {n} pieces')
    for k in range(n):
        P = V[lab == k]
        lo, hi = P.min(0), P.max(0)
        print(f'  piece {k}: {len(P):5d} vertices, height {(lo[1] - V[:, 1].min()) / H:.2f}-{(hi[1] - V[:, 1].min()) / H:.2f} of the body,'
              f' x {lo[0]:+.3f}..{hi[0]:+.3f} z {lo[2]:+.3f}..{hi[2]:+.3f}')
