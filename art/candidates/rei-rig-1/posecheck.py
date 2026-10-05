"""Offline check of a rigged GLB's clip: skin the mesh at several frames (numpy, no GPU) and draw it front and side
in flat colours per piece, with the joints, so a twisted spine or a limb through the body shows at once. Also prints
how far the head, chest and hips turn away from facing forward over the clip (degrees about the vertical).

  python3 art/candidates/rei-rig-1/posecheck.py <glb> <out.png> [frames=6]
"""
import sys
import numpy as np
from PIL import Image, ImageDraw
from glbio import Glb
from joints import pieces


def slerp(a, b, t):
    if a @ b < 0:
        b = -b
    q = a * (1 - t) + b * t
    return q / np.linalg.norm(q)


def pose_at(g, t):
    an = g.j['animations'][0]
    trs = {}
    for c in an['channels']:
        s = an['samplers'][c['sampler']]
        T = g.acc(s['input'])[:, 0]
        O = g.acc(s['output']).astype(np.float64)
        k = int(np.clip(np.searchsorted(T, t) - 1, 0, len(T) - 1))
        k2 = min(k + 1, len(T) - 1)
        f = 0 if k2 == k else np.clip((t - T[k]) / (T[k2] - T[k]), 0, 1)
        v = slerp(O[k], O[k2], f) if c['target']['path'] == 'rotation' else O[k] * (1 - f) + O[k2] * f
        i = c['target']['node']
        nd = g.j['nodes'][i]
        cur = list(trs.get(i, (nd.get('translation', [0, 0, 0]), nd.get('rotation', [0, 0, 0, 1]), nd.get('scale', [1, 1, 1]))))
        cur[{'translation': 0, 'rotation': 1, 'scale': 2}[c['target']['path']]] = v
        trs[i] = tuple(cur)
    return trs


def yaw(M):
    f = M[:3, :3] @ np.array([0, 0, 1.0])
    return np.degrees(np.arctan2(f[0], f[2]))


def main():
    g = Glb(sys.argv[1])
    nf = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    V0, lab, idx = pieces(g)
    T = g.acc(g.j['animations'][0]['samplers'][0]['input'])[:, 0]
    times = np.linspace(T.min(), T.max(), nf, endpoint=False) if T.max() > 0 else [0]
    joints, _ = g.skin()
    S = g.local(g.node('Armature'))
    pal = [(150, 180, 220), (240, 190, 140), (160, 220, 160), (230, 150, 150), (200, 170, 230)]
    cw, sc = 300, 230
    im = Image.new('RGB', (cw * len(times), 2 * 320 + 20), 'white'); d = ImageDraw.Draw(im)
    worst = {}
    for fi, t in enumerate(times):
        M = g.arm_space(pose_at(g, t))
        V = g.skinned(M)
        for n in ('Head', 'Spine', 'Hips'):
            y = yaw(M[g.node(n)]) - yaw(g.arm_space()[g.node(n)])
            worst[n] = max(worst.get(n, 0), abs(y))
        for row, (i, k, dep) in enumerate(((0, 1, 2), (2, 1, 0))):
            ox, oy = fi * cw + cw // 2, row * 330 + 310
            P = lambda p: (ox + (p[i] - (V[:, i].mean() if row else 0)) * sc, oy - p[k] * sc)
            for tri in sorted(idx, key=lambda tr: V[tr, dep].mean()):
                d.polygon([P(V[v]) for v in tri], fill=pal[lab[tri[0]] % 5], outline=(110, 110, 110))
            for j in joints:
                p = (S @ M[j])[:3, 3]
                x, y = P(p); d.ellipse((x - 2, y - 2, x + 2, y + 2), fill='red')
        d.text((fi * cw + 5, 3), f't={t:.2f}s', fill='black')
    im.save(sys.argv[2])
    print('max turn from rest over the clip (deg):', {k: round(v, 1) for k, v in worst.items()})


if __name__ == '__main__':
    main()
