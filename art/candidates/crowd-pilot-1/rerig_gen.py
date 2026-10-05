"""Our rig (option a in Review crowd-pilot-1) on a Meshy model, Rei's method (art/candidates/rei-rig-1/rerig.py) made
general. The model stays exactly as Meshy made it (vertices, UVs, texture); the skeleton, weights and clips change:
  skeleton: the game's Meshy skeleton (24 bones, the cast's names and parenting), each joint placed in the model's own
            mesh (joints_gen.py), with the bone orientations of a donor from the cast whose rig plays straight in the
            game (Hamada for the man, Emi for the woman), so the donor's Meshy walk, run and Chair_Sit_Idle_F play on
            it with the same motion; the hips' travel is scaled to the leg length;
  weights:  Blender's bone heat on that skeleton (art/candidates/kenji-meshy-3/heat_bl.py, as Kenji's round 3), on a
            welded copy of the mesh; above the hip joints the thighs' share fades into Hips over 5 cm (Kenji's fix);
            small loose shells (floating eyes and brows) take the weights of the nearest body vertex; shells over the
            neck (hair, bun, hair tie, eyes, brows) go wholly on the head;
  limbs:    each arm and leg bone's donor frame is turned onto the model's own limb line, so the clip's swing lands
            where the donor's does (B's A-pose arms hang 12 degrees lower than Emi's and went into her body).

  python3 art/candidates/crowd-pilot-1/rerig_gen.py <meshy rigged glb> <donor clip glb> <out glb> [joints.json]
"""
import json, os, subprocess, sys, tempfile
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../rei-rig-1'))
from glbio import Glb
from joints import pieces
from rerig import rot_of, mat_quat
import joints_gen

LEAF = ('headfront', 'head_end')
# bone -> the joint pair whose line it follows (the hand follows the forearm)
ALIGN = {'Arm': ('Arm', 'ForeArm'), 'ForeArm': ('ForeArm', 'Hand'), 'Hand': ('ForeArm', 'Hand'),
         'UpLeg': ('UpLeg', 'Leg'), 'Leg': ('Leg', 'Foot')}


def turn(a, b):
    """The smallest rotation taking direction a onto direction b."""
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = a @ b
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)
SMALL = 60
HEAT = os.path.join(HERE, '../kenji-meshy-3/heat_bl.py')


def heat(V, idx, names, J, par_names, lab=None):
    # small loose shells (Meshy's floating eyes and brows, under SMALL vertices) stay out of the heat solve, which
    # fails outright on them, and take the weights of the nearest vertex of the body (as Kenji's tie did)
    sizes = np.bincount(lab) if lab is not None else None
    small = sizes[lab] < SMALL if lab is not None else np.zeros(len(V), bool)
    full_V, full_idx = V, idx
    keep = np.where(~small)[0]
    remap = -np.ones(len(V), int); remap[keep] = np.arange(len(keep))
    idx = remap[idx[np.all(~small[idx], 1)]]
    V = V[keep]
    key = {}
    rep = np.array([key.setdefault(tuple(np.round(v, 5)), len(key)) for v in V])
    U = np.zeros((len(key), 3)); U[rep] = V
    F = rep[idx]
    F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    pos = np.array([J[n] for n in names])
    parent = np.array([names.index(p) if p in names else -1 for p in par_names])
    deform = np.array([n not in LEAF for n in names], int)
    with tempfile.TemporaryDirectory() as tmp:
        np.savez(f'{tmp}/in.npz', V=U, F=F, names=np.array(names), pos=pos, parent=parent, deform=deform)
        r = subprocess.run(['blender', '-b', '-P', HEAT, '--', f'{tmp}/in.npz', f'{tmp}/w.npy'], capture_output=True, text=True)
        print([l for l in r.stdout.splitlines() if 'HEAT' in l or 'rror' in l or 'failed' in l.lower()])
        W = np.load(f'{tmp}/w.npy')[rep].astype(np.float64)
    y0 = (J['LeftUpLeg'][1] + J['RightUpLeg'][1]) / 2
    f = np.clip(1 - (V[:, 1] - y0) / 0.05, 0, 1)
    for s in ('LeftUpLeg', 'RightUpLeg'):
        k = names.index(s)
        moved = W[:, k] * (1 - f)
        W[:, k] -= moved
        W[:, names.index('Hips')] += moved
    empty = W.sum(1) == 0
    if empty.any():
        print('no weight from heat:', int(empty.sum()), 'vertices; nearest weighted vertex used')
        ok = np.where(~empty)[0]
        for i in np.where(empty)[0]:
            W[i] = W[ok[np.argmin(np.linalg.norm(V[ok] - V[i], axis=1))]]
    W = W / W.sum(1, keepdims=True)
    out = np.zeros((len(full_V), W.shape[1])); out[keep] = W
    for i in np.where(small)[0]:
        out[i] = W[np.argmin(np.linalg.norm(V - full_V[i], axis=1))]
    print('small shells', int(len(set(lab[small]))) if lab is not None else 0, 'vertices', int(small.sum()))
    return out


def main():
    src, donor_p, out_p = sys.argv[1:4]
    g, dn = Glb(src), Glb(donor_p)
    V, lab, idx = pieces(g)
    if len(sys.argv) > 4:
        J = json.load(open(sys.argv[4]))
    else:
        J = joints_gen.fit(g)[0]
    joints, _ = g.skin()
    jn = [g.names[j] for j in joints]
    par = g.parents()
    S = g.local(g.node('Armature'))
    dj, dibm = dn.skin()
    Sd = dn.local(dn.node('Armature'))
    dbind = {dn.names[j]: np.linalg.inv(Sd) @ np.linalg.inv(dibm[k]) for k, j in enumerate(dj)}
    newA = {}
    for n in jn:
        R = rot_of(dbind[n])
        # limbs: the donor's frame turned onto this model's own limb line (its A-pose arms may hang at another angle
        # than the donor's; the clip then turns the limb from the donor's line and B's arms ended inside her body)
        k = ALIGN.get(n.replace('Left', '').replace('Right', ''))
        if k:
            side = 'Left' if n.startswith('Left') else 'Right'
            a, b = (side + x for x in k)
            d = dbind[b][:3, 3] - dbind[a][:3, 3]
            m = (np.array(J[b]) - np.array(J[a])) * 100
            R = turn(d, m) @ R
        M = np.eye(4); M[:3, :3] = R; M[:3, 3] = np.array(J[n]) * 100
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
    W = heat(V, idx, jn, J, [g.names[par[j]] for j in joints], lab)
    # shells whose middle is over 3 cm above the neck joint (hair, a bun, a hair tie, eyes, brows) go wholly on the
    # head, as Rei's hair did; heat gave B's bun to her left shoulder and arm, so the run pulled it into her body
    for k in range(lab.max() + 1):
        m = lab == k
        if V[m][:, 1].mean() > J['neck'][1] + 0.03:
            W[m] = 0
            W[m, jn.index('Head')] = 1
    order = np.argsort(-W, 1)[:, :4]
    Wt = np.take_along_axis(W, order, 1)
    Wt /= Wt.sum(1, keepdims=True)
    at = g.prim()['attributes']
    at['JOINTS_0'] = g.add(order, 'VEC4', 5123)
    at['WEIGHTS_0'] = g.add(Wt, 'VEC4', 5126)
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
    share = W.sum(0) / len(W)
    json.dump({'joints': J, 'donor': donor_p, 'hips_travel_scale': leg,
               'weight_share': {n: round(float(s), 3) for s, n in sorted(zip(share, jn), reverse=True)}},
              open(out_p.rsplit('.', 1)[0] + '-rig.json', 'w'), indent=1)
    print('wrote', out_p, 'hips travel x', round(leg, 3))


if __name__ == '__main__':
    main()
