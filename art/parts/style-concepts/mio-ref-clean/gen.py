"""mio-ref-clean: a clean, high-res copy of the picked char-face-1 target (mio-front-d60), one change per step.
Jørgen (2026-10-01): "do we have mio-front-d60 is high res, without shadow and without the rope things and without glasses"

  python3 gen.py up        step 01: RealESRGAN x4 anime, lanczos down to 3072 (GPU)
  python3 clean.py shadow  step 02: floor shadow out, plain background (CPU)
  python3 gen.py strings   step 03: drawstrings painted out (GPU, masked inpaint in a 1024 crop)
  python3 gen.py glasses   step 04: glasses out, eyes and brows redrawn (GPU, masked inpaint in a 1024 crop)
Binaries go to the main checkout's art/parts/style-concepts/mio-ref-clean/ (git-ignored); settings to prompts.json here."""
import json, os, sys
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import comfy

SRC = '/home/jorgen/repo/japanese/art/parts/style-concepts/claude-facetface/gen/i2i-cf04/mio-front-d60.png'
OUT = '/home/jorgen/repo/japanese/art/parts/style-concepts/mio-ref-clean'
LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prompts.json')


def log(key, entry):
    d = json.load(open(LOG)) if os.path.exists(LOG) else {}
    d[key] = entry
    json.dump(d, open(LOG, 'w'), indent=1)


def up():
    name = comfy.upload(SRC)
    wf = {
        '1': {'class_type': 'LoadImage', 'inputs': {'image': name}},
        '2': {'class_type': 'UpscaleModelLoader', 'inputs': {'model_name': 'RealESRGAN_x4plus_anime_6B.pth'}},
        '3': {'class_type': 'ImageUpscaleWithModel', 'inputs': {'upscale_model': ['2', 0], 'image': ['1', 0]}},
        '4': {'class_type': 'ImageScaleBy', 'inputs': {'image': ['3', 0], 'upscale_method': 'lanczos', 'scale_by': 0.75}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['4', 0], 'filename_prefix': 'mio-ref-clean/up'}},
    }
    comfy.run(wf, f'{OUT}/step-01-upscale.png')
    json.dump(wf, open(os.path.join(os.path.dirname(LOG), 'workflow-01-upscale.json'), 'w'), indent=1)
    log('step-01-upscale', {'source': SRC, 'method': 'RealESRGAN_x4plus_anime_6B x4, lanczos x0.75 -> 3072x3072', 'workflow': 'workflow-01-upscale.json'})


Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe, 1girl, solo, '
     'Mio, a 25-year-old woman: black hair with green underneath, light tan eyes, narrow almond eyes, half-lidded, slim with soft curves, ')
TAIL = ', calm neutral expression, low poly 3d game character, faceted flat-shaded polygons, anime face, looking at the viewer, plain light grey background'
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, bad anatomy, extra limbs, '
       'child, loli, text, watermark, signature, fat, obese, plump, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, '
       'phone, cup, realistic, photorealistic')
# the char-face-1 prompt (i2i-cf04/prompts.json, mio-front-d60) with one phrase changed per step
STEPS = {
    'strings': dict(src='step-02-no-shadow.png', box=(1025, 640, 2049, 1664), scale=1.0,
                    prompt=Q + 'oversized black hoodie, no drawstrings, glasses' + TAIL,
                    neg=NEG + ', drawstrings, hoodie strings, cords, aglets, eyelets'),
    'strings-refine': dict(src='step-03c-no-strings-rowfill.png', box=(1025, 640, 2049, 1664), scale=1.0,
                    prompt=Q + 'oversized black hoodie, no drawstrings, glasses' + TAIL,
                    neg=NEG + ', drawstrings, hoodie strings, cords, aglets, eyelets'),
    'glasses': dict(src='step-03-no-strings.png', box=(1170, 260, 1938, 1028), scale=1024 / 768,
                    prompt=Q + 'oversized black hoodie, no glasses' + TAIL,
                    neg=NEG + ', glasses, eyewear, black-framed eyewear, round eyewear'),
    'glasses-refine': dict(src='step-04c-no-glasses-cvfill.png', box=(1170, 260, 1938, 1028), scale=1024 / 768,
                    prompt=Q + 'oversized black hoodie, no glasses' + TAIL,
                    neg=NEG + ', glasses, eyewear, black-framed eyewear, round eyewear'),
}


def inpaint(step, mask_png, seed, denoise, out_png):
    """Masked img2img (RDBT + Anima LLLite inpainting-v2) on a crop of the previous step; the crop is pasted back
    through the feathered mask, so nothing outside the mask changes."""
    from PIL import Image, ImageFilter
    st = STEPS[step]
    x0, y0, x1, y1 = st['box']
    n = int(round((x1 - x0) * st['scale']))
    base = Image.open(f"{OUT}/{st['src']}").convert('RGB')
    mask = Image.open(mask_png).convert('L')
    crop, mcrop = base.crop(st['box']), mask.crop(st['box'])
    tmp = f'/tmp/claude-1000/mio-ref-clean-{step}'
    os.makedirs(tmp, exist_ok=True)
    crop.resize((n, n), Image.LANCZOS).save(f'{tmp}/crop.png')
    mcrop.resize((n, n), Image.LANCZOS).save(f'{tmp}/mask.png')
    img, msk = comfy.upload(f'{tmp}/crop.png'), comfy.upload(f'{tmp}/mask.png')
    wf = {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'rdbtAnima.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': st['prompt'], 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': st['neg'], 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': img}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': msk, 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        'P': {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}},
        'A': {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                        'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['A', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5.0, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal',
                                                   'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': f'mio-ref-clean/{step}'}},
    }
    comfy.run(wf, f'{tmp}/out.png')
    json.dump(wf, open(os.path.join(os.path.dirname(LOG), f'workflow-{step}.json'), 'w'), indent=1)
    gen = Image.open(f'{tmp}/out.png').convert('RGB').resize((x1 - x0, y1 - y0), Image.LANCZOS)
    m = mcrop.filter(ImageFilter.GaussianBlur(2))
    out = base.copy()
    out.paste(Image.composite(gen, crop, m), (x0, y0))
    out.save(out_png)
    log(os.path.basename(out_png)[:-4], {'source': st['src'], 'crop': st['box'], 'crop_scale': st['scale'], 'mask': os.path.basename(mask_png),
                                        'model': 'rdbtAnima.safetensors + anima-lllite-inpainting-v2', 'seed': seed, 'denoise': denoise,
                                        'steps': 30, 'cfg': 5.0, 'sampler': 'euler_ancestral', 'prompt': st['prompt'], 'negative': st['neg'],
                                        'workflow': f'workflow-{step}.json'})


if __name__ == '__main__':
    if sys.argv[1] == 'inpaint':
        inpaint(sys.argv[2], sys.argv[3], int(sys.argv[4]), float(sys.argv[5]), sys.argv[6])
        sys.exit()
    globals()[sys.argv[1]]()
