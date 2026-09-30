# ComfyUI passes for the top-down island map (see topdown.py for the geometry).
#   gen.py delabel                 remove the three callout labels from the picked map (Klein masked inpaint)
#   gen.py fill MODEL IN OUT SEED  fill the hidden ground and the sea outside the picture, in 1024 tiles
#   gen.py unify IN OUT DENOISE SEED   light Klein img2img over the whole map, in tiles
# Needs the GPU lock (GUIDE, Engineering). Workflows are saved to tools/workflows/island-topdown-*.json.
import json, os, sys, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, 'work')
WF = os.path.join(ROOT, 'tools', 'workflows')

KLEIN_TOP = ('Straight top-down view, looking straight down from directly above, of a small island town in a simple '
             'faceted 3D illustration style. {what} No shadows, no text.')
ANIMA_Q = 'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, '
ANIMA_NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, text, '
             'watermark, signature, people, person, 1girl, 1boy, character, letters, logo, perspective, horizon, sky')


def klein(image, mask, prompt, seed, steps=4, ref=True, denoise_sigmas=None):
    wf = {
        'U': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'flux-2-klein-4b-fp8.safetensors', 'weight_dtype': 'default'}},
        'C': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_4b.safetensors', 'type': 'flux2'}},
        'V': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'flux2-vae.safetensors'}},
        'T': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['C', 0]}},
        'L': {'class_type': 'LoadImage', 'inputs': {'image': image}},
        'E': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['L', 0], 'vae': ['V', 0]}},
        'W': {'class_type': 'GetImageSize', 'inputs': {'image': ['L', 0]}},
        'S': {'class_type': 'Flux2Scheduler', 'inputs': {'steps': steps, 'width': ['W', 0], 'height': ['W', 1]}},
        'K': {'class_type': 'KSamplerSelect', 'inputs': {'sampler_name': 'euler'}},
        'R': {'class_type': 'RandomNoise', 'inputs': {'noise_seed': seed}},
        'D': {'class_type': 'VAEDecode', 'inputs': {'samples': ['X', 0], 'vae': ['V', 0]}},
        'O': {'class_type': 'SaveImage', 'inputs': {'images': ['D', 0], 'filename_prefix': 'island-topdown/klein'}},
    }
    cond = ['T', 0]
    if ref:
        wf['RL'] = {'class_type': 'ReferenceLatent', 'inputs': {'conditioning': ['T', 0], 'latent': ['E', 0]}}
        cond = ['RL', 0]
    wf['G'] = {'class_type': 'BasicGuider', 'inputs': {'model': ['U', 0], 'conditioning': cond}}
    latent = ['E', 0]
    if mask:
        wf['M'] = {'class_type': 'LoadImageMask', 'inputs': {'image': mask, 'channel': 'red'}}
        wf['N'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['E', 0], 'mask': ['M', 0]}}
        latent = ['N', 0]
    sig = ['S', 0]
    if denoise_sigmas is not None:  # img2img: keep only the last part of the schedule
        wf['SP'] = {'class_type': 'SplitSigmasDenoise', 'inputs': {'sigmas': ['S', 0], 'denoise': denoise_sigmas}}
        sig = ['SP', 1]
    wf['X'] = {'class_type': 'SamplerCustomAdvanced', 'inputs': {'noise': ['R', 0], 'guider': ['G', 0], 'sampler': ['K', 0],
                                                                 'sigmas': sig, 'latent_image': latent}}
    return wf


def anima_inpaint(image, mask, prompt, seed, model='rdbtAnima.safetensors', denoise=1.0, steps=30):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': model, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': ANIMA_Q + prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': ANIMA_NEG, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': image}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': mask, 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        'P': {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}},
        'A': {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0],
                                                           'mask': ['12', 0], 'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}},
        '14': {'class_type': 'DifferentialDiffusion', 'inputs': {'model': ['A', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['14', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': steps, 'cfg': 5.0, 'sampler_name': 'euler_ancestral',
                                                   'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'island-topdown/anima'}},
    }


def save_wf(name, wf):
    for d in (WF, os.path.expanduser('~/ai/workflows')):
        os.makedirs(d, exist_ok=True)
        json.dump(wf, open(os.path.join(d, f'island-topdown-{name}.json'), 'w'), indent=1)


def lock_ok():
    try:
        return 'island-topdown' in open('/tmp/claude-1000/gpu.lock/owner').read()
    except OSError:
        return False


def run(wf, out):
    if not lock_ok():
        raise SystemExit('GPU lock is not ours; stopping')
    return comfy.run(wf, out)


def tiles(w, h, size=1024, overlap=128):
    def starts(n):
        if n <= size:
            return [0]
        k = int(np.ceil((n - overlap) / (size - overlap)))
        return [round(i * (n - size) / (k - 1)) for i in range(k)]
    return [(x, y) for y in starts(h) for x in starts(w)]


def fill(model, src, out, seed, what, mask_path):
    img = Image.open(src).convert('RGB')
    mask = Image.open(mask_path).convert('L')
    W, H = img.size
    tmp = os.path.join(WORK, 'tiles'); os.makedirs(tmp, exist_ok=True)
    for n, (x, y) in enumerate(tiles(W, H)):
        box = (x, y, min(x + 1024, W), min(y + 1024, H))
        m = mask.crop(box)
        if np.asarray(m).max() == 0:
            continue
        ip, mp = os.path.join(tmp, f't{n}.png'), os.path.join(tmp, f't{n}-m.png')
        img.crop(box).save(ip)
        m.filter(ImageFilter.MaxFilter(9)).save(mp)
        iname, mname = comfy.upload(ip), comfy.upload(mp)
        if model == 'klein':
            wf = klein(iname, mname, KLEIN_TOP.format(what=what), seed + n)
        else:
            wf = anima_inpaint(iname, mname, what, seed + n, denoise=float(os.environ.get('DENOISE', '1.0')))
        if n == 0:
            save_wf(f'fill-{model}', wf)
        res = Image.open(run(wf, os.path.join(tmp, f't{n}-out.png'))).convert('RGB').resize(m.size)
        # paste only the masked pixels back, softened a little at the edge
        soft = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
        img.paste(res, box[:2], soft)
        print('tile', n, box, flush=True)
    img.save(out)


def unify(src, out, denoise, seed, what):
    img = Image.open(src).convert('RGB')
    W, H = img.size
    acc = np.zeros((H, W, 3), np.float64); wsum = np.zeros((H, W, 1), np.float64)
    tmp = os.path.join(WORK, 'tiles'); os.makedirs(tmp, exist_ok=True)
    for n, (x, y) in enumerate(tiles(W, H, overlap=256)):
        box = (x, y, min(x + 1024, W), min(y + 1024, H))
        ip = os.path.join(tmp, f'u{n}.png'); img.crop(box).save(ip)
        wf = klein(comfy.upload(ip), None, KLEIN_TOP.format(what=what), seed + n, steps=8, denoise_sigmas=denoise)
        if n == 0:
            save_wf('unify-klein', wf)
        res = np.asarray(Image.open(run(wf, os.path.join(tmp, f'u{n}-out.png'))).convert('RGB').resize((box[2] - box[0], box[3] - box[1])), np.float64)
        # feathered blend so tile seams don't show
        hh, ww = res.shape[:2]
        wy = np.minimum(np.arange(hh) + 1, hh - np.arange(hh)).clip(max=128)[:, None]
        wx = np.minimum(np.arange(ww) + 1, ww - np.arange(ww)).clip(max=128)[None, :]
        wgt = (wy * wx)[..., None].astype(np.float64)
        acc[box[1]:box[3], box[0]:box[2]] += res * wgt; wsum[box[1]:box[3], box[0]:box[2]] += wgt
        print('tile', n, box, flush=True)
    Image.fromarray(np.clip(acc / wsum, 0, 255).astype(np.uint8)).save(out)


LABELS = [  # callout boxes and leaders on the picked map, picture px (x0, y0, x1, y1)
    (202, 499, 384, 542), (353, 528, 386, 564),     # Honsha Station / Security
    (500, 433, 624, 469), (488, 452, 514, 478),     # Head Office · B2
    (1096, 627, 1169, 663), (1076, 648, 1112, 698),  # Dorms
]


def delabel(seed=11):
    from topdown import ORIG
    img = Image.open(ORIG).convert('RGB')
    m = Image.new('L', img.size, 0); d = ImageDraw.Draw(m)
    for b in LABELS:
        d.rectangle(b, fill=255)
    os.makedirs(WORK, exist_ok=True)
    mp = os.path.join(WORK, 'label-mask.png'); m.save(mp)
    wf = klein(comfy.upload(ORIG), comfy.upload(mp),
               'A high oblique bird\'s-eye view of a small island town in a simple faceted 3D illustration style: '
               'a blue curved station roof, grey office walls with blue windows, pale apartment walls, paved paths and trees. No text, no labels.',
               seed)
    save_wf('delabel-klein', wf)
    res = Image.open(run(wf, os.path.join(WORK, 'delabel-raw.png'))).convert('RGB').resize(img.size)
    img.paste(res, (0, 0), m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.5)))
    img.save(os.path.join(WORK, 'delabelled.png'))


if __name__ == '__main__':
    sys.path.insert(0, HERE)
    a = sys.argv[1:]
    if a[0] == 'delabel':
        delabel(int(a[1]) if len(a) > 1 else 11)
    elif a[0] == 'fill':
        fill(a[1], a[2], a[3], int(a[4]), a[5], a[6])
    elif a[0] == 'unify':
        unify(a[1], a[2], float(a[3]), int(a[4]), a[5])
