"""Carina's rig, made as Rei's was (art/candidates/rei-rig-1, Review rei-meshy-1 option rei-1-rig2): her Meshy model
unchanged (vertices, UVs, normals and texture), the game's Meshy skeleton with Emi's bone orientations, so Emi's
Meshy walk, run and Chair_Sit_Idle_F play on her as on Emi, and the joints placed inside her own mesh.

Rei's rerig.py does the skeleton, weights and clips; only these are Carina's, per shape (carina-1 from the round-6
picture, carina-2 from Jørgen's approved render):
  - her pieces, relabelled to Rei's numbering (0 top with arms, hands and neck; 1 legs with shoes; 2 head, hair and
    eyes; she has no ponytail or hair tie);
  - the joints, from slices of her own mesh: the middle of each trouser leg, of the top between the arms, of each
    sleeve, left and right mirrored. Her left is +x (image right in a front view). Metres, front +z;
  - the hem: below it the top also follows the thighs.
carina-2's arms hang steeply, so its sleeves are sliced along y (carina-1's along x).

  python3 art/candidates/carina-meshy-1/rig.py <rigged glb> <donor clip glb> <out glb> [model=carina-2]
  python3 art/candidates/carina-meshy-1/rig.py joints <rigged glb> <out joints.json> [model=carina-2]
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
import joints as rj  # noqa: E402
import rerig  # noqa: E402
from glbio import Glb  # noqa: E402


def mid(P, axis, at, band=0.006):
    s = P[np.abs(P[:, axis] - at) < band]
    return (s.min(0) + s.max(0)) / 2


def mirror(J, names):
    for k in names:
        l, r = np.array(J['Left' + k]), np.array(J['Right' + k])
        m = (l + r) / 2; x = (l[0] - r[0]) / 2
        J['Left' + k] = [x, m[1], m[2]]; J['Right' + k] = [-x, m[1], m[2]]


def legs_spine_head(J, torso, legs, head, h, ank_at):
    """h: heights (UpLeg, Leg, Foot, Hips, Spine02, Spine01, Spine, neck, Head) for this shape; ank_at: where the
    leg is sliced for the ankle's middle (above the shoe)."""
    up_y, knee_y, ank_y, hip_y, s2, s1, s0, nk, hd = h
    for s, sg in (('Left', 1), ('Right', -1)):
        L = legs[legs[:, 0] * sg > 0]
        up, knee, ank = mid(L, 1, up_y), mid(L, 1, knee_y), mid(L, 1, ank_at)
        J[s + 'UpLeg'] = [up[0], up_y, up[2]]
        J[s + 'Leg'] = [knee[0], knee_y, knee[2]]
        J[s + 'Foot'] = [ank[0], ank_y, ank[2]]
        shoe = L[L[:, 1] < 0.04]
        J[s + 'ToeBase'] = [ank[0], 0.02, shoe[:, 2].max() - 0.04]
    body = torso[np.abs(torso[:, 0]) < 0.05]
    J['Hips'] = [0.0, hip_y, mid(body, 1, hip_y + 0.005)[2]]
    for n, y in (('Spine02', s2), ('Spine01', s1), ('Spine', s0), ('neck', nk)):
        J[n] = [0.0, y, mid(body, 1, y)[2]]
    J['Head'] = [0.0, hd, J['neck'][2]]
    J['head_end'] = [0.0, float(head[:, 1].max()), J['neck'][2]]
    J['headfront'] = [0.0, hd, float(head[:, 2].max())]


def fit1(V, lab):
    torso, legs, head = V[lab == 0], V[lab == 1], V[lab == 2]
    J = {}
    legs_spine_head(J, torso, legs, head, (0.42, 0.24, 0.075, 0.465, 0.51, 0.555, 0.60, 0.648, 0.695), 0.08)
    for s, sg in (('Left', 1), ('Right', -1)):
        A = torso[torso[:, 0] * sg > 0.10]
        # the sleeve's middle line in its upper part (x 0.12-0.20), carried back to the shoulder; the forearm's
        # (x 0.20-0.26) for the wrist
        def line(xs, A=A, sg=sg):
            C = np.array([mid(A, 0, sg * x) for x in xs])
            return np.polyfit(xs, C[:, 1], 1), np.polyfit(xs, C[:, 2], 1)
        (uy, uz), (fy, fz) = line(np.array([0.12, 0.14, 0.16, 0.18, 0.20])), line(np.array([0.20, 0.22, 0.24, 0.26]))
        at = lambda x, ky, kz, sg=sg: [sg * x, float(np.polyval(ky, x)), float(np.polyval(kz, x))]
        J[s + 'Arm'] = at(0.085, uy, uz); J[s + 'Arm'][2] = J['Spine'][2]
        J[s + 'Shoulder'] = [sg * 0.025, J[s + 'Arm'][1] + 0.01, J['Spine'][2]]
        J[s + 'ForeArm'] = at(0.18, uy, uz)
        J[s + 'Hand'] = at(0.265, fy, fz)
    mirror(J, ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Shoulder', 'Arm', 'ForeArm', 'Hand'))
    return J


def fit2(V, lab, hands):
    torso, legs, head = V[lab == 0], V[lab == 1], V[lab == 2]
    J = {}
    legs_spine_head(J, torso, legs, head, (0.37, 0.22, 0.08, 0.40, 0.44, 0.48, 0.525, 0.575, 0.635), 0.14)
    for s, sg in (('Left', 1), ('Right', -1)):
        # the sleeve below the armpit, apart from the body (x beyond 0.09), sliced along y; its middle line carried
        # up to the shoulder and down to the cuff; the wrist at the top of the hand piece
        A = torso[torso[:, 0] * sg > 0.09]
        ys = np.array([0.40, 0.42, 0.44, 0.46])
        C = np.array([mid(A, 1, y) for y in ys])
        kx, kz = np.polyfit(ys, C[:, 0], 1), np.polyfit(ys, C[:, 2], 1)
        at = lambda y, sg=sg: [float(np.polyval(kx, y)), y, float(np.polyval(kz, y))]
        H = hands[s]
        top = H[H[:, 1] > H[:, 1].max() - 0.02]
        w = (top.min(0) + top.max(0)) / 2
        J[s + 'Arm'] = [sg * 0.085, 0.535, J['Spine'][2]]
        J[s + 'Shoulder'] = [sg * 0.025, 0.545, J['Spine'][2]]
        J[s + 'ForeArm'] = at(0.44)
        J[s + 'Hand'] = [float(w[0]), float(H[:, 1].max()) - 0.005, float(w[2])]
    mirror(J, ('UpLeg', 'Leg', 'Foot', 'ToeBase', 'Shoulder', 'Arm', 'ForeArm', 'Hand'))
    return J


# Meshy's piece order on each shape (biggest first) -> Rei's numbering
MODELS = {
    'carina-1': {'relabel': {0: 2, 1: 0, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2}, 'hem': 0.44, 'fit': lambda V, lab, raw: fit1(V, lab)},
    'carina-2': {'relabel': {0: 2, 1: 0, 2: 2, 3: 1, 4: 1, 5: 1, 6: 0, 7: 0, 8: 0}, 'hem': 0.42,
                 'fit': lambda V, lab, raw: fit2(V, lab, {'Left': V[raw == 6], 'Right': V[raw == 7]})},
}
M = MODELS['carina-2']


def pieces(g):
    V, raw, idx = rj.pieces(g)
    return V, np.array([M['relabel'][k] for k in raw]), idx


def joints_for(path):
    V, raw, idx = rj.pieces(Glb(path))
    lab = np.array([M['relabel'][k] for k in raw])
    P, pl = rj.dense(V, lab, idx)
    _, praw = rj.dense(V, raw, idx)
    J = M['fit'](P, pl, praw)
    return {k: [round(float(c), 4) for c in v] for k, v in J.items()}


rerig.pieces = pieces
_weights = rerig.weights
rerig.weights = lambda V, lab, idx, J: _weights(V, lab, idx, J, hem=M['hem'])

if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('model=')]
    for a in sys.argv[1:]:
        if a.startswith('model='):
            M = MODELS[a.split('=', 1)[1]]
    if args[0] == 'joints':
        J = joints_for(args[1])
        json.dump(J, open(args[2], 'w'), indent=1)
        for k, v in J.items():
            print(f'{k:14s} {v}')
    else:
        src, donor, out = args[:3]
        jp = out.rsplit('.', 1)[0] + '-joints.json'
        json.dump(joints_for(src), open(jp, 'w'), indent=1)
        sys.argv = [sys.argv[0], src, donor, out, jp]
        rerig.main()
