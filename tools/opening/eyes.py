"""Eye frames for the opening's character shots, by face-only inpainting of the approved sprites (everything outside the
eye masks stays identical). mc-open: the approved main character sprite has his eyes squeezed shut, so the opening needs an
eyes-open version; *-closed: blink frames. Candidates go to art/opening/eyes/<name>-<seed>.png at the sprite's size.
Run: ~/ai/sd/venv/bin/python tools/opening/eyes.py [job ...]"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy_op
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'art', 'opening', 'eyes')
Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'anime screenshot, anime coloring, 2d, cel shading, clean lineart, safe')
N = ('worst quality, low quality, blurry, jpeg artifacts, bad anatomy, deformed eyes, asymmetrical eyes, cross-eyed, extra eyes, '
     '3d, realistic, photorealistic')
# name: (sprite, crop box, eye ellipses in sprite px, description, eye words, denoise, seeds)
MC = ('1boy, adult, a tired 34-year-old Scandinavian man, short dark-blond hair, short dark-blond beard, fair pale skin, light eyebrows, '
      'glasses with clear lenses, close-up of his face')
JOBS = {
    'mc-open': ('art/production/M/02-it-guy-601.png', (250, 150, 680, 580), [(352, 262, 444, 326), (466, 262, 580, 326)], MC,
                '(open eyes:1.5), calm blue eyes looking at the viewer, relaxed eyelids, faint hopeful look, symmetrical eyes', 0.8, (1, 2, 3, 4)),
    'emi-closed': ('art/slice/emi2/r3/rdbt/work-41.png', (230, 100, 660, 530), [(312, 228, 402, 292), (484, 202, 562, 266)],
                   '1girl, adult woman, auburn bob, clear tortoiseshell glasses, close-up of her face, smiling',
                   '(closed eyes:1.5), eyes shut, happy closed eyes, long eyelashes', 0.8, (1, 2)),
    'rei-closed': ('art/production/B/rei-smirk.png', (200, 180, 630, 610), [(266, 320, 344, 376), (414, 256, 492, 308)],
                   '1girl, adult woman, silver hair, close-up of her face, thin knowing smile',
                   '(closed eyes:1.5), eyes shut, calm, long eyelashes, sharp eyeliner', 0.8, (1, 2)),
    'mio-closed': ('art/production/B/mio-bored.png', (250, 250, 530, 530), [(292, 316, 366, 366), (404, 276, 496, 336)],
                   '1girl, adult woman, messy black hair with green underneath, thin glasses with clear lenses, close-up of her face, three-quarter view',
                   '(closed eyes:1.5), eyes shut, relaxed eyelids, long eyelashes, calm', 0.8, (1, 2)),
}
UP = 1024


def mask(ells, size, off, s, grow, blur):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    for e in ells:
        box = [(e[0] - off[0]) * s - grow, (e[1] - off[1]) * s - grow, (e[2] - off[0]) * s + grow, (e[3] - off[1]) * s + grow]
        d.ellipse(box, fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def inpaint_wf(src, msk, prompt, seed, denoise):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': comfy_op.MODEL, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': N, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(src)}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(msk), 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal',
                                                   'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening-eyes'}},
    }


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for k in sys.argv[1:] or list(JOBS):
        src, box, ells, desc, words, dn, seeds = JOBS[k]
        base = Image.open(os.path.join(ROOT, src)).convert('RGB')
        s = UP / (box[2] - box[0])
        crop = base.crop(box).resize((UP, round((box[3] - box[1]) * s)), Image.LANCZOS)
        cp = os.path.join(OUT, f'{k}-crop.png'); crop.save(cp)
        mp = os.path.join(OUT, f'{k}-mask.png'); mask(ells, crop.size, box[:2], s, 22, 8).convert('RGB').save(mp)
        for seed in seeds:
            out = os.path.join(OUT, f'{k}-{seed}.png')
            if os.path.exists(out):
                continue
            wf = inpaint_wf(cp, mp, f'{Q}, {desc}, {words}', seed, dn)
            tmp = out + '.tmp.png'
            comfy_op.run(wf, tmp)
            rep = Image.open(tmp).convert('RGB').resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
            full = base.copy(); full.paste(rep, box[:2])
            m = mask(ells, base.size, (0, 0), 1, 8, 3)
            Image.composite(full, base, m).save(out)
            os.remove(tmp)
            os.replace(tmp[:-4] + '.workflow.json', out[:-4] + '.workflow.json')
            print('ok', out, flush=True)
