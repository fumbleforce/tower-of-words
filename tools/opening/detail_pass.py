"""Local detail pass for pilot-b (free): the Nano Banana Pro exterior upscaled 2x (RealESRGAN anime, art/opening/cloud/pilotb-up2x.png),
then a masked low-denoise repaint with One Obsession of only the train, beam and pillars in the near tile, pasted back through a
feathered mask so everything else stays identical. Mask = not sea or sky (the structures are white/grey, the water and sky blue).
Run: ~/ai/sd/venv/bin/python tools/opening/detail_pass.py  -> art/opening/cloud/pilotb-detail-<denoise>.png"""
import os, sys, json
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import comfy, comfy_op

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'opening', 'cloud')
BOX = (900, 1850, 900 + 1824, 1850 + 1216)   # near tile in 2x coords: the train and the near beam
PROMPT = ('anime screenshot, anime coloring, 2d, cel shading, clean lineart, detailed anime background art, hand-painted anime background, no humans, scenery, '
          'a detailed modern white monorail train of four cars on a concrete monorail beam over a calm bay, windows, sliding doors, panel lines, '
          'the concrete beam with segment joints, round concrete pillars. Early morning, soft warm light.')
NEG = ('worst quality, low quality, blurry, jpeg artifacts, text, watermark, logo, letters, 3d, realistic, photorealistic, '
       'rails, railway sleepers, second track, boat, people')


def wf(img, msk, dn, seed):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': 'oneObsessionAnima.safetensors', 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': PROMPT, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': NEG, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(img)}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(msk), 'channel': 'red'}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': dn}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'opening-detail'}},
    }


if __name__ == '__main__':
    full = Image.open(os.path.join(R, 'pilotb-up2x.png')).convert('RGB')
    tile = full.crop(BOX)
    a = np.asarray(tile).astype(np.int16)
    struct = (a[..., 2] - a[..., 0] < 45) & (a.mean(-1) > 90)     # white/grey structures, not blue water
    m = Image.fromarray((struct * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(8))
    tp, mp = os.path.join(R, 'detail-tile.png'), os.path.join(R, 'detail-mask.png')
    tile.save(tp); m.convert('RGB').save(mp)
    for dn, seed in [(0.3, 11), (0.38, 12), (0.45, 13)]:
        out = os.path.join(R, f'pilotb-detail-{int(dn * 100)}.png')
        if os.path.exists(out):
            continue
        tmp = out + '.tile.png'
        w = wf(tp, mp, dn, seed)
        comfy_op.run(w, tmp)
        rep = Image.open(tmp).convert('RGB').resize(tile.size)
        pasted = full.copy()
        pasted.paste(Image.composite(rep, tile, m), BOX[:2])
        pasted.save(out)
        os.remove(tmp)
        os.replace(tmp[:-4] + '.workflow.json', out[:-4] + '.workflow.json')
        print('ok', out, flush=True)
