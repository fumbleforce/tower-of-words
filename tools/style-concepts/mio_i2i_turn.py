# char-mio-i2i, the aligned turnaround (Jørgen, 2026-10-01: "generate the sides of her etc to try lining up all the
# points"). Every view is painted over a render of our model from a camera that only turns about her vertical axis
# (same distance, height, 20 degree lens and 4 degree tilt as the clean picture's camera), so the top of the head,
# chin, shoulders, hem, knees, ankles and soles sit on the same image rows in every view. The model also sees the
# clean front: each canvas is the clean front (left half) beside the source render (right half), and only the right
# half is repainted (masked img2img with DifferentialDiffusion, RDBT Anima, Euler A, 30 steps, CFG 5).
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_turn.py gen <job> <tag>[,<tag>...] [--denoise 0.65] [--seed 301]
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_turn.py sheet <job> [tags]
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_turn.py wiregen <job> 0.55,0.75   (the model draws a wireframe)
# gen writes claude-mioi2i/gen/<job>/<tag>.png (the repainted half at 1024, the same framing as the source render),
# <tag>-canvas.png and prompts.json; sheet writes gen/<job>/guides.webp: the clean front and every view side by side at
# one scale, with the landmark rows of the clean front drawn across all of them and each view's measured top, hem and
# soles listed against the front's.
#
# Staging (shot-staging), each canvas: two figures of the same woman side by side on a plain light grey background,
# whole body, same size, feet on one line, arms down. Left: facing the viewer. Right: the view the source shows (her
# left side in profile, her back, her right side). Soft even light. Only the right figure is drawn new.
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
import comfy  # noqa: E402

import mio_i2i_cam as C  # noqa: E402
import mio_i2i_gen as G  # noqa: E402
import mio_i2i_views as V  # noqa: E402

HALF = 768
# what the right figure shows, in plain words
SEEN = {
    'l90': 'right: the same girl from the side, profile facing the left edge of the picture',
    'r90': 'right: the same girl from the side, profile facing the right edge of the picture',
    'back': 'right: the same girl from behind, back view',
    'l40': 'right: the same girl in three-quarter view',
    'r40': 'right: the same girl in three-quarter view',
}
# landmark rows on the clean front, at 1024 px (measured on the picture)
MARKS = [('top of head', 71), ('eyes', 203), ('chin', 257), ('shoulders', 310), ('hem', 625), ('fingertips', 650),
         ('knees', 738), ('ankles', 870), ('soles', 965)]


def prompt(tag):
    return (f'{G.QT}, safe, reference sheet, the same girl twice, left: front view, {SEEN[tag]}, {G.WHO}, calm neutral '
            f'expression, {G.STYLE}, standing straight, arms down, full body, plain light grey background')


def negative():
    return G.NEG + ', glasses, eyewear, drawstrings, different outfits, different hair'


def canvas(tag):
    front = Image.open(C.CLEAN).convert('RGB').resize((HALF, HALF), Image.LANCZOS)
    src = Image.open(os.path.join(C.OUT, 'src-clean', tag + '.png')).convert('RGBA')
    bg = Image.new('RGBA', src.size, (229, 232, 236, 255))
    bg.alpha_composite(src)
    cv = Image.new('RGB', (HALF * 2, HALF), (229, 232, 236))
    cv.paste(front, (0, 0))
    cv.paste(bg.convert('RGB').resize((HALF, HALF), Image.LANCZOS), (HALF, 0))
    mask = Image.new('L', (HALF * 2, HALF), 0)
    mask.paste(255, (HALF, 0, HALF * 2, HALF))
    return cv, mask


def gen(job, tags, denoise, seed):
    out = os.path.join(C.OUT, 'gen', job)
    os.makedirs(out, exist_ok=True)
    log = os.path.join(out, 'prompts.json')
    data = json.load(open(log)) if os.path.exists(log) else {}
    for tag in tags:
        if not G.mine():
            sys.exit('lost the GPU lock; stopping')
        cv, mask = canvas(tag)
        cp = os.path.join('/tmp/claude-1000', f'mioturn-{job}-{tag}.png')
        mp = os.path.join('/tmp/claude-1000', f'mioturn-{job}-{tag}-mask.png')
        cv.save(cp)
        Image.merge('RGB', [mask] * 3).save(mp)
        wf = comfy.anima(prompt(tag), negative(), model=G.MODEL, w=HALF * 2, h=HALF, seed=seed)
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
                         source=os.path.relpath(os.path.join(C.OUT, 'src-clean', tag + '.png'), C.MAIN),
                         prompt=prompt(tag), negative=negative())
        json.dump(data, open(log, 'w'), indent=1, ensure_ascii=False)
        print('wrote', tag, flush=True)


def measure(rgb, tag=None):
    m = V.bg_mask(np.asarray(rgb).astype(np.float32))
    if tag:  # inside the source render's silhouette (a little wider), so floor shadows don't count as her
        from scipy import ndimage
        a = np.asarray(Image.open(os.path.join(C.OUT, 'src-clean', tag + '.png')).getchannel('A')) > 230
        m &= ndimage.binary_dilation(a, iterations=12)
    rows = np.nonzero(m.any(axis=1))[0]
    top, bottom = int(rows.min()), int(rows.max())
    # the hem: the lowest row (above the knees) where the figure is still wider than 70% of its widest
    w = m.sum(axis=1)
    wide = np.nonzero(w[:780] > 0.7 * w[200:780].max())[0]
    return top, int(wide.max()) if len(wide) else -1, bottom


def sheet(job, tags=('l90', 'back', 'r90')):
    font = ImageFont.load_default(size=20)
    W = 380
    imgs = [('clean front', Image.open(C.CLEAN).convert('RGB').resize((1024, 1024), Image.LANCZOS), None)]
    for t in tags:
        p = os.path.join(C.OUT, 'gen', job, t + '.png')
        if os.path.exists(p):
            imgs.append((t, Image.open(p).convert('RGB'), t))
    x0, x1 = 322, 702
    sh = Image.new('RGB', (W * len(imgs), 1024 + 40 + 24 * len(imgs)), (255, 255, 255))
    d = ImageDraw.Draw(sh)
    lines = []
    ref = None
    for i, (name, im, tag) in enumerate(imgs):
        sh.paste(im.crop((x0, 0, x1, 1024)), (i * W, 40))
        d.text((i * W + 8, 10), name, fill=(0, 0, 0), font=font)
        top, hem, bottom = measure(im, tag)
        if ref is None:
            ref = (top, hem, bottom)
        lines.append(f'{name}: top {top} ({top - ref[0]:+d}), hem {hem} ({hem - ref[1]:+d}), soles {bottom} '
                     f'({bottom - ref[2]:+d}) px at 1024')
    for label, y in MARKS:
        d.line([(0, 40 + y), (sh.size[0], 40 + y)], fill=(230, 0, 120), width=1)
        d.text((sh.size[0] - 120, 40 + y - 18), label, fill=(230, 0, 120), font=font)
    for k, t in enumerate(lines):
        d.text((8, 1024 + 46 + 24 * k), t, fill=(0, 0, 0), font=font)
    path = os.path.join(C.OUT, 'gen', job, 'guides.webp')
    sh.save(path, quality=92)
    print('\n'.join(lines))
    print('sheet', path)


WIRE_P = ('{qt}, safe, wireframe render of a low poly 3d character model, 1girl, solo, standing, full body, front view, '
          'polygon mesh edges drawn as thin bright lines over flat-shaded faces, every facet outlined, plain light grey '
          'background')


def wiregen(job, denoises, seed=301):
    """Ask the image model itself for a wireframe: img2img over the clean front (1024) with a wireframe prompt."""
    out = os.path.join(C.OUT, 'gen', job)
    os.makedirs(out, exist_ok=True)
    src = os.path.join('/tmp/claude-1000', 'mioturn-clean-1024.png')
    Image.open(C.CLEAN).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(src)
    up = comfy.upload(src)
    log = os.path.join(out, 'prompts.json')
    data = json.load(open(log)) if os.path.exists(log) else {}
    p = WIRE_P.format(qt=G.QT)
    for dn in denoises:
        if not G.mine():
            sys.exit('lost the GPU lock; stopping')
        name = f'wire-d{int(dn * 100)}'
        comfy.run(G.i2i_wf(up, p, G.NEG, dn, seed), os.path.join(out, name + '.png'))
        data[name] = dict(model=G.MODEL, seed=seed, denoise=dn, steps=30, cfg=5, sampler='euler_ancestral',
                          source=os.path.relpath(C.CLEAN, C.MAIN), prompt=p, negative=G.NEG)
        json.dump(data, open(log, 'w'), indent=1, ensure_ascii=False)
        print('wrote', name, flush=True)


def main():
    a = sys.argv[1:]
    if a[0] == 'wiregen':
        G.lock()
        try:
            wiregen(a[1], [float(x) for x in a[2].split(',')])
        finally:
            G.unlock()
        return
    if a[0] == 'sheet':
        sheet(a[1], tuple(a[2].split(',')) if len(a) > 2 else ('l90', 'back', 'r90'))
        return
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
        gen(a[1], a[2].split(','), dn, seed)
    finally:
        G.unlock()


if __name__ == '__main__':
    main()
