"""Joint places for "our rig" (option a in Review crowd-pilot-1), Rei's method (art/candidates/rei-rig-1) made general
for any Meshy person: the game's Meshy skeleton (the same 24 bones and names), each joint placed inside the person's
own mesh, left and right mirrored. Rei's joints.py read her mesh's pieces (jacket, trousers, head, ponytail); these
models come in other pieces, so here every joint starts where Meshy's auto-rig put it, then:
  - left and right are averaged into a mirrored pair (her left is +x, image right in a front view);
  - Hips and spine go to x = 0, and to the middle (front to back) of the body's slice at their height;
  - the neck to the middle of a narrow slice of the neck (where Meshy put it front to back if hair hangs behind),
    the head joint on the neck line;
  - hip, knee and ankle joints go to the middle of their leg's slice (for a skirt, only front to back);
  - elbow and wrist go to the middle of the sleeve's cross-section across the arm's line;
Metres, the model's own space (front +z, floor y = 0).

  python3 art/candidates/crowd-pilot-1/joints_gen.py <meshy rigged glb> <out joints.json>
"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb
from joints import pieces, dense

PAIRS = ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot', 'ToeBase')


def meshy_joints(g):
    joints, ibm = g.skin()
    return {g.names[j]: np.linalg.inv(m)[:3, 3].astype(float) for j, m in zip(joints, ibm)}


def mid(S):
    return (S.min(0) + S.max(0)) / 2


def fit(g):
    V, lab, idx = pieces(g)
    P, _ = dense(V, lab, idx, 8)
    J0 = meshy_joints(g)
    J = {k: v.copy() for k, v in J0.items()}
    for s in PAIRS:                                           # mirrored pairs
        l, r = J['Left' + s], J['Right' + s]
        x, m = (abs(l[0]) + abs(r[0])) / 2, (l + r) / 2
        J['Left' + s] = np.array([x, m[1], m[2]]); J['Right' + s] = np.array([-x, m[1], m[2]])
    notes = {}

    def band(y, w=0.008):
        return P[np.abs(P[:, 1] - y) < w]
    # trunk: x = 0, front-to-back middle of the slice between the arms
    for n in ('Hips', 'Spine02', 'Spine01', 'Spine'):
        S = band(J[n][1])
        S = S[np.abs(S[:, 0]) < 0.05]
        if len(S) > 10:
            J[n] = np.array([0.0, J[n][1], mid(S)[2]])
    # legs: the middle of each leg's slice; a slice that crosses the middle line is a skirt: front to back only
    for s, sg in (('Left', 1), ('Right', -1)):
        for n, dy in (('UpLeg', -0.03), ('Leg', 0), ('Foot', 0)):
            j = J[s + n]
            S = band(j[1] + dy)
            S = S[(S[:, 0] * sg > -0.005) & (np.abs(S[:, 0] - j[0]) < 0.09)]
            if len(S) < 10:
                continue
            c = mid(S)
            if S[:, 0].min() * sg < 0.004 and n != 'Foot':
                J[s + n] = np.array([j[0], j[1], c[2]]); notes[s + n] = 'skirt: z only'
            else:
                J[s + n] = np.array([c[0], j[1], c[2]])
    # arms: elbow and wrist in the middle of the sleeve, across the arm's line
    for s in ('Left', 'Right'):
        a, h = J[s + 'Arm'], J[s + 'Hand']
        d = (h - a) / np.linalg.norm(h - a)
        for n in ('ForeArm', 'Hand'):
            j = J[s + n]
            t = (P - j) @ d
            r = np.linalg.norm((P - j) - np.outer(t, d), axis=1)
            S = P[(np.abs(t) < 0.006) & (r < 0.07)]
            if len(S) > 10:
                J[s + n] = mid(S)
        sz = band(a[1])
        sz = sz[np.abs(sz[:, 0] - a[0]) < 0.02]
        if len(sz) > 10:
            J[s + 'Arm'] = np.array([a[0], a[1], mid(sz)[2]])
    for s in ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Arm', 'ForeArm', 'Hand', 'Shoulder'):   # mirror again
        l, r = J['Left' + s], J['Right' + s]
        x, m = (abs(l[0]) + abs(r[0])) / 2, (l + r) / 2
        J['Left' + s] = np.array([x, m[1], m[2]]); J['Right' + s] = np.array([-x, m[1], m[2]])
    for s in ('Left', 'Right'):
        J[s + 'Shoulder'][2] = J['Spine'][2]
    J['Hips'][1] = max(J['Hips'][1], J['LeftUpLeg'][1] + 0.03)
    # neck: the middle of a narrow slice (|x| < 3 cm) unless that slice is deeper than 16 cm, which means hair hangs
    # behind the neck (a bun or a ponytail would pull the middle back; Rei's script left her ponytail out by piece);
    # then front to back where Meshy put it. The head joint sits on the neck line, the head's ends where Meshy put them.
    S = band(J0['neck'][1], 0.006)
    S = S[np.abs(S[:, 0]) < 0.03]
    nz = mid(S)[2] if len(S) > 10 and np.ptp(S[:, 2]) < 0.16 else J0['neck'][2]
    notes['neck'] = 'slice' if nz != J0['neck'][2] else 'kept (hair behind)'
    J['neck'] = np.array([0.0, J0['neck'][1], nz])
    J['Head'] = np.array([0.0, J0['Head'][1], nz])
    for n in ('head_end', 'headfront'):
        J[n] = np.array([0.0, J0[n][1], J0[n][2]])
    out = {k: [round(float(c), 4) for c in v] for k, v in J.items()}
    moved = {k: round(float(np.linalg.norm(J[k] - J0[k])) * 100, 1) for k in J}
    return out, moved, notes


if __name__ == '__main__':
    J, moved, notes = fit(Glb(sys.argv[1]))
    json.dump(J, open(sys.argv[2], 'w'), indent=1)
    for k, v in J.items():
        print(f'{k:14s} {v}  moved {moved[k]} cm {notes.get(k, "")}')
