"""Filled orthographic silhouettes of a skinned GLB (front, side, top) with joint crosses. args: glb out [joints.json]"""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, '/home/jorgen/repo/japanese/.claude/worktrees/agent-a1a8b5ac444530f15/art/candidates/rei-rig-1')
from glbio import Glb
g = Glb(sys.argv[1])
V = g.skinned()
joints, ibm = g.skin()
JW = {g.names[j]: np.linalg.inv(ibm[k])[:3, 3] for k, j in enumerate(joints)}
if len(sys.argv) > 3:
    JW = {k: np.array(v) for k, v in json.load(open(sys.argv[3])).items()}
idx = g.acc(g.prim()['indices']).reshape(-1, 3)
# component colour
par = list(range(len(V)))
def f(a):
    while par[a] != a:
        par[a] = par[par[a]]; a = par[a]
    return a
key = {}
rep = np.array([key.setdefault(tuple(np.round(v, 4)), i) for i, v in enumerate(V)])
for a, b, c in rep[idx]:
    for x, y in ((a, b), (b, c)):
        ra, rb = f(x), f(y)
        if ra != rb: par[ra] = rb
comp = np.array([f(r) for r in rep])
u, cnt = np.unique(comp, return_counts=True)
order = {c: k for k, c in enumerate(u[np.argsort(-cnt)])}
pal = [(150, 180, 220), (240, 190, 140), (160, 220, 160), (230, 150, 150), (200, 170, 230)]
sc = 900
W = 700
im = Image.new('RGB', (3 * W, 1100), 'white'); d = ImageDraw.Draw(im)
views = ((0, 1, 2, 'front (their left = image right)'), (2, 1, 0, 'side (front = right)'), (0, 2, 1, 'top (front = down)'))
for panel, (i, k, depth, title) in enumerate(views):
    ox = panel * W + W // 2
    def P(p):
        return (ox + p[i] * sc, 1050 - p[k] * sc if k == 1 else 550 + p[k] * sc)
    tri = sorted(idx, key=lambda t: V[t, depth].mean() * (1 if depth != 2 else 1))
    for t in tri:
        c = pal[order[comp[t[0]]] % 5]
        shade = 0.75 + 0.25 * ((V[t, depth].mean() + 0.3) / 0.6)
        d.polygon([P(V[v]) for v in t], fill=tuple(int(min(255, x * shade)) for x in c), outline=(120, 120, 120))
    for n, p in JW.items():
        x, y = P(p); d.line((x - 7, y, x + 7, y), fill='red', width=2); d.line((x, y - 7, x, y + 7), fill='red', width=2)
        d.text((x + 5, y + 2), n, fill='black')
    d.text((ox - 300, 10), title, fill='black')
    for yy in range(0, 12):
        y = 1050 - yy * 0.1 * sc if k == 1 else 0
        if k == 1: d.text((panel * W + 5, y), f'{yy/10:.1f}', fill='gray')
im.save(sys.argv[2])
