"""Shot 3, mio-window-look: the picked shot-2 picture with only her face changed (eyes raised to the viewer, head still
bowed, deadpan). Run through gen.py (it holds the GPU lock and starts ComfyUI): gen.py look:<source>:<seed>:<denoise>

- Crop a square around her face (imgutils face box, 1.7x), upscale to 1024.
- Mask: her eyes only (imgutils eye boxes, grown to take the lids), soft; her mouth is already a flat deadpan line, so
  the rest of the face, hair and bangs stay as they are. Eyes are in the mask on purpose: they are the change.
- RDBT + LLLite inpainting-v2 (strength 1.0) on the masked crop, the shot's light, "eyes raised, looking at the viewer".
- Paste the repainted face back through the soft mask, then her glasses frame pixels from the source on top, so the frame
  is identical to shot 2 (art/PROMPTS.md "Mio's glasses")."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import gen
import comfy
import consist
from production import Q

UP = 1024
LOOK = ('safe, 1girl, solo, close-up of her face, Mio, a 30-year-old woman, pale skin, very dark green hair bordering on black '
        'with bangs, light tan eyes, thin-framed glasses with clear lenses, head bowed, eyes raised looking up at the viewer, '
        'looking at viewer, deadpan, unimpressed, half-lidded eyes, expressionless, soft warm morning sunlight from the right')
LOOK_NEG = (gen.MIO_NEG.replace('looking at viewer, ', '') +
            ', looking down, closed eyes, smile, frown, furrowed brow, angry, crying, open mouth, sunglasses, tinted eyewear')


def source(name):
    for suffix in ('-glasses.png', '-final.png', '.png'):
        p = os.path.join(gen.RAW, name + suffix)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)


def frame_mask(name, size):
    p = os.path.join(gen.RAW, name + '-frame.png')
    if os.path.exists(p):
        return Image.open(p).convert('L')
    if gen.JOBS.get(name, {}).get('method') == 'i2i':
        return Image.fromarray((gen.mio_phone_frame() * 255).astype('uint8'))
    raise FileNotFoundError('no frame mask for ' + name)


def run(spec):
    parts = spec.split(':')
    _, name, seed, d = parts[:4]
    side_glance = len(parts) > 4 and parts[4] == 'side'
    seed, d = int(seed), float(d)
    src_p = source(name)
    img = Image.open(src_p).convert('RGB')
    fx0, fy0, fx1, fy1 = consist.faces([src_p])[src_p][0]
    fw, fh = fx1 - fx0, fy1 - fy0
    side = int(1.7 * max(fw, fh))
    cx, cy = (fx0 + fx1) / 2, (fy0 + fy1) / 2
    bx = int(min(max(cx - side / 2, 0), img.width - side))
    by = int(min(max(cy - side / 2, 0), img.height - side))
    box = (bx, by, bx + side, by + side)
    crop = img.crop(box).resize((UP, UP), Image.LANCZOS)
    # the eyes only (her mouth is already a flat deadpan line): each detected eye box grown to take the lids and the brow
    # line under the bangs, soft ellipses
    sys.path.insert(0, os.path.join(gen.ROOT, 'tools'))
    import portrait_candidates as pc
    eyes = pc.eye_boxes(src_p, pad=0)
    m = Image.new('L', img.size, 0)
    for ex0, ey0, ex1, ey1 in eyes:
        w, h = ex1 - ex0, ey1 - ey0
        ImageDraw.Draw(m).ellipse((ex0 - 0.35 * w, ey0 - 0.7 * h, ex1 + 0.35 * w, ey1 + 0.45 * h), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(max(2, fw * 0.015)))
    mc = m.crop(box).resize((UP, UP), Image.LANCZOS)
    tag = f'look-{name}-{seed}-d{int(d * 100)}' + ('-side' if side_glance else '')
    cp, mp = os.path.join(gen.RAW, tag + '-crop.png'), os.path.join(gen.RAW, tag + '-mask.png')
    crop.save(cp)
    mc.save(mp)
    out = os.path.join(gen.RAW, tag + '-work.png')
    # side-view renders: one phrase changed, the eyes turned sideways toward us rather than "raised"
    prompt = f'{Q}, {LOOK}'.replace('eyes raised looking up at the viewer', 'sideways glance at the viewer') if side_glance else f'{Q}, {LOOK}'
    if not os.path.exists(out):
        wf = comfy.anima(prompt, LOOK_NEG, model=gen.RDBT, w=UP, h=UP, steps=30, cfg=5, seed=seed)
        wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}}
        wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
        wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
        wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
        wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': gen.LLLITE_INPAINT}}
        wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0],
                                                               'mask': ['12', 0], 'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
        wf['7']['inputs'].update(model=['A', 0], latent_image=['13', 0], denoise=d)
        del wf['6']
        gen.check_lock()
        comfy.run(wf, out)
    work = Image.open(out).convert('RGB').resize((side, side), Image.LANCZOS)
    full = img.copy()
    full.paste(work, box[:2], m.crop(box))
    fm = frame_mask(name, img.size).filter(ImageFilter.GaussianBlur(0.7))
    full = Image.composite(img, full, fm)
    final = os.path.join(gen.RAW, tag + '.png')
    full.save(final)
    full.save(os.path.join(gen.HERE, tag + '.webp'), quality=92)
    L = json.load(open(gen.LOG)) if os.path.exists(gen.LOG) else {}
    L[tag] = dict(shot='mio-window-look', method='look', source=os.path.relpath(src_p, gen.ROOT), seed=seed, denoise=d,
                  crop=list(box), face=[fx0, fy0, fx1, fy1], eyes=[list(e) for e in eyes], mask='eyes only, each eye box grown (0.35 w sides, 0.7 h above, 0.45 h below), soft', model='rdbtAnima', steps=30, cfg=5,
                  sampler='euler_ancestral normal', lllite='anima-lllite-inpainting-v2 1.0, masked crop 1024',
                  prompt=prompt, negative=LOOK_NEG, glasses='frame pixels pasted back from the source',
                  file=f'art/candidates/portraits/opening-window-1/{tag}.webp')
    json.dump(L, open(gen.LOG, 'w'), ensure_ascii=False, indent=1)
    print('ok', tag, flush=True)
