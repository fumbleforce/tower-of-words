#!/usr/bin/env python3
"""Straighten and smooth a base's legs into a new version (creator-base-6 feedback).

  python refine_legs.py mio source16 source17
  python refine_legs.py eric source16 source17

Jørgen on creator-base-6: "legs are looking bent inward like they have to pee, and are a bit knobbly." The base's
legs are rings of eight corners from the hip down to the ankle. Their centres wander inwards at the knee, and their
sizes jump from ring to ring (a narrow ring and a wide one at the knee), so the knees knock and the legs look lumpy.

This moves only the rings strictly between the top of the thigh and the ankle:
- each ring's centre goes onto the leg's bones (hip joint, knee, ankle), plus an offset that runs evenly from the
  top ring's own offset to the ankle ring's, so the leg follows its bones instead of bending in at the knee;
- each ring becomes an ellipse whose width and depth taper evenly from the top ring to the ankle ring, keeping the
  angle of every corner round the leg, so the silhouette is one clean taper;
- corners of a ring share one height (the rings were tilted a little).
The top ring (where the leg joins the hips), the ankle ring and the feet stay exactly where they are, and so does
everything else: head, arms, texture, skin weights, triangle order. Body normals are recomputed. The fitted
original-clothes file is copied with the new base id. Refuses to overwrite. Needs numpy.
"""
import json
import sys
from pathlib import Path

import numpy as np

BASE = Path(__file__).resolve().parents[3] / 'art/parts/base'
SPREAD = 0.008   # the top of the thigh moves out this far (body heights), so the thighs stand apart
NARROW = 0.006   # the ankle and foot move in this far, so the legs stand straighter
KNEE = 0.3       # share of the bones' forward knee the leg keeps
THIGH = 1.4     # the thigh is at most this much wider than the ankle


def rings(corners, side, J):
    """Leg rings of one side: lists of unique-corner indices by height, lowest (ankle) first."""
    up, foot = J[side + 'UpLeg'][1], J[side + 'Foot'][1]
    sign = np.sign(J[side + 'UpLeg'][0])
    pick = np.where((corners[:, 1] < up + 0.02) & (corners[:, 1] > foot - 0.004) & (np.sign(corners[:, 0]) == sign)
                    & (np.abs(corners[:, 0]) < 0.16))[0]
    pick = pick[np.argsort(corners[pick, 1])]
    groups, cur = [], [pick[0]]
    for i in pick[1:]:
        if corners[i, 1] - corners[cur[0], 1] < 0.02:
            cur.append(i)
        else:
            groups.append(cur)
            cur = [i]
    groups.append(cur)
    return [g for g in groups if len(g) == 8]


def bone_point(y, J, side):
    """Point on the leg's bones (hip joint, knee, ankle) at height y."""
    chain = [np.array(J[side + b]) for b in ('UpLeg', 'Leg', 'Foot')]
    for a, b in zip(chain, chain[1:]):
        if b[1] <= y <= a[1]:
            return a + (b - a) * (y - a[1]) / (b[1] - a[1])
    return chain[0] if y > chain[0][1] else chain[-1]


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
    keys = np.round(pos, 5)
    corners, inverse = np.unique(keys[body], axis=0, return_inverse=True)
    moved = corners.copy()
    report = {}
    for side in ('Left', 'Right'):
        R = rings(corners, side, J)
        if len(R) < 3:
            raise SystemExit(f'{sid} {side}: found {len(R)} leg rings of eight')
        ankle, top = R[0], R[-1]
        centre = lambda g: corners[g].mean(0)
        size = lambda g: np.ptp(corners[g][:, [0, 2]], axis=0) / 2
        out = np.sign(J[side + 'UpLeg'][0])   # +1 if this leg is on the +x side
        # the new leg axis: a straight line from the top of the thigh to the ankle, both pulled towards upright
        top_c, ank_c = centre(top), centre(ankle)
        T = top_c + np.array([out * SPREAD, 0, 0])
        A = ank_c - np.array([out * NARROW, 0, 0])
        size_a, size_t = size(ankle), np.minimum(size(top), size(ankle) * THIGH)
        report[side] = []
        for g in R:
            c = centre(g)
            f = (c[1] - A[1]) / (T[1] - A[1])   # 0 at the ankle, 1 at the top of the thigh
            new_c = A + (T - A) * f
            # a little of the bones' forward knee stays, so the knee still bends where the joint is
            knee = bone_point(c[1], J, side) - (bone_point(A[1], J, side) + (bone_point(T[1], J, side) - bone_point(A[1], J, side)) * f)
            new_c[2] += KNEE * knee[2]
            rx, rz = (size_a + (size_t - size_a) * f) if g is not ankle else size(g)
            for i in g:
                v = corners[i] - c
                a = np.arctan2(v[2] / max(size(g)[1], 1e-6), v[0] / max(size(g)[0], 1e-6))
                moved[i] = [new_c[0] + rx * np.cos(a), c[1], new_c[2] + rz * np.sin(a)]
            report[side].append({'y': round(float(c[1]), 3), 'centreShift': np.round(new_c - c, 4).tolist(),
                                 'size': np.round(size(g), 4).tolist(), 'newSize': [round(float(rx), 4), round(float(rz), 4)]})
        # the foot goes with its ankle
        foot = np.where((corners[:, 1] < A[1] - 0.004) & (np.sign(corners[:, 0]) == out))[0]
        moved[foot] = corners[foot] + (A - ank_c) * [1, 0, 1]
    pos[body] = moved[inverse]
    # smooth normals on the body (area-weighted over every triangle meeting at a corner); other pieces keep theirs
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
    d['construction'] = dict(d['construction'], legs={'from': f'clean-{sid}-{old}', 'rings': report})
    out_json.write_text(json.dumps(d, separators=(',', ':')))
    fit = json.loads(fit_in.read_text())
    fit['base'] = d['id']
    fit_out.write_text(json.dumps(fit, separators=(',', ':')))
    print(json.dumps({'id': d['id'], 'rings': report}))


if __name__ == '__main__':
    main()
