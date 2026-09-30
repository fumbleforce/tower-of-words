#!/usr/bin/env python3
"""Stand a base's legs as two upright columns with a small gap (creator-base-7 feedback).

  python column_legs.py mio source17 source18
  python column_legs.py eric source17 source18

Jørgen on creator-base-7: "characters still look bow-legged." The legs of source17 run on a straight line from the
top of the thigh out to the ankle, which sits on the original skeleton's ankle, well outside the hip. From the front
the two legs make an upside-down V: touching at the crotch, apart at the feet. The originals' trouser legs are
upright columns with a narrow, even gap and the feet under them.

This keeps every ring's size, depth and height from source17 and moves only its centre sideways, so that each
leg's inner edge is one vertical line at GAP from the middle, from the first ring below the crotch down to the
ankle. The foot goes with its ankle. The top ring (where the leg joins the hips) stays. Bones and skin weights stay;
the walk swings the legs forwards and back, so a sideways offset from the bone rides along. Refuses to overwrite.
"""
import json
import sys
from pathlib import Path

import numpy as np

from refine_legs import BASE, rings

GAP = {'mio': 0.026, 'eric': 0.027}   # half the gap between the legs (body heights)


def main():
    sid, old, new = sys.argv[1:4]
    src, fit_in = BASE / f'clean-{sid}-{old}.json', BASE / f'clean-{sid}-{old}-fit3-layers.json'
    out_json, fit_out = BASE / f'clean-{sid}-{new}.json', BASE / f'clean-{sid}-{new}-fit3-layers.json'
    for path in (out_json, fit_out):
        if path.exists():
            raise SystemExit(f'{path} exists; pick a new version')
    d = json.loads(src.read_text())
    J = json.loads((BASE / f'src-{sid}-exact.json').read_text())['P']
    pos = np.array(d['pos'], float).reshape(-1, 3)
    body = np.repeat(np.array(d['pieces']) == 'body', 3)
    corners, inverse = np.unique(np.round(pos[body], 5), axis=0, return_inverse=True)
    moved = corners.copy()
    report = {}
    for side in ('Left', 'Right'):
        R = rings(corners, side, J)
        out = np.sign(J[side + 'UpLeg'][0])
        report[side] = []
        ankle_shift = 0.0
        for g in R[:-1]:   # every ring but the top one
            xs = corners[g, 0] * out            # this leg's corners, measured outwards from the middle
            shift = GAP[sid] - xs.min()         # moves the inner edge onto the line
            moved[g, 0] = corners[g, 0] + out * shift
            if g is R[0]:
                ankle_shift = shift
            report[side].append({'y': round(float(corners[g, 1].mean()), 3), 'shift': round(float(shift), 4)})
        foot = np.where((corners[:, 1] < corners[R[0], 1].min() - 0.004) & (np.sign(corners[:, 0]) == out))[0]
        moved[foot, 0] = corners[foot, 0] + out * ankle_shift
    pos[body] = moved[inverse]
    # smooth normals on the body again (area-weighted); other pieces keep theirs
    tri = pos.reshape(-1, 3, 3)
    fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    acc = np.zeros_like(corners)
    bt = np.where(np.array(d['pieces']) == 'body')[0]
    inv_t = inverse.reshape(-1, 3)
    for k in range(3):
        np.add.at(acc, inv_t[:, k], fn[bt])
    acc /= np.linalg.norm(acc, axis=1, keepdims=True) + 1e-12
    normal = np.array(d['normal'], float).reshape(-1, 3)
    normal[body] = acc[inverse]
    d['pos'] = [round(float(v), 6) for v in pos.ravel()]
    d['normal'] = [round(float(v), 6) for v in normal.ravel()]
    d['id'] = f'clean-{sid}-{new}'
    d['construction'] = dict(d['construction'], columns={'from': f'clean-{sid}-{old}', 'gap': GAP[sid], 'rings': report})
    out_json.write_text(json.dumps(d, separators=(',', ':')))
    fit = json.loads(fit_in.read_text())
    fit['base'] = d['id']
    fit_out.write_text(json.dumps(fit, separators=(',', ':')))
    print(json.dumps({'id': d['id'], 'rings': report}))


if __name__ == '__main__':
    main()
