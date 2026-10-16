"""head-scale and recolour: the only edits a generated model gets, each because a Review asked for it (Carina round 2:
"Her head should be 15% smaller. Her pants should be a different color"). Never on a model Jørgen supplied: those
keep his face, eyes and body. fix_bl.py does the edit in Blender on the rigged model; Meshy's clips are then copied
onto the edited model unchanged, channel by channel (art/candidates/carina-meshy-1/clips.py), so walk, run and sit
carry the edit.

  head-scale  scale (0.85), heads ([0, 2]: the head pieces, biggest first), pivot ([x, y, z], default the Head joint),
              expect (the piece sizes these settings were written for)
  recolour    piece (its number, biggest first), rgb ([r, g, b], sRGB at the piece's middle brightness), expect
Writes build/<step>/model.glb and model.png (the texture, which the package step uses) and the clips beside them."""
import os
import numpy as np
from common import HERE, blender
from glbio import Glb


def clip_onto(model_p, clip_p, out_p):
    """Meshy's clip, made on the same skeleton, onto the edited model (lifted from carina-meshy-1/clips.py)."""
    g, c = Glb(model_p), Glb(clip_p)
    gj, gi = g.skin(); cj, ci = c.skin()
    gn, cn = [g.names[j] for j in gj], [c.names[j] for j in cj]
    assert sorted(gn) == sorted(cn), 'different skeleton'
    assert max(np.abs(gi[k] - ci[cn.index(n)]).max() for k, n in enumerate(gn)) < 1e-3, 'different bind pose'
    for n in [g.names[j] for j in gj]:
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


def _edit(ctx, step, args, o):
    d = ctx.path('build', step)
    os.makedirs(d, exist_ok=True)
    out = os.path.join(d, 'model.glb')
    if o.get('expect'):
        args.append('expect=' + ','.join(str(n) for n in o['expect']))
    log = blender(os.path.join(HERE, 'fix_bl.py'), [ctx.files['rigged'], out] + args, f'character-build-{ctx.id}')
    print('\n'.join(l for l in log.splitlines() if l.startswith(('PIECES', 'HEAD', 'RECOLOUR', 'WROTE'))))
    for clip, src in list(ctx.files['clips'].items()):
        ctx.files['clips'][clip] = os.path.join(d, f'{clip}.glb')
        clip_onto(out, src, ctx.files['clips'][clip])
    ctx.files['rigged'] = out
    ctx.files['skin'] = os.path.join(d, 'model.png')


def head_scale(ctx, o):
    args = [f'head={o.get("scale", 0.85)}', 'heads=' + ','.join(str(i) for i in o.get('heads', [0, 2]))]
    if o.get('pivot'):
        args.append('pivot=' + ','.join(str(c) for c in o['pivot']))
    _edit(ctx, 'head-scale', args, o)


def recolour(ctx, o):
    _edit(ctx, 'recolour', [f'recolour={o["piece"]}:' + ','.join(str(c) for c in o['rgb'])], o)
