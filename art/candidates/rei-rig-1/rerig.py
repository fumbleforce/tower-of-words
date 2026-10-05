"""Rei's new rig (Review rei-meshy-1; Jørgen on rei-1: "model good, rig terrible"). No new Meshy generation: her
model stays exactly as Meshy made it (the same vertices, UVs, normals and texture, byte for byte), and only the
skeleton, the skin weights and the clips change.

Skeleton: the game's Meshy skeleton (the same 24 bones, names and parenting as Kuro, Aoi, Emi and the staff), with
the bone orientations of a donor rig that plays straight in the game (Emi's), and the joints placed inside Rei's own
body (joints.py). Because the bones are oriented as the donor's, the donor's Meshy clips (walk, run, Chair_Sit_Idle_F)
play on Rei with the same motion: only the bone offsets differ, and the hips' travel is scaled to her leg length. The
approved idle is baked on afterwards from this rig, as for the others (staff-meshy-1/install.sh).

Weights: each piece of the mesh goes to its own bones. Head and hair tie: Head. Ponytail: Head at the top, blending
to neck lower down, so it turns with her head and hangs from her neck. Legs and jacket: distance to the bones of
their own side (her left is +x), smoothed over the surface; the jacket's hem also follows the thighs a little.

  python3 art/candidates/rei-rig-1/rerig.py <rei rigged glb> <donor clip glb> <out glb> [joints.json]
"""
import json, sys
import numpy as np
from glbio import Glb, compose
from joints import pieces, dense, fit

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


def weights(V, lab, idx, J, hem=0.40):
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
    for piece, bones in ((1, ['Hips'] + [s + k for s in SIDE for k in ('UpLeg', 'Leg', 'Foot', 'ToeBase')]),
                         (0, ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck'] +
                          [s + k for s in SIDE for k in ('Shoulder', 'Arm', 'ForeArm', 'Hand', 'UpLeg')])):
        m = lab == piece
        x = V[:, 0]
        raw = {}
        for b in bones:
            w = 1 / (D[b] + 0.004) ** 6
            ok = side_ok(b, x)
            if b.replace('Left', '').replace('Right', '') in ('Arm', 'ForeArm', 'Hand'):
                ok &= np.abs(x) > 0.06                          # the arms never pull the chest
            if piece == 0 and b.endswith('UpLeg'):
                ok &= V[:, 1] < hem                             # the hem only
                w = w * 0.35
            raw[b] = np.where(m & ok, w, 0)
        tot = sum(raw.values())
        for b in bones:
            W[b] += np.where(m, raw[b] / np.maximum(tot, 1e-30), 0)
    W['Head'] += (lab == 2) | (lab == 4)
    pony = lab == 3
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
    smooth = (lab == 0) | (lab == 1)
    for _ in range(2):
        Ar = A[rep]
        B = np.array([Ar[list(nb[rep[i]])].mean(0) if smooth[i] else A[i] for i in range(n)])
        A = 0.5 * A + 0.5 * B
    A /= A.sum(1, keepdims=True)
    return names, A


def main():
    rei_p, donor_p, out_p = sys.argv[1:4]
    g = Glb(rei_p)
    dn = Glb(donor_p)
    V, lab, idx = pieces(g)
    J = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else fit(*dense(V, lab, idx))
    names, A = weights(V, lab, idx, J)

    # donor bind frames (armature space, cm) from its inverse bind matrices
    S = g.local(g.node('Armature'))
    dj, dibm = dn.skin()
    Sd = dn.local(dn.node('Armature'))
    dbind = {dn.names[j]: np.linalg.inv(Sd) @ np.linalg.inv(dibm[k]) for k, j in enumerate(dj)}
    # Rei's new bind frames: the donor's orientation at Rei's joint, in cm
    joints, _ = g.skin()
    jn = [g.names[j] for j in joints]
    par = g.parents()
    newA = {}
    for n in jn:
        M = np.eye(4); M[:3, :3] = rot_of(dbind[n]); M[:3, 3] = np.array(J[n]) * 100
        newA[n] = M
    # node rest TRS: local = inv(parent) @ own (Hips' parent is the Armature)
    for k, n in enumerate(jn):
        i = joints[k]
        p = g.names[par[i]]
        L = newA[n] if p == 'Armature' else np.linalg.inv(newA[p]) @ newA[n]
        nd = g.j['nodes'][i]
        nd['translation'] = L[:3, 3].tolist()
        nd['rotation'] = mat_quat(L[:3, :3]).tolist()
        nd.pop('scale', None)
    # inverse bind matrices (metres, column-major): IBM = inv(S @ A)
    ibm = np.stack([np.linalg.inv(S @ newA[n]) for n in jn])
    g.j['skins'][0]['inverseBindMatrices'] = g.add(ibm.transpose(0, 2, 1).reshape(-1, 16), 'MAT4')
    # weights: the top four per vertex
    col = {b: c for c, b in enumerate(names)}
    order = np.argsort(-A, 1)[:, :4]
    Wt = np.take_along_axis(A, order, 1)
    Wt /= Wt.sum(1, keepdims=True)
    Jt = np.vectorize(lambda c: jn.index(names[c]))(order)
    at = g.prim()['attributes']
    at['JOINTS_0'] = g.add(Jt, 'VEC4', 5123)
    at['WEIGHTS_0'] = g.add(Wt, 'VEC4', 5126)
    # the donor's clip, onto Rei's nodes by name; bone offsets are Rei's, the hips' travel scaled to her legs
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
    json.dump({'joints': J, 'donor': donor_p, 'hips_travel_scale': leg}, open(out_p.rsplit('.', 1)[0] + '-rig.json', 'w'), indent=1)
    print('wrote', out_p, 'hips travel x', round(leg, 3))


if __name__ == '__main__':
    main()
