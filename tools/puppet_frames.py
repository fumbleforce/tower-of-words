"""Puppet frames for the Live2D-style sprite demo (proto2/video2): blink and mouth frames for Mio by face-only inpainting.
The face is cropped from the approved base sprite, upscaled, repainted inside a small mask with RDBT Anima, scaled back
and pasted over the base with a feathered mask, so everything outside the eyes or mouth stays identical.
Candidates: art/puppet/mio/cand/<part>-<seed>.png. Run: ~/ai/sd/venv/bin/python tools/puppet_frames.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
import comfy
from production import Q, N, RDBT
from PIL import Image, ImageDraw, ImageFilter

BASE = 'art/production/B/mio-bored.png'
OUT = 'art/puppet/mio'
CROP = (250, 250, 530, 530)          # face box in the 896x1152 sprite
UP = 1024                             # crop is repainted at this size
DESC = ('1girl, Mio, a 25-year-old woman, messy black hair with green underneath, thin glasses with clear lenses and dark brown frames, '
        'pale skin, close-up of her face, three-quarter view, head tilted')

# part -> (ellipses in sprite coords, prompt, denoise)
EYES = [(292, 316, 366, 366), (404, 276, 496, 336)]
MOUTH = [(372, 410, 440, 448)]
PARTS = {
    'eyes-closed': (EYES, 'closed eyes, eyes shut, relaxed eyelids, long eyelashes, calm', 0.8),
    'eyes-half': (EYES, 'half-closed eyes, sleepy droopy eyelids, looking down', 0.7),
    'mouth-small': (MOUTH, 'slightly open mouth, small mouth, talking, calm', 0.75),
    'mouth-open': (MOUTH, 'open mouth, talking, small mouth, calm, teeth not visible', 0.8),
}
SEEDS = (11, 12, 13, 14)


def to_crop(box):
    s = UP / (CROP[2] - CROP[0])
    return tuple(round((v - CROP[i % 2]) * s) for i, v in enumerate(box))


def mask_img(ells, size, grow=0, blur=0, space='crop'):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    for e in ells:
        e = to_crop(e) if space == 'crop' else e
        d.ellipse((e[0] - grow, e[1] - grow, e[2] + grow, e[3] + grow), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur)) if blur else m


def inpaint(src_png, mask_png, prompt, seed, denoise):
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': N, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(src_png)}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mask_png), 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'puppet'}},
    }
    return wf


def main():
    os.makedirs(f'{OUT}/cand', exist_ok=True)
    base = Image.open(BASE).convert('RGB')
    crop = base.crop(CROP).resize((UP, UP), Image.LANCZOS)
    crop_png = f'{OUT}/face-crop.png'
    crop.save(crop_png)
    only = sys.argv[1:]
    for part, (ells, words, denoise) in PARTS.items():
        if only and part not in only:
            continue
        mpng = f'{OUT}/mask-{part}.png'
        mask_img(ells, (UP, UP), grow=18, blur=6).convert('RGB').save(mpng)
        for seed in SEEDS:
            out = f'{OUT}/cand/{part}-{seed}.png'
            if os.path.exists(out):
                continue
            wf = inpaint(crop_png, mpng, f'{Q}, {DESC}, {words}', seed, denoise)
            for d in ('tools/workflows', os.path.expanduser('~/ai/workflows')):
                json.dump(wf, open(f'{d}/puppet-face-inpaint.json', 'w'), indent=1)
            tmp = out + '.crop.png'
            comfy.run(wf, tmp)
            # paste back: repainted crop scaled down, blended through a feathered mask of the part only
            rep = Image.open(tmp).convert('RGB').resize((CROP[2] - CROP[0], CROP[3] - CROP[1]), Image.LANCZOS)
            full = base.copy()
            full.paste(rep, CROP[:2])
            m = mask_img(ells, base.size, grow=5, blur=3, space='sprite')
            Image.composite(full, base, m).save(out)
            os.remove(tmp)
            print('ok', part, seed, flush=True)


if __name__ == '__main__':
    main()


def rig(path=f'{OUT}/rig.png'):
    """Weight maps for the shader, half resolution. R: loose strands on her right side of the picture (left) plus stray
    wisps, G: the bun, B: the head (for a small tilt). Smooth fields, so the flat background next to the hair moves with it."""
    import numpy as np
    W, H = 896, 1152
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def smooth(a, b, v):
        t = np.clip((v - a) / (b - a), 0, 1)
        return t * t * (3 - 2 * t)

    def poly(pts, blur):
        m = Image.new('L', (W, H), 0)
        ImageDraw.Draw(m).polygon(pts, fill=255)
        return np.asarray(m.filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255

    # loose strands left of the face, hanging from about y=250 down to y=560; stray wisps at the top left
    left = poly([(150, 230), (300, 230), (300, 300), (292, 470), (300, 540), (285, 590), (200, 580), (150, 400)], 10)
    left *= smooth(260, 520, yy)
    wisps = poly([(150, 100), (270, 100), (270, 190), (200, 280), (140, 260)], 10) * smooth(260, 150, xx)
    r = np.clip(left + wisps, 0, 1)
    # bun: everything right of the ear, growing with distance from its root
    bun = poly([(560, 60), (720, 50), (800, 200), (790, 330), (700, 430), (600, 430), (600, 350), (590, 200)], 12)
    d = np.hypot(xx - 585, yy - 225)
    g = bun * smooth(50, 170, d)
    # head: above the headphones, feathered at the neck
    head = poly([(170, 20), (780, 20), (800, 420), (560, 460), (430, 490), (300, 470), (170, 420)], 25)
    b = head * smooth(560, 440, yy)
    rgb = np.stack([r, g, b], -1)
    Image.fromarray((rgb * 255).astype('uint8')).resize((W // 2, H // 2), Image.BILINEAR).save(path)
    return path


def drawn_mouths():
    """Mouth frames drawn in the sprite's own style (a tiny mouth line), because inpainting gave big glossy lips that
    don't match. Shapes are drawn 8x oversized and scaled down, then pasted over the base."""
    base = Image.open(BASE).convert('RGB')
    x0, y0, w, h, S = 370, 405, 60, 40, 8
    skin = base.getpixel((396, 440))
    out = {}
    for key, depth, width in (('small', 4.0, 16), ('open', 8.0, 18)):
        big = base.crop((x0, y0, x0 + w, y0 + h)).resize((w * S, h * S), Image.LANCZOS)
        d = ImageDraw.Draw(big)
        # cover the original dash with skin
        d.rectangle(((383 - x0) * S, (423 - y0) * S, (410 - x0) * S, (433 - y0) * S), fill=skin)
        import math
        cx, cy, tilt = 397, 427.5, math.radians(9)
        def P(u, v):  # mouth-local (u along the mouth, v downwards) -> big-crop coords
            x = cx + u * math.cos(tilt) - v * math.sin(tilt)
            y = cy + u * math.sin(tilt) + v * math.cos(tilt)
            return ((x - x0) * S, (y - y0) * S)
        hw = width / 2
        n = 24
        top = [P(-hw + 2 * hw * i / n, -0.6 * math.sin(math.pi * i / n)) for i in range(n + 1)]
        bot = [P(hw - 2 * hw * i / n, depth * math.sin(math.pi * i / n) ** 0.8) for i in range(n + 1)]
        d.polygon(top + bot, fill=(92, 36, 44))
        tongue = [P(-hw * 0.55 + hw * 1.1 * i / n, depth * (0.55 + 0.1 * math.sin(math.pi * i / n))) for i in range(n + 1)]
        tongue += [P(hw * 0.55 - hw * 1.1 * i / n, depth * 0.95 * math.sin(math.pi * (0.5 + 0.5 * i / n)) ** 0.5 if False else depth * 0.92) for i in range(n + 1)]
        if depth > 5:
            d.polygon(tongue, fill=(196, 104, 112))
        d.line(top, fill=(40, 22, 26), width=int(1.3 * S))
        small = big.resize((w, h), Image.LANCZOS)
        img = base.copy()
        img.paste(small, (x0, y0))
        img.save(f'{OUT}/cand/mouth-drawn-{key}.png')
        out[key] = img
    return out


def export(dest='proto2/video2/puppet', eyes_closed=11, eyes_half=11):
    """Write the page assets: base.webp, rig.png and the eye/mouth patches (rects must match puppet.js)."""
    import shutil
    os.makedirs(dest, exist_ok=True)
    base = Image.open(BASE).convert('RGB')
    base.save(f'{dest}/base.webp', quality=90)
    shutil.copy(rig(), f'{dest}/rig.png')
    EYES_R, MOUTH_R = (278, 258, 278 + 236, 258 + 126), (355, 395, 355 + 100, 395 + 70)
    frames = {'eyes-open': (base, EYES_R), 'eyes-half': (f'{OUT}/cand/eyes-half-{eyes_half}.png', EYES_R),
              'eyes-closed': (f'{OUT}/cand/eyes-closed-{eyes_closed}.png', EYES_R), 'mouth-closed': (base, MOUTH_R),
              'mouth-small': (f'{OUT}/cand/mouth-drawn-small.png', MOUTH_R), 'mouth-open': (f'{OUT}/cand/mouth-drawn-open.png', MOUTH_R)}
    for k, (src, r) in frames.items():
        im = src if isinstance(src, Image.Image) else Image.open(src).convert('RGB')
        im.crop(r).save(f'{dest}/{k}.png', optimize=True)
