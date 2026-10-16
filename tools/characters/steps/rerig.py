"""rerig: our skeleton on a Meshy model, only when a Review flags Meshy's rig (Rei: "model good, rig terrible"); new
models otherwise keep Meshy's own rig. Lifted from art/candidates/rei-rig-2/rerig2.py, with weights(), rot_of() and
mat_quat() from rei-rig-1/rerig.py; Rei's piece layout is the default `pieces`.

The game's Meshy skeleton (24 bones) with its joints placed inside the model (a joints file: rei-rig-1/joints.py for
Rei, crowd-pilot-1/joints_gen.py for others), each bone's bind orientation the donor's turned by the smallest
rotation that takes the donor's bone onto this body's, so the donor's clip rotations put the bones in the donor's
directions with this body's own bone lengths; the hips' travel is scaled to the legs. Weights: each piece to its own
bones (head pieces wholly Head; a ponytail Head at the top blending to neck; body and legs by distance to their own
side's bones, smoothed). The mesh, UVs and texture are untouched.

Settings: joints (repo path of the joints JSON), donors ({clip: repo path of a donor clip GLB on the game's
skeleton, e.g. game3d/assets/characters/emi/walk.glb}), pieces ({body, legs, head: [..], tail}, default Rei's).
Writes build/rerig/<clip>.glb and <clip>-rig.json.
"""
import json, os
import numpy as np
from common import MAIN
from glbio import Glb, pieces

ROLES = {'body': 0, 'legs': 1, 'head': [2, 4], 'tail': 3}      # rei-1's piece numbers


SIDE = ('Left', 'Right')


def rot_of(M):
    R = M[:3, :3].copy()
    return R / np.linalg.norm(R, axis=0)


def mat_quat(R):
    t = np.trace(R)
    if t > 0:
        s = 0.5 / np.sqrt(t + 1); w = 0.25 / s
        x, y, z = (R[2, 1] - R[1, 2]) * s, (R[0, 2] - R[2, 0]) * s, (R[1, 0] - R[0, 1]) * s
    else:
        i = int(np.argmax(np.diag(R)))
        if i == 0:
            s = 2 * np.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]); w = (R[2, 1] - R[1, 2]) / s
            x, y, z = 0.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s
        elif i == 1:
            s = 2 * np.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]); w = (R[0, 2] - R[2, 0]) / s
            x, y, z = (R[0, 1] + R[1, 0]) / s, 0.25 * s, (R[1, 2] + R[2, 1]) / s
        else:
            s = 2 * np.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]); w = (R[1, 0] - R[0, 1]) / s
            x, y, z = (R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, 0.25 * s
    q = np.array([x, y, z, w]); return q / np.linalg.norm(q)


def seg_dist(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def weights(V, lab, idx, J, hem=0.40, roles=ROLES):
    """Per-vertex weights {bone: array} (metres). hem: below this height the top also follows the thighs."""
    j = {k: np.array(v) for k, v in J.items()}
    n = len(V)
    segs = {'Hips': (np.array([0, j['LeftUpLeg'][1], j['Hips'][2]]), j['Spine02']), 'Spine02': (j['Spine02'], j['Spine01']),
            'Spine01': (j['Spine01'], j['Spine']), 'Spine': (j['Spine'], j['neck']), 'neck': (j['neck'], j['Head'])}
    for s in SIDE:
        hand_dir = j[s + 'Hand'] - j[s + 'ForeArm']
        toe = j[s + 'ToeBase'] + np.array([0, 0, 0.03])
        segs.update({s + 'Shoulder': (j[s + 'Shoulder'], j[s + 'Arm']), s + 'Arm': (j[s + 'Arm'], j[s + 'ForeArm']),
                     s + 'ForeArm': (j[s + 'ForeArm'], j[s + 'Hand']),
                     s + 'Hand': (j[s + 'Hand'], j[s + 'Hand'] + hand_dir / np.linalg.norm(hand_dir) * 0.07),
                     s + 'UpLeg': (j[s + 'UpLeg'], j[s + 'Leg']), s + 'Leg': (j[s + 'Leg'], j[s + 'Foot']),
                     s + 'Foot': (j[s + 'Foot'], j[s + 'ToeBase']), s + 'ToeBase': (j[s + 'ToeBase'], toe)})
    D = {b: seg_dist(V, *ab) for b, ab in segs.items()}
    W = {b: np.zeros(n) for b in segs}
    W['Head'] = np.zeros(n)

    def side_ok(b, x):
        if b.startswith('Left'):
            return x > -0.01
        if b.startswith('Right'):
            return x < 0.01
        return np.ones_like(x, bool)
    for piece, bones in ((roles['legs'], ['Hips'] + [s + k for s in SIDE for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase')]),
                         (roles['body'], ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck'] +
                          [s + k for s in SIDE for k in ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg')])):
        m = lab == piece
        x = V[:, 0]
        raw = {}
        for b in bones:
            w = 1 / (D[b] + 0.004) ** 6
            ok = side_ok(b, x)
            if b.replace('Left', '').replace('Right', '') in ('Arm', 'ForeArm', 'Hand'):
                ok &= np.abs(x) > 0.06                          # the arms never pull the chest
            if piece == roles['body'] and b.endswith('UpLeg'):
                ok &= V[:, 1] < hem                             # the hem only
                w = w * 0.35
            raw[b] = np.where(m & ok, w, 0)
        tot = sum(raw.values())
        for b in bones:
            W[b] += np.where(m, raw[b] / np.maximum(tot, 1e-30), 0)
    W['Head'] += np.isin(lab, roles['head'])
    pony = lab == roles['tail']
    t = np.clip((V[:, 1] - 0.45) / 0.35, 0, 1)
    W['Head'] += np.where(pony, t, 0)
    W['neck'] += np.where(pony, 1 - t, 0)
    # smooth twice over the welded surface, inside each piece (seams carry duplicate vertices)
    key = {}
    rep = np.array([key.setdefault(tuple(np.round(v, 4)), i) for i, v in enumerate(V)])
    nb = [set() for _ in range(n)]
    for tri in rep[idx]:
        for a in tri:
            nb[a].update(tri)
    names = list(W)
    A = np.stack([W[b] for b in names], 1)
    smooth = (lab == roles['body']) | (lab == roles['legs'])
    for _ in range(2):
        Ar = A[rep]
        B = np.array([Ar[list(nb[rep[i]])].mean(0) if smooth[i] else A[i] for i in range(n)])
        A = 0.5 * A + 0.5 * B
    A /= A.sum(1, keepdims=True)
    return names, A


MAIN_CHILD = {'Hips': 'Spine02', 'Spine02': 'Spine01', 'Spine01': 'Spine', 'Spine': 'neck', 'neck': 'Head',
              'Head': 'head_end'}
for s in ('Left', 'Right'):
    MAIN_CHILD.update({s + 'Shoulder': s + 'Arm', s + 'Arm': s + 'ForeArm', s + 'ForeArm': s + 'Hand',
                       s + 'UpLeg': s + 'Leg', s + 'Leg': s + 'Foot', s + 'Foot': s + 'ToeBase'})


def turn(a, b):
    """The smallest rotation taking direction a onto b (3x3)."""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v, c = np.cross(a, b), float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def rerig(rei_p, donor_p, joints_p, out_p, roles=ROLES):
    g, dn = Glb(rei_p), Glb(donor_p)
    J = json.load(open(joints_p))
    J = J.get('joints', J)
    V, lab, idx = pieces(g)
    names, A = weights(V, lab, idx, J, roles=roles)

    S = g.local(g.node('Armature'))
    dj, dibm = dn.skin()
    Sd = dn.local(dn.node('Armature'))
    dbind = {dn.names[j]: np.linalg.inv(Sd) @ np.linalg.inv(dibm[k]) for k, j in enumerate(dj)}
    joints, _ = g.skin()
    jn = [g.names[j] for j in joints]
    par = g.parents()
    # the correction per bone: donor bone direction -> Rei's (leaves take their parent's)
    C, turned = {}, {}
    for n in jn:  # parents come before children in the joint list
        if n in MAIN_CHILD:
            c = MAIN_CHILD[n]
            C[n] = turn(dbind[c][:3, 3] - dbind[n][:3, 3], np.array(J[c]) - np.array(J[n]))
            turned[n] = round(float(np.degrees(np.arccos(np.clip((np.trace(C[n]) - 1) / 2, -1, 1)))), 1)
        else:
            C[n] = C[g.names[par[g.node(n)]]]
    newA = {}
    for n in jn:
        M = np.eye(4); M[:3, :3] = C[n] @ rot_of(dbind[n]); M[:3, 3] = np.array(J[n]) * 100
        newA[n] = M
    for k, n in enumerate(jn):
        i = joints[k]
        p = g.names[par[i]]
        L = newA[n] if p == 'Armature' else np.linalg.inv(newA[p]) @ newA[n]
        nd = g.j['nodes'][i]
        nd['translation'] = L[:3, 3].tolist()
        nd['rotation'] = mat_quat(L[:3, :3]).tolist()
        nd.pop('scale', None)
    ibm = np.stack([np.linalg.inv(S @ newA[n]) for n in jn])
    g.j['skins'][0]['inverseBindMatrices'] = g.add(ibm.transpose(0, 2, 1).reshape(-1, 16), 'MAT4')
    order = np.argsort(-A, 1)[:, :4]
    Wt = np.take_along_axis(A, order, 1)
    Wt /= Wt.sum(1, keepdims=True)
    Jt = np.vectorize(lambda c: jn.index(names[c]))(order)
    at = g.prim()['attributes']
    at['JOINTS_0'] = g.add(Jt, 'VEC4', 5123)
    at['WEIGHTS_0'] = g.add(Wt, 'VEC4', 5126)
    # the donor's clip by bone name: rotations as they are; bone offsets Rei's; the hips' travel scaled to her legs
    leg = J['Hips'][1] / (dbind['Hips'][1, 3] / 100)
    da = dn.j['animations'][0]
    samplers, channels = [], []
    for c in da['channels']:
        name = dn.names[c['target']['node']]
        if name not in g.names:
            continue
        s = da['samplers'][c['sampler']]
        inp = dn.acc(s['input'])
        out = dn.acc(s['output']).astype(np.float64)
        path = c['target']['path']
        node = g.node(name)
        if path == 'translation':
            if name == 'Hips':
                out = np.array(J['Hips']) * 100 + (out - dbind['Hips'][:3, 3]) * leg
            else:
                out = np.tile(g.j['nodes'][node]['translation'], (len(out), 1))
        samplers.append({'input': g.add(inp, 'SCALAR', minmax=True), 'output': g.add(out, 'VEC3' if path != 'rotation' else 'VEC4'),
                         'interpolation': s.get('interpolation', 'LINEAR')})
        channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': path}})
    g.j['animations'] = [{'name': da.get('name', 'clip'), 'samplers': samplers, 'channels': channels}]
    g.save(out_p)
    json.dump({'joints': J, 'donor': donor_p, 'hips_travel_scale': leg, 'turned_deg': turned},
              open(out_p.rsplit('.', 1)[0] + '-rig.json', 'w'), indent=1)
    print('wrote', out_p, 'turned', turned)


def run(ctx, o):
    d = ctx.path('build', 'rerig')
    os.makedirs(d, exist_ok=True)
    roles = {**ROLES, **o.get('pieces', {})}
    joints = os.path.join(MAIN, o['joints'])
    model = ctx.files['rigged']
    out = {}
    for clip, donor in o['donors'].items():
        out[clip] = os.path.join(d, f'{clip}.glb')
        rerig(model, os.path.join(MAIN, donor), joints, out[clip], roles)
    ctx.files['clips'] = out
    ctx.files['rigged'] = out.get('walk') or next(iter(out.values()))
