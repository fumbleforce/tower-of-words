"""Place the game's Meshy skeleton (Hips, Spine02, Spine01, Spine, neck, Head ...) inside Rei's own mesh (Review
rei-meshy-1, Jørgen on rei-1: "model good, rig terrible"). Meshy's auto-rig put her spine and left arm inside the
ponytail; here every joint comes from the mesh's own pieces (torso with arms, legs, head, ponytail, hair tie), with the
ponytail and hair tie left out, and left and right kept symmetric. Left and right are hers: her left is +x (image right
in a front view). Metres, the model's own space (front +z, floor y = 0).

  python3 art/candidates/rei-rig-1/joints.py <rigged glb> <out joints.json>
"""
import json, sys
import numpy as np
from glbio import Glb


def pieces(g):
    """Vertex piece labels, biggest first: 0 torso+arms, 1 legs, 2 head, 3 ponytail, 4 hair tie (for Rei)."""
    V = g.acc(g.prim()['attributes']['POSITION']).astype(np.float64)
    idx = g.acc(g.prim()['indices']).reshape(-1, 3)
    par = np.arange(len(V))

    def f(a):
        while par[a] != a:
            par[a] = par[par[a]]; a = par[a]
        return a
    key = {}
    rep = np.array([key.setdefault(tuple(np.round(v, 4)), i) for i, v in enumerate(V)])
    for a, b, c in rep[idx]:
        for x, y in ((a, b), (b, c)):
            ra, rb = f(x), f(y)
            if ra != rb:
                par[ra] = rb
    comp = np.array([f(r) for r in rep])
    u, cnt = np.unique(comp, return_counts=True)
    order = {c: k for k, c in enumerate(u[np.argsort(-cnt)])}
    return V, np.array([order[c] for c in comp]), idx


def dense(V, lab, idx, n=12):
    """Points spread over every triangle (the mesh is low-poly, so slices of the vertices alone come out empty)."""
    a, b = np.meshgrid(np.arange(n + 1), np.arange(n + 1))
    m = a + b <= n
    w = np.c_[a[m], b[m], n - a[m] - b[m]] / n
    P = np.einsum('kc,tcd->tkd', w, V[idx]).reshape(-1, 3)
    return P, np.repeat(lab[idx[:, 0]], len(w))


def centre(P, y, band=0.008):
    s = P[np.abs(P[:, 1] - y) < band]
    return (s.min(0) + s.max(0)) / 2, s


def fit(V, lab):
    torso, legs, head = V[lab == 0], V[lab == 1], V[lab == 2]
    J = {}
    # legs: the middle of each trouser leg at the hip, knee and ankle; the hips joint between them
    side = {'Left': legs[legs[:, 0] > 0], 'Right': legs[legs[:, 0] < 0]}
    for s, L in side.items():
        sg = 1 if s == 'Left' else -1
        up = centre(L[np.abs(L[:, 0]) > 0.015], 0.33)[0]          # just below the crotch
        J[s + 'UpLeg'] = [up[0], 0.36, up[2]]
        J[s + 'Leg'] = list(centre(L, 0.20)[0][:3]); J[s + 'Leg'][1] = 0.20
        an = centre(L, 0.07)[0]
        J[s + 'Foot'] = [an[0], 0.06, an[2]]
        shoe = L[L[:, 1] < 0.04]
        J[s + 'ToeBase'] = [an[0], 0.015, shoe[:, 2].max() - 0.035]
    for s in ('UpLeg', 'Leg', 'Foot', 'ToeBase'):           # symmetric about x = 0
        l, r = np.array(J['Left' + s]), np.array(J['Right' + s])
        m = (l + r) / 2
        x = (l[0] - r[0]) / 2
        J['Left' + s] = [x, m[1], m[2]]; J['Right' + s] = [-x, m[1], m[2]]
    hz = centre(legs, 0.40)[0][2]
    J['Hips'] = [0.0, 0.40, hz]
    # spine: the middle of the jacket between the arms
    body = torso[np.abs(torso[:, 0]) < 0.075]
    for n, y in (('Spine02', 0.45), ('Spine01', 0.50), ('Spine', 0.55), ('neck', 0.595)):
        J[n] = [0.0, y, centre(body, y)[0][2]]
    # head: on the neck line at the chin, the top of the skull, and the face's front
    nz = J['neck'][2]
    hz = (head[:, 2].min() + head[:, 2].max()) / 2
    J['Head'] = [0.0, 0.635, (nz + hz) / 2]
    J['head_end'] = [0.0, head[:, 1].max(), hz]
    J['headfront'] = [0.0, 0.635, head[:, 2].max()]
    # arms: the arm's middle line, from the shoulder to the hand, found from the sleeve's slices along x
    for s in ('Left', 'Right'):
        sg = 1 if s == 'Left' else -1
        A = torso[torso[:, 0] * sg > 0.10]
        def at(x, A=A, sg=sg):
            sl = A[np.abs(A[:, 0] * sg - x) < 0.006]
            return (sl.min(0) + sl.max(0)) / 2
        # the sleeve's middle line past the jacket's flared hem (|x| > 0.16), carried back to the shoulder
        xs = np.array([0.17, 0.19, 0.21, 0.23])
        C = np.array([at(x) for x in xs])
        ky = np.polyfit(xs, C[:, 1], 1)
        kz = np.polyfit(xs, C[:, 2], 1)
        line = lambda x: [sg * x, float(np.polyval(ky, x)), float(np.polyval(kz, x))]
        J[s + 'Arm'] = line(0.085); J[s + 'Arm'][2] = J['Spine'][2]
        J[s + 'Shoulder'] = [sg * 0.025, J[s + 'Arm'][1] + 0.01, J['Spine'][2]]
        J[s + 'ForeArm'] = line(0.155)
        J[s + 'Hand'] = line(0.225)
    for s in ('Shoulder', 'Arm', 'ForeArm', 'Hand'):
        l, r = np.array(J['Left' + s]), np.array(J['Right' + s])
        m = (l + r) / 2; x = (l[0] - r[0]) / 2
        J['Left' + s] = [x, m[1], m[2]]; J['Right' + s] = [-x, m[1], m[2]]
    return {k: [round(float(c), 4) for c in v] for k, v in J.items()}


if __name__ == '__main__':
    g = Glb(sys.argv[1])
    V, lab, idx = pieces(g)
    for k in range(5):
        print(k, (lab == k).sum(), V[lab == k].min(0).round(3), V[lab == k].max(0).round(3))
    J = fit(*dense(V, lab, idx))
    json.dump(J, open(sys.argv[2], 'w'), indent=1)
    for k, v in J.items():
        print(f'{k:14s} {v}')
