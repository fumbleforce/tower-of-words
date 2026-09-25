"""Version A of the opening's exterior shot (layered cel animation) from the approved master art/approved/monorail-bay-ref3.png,
upscaled 2x (art/opening/pilot/bay3.png, 3344x1882). Local and free.
  matte     train matte: BiRefNet matte of a crop around the train, intersected with a hand-measured outline of the train above the
            beam's top edge (the matte alone also keeps the beam and pillars) -> art/opening/pilot/train.png (RGBA, crop coords)
  clean     clean plate: the train inpainted out with One Obsession (masked, denoise 1.0, three seeds) -> art/opening/pilot/clean-<seed>.png
  masks     sky mask (for cloud drift) and sea sparkle points -> art/opening/pilot/sky.png, proto2/opening/sparkles.json
Run: ~/ai/sd/venv/bin/python tools/opening/layers.py <step>"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
P = os.path.join(ROOT, 'art', 'opening', 'pilot')
CROP = (260, 900, 1260, 1460)          # 1000x560 around the train in the 2x image
# train outline in crop coords (measured on a grid): roof line from the lower-left cab to the upper-right end, then back along
# the underside where the cars sit on the beam
OUTLINE = [(38, 440), (42, 350), (62, 318), (130, 287), (330, 213), (560, 138), (800, 40), (852, 40), (864, 70), (866, 122),
           (832, 136), (700, 200), (560, 272), (420, 332), (250, 406), (150, 446), (60, 464)]
# car gaps (crop x) for splitting the train into four rigid cars
GAPS = [393, 569, 712]


def poly_mask(size, pts, grow=0, blur=0):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    if grow:
        m = m.filter(ImageFilter.MaxFilter(grow * 2 + 1))
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


def matte():
    crop = Image.open(os.path.join(P, 'train-crop.png')).convert('RGB')
    bi = Image.open(os.path.join(P, 'cut1', 'train-crop.png')).getchannel('A')
    poly = poly_mask(crop.size, OUTLINE, grow=2, blur=1.2)
    a = np.minimum(np.asarray(bi, np.float32), np.asarray(poly, np.float32))
    out = crop.copy()
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    out.save(os.path.join(P, 'train.png'))
    print('matte ok')


def clean():
    import comfy, comfy_op
    full = Image.open(os.path.join(P, 'bay3.png')).convert('RGB')
    crop = full.crop(CROP)
    S = (1024, 576)
    m = poly_mask(crop.size, OUTLINE, grow=16, blur=4)
    cp, mp = os.path.join(P, 'clean-crop.png'), os.path.join(P, 'clean-mask.png')
    crop.resize(S, Image.LANCZOS).save(cp)
    m.resize(S).convert('RGB').save(mp)
    prompt = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, '
              'no humans, scenery, an empty white concrete monorail beam on pillars crossing a calm blue sea, the smooth top surface of the beam, '
              'sunlight glitter on the water. Early morning.')
    neg = 'train, monorail train, vehicle, car, bus, people, text, logo, worst quality, low quality, blurry, 3d, realistic'
    for seed in (1, 2, 3):
        out = os.path.join(P, f'clean-{seed}.png')
        if os.path.exists(out):
            continue
        wf = {
            '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'oneObsessionAnima.safetensors', 'weight_dtype': 'default'}},
            '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
            '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
            '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
            '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['2', 0]}},
            '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}},
            '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
            '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}},
            '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
            '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                       'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': 1.0}},
            '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
            '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening-clean'}},
        }
        tmp = out + '.crop.png'
        comfy_op.run(wf, tmp)
        rep = Image.open(tmp).convert('RGB').resize(crop.size, Image.LANCZOS)
        plate = full.copy()
        plate.paste(Image.composite(rep, crop, m), CROP[:2])
        plate.save(out)
        os.remove(tmp)
        os.replace(tmp[:-4] + '.workflow.json', out[:-4] + '.workflow.json')
        print('clean ok', out, flush=True)


def masks(plate_path):
    im = Image.open(plate_path).convert('RGB')
    d = np.asarray(Image.open(os.path.join(P, 'bay3-d.png')).convert('L').resize(im.size)).astype(np.float32) / 255
    a = np.asarray(im).astype(np.float32)
    H, W = d.shape
    ys = np.arange(H)[:, None].repeat(W, 1)
    horizon = int(0.3 * H)  # sea horizon at about 30% of the height in the master
    # drifting clouds: only the sky above the tallest tower (y < 15.5% of the height), feathered to 17.5%, so no building moves
    band = np.clip((0.175 * H - ys) / (0.02 * H), 0, 1)
    sm = Image.fromarray((band * 255).astype(np.uint8))
    im.save(os.path.join(P, 'sky.png'))                     # the whole picture as the back layer (only its sky shows)
    plate = im.copy(); plate.putalpha(Image.fromarray(255 - np.asarray(sm)))  # the plate with the sky cut out, drawn on top
    plate.save(os.path.join(P, 'plate-nosky.png'))
    # sparkle points: bright water pixels below the horizon, away from the beam, pillars and train (their depth is well above the sea's)
    lum = a.mean(-1)
    sea_depth = np.median(d[ys > horizon + 20].reshape(-1)) if False else None
    rng = np.random.default_rng(3)
    cand = np.argwhere((ys > horizon + 12) & (lum > 215) & (a[..., 2] > a[..., 0]))
    pts = []
    for y, x in cand[rng.permutation(len(cand))]:
        # reject points on structures: local depth much higher than the sea at that height
        row = d[y, max(0, x - 200):x + 200]
        if d[y, x] > np.median(row) + 0.06:
            continue
        if all((x - px) ** 2 + (y - py) ** 2 > 40 ** 2 for px, py in pts):
            pts.append((int(x), int(y)))
        if len(pts) >= 220:
            break
    json.dump({'w': W, 'h': H, 'pts': [[round(x / W, 4), round(y / H, 4)] for x, y in pts]},
              open(os.path.join(ROOT, 'proto2', 'opening', 'sparkles.json'), 'w'))
    print('masks ok', len(pts), 'sparkle points')


def lerp_pts(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x <= x1:
            f = (x - x0) / (x1 - x0)
            return y0 + f * (y1 - y0)
    return pts[-1][1]


def prefill_a():
    """Clean plate for A without a generative guess: the beam's top face is rebuilt by sweeping its cross-section, sampled just ahead
    of the train (x 1150-1250), back along the measured beam edges; the sea behind the train is copied from just above."""
    full = Image.open(os.path.join(P, 'bay3.png')).convert('RGB')
    a = np.asarray(full).astype(np.float32).copy()
    Hh, Ww = a.shape[:2]
    poly = [(x + CROP[0], y + CROP[1]) for x, y in OUTLINE]
    m = np.asarray(poly_mask(full.size, poly, grow=14)) > 0
    # measured beam edges (2x px): near = lower edge of the top face, far = upper edge
    near = [(150, 1530), (325, 1420), (600, 1290), (900, 1140), (1125, 1025), (1200, 995), (1260, 978)]
    far = [(150, 1395), (325, 1320), (600, 1200), (900, 1070), (1125, 968), (1200, 950), (1260, 938)]
    ref_x = list(range(1150, 1250))
    # sea first: fill masked pixels from above until none are left
    filled = ~m
    for dy in (140, 280, 420):
        src = np.roll(a, dy, axis=0); srcok = np.roll(filled, dy, axis=0)
        take = (~filled) & srcok
        a[take] = src[take]; filled |= take
    # then the beam top face inside the mask
    # one cross-section profile (median over the reference columns), indexed by v in [-0.05, 1.05]
    orig = np.asarray(full).astype(np.float32)
    N = 240
    vs = np.linspace(-0.05, 1.05, N)
    prof = np.zeros((N, 3), np.float32)
    for i, v in enumerate(vs):
        samples = []
        for rx in ref_x:
            rf, rn = lerp_pts(far, rx), lerp_pts(near, rx)
            samples.append(orig[int(round(rf + v * (rn - rf))), rx])
        prof[i] = np.median(np.array(samples), axis=0)
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        fy, ny = lerp_pts(far, x), lerp_pts(near, x)
        v = (y - fy) / max(1.0, ny - fy)
        if -0.05 <= v <= 1.05:
            a[y, x] = prof[int((v + 0.05) / 1.1 * (N - 1))]
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    out.save(os.path.join(P, 'clean-prefill.png'))
    print('prefill ok')
    # light blend pass (One Obsession, masked, low denoise) so the rebuilt area takes the painted texture
    import comfy, comfy_op
    crop = out.crop(CROP)
    mk = poly_mask(crop.size, OUTLINE, grow=20, blur=8)
    S = (1024, 576)
    cp, mp = os.path.join(P, 'pf-crop.png'), os.path.join(P, 'pf-mask.png')
    crop.resize(S, Image.LANCZOS).save(cp); mk.resize(S).convert('RGB').save(mp)
    prompt = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, '
              'scenery, an empty white concrete monorail beam on pillars over a calm blue sea with sunlight glitter. Early morning.')
    neg = 'train, vehicle, people, text, logo, second beam, worst quality, low quality, blurry, 3d, realistic'
    for dn in (0.25, 0.35):
        o = os.path.join(P, f'clean-pf-{int(dn * 100)}.png')
        wf = {
            '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'oneObsessionAnima.safetensors', 'weight_dtype': 'default'}},
            '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
            '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
            '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
            '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['2', 0]}},
            '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}},
            '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
            '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}},
            '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
            '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                       'seed': 5, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': dn}},
            '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
            '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening-clean-pf'}},
        }
        tmp = o + '.crop.png'
        comfy_op.run(wf, tmp)
        rep = Image.open(tmp).convert('RGB').resize(crop.size, Image.LANCZOS)
        plate = out.copy(); plate.paste(Image.composite(rep, crop, mk), CROP[:2]); plate.save(o)
        os.remove(tmp); os.replace(tmp[:-4] + '.workflow.json', o[:-4] + '.workflow.json')
        print('blend ok', o, flush=True)


# ---- option C: side-on silhouette (art/opening/pilot/c.png, 2x of art/opening/cloud/c-gptimage2-1.webp) ----
C_BOX = (515, 1496, 1285, 1567)   # the train above the beam's top edge (y 1566), 2x px


def c_layers():
    import comfy, comfy_op
    full = Image.open(os.path.join(P, 'c.png')).convert('RGB')
    x0, y0, x1, y1 = C_BOX
    # train cel: the dark silhouette inside the box (the sky there is bright orange), plus the lit wheel glints along its base
    crop = full.crop(C_BOX)
    a = np.asarray(crop).astype(np.float32)
    lum = a.mean(-1)
    dark = lum < 115
    from scipy import ndimage
    solid = ndimage.binary_fill_holes(ndimage.binary_closing(dark, np.ones((5, 5))))
    solid = ndimage.binary_opening(solid, np.ones((3, 3)))
    solid[-4:, :] = False  # the beam's top edge stays on the plate
    m = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    cel = crop.copy(); cel.putalpha(m); cel.save(os.path.join(P, 'c-train.png'))
    if len(sys.argv) > 2 and sys.argv[2] == 'cel':
        return
    # clean plate: repaint the sky where the train was (the beam below y1 stays untouched)
    pad = 60
    region = (x0 - pad, y0 - pad * 3, x1 + pad, y1 + 4)
    # pre-fill: the sky where the train was, copied from just above it (the beam below stays untouched)
    fa = np.asarray(full).astype(np.float32).copy()
    ty0, ty1 = y0 - 4, y1 - 3
    hgt = ty1 - ty0
    ty1 = y1 - 6
    hgt = ty1 - ty0
    xa, xb = x0 - 6, x1 + 6
    src = fa[ty0 - hgt:ty1 - hgt, xa:xb].copy()
    # per-column gradient correction so the patch meets the sky above and below without a seam
    top_d = fa[ty0 - 1, xa:xb] - src[0]
    # smooth the correction along x so it follows the sky, not single pixels
    k = np.ones(31) / 31
    top_d = np.stack([np.convolve(top_d[:, c], k, mode='same') for c in range(3)], -1)
    src += top_d[None]
    fa[ty0:ty1, xa:xb] = src
    # the beam's top edge rows (wheels sat there): copy them from the clean beam further right (the beam is level)
    fa[y1 - 8:y1 + 6, xa:xb] = fa[y1 - 8:y1 + 6, xa + 820:xb + 820]
    full = Image.fromarray(fa.clip(0, 255).astype(np.uint8))
    full.save(os.path.join(P, 'c-prefill.png'))
    rc = full.crop(region)
    mk = Image.new('L', rc.size, 0)
    ImageDraw.Draw(mk).rectangle([pad - 8, pad * 3 - 8, rc.width - pad + 8, rc.height - 5], fill=255)
    mk = mk.filter(ImageFilter.GaussianBlur(4))
    S = (1024, round(1024 * rc.height / rc.width / 8) * 8)
    cp, mp = os.path.join(P, 'c-clean-crop.png'), os.path.join(P, 'c-clean-mask.png')
    rc.resize(S, Image.LANCZOS).save(cp); mk.resize(S).convert('RGB').save(mp)
    prompt = ('anime screenshot, anime coloring, 2d, cel shading, detailed anime background art, hand-painted anime background, no humans, scenery, '
              'golden orange sunrise sky with soft clouds just above a long dark flat concrete beam, glowing warm light.')
    neg = 'train, vehicle, building, people, text, logo, worst quality, low quality, blurry, 3d, realistic'
    for seed in (3,):
        out = os.path.join(P, f'c-clean-{seed}.png')
        if os.path.exists(out):
            continue
        wf = {
            '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'oneObsessionAnima.safetensors', 'weight_dtype': 'default'}},
            '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
            '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
            '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
            '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['2', 0]}},
            '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}},
            '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
            '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}},
            '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
            '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                       'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': 0.3}},
            '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
            '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening-clean-c'}},
        }
        tmp = out + '.crop.png'
        comfy_op.run(wf, tmp)
        rep = Image.open(tmp).convert('RGB').resize(rc.size, Image.LANCZOS)
        plate = full.copy(); plate.paste(Image.composite(rep, rc, mk), region[:2]); plate.save(out)
        os.remove(tmp); os.replace(tmp[:-4] + '.workflow.json', out[:-4] + '.workflow.json')
        print('c clean ok', out, flush=True)


if __name__ == '__main__':
    if sys.argv[1] == 'prefill':
        prefill_a(); sys.exit()
    if sys.argv[1] == 'c':
        c_layers(); sys.exit()
    step = sys.argv[1]
    if step == 'matte':
        matte()
    elif step == 'clean':
        clean()
    elif step == 'masks':
        masks(sys.argv[2])
