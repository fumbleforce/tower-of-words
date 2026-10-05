"""Kenji round 3 (Review kenji-meshy-1): new skin weights on Meshy's rig. Jørgen on kenji-2: "his model is a bit
broken". Meshy's auto-rig put his whole torso and belly on the two thigh bones (almost nothing on the spine) and his
tie on the thighs, `headfront` and Head, so his body swung in halves with his legs. The skeleton Meshy placed is
right, so it and the clips stay; only the weights change:
  body: Blender's bone-heat weights (heat_bl.py) on a welded copy of the mesh (the seams' duplicate vertices made one
        point), copied back to every vertex at that point; above the hip joints the thighs' share fades out over 5 cm
        into Hips (heat still gave the sides of his belly to the thighs);
  hair: wholly Head;
  tie:  the weights of the shirt right behind it (the four nearest front-of-body vertices), so it moves with his chest.
The mesh, UVs, texture, skeleton and clips are as Meshy made them.

  python3 art/candidates/kenji-meshy-3/reweight.py <in.glb> <out.glb> [<in.glb> <out.glb> ...]
(all inputs share one mesh: the rigged model and Meshy's walk, run and sit files; the weights come from the first)
"""
import os, subprocess, sys, tempfile
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../rei-rig-1'))
from glbio import Glb
from joints import pieces

LEAF = ('headfront', 'head_end')


def heat_weights(g):
    V, lab, idx = pieces(g)
    joints, ibm = g.skin()
    names = [g.names[j] for j in joints]
    pos = np.array([np.linalg.inv(m)[:3, 3] for m in ibm])
    par = g.parents()
    parent = np.array([joints.index(par[j]) if par.get(j) in joints else -1 for j in joints])
    deform = np.array([n not in LEAF for n in names], int)
    key = {}
    rep = np.array([key.setdefault(tuple(np.round(v, 5)), len(key)) for v in V])
    U = np.zeros((len(key), 3))
    U[rep] = V
    F = rep[idx]
    F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    with tempfile.TemporaryDirectory() as tmp:
        np.savez(f'{tmp}/in.npz', V=U, F=F, names=np.array(names), pos=pos, parent=parent, deform=deform)
        r = subprocess.run(['blender', '-b', '-P', os.path.join(HERE, 'heat_bl.py'), '--', f'{tmp}/in.npz', f'{tmp}/w.npy'],
                           capture_output=True, text=True)
        print([l for l in r.stdout.splitlines() if 'HEAT' in l or 'rror' in l or 'failed' in l.lower()])
        W = np.load(f'{tmp}/w.npy')[rep].astype(np.float64)
    # the belly above the hip joints goes with the pelvis, not the thighs
    jy = {n: p[1] for n, p in zip(names, pos)}
    y0 = (jy['LeftUpLeg'] + jy['RightUpLeg']) / 2
    f = np.clip(1 - (V[:, 1] - y0) / 0.05, 0, 1)
    for s in ('LeftUpLeg', 'RightUpLeg'):
        k = names.index(s)
        moved = W[:, k] * (1 - f) * (lab == 0)
        W[:, k] -= moved
        W[:, names.index('Hips')] += moved
    return V, lab, names, W


def apply(g, V, lab, names, W):
    hair = max(range(1, lab.max() + 1), key=lambda k: V[lab == k][:, 1].mean())
    tie = [k for k in range(1, lab.max() + 1) if k != hair]
    W = W.copy()
    W[lab == hair] = 0
    W[lab == hair, names.index('Head')] = 1
    body = np.where((lab == 0) & (V[:, 2] > 0.02) & (V[:, 1] < 0.72))[0]
    for k in tie:
        for i in np.where(lab == k)[0]:
            d = np.hypot(V[body, 0] - V[i, 0], V[body, 1] - V[i, 1]) + 0.3 * np.abs(V[body, 2] - V[i, 2])
            W[i] = W[body[np.argsort(d)[:4]]].mean(0)
    empty = W.sum(1) == 0
    if empty.any():
        print('no weight from heat:', int(empty.sum()), 'vertices; nearest weighted vertex used')
        ok = np.where(~empty)[0]
        for i in np.where(empty)[0]:
            W[i] = W[ok[np.argmin(np.linalg.norm(V[ok] - V[i], axis=1))]]
    W /= W.sum(1, keepdims=True)
    order = np.argsort(-W, 1)[:, :4]
    Wn = np.take_along_axis(W, order, 1)
    Wn /= Wn.sum(1, keepdims=True)
    a = g.prim()['attributes']
    a['JOINTS_0'] = g.add(order, 'VEC4', 5123)
    a['WEIGHTS_0'] = g.add(Wn, 'VEC4', 5126)
    return W


def main():
    args = sys.argv[1:]
    first = Glb(args[0])
    V, lab, names, W = heat_weights(first)
    for i in range(0, len(args), 2):
        g = Glb(args[i])
        assert [g.names[j] for j in g.skin()[0]] == names, 'different joint order'
        assert np.array_equal(g.acc(g.prim()['attributes']['POSITION']), first.acc(first.prim()['attributes']['POSITION']))
        Wf = apply(g, V, lab, names, W)
        g.save(args[i + 1])
    body = Wf[lab == 0]
    share = body.sum(0) / len(body)
    print('body weight shares:', {n: round(float(s), 3) for s, n in sorted(zip(share, names), reverse=True)[:8]})


if __name__ == '__main__':
    main()
