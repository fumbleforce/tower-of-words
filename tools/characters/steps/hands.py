"""hand-scale: hand bones scaled when the body loads in the game, where a Review found Meshy's hands too big (Jørgen
on aoi-1: "her hands are larger than the others"; Aoi and the guard at 0.75). The model files stay as Meshy made
them; the scale lives in game3d/js/cast3d.js HANDS, and this step checks that table holds the recipe's value and says
the line to add when it doesn't. Also measures the hands against the height from the rig's hand bones (Eric 0.107,
Mio 0.105; Aoi was 0.108 before her 0.75), into build/hands.json. Settings: scale.

The model has one primitive (Meshy's); measure() reads only that one.
"""
import json, os, re, sys
import numpy as np
from common import ROOT
from glbio import Glb


def measure(path):
    """Hand size as art/candidates/aoi-emi-meshy-2/hands.py counted it: the vertices whose strongest weight is a hand
    bone, in the rest pose; the longest side of each hand's box over the model's height, averaged over both hands."""
    g = Glb(path)
    names = [g.names[j].split(':')[-1] for j in g.skin()[0]]
    a = g.prim()['attributes']
    P = g.acc(a['POSITION']).astype(float)
    J = g.acc(a['JOINTS_0']).astype(int)
    W = g.acc(a['WEIGHTS_0']).astype(float)
    top = J[np.arange(len(J)), W.argmax(1)]
    H = np.ptp(P[:, int(np.argmax(np.ptp(P, 0)))])
    sizes = []
    for side in ('Left', 'Right'):
        h = P[np.isin(top, [i for i, nm in enumerate(names) if nm.startswith(side + 'Hand')])]
        sizes.append(float(np.ptp(h, 0).max() / H) if len(h) else 0)
    return round(sum(sizes) / 2, 4)


def run(ctx, o):
    m = measure(ctx.files['rigged'])
    want = o.get('scale')
    json.dump({'hand_over_height': m, 'scale': want}, open(ctx.path('build', 'hands.json'), 'w'), indent=1)
    print('hands over height', m, 'scale', want)
    if want is None:
        return
    src = open(os.path.join(ROOT, 'game3d/js/cast3d.js')).read()
    table = re.search(r'const HANDS = \{([^}]*)\}', src).group(1)
    have = dict((k.strip().strip("'\""), float(v)) for k, v in re.findall(r"([\w'\"-]+)\s*:\s*([\d.]+)", table))
    if have.get(ctx.id) != want:
        sys.exit(f'hand-scale: game3d/js/cast3d.js HANDS has {ctx.id}: {have.get(ctx.id)}; add "{ctx.id}: {want}"')
