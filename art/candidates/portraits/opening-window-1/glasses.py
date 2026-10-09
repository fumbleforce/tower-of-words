"""Mio's glasses on the side-view ipa renders (CPU, no diffusion).

The ipa renders draw her frame in the right shape (rounded rectangles, nose pad) but light gold and thin; hers are taupe
grey, medium thickness (art/PROMPTS.md "Mio's glasses", approved frame median about 91, 78, 76). Her own frame can't be
transplanted onto a near-profile face (the approved one is seen from the front), so here the render's own frame is kept
as drawn and only recoloured: the frame's pixels (warm light tan in the glasses box, iris excluded) are mapped onto the
approved frame colour with their own light and shade kept, and the frame grown by 1 px in that colour so it reads as
thick as hers. Writes RAW/<name>-glasses.png and RAW/<name>-frame.png (the frame mask, for shot 3 and the cut-out).
Usage: ~/ai/sd/venv/bin/python glasses.py <name>:<x0>,<y0>,<x1>,<y1>:<eye x0>,<y0>,<x1>,<y1> ..."""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '../../../../art/production/opening-window-1')
TAUPE = np.array([91.0, 78.0, 76.0])
TAUPE_V = 91.0     # its median brightness (max channel)


def run(spec):
    name, box, eye = spec.split(':')
    x0, y0, x1, y1 = map(int, box.split(','))
    ex0, ey0, ex1, ey1 = map(int, eye.split(','))
    src = os.path.join(RAW, name + '.png')
    im = np.asarray(Image.open(src).convert('RGB')).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    v = im.max(-1)
    m = (r >= g) & (g >= b - 2) & ((r - b) > 25) & ((r - b) < 120) & (v > 90) & (v < 240)
    inbox = np.zeros(m.shape, bool)
    inbox[y0:y1, x0:x1] = True
    eyem = np.zeros(m.shape, bool)
    eyem[ey0:ey1, ex0:ex1] = True
    m &= inbox & ~eyem
    lab, n = ndimage.label(m)
    sz = ndimage.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, [i + 1 for i in range(n) if sz[i] >= 40])
    vmed = np.median(v[m])
    out = im.copy()
    out[m] = np.clip(TAUPE[None, :] * (v[m] / vmed)[:, None] * (TAUPE_V / TAUPE.max()), 0, 255)
    # 1 px thicker: neighbours that are skin or lens (light), not the dark outline, take the frame colour
    grow = ndimage.binary_dilation(m, iterations=1) & ~m & (v > 150) & inbox & ~eyem
    out[grow] = TAUPE
    frame = m | grow
    Image.fromarray(out.astype('uint8')).save(os.path.join(RAW, name + '-glasses.png'))
    # the frame mask for shot 3 and the cut-out: the coloured frame plus its dark outline (1 px)
    outline = ndimage.binary_dilation(frame, iterations=1) & (v < 90)
    Image.fromarray(((frame | outline) * 255).astype('uint8')).save(os.path.join(RAW, name + '-frame.png'))
    Image.fromarray(out.astype('uint8')).save(os.path.join(HERE, name + '-glasses.webp'), quality=92)
    L = json.load(open(os.path.join(HERE, 'prompts.json')))
    e = dict(L[name])
    e.update(method='ipa + glasses recolour', glasses=f'own frame recoloured to the approved taupe (median 91,78,76) with its shading kept, grown 1 px; frame box {box}, iris box {eye} left out; source frame median brightness {vmed:.0f}',
             file=f'art/candidates/portraits/opening-window-1/{name}-glasses.webp')
    L[name + '-glasses'] = e
    json.dump(L, open(os.path.join(HERE, 'prompts.json'), 'w'), ensure_ascii=False, indent=1)
    print('glasses', name, int(frame.sum()), 'px, source median v', vmed)


if __name__ == '__main__':
    for s in sys.argv[1:]:
        run(s)


def blend(spec):
    """blend:<name>:<seed>:<denoise>  (run through gen.py, which holds the GPU): a light masked img2img over the recoloured
    frame (frame mask grown 3 px, the iris box left out) so it sits in the line work, as art/PROMPTS.md "Mio's glasses"
    step 3. Only masked pixels change; the result replaces RAW/<name>-glasses.png (the unblended one is kept as -recol)."""
    import shutil
    from PIL import ImageFilter
    sys.path.insert(0, HERE)
    import gen, comfy
    from production import Q
    _, name, seed, d = spec.split(':')
    seed, d = int(seed), float(d)
    L = json.load(open(os.path.join(HERE, 'prompts.json')))
    e = L[name + '-glasses']
    recol = os.path.join(RAW, name + '-recol.png')
    if not os.path.exists(recol):
        shutil.copy(os.path.join(RAW, name + '-glasses.png'), recol)
    img = Image.open(recol).convert('RGB')
    fm = np.asarray(Image.open(os.path.join(RAW, name + '-frame.png'))) > 127
    eye = [int(t) for t in e['glasses'].split('iris box ')[1].split(' ')[0].split(',')]
    m = ndimage.binary_dilation(fm, iterations=3)
    m[eye[1]:eye[3], eye[0]:eye[2]] = False
    ys, xs = np.nonzero(m)
    cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
    side = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.5)
    bx, by = max(0, cx - side // 2), max(0, cy - side // 2)
    box = (bx, by, bx + side, by + side)
    mi = Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.5))
    cp, mp = os.path.join(RAW, f'blend-{name}-crop.png'), os.path.join(RAW, f'blend-{name}-mask.png')
    img.crop(box).resize((1024, 1024), Image.LANCZOS).save(cp)
    mi.crop(box).resize((1024, 1024), Image.LANCZOS).save(mp)
    prompt = (f'{Q}, safe, 1girl, solo, close-up of her face in profile looking down, Mio, a 30-year-old woman, pale skin, very dark '
              'green hair bordering on black with bangs, light tan eyes, glasses with medium-thick taupe-grey frames, clear lenses')
    out = os.path.join(RAW, f'blend-{name}-{seed}-d{int(d * 100)}-work.png')
    if not os.path.exists(out):
        wf = comfy.anima(prompt, gen.MIO_NEG + ', gold frames, silver frames, sunglasses, tinted eyewear', model=gen.RDBT,
                         w=1024, h=1024, steps=30, cfg=5, seed=seed)
        wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}}
        wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
        wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
        wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
        wf['7']['inputs'].update(latent_image=['13', 0], denoise=d)
        del wf['6']
        gen.check_lock()
        comfy.run(wf, out)
    work = Image.open(out).convert('RGB').resize((side, side), Image.LANCZOS)
    full = img.copy()
    full.paste(work, box[:2], mi.crop(box))
    full.save(os.path.join(RAW, name + '-glasses.png'))
    full.save(os.path.join(HERE, name + '-glasses-blend.webp'), quality=92)
    e = dict(e, method='ipa + glasses recolour + blend', file=f'art/candidates/portraits/opening-window-1/{name}-glasses-blend.webp')
    e['glasses'] += f'; then a masked img2img blend over the frame (grown 3 px, iris out), denoise {d}, seed {seed}: {prompt}'
    L[name + '-glasses-blend'] = e
    json.dump(L, open(os.path.join(HERE, 'prompts.json'), 'w'), ensure_ascii=False, indent=1)
    print('blend', name, flush=True)
