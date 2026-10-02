"""Per-part input pictures for the parts method (#171, reviews/char-mio-parts-1), cut from the target picture
(art/parts/style-concepts/mio-ref-clean/final-cutout.png, the cleaned gen-i2i mio-front-d60 picked in char-face-1).

  inputs.py head      head and hair above the neck line, plus the long lock over her right shoulder (image left)  (CPU)
  inputs.py strands   inpaint that lock out of the hoodie so the body has no painted hair on it                   (GPU, ComfyUI)
  inputs.py body      everything below the neck line, from the inpainted picture                                  (CPU)
  inputs.py hair      the head picture with the skin taken out: hair only                                         (CPU)
Coordinates are pixels of the 3072x3072 picture. Pictures go to the main checkout's art/parts/char-mio-parts/inputs/
(git-ignored); settings to the round's review folder (inputs.json)."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

MAIN = '/home/jorgen/repo/japanese'
SRC = f'{MAIN}/art/parts/style-concepts/mio-ref-clean/final-cutout.png'
OUT = f'{MAIN}/art/parts/char-mio-parts/inputs'
LOG = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
                   'reviews/char-mio-parts-1/inputs.json')

# The neck line: under the hair on both sides, straight across the neck at y=830. Above it is the head part.
NECK = [(1100, 860), (1300, 860), (1400, 805), (1490, 805), (1495, 830), (1582, 830), (1590, 805), (1700, 800),
        (1760, 842), (2000, 852)]
# Her right front lock (image left), which hangs over the hoodie below the neck line.
LOCK = [(1245, 860), (1293, 915), (1290, 1045), (1350, 1098), (1356, 1066), (1418, 1074), (1405, 960), (1400, 800), (1290, 830)]
# Outside the hoodie's shoulder: hair only, so never part of the body.
OUTSIDE = [(1100, 850), (1300, 850), (1293, 918), (1240, 1062), (1100, 1062)]


def poly_mask(size, *polys):
    m = Image.new('L', size, 0); d = ImageDraw.Draw(m)
    for p in polys: d.polygon(p, fill=255)
    return m


def above_neck(size):
    return poly_mask(size, [(0, 0), (size[0], 0)] + [(min(x, size[0]), y) for x, y in NECK[::-1]])


def log(key, entry):
    d = json.load(open(LOG)) if os.path.exists(LOG) else {}
    d[key] = entry
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(d, open(LOG, 'w'), indent=1, ensure_ascii=False)


def square(im, size, margin=0.06):
    """Crop to the alpha bbox, pad to a centred square with a margin, resize."""
    im = im.crop(im.split()[3].getbbox())
    s = int(max(im.size) * (1 + 2 * margin))
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return sq.resize((size, size), Image.LANCZOS)


def head():
    src = Image.open(SRC).convert('RGBA')
    keep = Image.fromarray(np.maximum(np.array(above_neck(src.size)), np.array(poly_mask(src.size, LOCK))))
    a = Image.fromarray(np.minimum(np.array(src.split()[3]), np.array(keep)))
    src.putalpha(a)
    square(src, 1024).save(f'{OUT}/head.png')
    log('head', {'source': SRC, 'method': 'alpha cut: above the neck line plus her right front lock; cropped, padded square, 1024',
                 'neck_line': NECK, 'lock': LOCK})


def strands():
    sys.path.insert(0, f'{MAIN}/tools')
    import comfy
    src = Image.open(SRC).convert('RGBA')
    flat = Image.new('RGB', src.size, (225, 227, 231)); flat.paste(src, mask=src.split()[3])
    # the lock below the neck line, grown a little so its dark outline goes too
    m = Image.fromarray(np.minimum(np.array(poly_mask(src.size, LOCK)), 255 - np.array(above_neck(src.size))))
    m = m.filter(ImageFilter.MaxFilter(9))
    # Seeds 401-404 at denoise 1.0 kept redrawing the lock from the hair above it. So the model now sees the head
    # area as background and the lock pre-filled with the hoodie's colour, and repaints that at denoise 0.85.
    bgc = Image.new('RGB', src.size, (225, 227, 231))
    flat = Image.composite(bgc, flat, Image.fromarray(np.maximum(np.array(above_neck(src.size)), np.array(poly_mask(src.size, OUTSIDE)))))
    flat = Image.composite(Image.new('RGB', src.size, flat.getpixel((1450, 1000))), flat, m)
    box = (1060, 700, 1700, 1340)                     # 640 crop around the lock, worked at 1024
    n = 1024
    tmp = '/tmp/claude-1000/char-mio-parts-strands'; os.makedirs(tmp, exist_ok=True)
    flat.crop(box).resize((n, n), Image.LANCZOS).save(f'{tmp}/crop.png')
    m.crop(box).resize((n, n), Image.LANCZOS).save(f'{tmp}/mask.png')
    img, msk = comfy.upload(f'{tmp}/crop.png'), comfy.upload(f'{tmp}/mask.png')
    prompt = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, '
              'oversized black hoodie, shoulder and chest of the hoodie, low poly 3d game character, faceted flat-shaded polygons, '
              'plain light grey background')
    neg = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, text, '
           'watermark, signature, hair, green hair, strand of hair, (rim light, red rim light, red outline, backlighting:1.4), '
           'drawstrings, realistic, photorealistic')
    seed, denoise = int(os.environ.get('SEED', 405)), 0.85
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'rdbtAnima.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': prompt, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': img}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': msk, 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        'P': {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}},
        'A': {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                        'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['A', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5.0, 'sampler_name': 'euler_ancestral',
                                                   'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'char-mio-parts/strands'}},
    }
    comfy.run(wf, f'{tmp}/out.png')
    json.dump(wf, open(f'{OUT}/workflow-strands.json', 'w'), indent=1)
    gen = Image.open(f'{tmp}/out.png').convert('RGB').resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
    mb = m.crop(box).filter(ImageFilter.GaussianBlur(2))
    out = src.copy()
    rgb = Image.composite(gen, flat.crop(box), mb).convert('RGBA')
    rgb.putalpha(src.crop(box).split()[3])
    out.paste(rgb, box[:2])
    out.save(f'{OUT}/no-lock-s{seed}.png'); out.save(f'{OUT}/no-lock.png')
    log(f'strands-s{seed}', {'source': SRC, 'crop': box, 'crop_px': n, 'model': 'rdbtAnima.safetensors + anima-lllite-inpainting-v2',
                    'seed': seed, 'denoise': denoise, 'steps': 30, 'cfg': 5.0, 'sampler': 'euler_ancestral', 'prompt': prompt,
                    'negative': neg, 'mask': 'her right front lock below the neck line, grown 4 px; from s405 the head area shown as background and the lock pre-filled with the hoodie colour', 'workflow': 'workflow-strands.json'})


def body():
    src = Image.open(f'{OUT}/no-lock.png').convert('RGBA')
    cut = np.maximum(np.array(above_neck(src.size)), np.array(poly_mask(src.size, OUTSIDE)))
    a = np.array(src).astype(int)                        # the background grey the inpaint saw where the hair was
    grey = (np.abs(a[..., :3] - np.array([225, 227, 231])).max(-1) < 18) * 255
    cut = np.maximum(cut, np.array(Image.fromarray(grey.astype('uint8')).filter(ImageFilter.MaxFilter(5))))
    src.putalpha(Image.fromarray(np.minimum(np.array(src.split()[3]), 255 - cut)))
    square(src, 2048).save(f'{OUT}/body.png')
    log('body', {'source': 'no-lock.png (= no-lock-s405.png, picked: the cleanest hoodie where the lock was)', 'method': 'alpha cut: below the neck line, hair outside the shoulder removed; padded square, 2048',
                 'outside': OUTSIDE})


def hair():
    """Hair only: the head picture minus skin, eyes and brows (anything not hair-coloured inside the face outline)."""
    src = Image.open(SRC).convert('RGBA')
    a = np.array(src).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    skinlike = (r > g + 12) & (r > 110)               # skin, lips, ear, nose: warm and light
    eyes = (r > 150) & (g > 100) & (b < 120)            # amber irises
    whites = (r > 200) & (g > 200) & (b > 200)
    face = Image.fromarray(((skinlike | eyes | whites) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))
    keep = np.maximum(np.array(above_neck(src.size)), np.array(poly_mask(src.size, LOCK)))
    alpha = np.minimum(np.minimum(a[..., 3], keep), 255 - np.array(face))
    out = src.copy(); out.putalpha(Image.fromarray(alpha.astype('uint8')))
    square(out, 1024).save(f'{OUT}/hair.png')
    log('hair', {'source': SRC, 'method': 'head cut, then skin, eye and white pixels made transparent (colour thresholds)'})


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    globals()[sys.argv[1]]()
