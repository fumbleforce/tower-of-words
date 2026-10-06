"""Meshy's own clips on round 2's model (reviews/carina-meshy-1, the Meshy-rig check). carina-2r2-*.glb is Meshy's
auto-rigged file after the Blender edits (fix_bl.py): Meshy's skeleton, the edited mesh and texture, no clip. Meshy's
walk, run and Chair_Sit_Idle_F were made on that same skeleton (the same joints, names and bind matrices), so each
clip is copied onto it unchanged, channel by channel, by bone name. The skin weights are mended afterwards
(crowd-pilot-2/reweight.py).
  python3 art/candidates/carina-meshy-1/clips.py <model glb> <Meshy clip glb> <out glb>
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../rei-rig-1'))
from glbio import Glb

model_p, clip_p, out_p = sys.argv[1:4]
g, c = Glb(model_p), Glb(clip_p)
gj, gi = g.skin(); cj, ci = c.skin()
gn, cn = [g.names[j] for j in gj], [c.names[j] for j in cj]    # Blender's export lists the joints in its own order
assert sorted(gn) == sorted(cn), 'different skeleton'
assert max(np.abs(gi[k] - ci[cn.index(n)]).max() for k, n in enumerate(gn)) < 1e-3, 'different bind pose'
for n in [g.names[j] for j in gj]:                         # the rest pose too, so the clip's untouched bones agree
    a, b = g.j['nodes'][g.node(n)], c.j['nodes'][c.node(n)]
    for k in ('translation', 'rotation', 'scale'):
        if k in b:
            a[k] = b[k]
        else:
            a.pop(k, None)
ca = c.j['animations'][0]
samplers, channels = [], []
for ch in ca['channels']:
    name = c.names[ch['target']['node']]
    if name not in g.names:
        continue
    s = ca['samplers'][ch['sampler']]
    path = ch['target']['path']
    samplers.append({'input': g.add(c.acc(s['input']), 'SCALAR', minmax=True),
                     'output': g.add(c.acc(s['output']), 'VEC4' if path == 'rotation' else 'VEC3'),
                     'interpolation': s.get('interpolation', 'LINEAR')})
    channels.append({'sampler': len(samplers) - 1, 'target': {'node': g.node(name), 'path': path}})
g.j['animations'] = [{'name': ca.get('name', 'clip'), 'samplers': samplers, 'channels': channels}]
g.save(out_p)
print('wrote', out_p, len(channels), 'channels')
