# char-mio-gen3d: the multi-view input. Same recipe as char-mio-i2i's turnaround t3 (mio_i2i_turn.py: diptych, the
# clean front on the left, a source render on the right, only the right half repainted; RDBT Anima, Euler A, 30
# steps, CFG 5, the same prompt and negative), with one change: the source renders are Meshy's single-picture model
# (raw/meshy-single, views/src-meshy-single) instead of our old blocky model, so the views start from her long hair
# and her real proportions.
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_gen3d_turn.py <set> <src> <tag>[,<tag>...] [--denoise 0.65] [--seed 301]
# Writes claude-miogen3d/views/<set>/<tag>.png (1024, same framing as the source), <tag>-canvas.png, prompts.json.
#
# Staging (shot-staging), each canvas: two figures of the same woman side by side on a plain light grey background,
# whole body, same size, feet on one line, arms down. Left: facing the viewer. Right: the view the source shows (l40
# and l90 see her left side, image right of her in the front view; r40 and r90 her right side; back her back). Soft
# even light, no floor shadow. Only the right figure is drawn new.
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import comfy  # noqa: E402

import mio_gen3d_paths as P  # noqa: E402
import mio_i2i_gen as G  # noqa: E402
import mio_i2i_turn as T  # noqa: E402

G.ME = 'claude-agent:mio-gen3d'
HALF = T.HALF


def canvas(src, tag):
    front = Image.open(P.CLEAN).convert('RGB').resize((HALF, HALF), Image.LANCZOS)
    s = Image.open(os.path.join(P.VIEWS, src, tag + '.png')).convert('RGBA')
    bg = Image.new('RGBA', s.size, (229, 232, 236, 255))
    bg.alpha_composite(s)
    cv = Image.new('RGB', (HALF * 2, HALF), (229, 232, 236))
    cv.paste(front, (0, 0))
    cv.paste(bg.convert('RGB').resize((HALF, HALF), Image.LANCZOS), (HALF, 0))
    mask = Image.new('L', (HALF * 2, HALF), 0)
    mask.paste(255, (HALF, 0, HALF * 2, HALF))
    return cv, mask


def gen(vset, src, tags, denoise, seed):
    out = os.path.join(P.VIEWS, vset)
    os.makedirs(out, exist_ok=True)
    log = os.path.join(out, 'prompts.json')
    data = json.load(open(log)) if os.path.exists(log) else {}
    for tag in tags:
        if not G.mine():
            sys.exit('lost the GPU lock; stopping')
        cv, mask = canvas(src, tag)
        cp = f'/tmp/claude-1000/miogen3d-{vset}-{tag}.png'
        mp = f'/tmp/claude-1000/miogen3d-{vset}-{tag}-mask.png'
        cv.save(cp)
        Image.merge('RGB', [mask] * 3).save(mp)
        wf = comfy.anima(T.prompt(tag), T.negative(), model=G.MODEL, w=HALF * 2, h=HALF, seed=seed)
        wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}}
        wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
        wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
        wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
        wf['14'] = {'class_type': 'DifferentialDiffusion', 'inputs': {'model': wf['7']['inputs']['model']}}
        wf['7']['inputs']['model'] = ['14', 0]
        del wf['6']
        wf['7']['inputs']['latent_image'] = ['13', 0]
        wf['7']['inputs']['denoise'] = denoise
        cpath = os.path.join(out, tag + '-canvas.png')
        comfy.run(wf, cpath)
        Image.open(cpath).convert('RGB').crop((HALF, 0, HALF * 2, HALF)).resize((1024, 1024), Image.LANCZOS) \
            .save(os.path.join(out, tag + '.png'))
        data[tag] = dict(model=G.MODEL, seed=seed, denoise=denoise, steps=30, cfg=5, sampler='euler_ancestral',
                         size=f'{HALF * 2}x{HALF}', method='diptych: clean front left, source render right, right half '
                         'masked (SetLatentNoiseMask + DifferentialDiffusion)',
                         source=os.path.relpath(os.path.join(P.VIEWS, src, tag + '.png'), P.MAIN),
                         prompt=T.prompt(tag), negative=T.negative())
        json.dump(data, open(log, 'w'), indent=1, ensure_ascii=False)
        print('wrote', tag, flush=True)


def main():
    a = sys.argv[1:]
    dn, seed = 0.65, 301
    if '--denoise' in a:
        k = a.index('--denoise')
        dn = float(a[k + 1])
        a = a[:k] + a[k + 2:]
    if '--seed' in a:
        k = a.index('--seed')
        seed = int(a[k + 1])
        a = a[:k] + a[k + 2:]
    G.lock()
    try:
        gen(a[0], a[1], a[2].split(','), dn, seed)
    finally:
        G.unlock()


if __name__ == '__main__':
    main()
