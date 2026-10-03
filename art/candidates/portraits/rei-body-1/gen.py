"""rei-body-1: extend Rei's picked portrait (rei-i65-2102, reviews/rei-portrait-1) down to the waist.

Jørgen picked "65-2102". At the cast's game scale it ends at the chest, above the bottom of the frame (chin to bottom
of the render 512 px = 1.8 face heights; the game cuts at 2.25 on desktop and the others reach about 2.57). This round
changes only that, the way Kuro's was done (reviews/kuro-body-1, job c, which he picked): the canvas grows downward,
the model paints the new strip, then the original pixels go back on top, so her face, hair and upper body stay
pixel-identical above a 32 px seam band.

Staging (for checking, not in the prompt): same camera and light as the render (eye level, slight three-quarter turn,
plain light grey background, soft even light). New in frame: the rest of her light grey suit jacket and black top down
to the waist, the jacket's buttoned front and lower hem, her arms at her sides with the forearms cut by the bottom edge,
and the end of her ponytail behind her left shoulder (image right). Nothing held. Physical sense: one body, the jacket
continues the lapels and the button already drawn, waist narrower than the bust (tall and curvy), no second pair of
arms, no red outline down her side.

Source: art/production/PC/rei-portrait-1/rei-i65-2102.png (896x1152).
Canvas: 896x1408 (256 px added at the bottom; chin to bottom then 768 px = 2.7 face heights). The model works on the
whole canvas (1.26 MP), so it sees her whole figure as context. Mask: the new strip, plus a SEAM band of the original
above it that it may repaint, softened.

Run (GPU lock held as OWNER): ~/ai/sd/venv/bin/python gen.py <job> [job ...]   jobs: see JOBS
Raw PNGs: art/production/PC/rei-body-1/ (git-ignored). Webp of each full render here: <job>-s<seed>.webp.
Prompts and settings: prompts.json here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
from production import RDBT
from PIL import Image, ImageFilter
import numpy as np

OWNER = 'claude-agent:rei-body-1'
PICK = json.load(open(os.path.join(ROOT, 'art/candidates/portraits/rei-portrait-1/prompts.json')))['rei-i65-2102']
SRC = os.path.join(ROOT, 'art/production/PC/rei-portrait-1/rei-i65-2102.png')
RAW = os.path.join(ROOT, 'art/production/PC/rei-body-1')
ADD, SEAM = 256, 32
SEEDS = [11, 12, 13]

# the picked render's own prompt and negative, word for word
PROMPT, NEG = PICK['prompt'], PICK['negative']

# job -> settings. One thing changes from one job to the next (noted in 'change').
JOBS = {
    'a': dict(fill='bg', denoise=1.0, lllite=True, add=ADD,
              change="Kuro's method (kuro-body-1 job c, picked): new strip starts as plain background colour, Anima LLLite inpainting-v2 patch 1.0, denoise 1.0"),
    # a's renders show ghost lines in the 32 px seam band: the model redrew rows 1120 to 1152 (mean change 12 to 33 per
    # channel against the original) and the cross-fade there showed both drawings at once. Up to row 1110 its output
    # matches the original (under 3 per channel). So b only moves the blend: the same renders, the original kept down to
    # row 1104, an 8 px blend into the model's output, the model's output below.
    'b': dict(fill='bg', denoise=1.0, lllite=True, add=ADD, raw_from='a', blend=(1104, 8),
              change="as a (same renders), but the seam blend moved up: the original kept to row 1104, then an 8 px blend into the model's own drawing, where both still match, instead of a 32 px cross-fade over rows the model redrew"),
}


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def prepare(fill, add):
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    a = np.asarray(im).astype(float)
    # background colour from the bottom corners' neighbourhood (the light grey gradient is darker at the bottom)
    bg = np.median(np.concatenate([a[h - 40:h, :24].reshape(-1, 3), a[h - 40:h, -24:].reshape(-1, 3)]), 0)
    c = np.zeros((h + add, w, 3))
    c[:h] = a
    c[h:] = bg
    canvas = Image.fromarray(c.clip(0, 255).astype('uint8'))
    m = Image.new('L', canvas.size, 0)
    m.paste(255, (0, h - SEAM, w, h + add))
    m = m.filter(ImageFilter.GaussianBlur(10))
    m.paste(255, (0, h, w, h + add))
    return im, canvas, m


def workflow(img, mask, seed, denoise, lllite=True):
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
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'rei-body'}},
    }
    if lllite:
        wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
        wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['14', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                              'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
        wf['7']['inputs']['model'] = ['A', 0]
    return wf


def composite(orig, canvas, raw, mask, blend=None):
    """Model output into the canvas through the mask, then the original back on top, blending only in the band
    (blend = (first row, rows); default the SEAM band at the original's bottom)."""
    out = canvas.copy()
    out.paste(raw, (0, 0), mask)
    w, h = orig.size
    y0, n = blend or (h - SEAM, SEAM)
    keep = Image.new('L', orig.size, 0)
    keep.paste(255, (0, 0, w, y0))
    ramp = np.linspace(255, 0, n).astype('uint8')
    keep.paste(Image.fromarray(np.repeat(ramp[:, None], w, 1)), (0, y0))
    out.paste(orig, (0, 0), keep)
    d = np.abs(np.asarray(out.crop((0, 0, w, y0))).astype(int) - np.asarray(orig.crop((0, 0, w, y0))).astype(int)).max()
    return out, int(d)


def main(jobs):
    os.makedirs(RAW, exist_ok=True)
    log_p = os.path.join(HERE, 'prompts.json')
    log = json.load(open(log_p)) if os.path.exists(log_p) else []
    for job in jobs:
        o = JOBS[job]
        orig, canvas, mask = prepare(o['fill'], o['add'])
        cp, mp = os.path.join(RAW, f'{job}-pad.png'), os.path.join(RAW, f'{job}-mask.png')
        canvas.save(cp)
        mask.convert('RGB').save(mp)
        for seed in SEEDS:
            name = f'{job}-s{seed}'
            raw = os.path.join(RAW, f"{o.get('raw_from', job)}-s{seed}-raw.png")
            if not os.path.exists(raw):
                check_lock()
                comfy.run(workflow(comfy.upload(cp), comfy.upload(mp), seed, o['denoise'], o.get('lllite', False)), raw)
            full, diff = composite(orig, canvas, Image.open(raw).convert('RGB'), mask, o.get('blend'))
            full.save(os.path.join(RAW, name + '.png'))
            full.save(os.path.join(HERE, name + '.webp'), 'WEBP', quality=92)
            print(name, 'max change above the blend:', diff, flush=True)
            log = [e for e in log if e['id'] != name] + [dict(id=name, job=job, seed=seed, change=o['change'], fill=o['fill'],
                   denoise=o['denoise'], lllite=o.get('lllite', False), prompt=PROMPT, negative=NEG, model=RDBT, steps=30, cfg=5,
                   sampler='euler_ancestral normal', source='rei-i65-2102', canvas=list(canvas.size), added_px=o['add'], seam_px=SEAM, blend=o.get('blend') or [1152 - SEAM, SEAM], raw_from=o.get('raw_from', job),
                   max_change_above_blend=diff)]
        json.dump(log, open(log_p, 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:] or list(JOBS))
