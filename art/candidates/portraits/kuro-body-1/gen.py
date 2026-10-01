"""kuro-body-1: extend Kuro's approved portrait down to the waist (issue #134).

Jørgen on showcase/cast-faces-1 (lineup.webp): "Kuro is off, her body is missing". Every other portrait goes down to
the waist; Kuro's ends at the chest (284 px below the chin at game size, 1.42 face heights; the game cuts at 2.25 on
desktop, the others reach about 2.57). This round changes only that: the canvas grows downward and the model paints
the new strip, then the original pixels go back on top, so her face, hair and upper body stay pixel-identical.

Staging (for checking, not in the prompt): same camera and light as the anchor (eye level, three-quarter turn, plain
mint background, soft even light). New in frame: the rest of her blazer and black blouse down to the waist, the
blazer's lower front and hem, her arms hanging at her sides with the forearms cut by the bottom edge. Nothing held.
Physical sense: one body, the blazer continues the lapels and buttons already drawn, the waist narrower than the
bust (slender), no second pair of arms, no red outline down her left side (image right).

Source: art/production/RF/kuro.png (1096x1408, the full-size render behind art/approved/kuro/kuro-after.webp).
Canvas: 1096x1824 (416 px added at the bottom = 239 px at game size, chin to bottom then 2.61 face heights).
The model works on a 1088x1264 window (x 4..1092, y 560..1824) so it sees the chest and chin as context at about
1.4 MP. Mask: the new strip, plus a SEAM band of the original above it that it may repaint, softened.

Run (GPU lock held): ~/ai/sd/venv/bin/python gen.py <job> [job ...]   jobs: see JOBS
Raw PNGs: art/production/KB/ in the main checkout (git-ignored). Webp at game size: here, <job>-s<seed>.webp.
Prompts and settings: prompts.json here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(WT, 'tools'))
import comfy
from production import RDBT
from PIL import Image, ImageFilter
import numpy as np

MAIN = '/home/jorgen/repo/japanese'
SRC = os.path.join(MAIN, 'art/production/RF/kuro.png')
RAW = os.path.join(MAIN, 'art/production/KB')
ADD, SEAM = 416, 32
X0, X1, Y0 = 4, 1092, 560
GAME_W, GAME_TOP_H = 630, 809        # kuro-neutral.webp: the source scaled to 630x809
SEEDS = [11, 12, 13]

# The anchor's own prompt (art/production/manifest.json, A/luna-s101), word for word, plus the build line the cast
# rules ask for ("Kuro: slender", art/PROMPTS.md Build lines).
PROMPT = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
          'anime screenshot, anime coloring, 2d, cel shading, clean lineart, safe, 1girl, solo, Luna, a 27-year-old '
          'night-shift receptionist: sleek black hair in a high bun held with two chopsticks, heavy black goth eyeliner, '
          'black cat-eye glasses with clear lenses, dark lipstick, company receptionist blazer over a black blouse, '
          'narrow face, slender, bored sly half-smile, waist-up portrait facing the viewer at a slight angle, '
          'plain light grey background, soft even studio light')
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, '
       'bad hands, missing fingers, extra fingers, long fingernails, claws, extra limbs, merged limbs, text, watermark, '
       'signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, fat, obese, plump, '
       'sunglasses, tinted eyewear, (rim light, red rim light, red outline, backlighting:1.4), '
       'holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book')

# job -> settings. One thing changes from one job to the next (noted in 'change').
JOBS = {
    'a': dict(fill='smear', denoise=1.0, change='first try: the new strip pre-filled by stretching her bottom rows down, denoise 1.0'),
    'b': dict(fill='smear', denoise=1.0, lllite=True, change='as a, plus the Anima LLLite inpainting-v2 patch (strength 1.0), which sees the picture and the mask'),
    'c': dict(fill='bg', denoise=1.0, lllite=True, change='as b, but the new strip starts as plain background colour instead of her stretched bottom rows'),
}


def prepare(fill):
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    a = np.asarray(im).astype(float)
    bg = np.median(a[:40, :40].reshape(-1, 3), 0)
    c = np.zeros((h + ADD, w, 3))
    c[:h] = a
    if fill == 'smear':
        # the last rows carried down, fading to the background colour over the strip
        last = a[h - 8:h].mean(0)
        t = np.linspace(0, 1, ADD)[:, None, None]
        c[h:] = last[None] * (1 - 0.6 * t) + bg * 0.6 * t
    else:
        c[h:] = bg
    canvas = Image.fromarray(c.clip(0, 255).astype('uint8'))
    if fill == 'smear':
        strip = canvas.crop((0, h, w, h + ADD)).filter(ImageFilter.GaussianBlur(6))
        canvas.paste(strip, (0, h))
    m = Image.new('L', canvas.size, 0)
    m.paste(255, (0, h - SEAM, w, h + ADD))
    m = m.filter(ImageFilter.GaussianBlur(10))
    m.paste(255, (0, h, w, h + ADD))
    return im, canvas, m


def workflow(img, mask, seed, denoise, lllite=False):
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': PROMPT, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEG, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': img}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': mask, 'channel': 'red'}},
        '14': {'class_type': 'DifferentialDiffusion', 'inputs': {'model': ['1', 0]}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['14', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'kuro-body'}},
    }
    if lllite:
        wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
        wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['14', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                              'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
        wf['7']['inputs']['model'] = ['A', 0]
    return wf


def composite(orig, canvas, raw_win, mask):
    """Model output into the full canvas through the mask (so the VAE's slight colour shift outside it is not taken),
    then the original back on top, blending only in the SEAM band."""
    out = canvas.copy()
    out.paste(raw_win, (X0, Y0), mask.crop((X0, Y0, X1, canvas.height)))
    w, h = orig.size
    keep = Image.new('L', orig.size, 255)
    ramp = np.linspace(255, 0, SEAM).astype('uint8')
    keep.paste(Image.fromarray(np.repeat(ramp[:, None], w, 1)), (0, h - SEAM))
    out.paste(orig, (0, 0), keep)
    # identity check: everything above the seam band is the original
    d = np.abs(np.asarray(out.crop((0, 0, w, h - SEAM))).astype(int) - np.asarray(orig.crop((0, 0, w, h - SEAM))).astype(int)).max()
    return out, int(d)


def game_size(full):
    w, h = full.size
    gh = GAME_TOP_H + round(ADD * GAME_TOP_H / 1408)
    return full.resize((GAME_W, gh), Image.LANCZOS)


def main(jobs):
    os.makedirs(RAW, exist_ok=True)
    log_p = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_p)) if os.path.exists(log_p) else []
    for job in jobs:
        o = JOBS[job]
        orig, canvas, mask = prepare(o['fill'])
        canvas.save(os.path.join(RAW, f'{job}-pad.png'))
        win = (X0, Y0, X1, canvas.height)
        cp, mp = os.path.join(RAW, f'{job}-win.png'), os.path.join(RAW, f'{job}-mask.png')
        canvas.crop(win).save(cp)
        mask.crop(win).convert('RGB').save(mp)
        for seed in SEEDS:
            name = f'{job}-s{seed}'
            raw = os.path.join(RAW, name + '-raw.png')
            if not os.path.exists(raw):
                if not open('/tmp/claude-1000/gpu.lock/owner').read().strip().startswith('claude-agent:kuro-body'):
                    sys.exit('GPU lock is not ours; stopping')
                comfy.run(workflow(comfy.upload(cp), comfy.upload(mp), seed, o['denoise'], o.get('lllite', False)), raw)
            full, diff = composite(orig, canvas, Image.open(raw).convert('RGB'), mask)
            full.save(os.path.join(RAW, name + '.png'))
            game_size(full).save(os.path.join(HERE, name + '.webp'), 'WEBP', quality=92)
            print(name, 'max change above the seam:', diff, flush=True)
            log = [e for e in log if e['id'] != name] + [dict(id=name, job=job, seed=seed, change=o['change'], fill=o['fill'],
                   denoise=o['denoise'], lllite=o.get('lllite', False), prompt=PROMPT, negative=NEG, model=RDBT, steps=30, cfg=5, sampler='euler_ancestral',
                   window=[X0, Y0, X1, Y0 + 1264], added_px=ADD, seam_px=SEAM)]
        json.dump(log, open(log_p, 'w'), indent=1)
    wf = workflow('INPUT_PADDED.png', 'INPUT_MASK.png', SEEDS[0], 1.0, lllite=True)
    json.dump(wf, open(os.path.join(HERE, '../../../../tools/workflows/anima-outpaint-bottom-lllite.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1:] or list(JOBS))
