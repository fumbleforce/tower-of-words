"""reweight: new skin weights on Meshy's own rig, only when a Review flags the weights (Meshy put Kenji's belly and
B's shins on the thighs). Lifted unchanged from art/candidates/crowd-pilot-2/reweight.py (the general form of
kenji-meshy-3/reweight.py), with heat() from crowd-pilot-1/rerig_gen.py. The skeleton Meshy placed and Meshy's walk,
run and sit stay exactly as they are; only the weights change:
  body:   Blender's bone heat (heat_bl.py) on a welded copy of the mesh, small loose shells (under 60 vertices) taking
          the nearest body vertex's weights; above the hip joints the thighs' share fades into Hips over 5 cm;
  head:   any piece whose middle is more than 3 cm above the neck joint (hair, bun, the head itself) wholly on Head;
  shoes:  the toe bones' share goes to the foot, so each shoe moves as one with its ankle.
The mesh, UVs, texture, skeleton and clips are untouched. Writes build/rig/<rigged, walk, run, ...>.glb and
build/rig/rigged-weights.json (the pieces put on the head and each bone's share). No settings.
"""
import json, os, tempfile
import numpy as np
from common import blender
from glbio import Glb, pieces

HERE = os.path.dirname(os.path.abspath(__file__))
LEAF = ('headfront', 'head_end')


SMALL = 60
HEAT = os.path.join(HERE, 'heat_bl.py')


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
        out = blender(HEAT, [f'{tmp}/in.npz', f'{tmp}/w.npy'], 'character-build-reweight')
        print([l for l in out.splitlines() if 'HEAT' in l or 'rror' in l or 'failed' in l.lower()])
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


def weights(g):
    V, lab, idx = pieces(g)
    joints, ibm = g.skin()
    names = [g.names[j] for j in joints]
    par = g.parents()
    J = {n: np.linalg.inv(m)[:3, 3] for n, m in zip(names, ibm)}
    par_names = [g.names[par[j]] if par.get(j) is not None else '' for j in joints]
    W = heat(V, idx, names, J, par_names, lab)
    head = []
    for k in range(lab.max() + 1):
        m = lab == k
        if V[m][:, 1].mean() > J['neck'][1] + 0.03:
            W[m] = 0
            W[m, names.index('Head')] = 1
            head.append(k)
    # shoes: heat gave most of A's separate shoe pieces to the toe bones, so the whole shoe would pivot at the ball of
    # the foot; the toes' share goes to the foot, and each shoe moves as one with its ankle
    for s in ('Left', 'Right'):
        t, f = names.index(s + 'ToeBase'), names.index(s + 'Foot')
        W[:, f] += W[:, t]
        W[:, t] = 0
    return V, lab, names, W, head


def apply(g, W):
    order = np.argsort(-W, 1)[:, :4]
    Wn = np.take_along_axis(W, order, 1)
    Wn /= Wn.sum(1, keepdims=True)
    a = g.prim()['attributes']
    a['JOINTS_0'] = g.add(order, 'VEC4', 5123)
    a['WEIGHTS_0'] = g.add(Wn, 'VEC4', 5126)

def run(ctx, o):
    d = ctx.path('build', 'rig')
    os.makedirs(d, exist_ok=True)
    jobs = [('rigged', ctx.files['rigged'])] + list(ctx.files['clips'].items())
    first = Glb(jobs[0][1])
    V, lab, names, W, head = weights(first)
    out = {}
    for name, src in jobs:
        g = Glb(src)
        assert [g.names[j] for j in g.skin()[0]] == names, 'different joint order'
        assert np.array_equal(g.acc(g.prim()['attributes']['POSITION']), first.acc(first.prim()['attributes']['POSITION']))
        apply(g, W)
        out[name] = os.path.join(d, f'{name}.glb')
        g.save(out[name])
        print('wrote', out[name])
    share = W.sum(0) / len(W)
    rep = {'pieces_on_head': head, 'weight_share': {n: round(float(s), 3) for s, n in sorted(zip(share, names), reverse=True)}}
    json.dump(rep, open(os.path.join(d, 'rigged-weights.json'), 'w'), indent=1)
    print(json.dumps(rep)[:600])
    ctx.files['rigged'] = out.pop('rigged')
    ctx.files['clips'].update(out)
