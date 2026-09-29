"""Mio looking down at her phone: one masked img2img pass (RDBT Anima, DifferentialDiffusion) over the approved portrait
(art/production/RF/mio.png, the 1008x1296 reframe that the v3 expressions came from). A crude paint of the phone, the hand
and the raised sleeve goes into the source first so the high-denoise area has a layout; the mask is graded: arm and phone
high, face medium (eyes down), rest kept. Her glasses frame is kept out of the mask and pasted back, then the irises
are colour-matched to the portrait (same as the v3 expressions).

Usage: ~/ai/sd/venv/bin/python mio_phone.py sketch | run <layout>:<seed> ...
"""
import sys, os, json
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(REPO, 'tools'))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'phone')
OUTDIR = os.path.join(REPO, 'art/candidates/portraits/mio-phone')
SRC = os.path.join(REPO, 'art/production/RF/mio.png')
OWNER = 'mio-phone-agent'
W, H = 1008, 1296
# v1: arm and phone at 235 (0.92): the model painted the hoodie back over the sketch. v2: one change, 180 (0.71) so the sketch survives.
HI = int(os.environ.get('HI', '180'))
HOOD = (22, 48, 44)
HOOD_D = (10, 24, 22)
SKIN = (243, 222, 214)
CASE = (48, 52, 60)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def phone_quad(cx, cy, w, h, ang):
    a = np.deg2rad(ang)
    R = np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]])
    pts = np.array([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) @ R.T + [cx, cy]
    return [tuple(p) for p in pts]


# Layouts. one: phone in her left hand (image right), forearm up from the bottom right; card and lanyard untouched.
# two: phone in both hands at the centre of her chest, forearms up from both bottom corners.
LAYOUTS = {
    'one': dict(phone=(590, 985, 108, 196, -8),
                sleeves=[[(830, 1230), (620, 1075)]],
                hands=[(548, 1000, 640, 1120)]),
    'two': dict(phone=(520, 985, 108, 196, 0),
                sleeves=[[(830, 1230), (600, 1085)], [(200, 1240), (445, 1085)]],
                hands=[(540, 1010, 610, 1120), (430, 1010, 500, 1120)]),
}
# v3 (after v2: the raised sleeves read as flat pasted shapes coming in from outside her body): each sleeve is now a thick
# rounded forearm from her own elbow at her side up to the hand, in the hoodie's own teal, outlined.
V = os.environ.get('V', '3')
SLEEVE_W = 120
FACE = int(os.environ.get('FACE', '205'))
HOOD = (2, 58, 63) if V == '3' else HOOD


def sketch(layout):
    L = LAYOUTS[layout]
    im = Image.open(SRC).convert('RGB')
    d = ImageDraw.Draw(im)
    for (x0, y0), (x1, y1) in L['sleeves']:
        d.line([(x0, y0), (x1, y1)], fill=(1, 4, 4), width=SLEEVE_W + 8)
        d.line([(x0, y0), (x1, y1)], fill=HOOD, width=SLEEVE_W)
        d.ellipse((x1 - SLEEVE_W / 2, y1 - SLEEVE_W / 2, x1 + SLEEVE_W / 2, y1 + SLEEVE_W / 2), fill=HOOD, outline=(1, 4, 4), width=4)
    for box in L['hands']:
        d.ellipse(box, fill=SKIN, outline=(120, 90, 90))
    q = phone_quad(*L['phone'])
    d.polygon(q, fill=CASE, outline=(20, 20, 24))
    # a faint cool glow from the screen side on the lower face and chin (screen blend, low opacity)
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((330, 470, 610, 700), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    tint = Image.new('RGB', (W, H), (190, 225, 255))
    im = Image.composite(ImageChops.screen(im, tint), im, glow)
    return im


def mask(layout):
    """Graded DifferentialDiffusion mask (white = change most)."""
    L = LAYOUTS[layout]
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    # hoodie around the arm(s) and phone: medium, so the cloth folds follow the raised arm
    d.rectangle((120, 800, 900, 1296), fill=150)
    # arm, hand and phone: high
    hi = Image.new('L', (W, H), 0)
    hd = ImageDraw.Draw(hi)
    for (x0, y0), (x1, y1) in L['sleeves']:
        hd.line([(x0, y0), (x1, y1)], fill=HI, width=SLEEVE_W + 20)
    for box in L['hands']:
        hd.ellipse(box, fill=HI)
    hd.polygon(phone_quad(*L['phone']), fill=HI)
    hi = hi.filter(ImageFilter.MaxFilter(41))
    m = ImageChops.lighter(m, hi)
    # face: eyes down, frown (v3 used 0.6 on the face)
    d2 = ImageDraw.Draw(m)
    d2.ellipse((330, 380, 610, 660), fill=FACE)
    m = m.filter(ImageFilter.GaussianBlur(14))
    # keep the headphones and the ID card area (one-hand layout) as they are
    keep = Image.new('L', (W, H), 0)
    kd = ImageDraw.Draw(keep)
    kd.ellipse((350, 615, 640, 780), fill=255)
    keep = keep.filter(ImageFilter.GaussianBlur(10))
    m = ImageChops.subtract(m, keep)
    frame = glasses_keep()
    m = Image.composite(Image.new('L', (W, H), 0), m, Image.fromarray((frame * 255).astype('uint8')))
    return m, frame


def glasses_keep():
    import portrait_candidates as pc
    return pc.mio_frame_mask(SRC)


P = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'anime screenshot, anime coloring, 2d, cel shading, clean lineart, safe, 1girl, solo, '
     'Mio, a 25-year-old woman: messy black hair with green underneath in a loose bun, glasses, dark green oversized hoodie, '
     'headphones around her neck, teal lanyard with an ID card, '
     '{hold}, looking down at the phone screen, head tilted down, slightly annoyed, small frown, '
     'the glow of the phone screen softly lighting her face, waist-up portrait, plain light grey background')
HOLD = {'one': 'holding a black smartphone in her left hand in front of her chest',
        'two': 'holding a black smartphone in both hands in front of her chest'}
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, bad hands, '
       'missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, signature, 3d, realistic, '
       'photorealistic, render, chubby, nude, nsfw, child, loli, fat, obese, plump, rim light, red rim light, backlighting, looking at viewer')


def wf(src_png, mask_png, p, seed):
    import production
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': production.RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': p, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEG, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': src_png}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': mask_png, 'channel': 'red'}},
        '14': {'class_type': 'DifferentialDiffusion', 'inputs': {'model': ['1', 0]}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['14', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': 1.0}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'miophone'}},
    }


def run(layout, seed):
    import comfy
    import portrait_candidates as pc
    os.makedirs(RAW, exist_ok=True)
    name = f'mio-phone-{layout}-{seed}'
    out = os.path.join(RAW, name + '.png')
    if os.path.exists(out):
        return out
    check_lock()
    sk = sketch(layout)
    m, frame = mask(layout)
    sp, mp = os.path.join(RAW, f'sketch-{layout}.png'), os.path.join(RAW, f'mask-{layout}.png')
    sk.save(sp)
    m.convert('RGB').save(mp)
    p = P.format(hold=HOLD[layout])
    w = wf(comfy.upload(sp), comfy.upload(mp), p, seed)
    rawp = os.path.join(RAW, name + '-raw.png')
    comfy.run(w, rawp)
    res = Image.open(rawp).convert('RGB')
    # paste her own glasses frame back, identical to the portrait
    km = Image.fromarray((frame * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
    res = Image.composite(Image.open(SRC).convert('RGB'), res, km)
    res.save(out)
    try:
        if os.environ.get('IRIS') != '1':
            raise RuntimeError('off (v2 smeared the eyes)')
        info = pc.match_iris(out, out, SRC)
        print('iris', info, flush=True)
    except Exception as e:  # downcast eyes can hide the irises from the eye detector
        print('iris match skipped:', e, flush=True)
    json.dump(w, open(os.path.join(OUTDIR, 'workflow-mio-phone.json'), 'w'), indent=1)
    lg = os.path.join(OUTDIR, 'log.json')
    L = json.load(open(lg)) if os.path.exists(lg) else []
    L = [e for e in L if e['name'] != name] + [{'name': name, 'base': 'art/production/RF/mio.png (approved mio-after, reframed)',
         'method': f'crude paint of phone, hand and sleeve + graded masked img2img, rdbtAnima, DifferentialDiffusion, denoise 1.0 with mask 0.59 hoodie / {HI/255:.2f} arm and phone / {FACE/255:.2f} face; glasses frame pasted back',
         'layout': layout, 'seed': seed, 'prompt': p, 'negative': NEG, 'steps': 30, 'cfg': 5, 'sampler': 'euler_ancestral normal'}]
    json.dump(L, open(lg, 'w'), ensure_ascii=False, indent=1)
    Image.open(out).resize((597, 768), Image.LANCZOS).save(os.path.join(OUTDIR, name + '.webp'), quality=92)
    print('ok', name, flush=True)
    return out


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUTDIR, exist_ok=True)
    if sys.argv[1] == 'sketch':
        for k in LAYOUTS:
            sk = sketch(k)
            m, _ = mask(k)
            both = Image.new('RGB', (W * 2, H))
            both.paste(sk, (0, 0)); both.paste(m.convert('RGB'), (W, 0))
            both.resize((W, H // 2)).save(os.path.join(RAW, f'preview-{k}.png'))
    else:
        for spec in sys.argv[2:]:
            k, s = spec.split(':')
            run(k, int(s))
