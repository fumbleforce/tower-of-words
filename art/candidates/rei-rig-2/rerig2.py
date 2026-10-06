"""Rei's rig, fixed (follow-up to Review rei-meshy-1, #271). Round 1's rig (rei-rig-1/rerig.py) gave each of her bones
the donor's (Emi's) bind orientation and played Emi's clip rotations on them. A clip rotation turns the bone's own
offset to its child, and Rei's offsets point elsewhere than Emi's: at rest her thighs lean back 9 degrees where Emi's
lean forward 14, so the same walk swung her legs about 23 degrees further back (the crowd-pilot-2 probe: planted-foot
slip 0.81 against the cast's 0.14 to 0.20, thighs out 19 degrees against 8).

Here each bone's bind orientation is the donor's turned by the smallest rotation that takes the donor's bone (joint
to its main child) onto Rei's. Then Rei's offset to that child, in the bone's own frame, points exactly as Emi's does,
so Emi's clip rotations put her bones in Emi's directions, with Rei's own bone lengths: the walk, run and sit play on
her as on Emi. A bone with no child (hands, toes, the head's end points) turns with its parent. The joints are round
1's (placed inside her mesh), the weights are round 1's (rerig.weights: the ponytail on the head at the top, blending
to the neck lower down), and her mesh, UVs and texture are untouched.

  python3 art/candidates/rei-rig-2/rerig2.py <rei rigged glb> <donor clip glb> <joints json> <out glb>
"""
import json, os, sys
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb
from joints import pieces
from rerig import weights, rot_of, mat_quat

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


def main():
    rei_p, donor_p, joints_p, out_p = sys.argv[1:5]
    g, dn = Glb(rei_p), Glb(donor_p)
    J = json.load(open(joints_p))
    J = J.get('joints', J)
    V, lab, idx = pieces(g)
    names, A = weights(V, lab, idx, J)

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


if __name__ == '__main__':
    main()
