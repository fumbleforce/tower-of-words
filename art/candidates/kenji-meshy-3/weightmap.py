"""Front and side pictures of a rigged GLB in its rest pose, each triangle coloured by its vertices' strongest bone
(Meshy's or ours), with a legend: the check that found Kenji's belly and tie weighted to his thighs.

  python3 art/candidates/kenji-meshy-3/weightmap.py <glb> <out.png>
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb

COL = {'Hips': (230, 60, 60), 'Spine02': (240, 140, 40), 'Spine01': (240, 200, 40), 'Spine': (170, 210, 60),
       'neck': (60, 180, 90), 'Head': (60, 170, 200), 'LeftShoulder': (120, 90, 200), 'RightShoulder': (120, 90, 200),
       'LeftArm': (170, 110, 220), 'RightArm': (170, 110, 220), 'LeftForeArm': (210, 140, 230),
       'RightForeArm': (210, 140, 230), 'LeftHand': (240, 180, 240), 'RightHand': (240, 180, 240),
       'LeftUpLeg': (40, 70, 160), 'RightUpLeg': (40, 110, 200), 'LeftLeg': (90, 90, 90), 'RightLeg': (130, 130, 130),
       'LeftFoot': (60, 40, 30), 'RightFoot': (100, 70, 50), 'LeftToeBase': (20, 20, 20), 'RightToeBase': (20, 20, 20),
       'headfront': (255, 0, 255), 'head_end': (255, 0, 255)}


def main(src, out):
    g = Glb(src)
    V = g.skinned()
    joints, _ = g.skin()
    a = g.prim()['attributes']
    J, W = g.acc(a['JOINTS_0']).astype(int), g.acc(a['WEIGHTS_0'])
    top = [g.names[joints[J[i, np.argmax(W[i])]]] for i in range(len(V))]
    idx = g.acc(g.prim()['indices']).reshape(-1, 3)
    sc, Wd = 800, 640
    im = Image.new('RGB', (2 * Wd + 220, 960), 'white'); d = ImageDraw.Draw(im)
    for panel, (i, dep, sgn) in enumerate(((0, 2, 1), (2, 0, -1))):
        ox = panel * Wd + Wd // 2
        for t in sorted(idx, key=lambda t: sgn * V[t, dep].mean()):
            names = [top[v] for v in t]
            c = COL.get(max(set(names), key=names.count), (0, 0, 0))
            d.polygon([(ox + V[v, i] * sc, 920 - V[v, 1] * sc) for v in t], fill=c, outline=(255, 255, 255))
        d.text((ox - 280, 8), ('front (their left = image right)', 'side (front = right)')[panel], fill='black')
    seen = []
    for n, c in COL.items():
        if c in [x[1] for x in seen]:
            continue
        seen.append((n, c))
    for k, (n, c) in enumerate(seen):
        d.rectangle((2 * Wd + 10, 30 + k * 26, 2 * Wd + 30, 50 + k * 26), fill=c)
        d.text((2 * Wd + 36, 34 + k * 26), n.replace('Left', '').replace('Right', '') if 'Leg' not in n else n, fill='black')
    im.save(out)


if __name__ == '__main__':
    main(*sys.argv[1:3])
