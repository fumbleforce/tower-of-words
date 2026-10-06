"""New skin weights on Meshy's own rig (Review crowd-pilot-2), as Kenji's round 3 mended his (kenji-meshy-3/reweight.py),
made general for any piece layout. Meshy's auto-rig weights on round 1's B put her shins on the thigh bones (her
knees could not bend; the shoes slid with the thighs) and her jacket's waist on the thighs. The skeleton Meshy placed
and Meshy's walk, run and sit clips stay exactly as they are; only the weights change:
  body:   Blender's bone heat (kenji-meshy-3/heat_bl.py, through crowd-pilot-1/rerig_gen.py's heat(): welded mesh,
          small loose shells take the nearest body vertex's weights); above the hip joints the thighs' share fades
          into Hips over 5 cm (Kenji's fix);
  head:   any piece whose middle is more than 3 cm above the neck joint (hair, bun, the head itself) wholly on Head.
The mesh, UVs, texture, skeleton and clips are untouched.

  python3 art/candidates/crowd-pilot-2/reweight.py <in.glb> <out.glb> [<in.glb> <out.glb> ...]
(all inputs share one mesh and skeleton: Meshy's rigged model and its walk, run and sit files; weights from the first)
"""
import importlib.util, json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../rei-rig-1'))
from glbio import Glb
from joints import pieces

spec = importlib.util.spec_from_file_location('rerig_gen', os.path.join(HERE, '../crowd-pilot-1/rerig_gen.py'))
rg = importlib.util.module_from_spec(spec)
sys.path.insert(0, os.path.join(HERE, '../crowd-pilot-1'))
spec.loader.exec_module(rg)


def weights(g):
    V, lab, idx = pieces(g)
    joints, ibm = g.skin()
    names = [g.names[j] for j in joints]
    par = g.parents()
    J = {n: np.linalg.inv(m)[:3, 3] for n, m in zip(names, ibm)}
    par_names = [g.names[par[j]] if par.get(j) is not None else '' for j in joints]
    W = rg.heat(V, idx, names, J, par_names, lab)
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


def main():
    args = sys.argv[1:]
    first = Glb(args[0])
    V, lab, names, W, head = weights(first)
    for i in range(0, len(args), 2):
        g = Glb(args[i])
        assert [g.names[j] for j in g.skin()[0]] == names, 'different joint order'
        assert np.array_equal(g.acc(g.prim()['attributes']['POSITION']), first.acc(first.prim()['attributes']['POSITION']))
        apply(g, W)
        g.save(args[i + 1])
        print('wrote', args[i + 1])
    share = W.sum(0) / len(W)
    rep = {'pieces_on_head': head, 'weight_share': {n: round(float(s), 3) for s, n in sorted(zip(share, names), reverse=True)}}
    json.dump(rep, open(args[1].rsplit('.', 1)[0] + '-weights.json', 'w'), indent=1)
    print(json.dumps(rep)[:600])


if __name__ == '__main__':
    main()
