# Measure an original model: joints, and per bone the box of its vertices (all, and skin-coloured only).
#   blender -b --factory-startup -P tools/creator/blender/measure.py -- <body>
import json
import os
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

body = C.args()[0]
C.reset()
arm, mesh = C.import_original(body)
me = mesh.data
names = {v: k for k, v in C.rig_names(body).items()}
groups = {g.index: names.get(g.name, g.name) for g in mesh.vertex_groups}
W = mesh.matrix_world
co = np.array([tuple(W @ v.co) for v in me.vertices])
dom = []
for v in me.vertices:
    best = max(v.groups, key=lambda g: g.weight) if v.groups else None
    dom.append(groups[best.group] if best else None)

# skin: Mio from her palette, Eric from his texture
skin = np.zeros(len(me.vertices), bool)
if body == 'mio':
    faces = json.load(open(os.path.join(C.ROOT, C.MIO_FACES)))['faces']
    for p in me.polygons:
        c = faces[p.index]
        if c and c == [247, 227, 216]:
            skin[list(p.vertices)] = True
else:
    img = bpy.data.images.load(os.path.join(C.ROOT, C.TEXTURE['eric']))
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)
    uv = me.uv_layers[0].data
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            u, v = uv[li].uv
            r, g, b, _ = px[min(h - 1, int(v * h)), min(w - 1, int(u * w))]
            if r > 0.85 and g > 0.72 and b > 0.62 and r - b > 0.05 and r - b < 0.3:
                skin[vi] = True
J = C.joints(arm, body)
out = {'joints': {k: [round(x, 4) for x in v] for k, v in J.items()},
       'height': float(co[:, 2].max() - co[:, 2].min()), 'bones': {}}
for b in sorted(set(d for d in dom if d)):
    idx = [i for i, d in enumerate(dom) if d == b]
    s = [i for i in idx if skin[i]]
    e = {'all': [np.round(co[idx].min(0), 4).tolist(), np.round(co[idx].max(0), 4).tolist()]}
    if s:
        e['skin'] = [np.round(co[s].min(0), 4).tolist(), np.round(co[s].max(0), 4).tolist(), len(s)]
    out['bones'][b] = e
print('MEASURE', json.dumps(out))
