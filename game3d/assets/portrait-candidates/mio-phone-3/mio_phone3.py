"""Mio phone portrait, round 3: ipa7a-1001 (Jørgen's pick in mio-phone-2) with her approved glasses. One change: the glasses.

Jørgen: "glasses are the main issue with Mio, they keep changing to different shapes"; on ipa7a-1001: "The glasses are not
the same though." Target: the frames of art/approved/mio/mio-after.webp (canvas art/production/RF/mio.png): same shape,
thickness, taupe-grey colour and size. Everything else in ipa7a-1001 stays as it is.

Approaches (every attempt goes on the review sheet):
- comp:   CPU composite (composite.py). The approved frame pixels are warped onto her face, lens by lens, and her own silver
          frame is removed with OpenCV inpainting. No diffusion.
- clean:  comp, then the leftovers of the old frame (a thin mask: old frame minus new frame) repainted with RDBT + the LLLite
          inpainting patch; the approved frame pixels are pasted back on top, so the frame is the portrait's own pixels.
- blend:  clean, then a light masked img2img over the glasses band (denoise 0.2 / 0.3) so the pasted frame sits in the
          line work; nothing pasted back.
- ipa:    diffusion only: the glasses band of the original pick repainted (LLLite inpainting) with the Anima IP-Adapter on
          the approved portrait and the frames described in words.
- dip:    diffusion only: the diptych repaint (approved head on the left, her head on the right), glasses band masked.
All diffusion runs on a 400x400 crop around the glasses, upscaled to 1024, and only masked pixels are pasted back.
Usage: ~/ai/consist/.venv/bin/python mio_phone3.py <job> ...   jobs: comp, clean:<seed>, blend:<d>:<seed>:<src>, ipa:<seed>,
       dip:<seed>, cut <name>"""
import sys, os, json, subprocess
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(REPO, 'tools'))
import comfy  # noqa: E402
import composite  # noqa: E402
from geom import APPR, TGT, frame_mask  # noqa: E402

RAW = os.path.join(REPO, 'art/production/mio-phone-3')  # git-ignored full-size PNGs
OWNER = 'mio-phone-3'
LOG = os.path.join(HERE, 'log.json')
CB = (296, 392, 696, 792)   # crop around the glasses on the 1008x1296 canvas
UP = 1024
RDBT = 'rdbtAnima.safetensors'
Q = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
     'anime screenshot, anime coloring, 2d, cel shading, clean lineart')
FACE = ('safe, 1girl, solo, Mio, a 25-year-old woman, close-up of her face looking down, messy black hair with a blunt fringe, '
        'light tan eyes, tired, small frown, plain light grey background, soft even studio light')
GLASSES = 'glasses with thick taupe-grey frames, rounded rectangular lenses, clear lenses'
NEG = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, text, '
       'watermark, signature, 3d, realistic, photorealistic, render, child, loli, western cartoon, comic book, flat vector, '
       'thick outlines, poster art, pop art, rim light, red rim light, backlighting, sunglasses, tinted eyewear, silver frames')


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def log(entry):
    L = json.load(open(LOG)) if os.path.exists(LOG) else []
    L = [e for e in L if e['name'] != entry['name']] + [entry]
    json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)


def save(img, name):
    out = os.path.join(RAW, name + '.png')
    img.save(out)
    img.convert('RGB').resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, name + '.webp'), quality=92)
    return out


def parts():
    """The composite and its masks, cached as arrays."""
    if not hasattr(parts, 'c'):
        img, _ = composite.build(1.0, None)
        parts.c = dict(comp=img, alpha=composite.LAST['alpha'], wm=composite.LAST['wm'], old=composite.LAST['old'], warped=composite.LAST['warped'])
    return parts.c


def inpaint(src, mask, prompt, seed, denoise, ipa=None, lllite=True, name='x'):
    """Masked img2img on the crop CB (upscaled to 1024); returns the full image with only masked pixels changed."""
    check_lock()
    src = src.convert('RGB')
    crop = src.crop(CB).resize((UP, UP), Image.LANCZOS)
    mimg = Image.fromarray((mask * 255).astype('uint8')).crop(CB).resize((UP, UP), Image.BILINEAR)
    cp, mp = os.path.join(RAW, 'work', name + '-crop.png'), os.path.join(RAW, 'work', name + '-mask.png')
    os.makedirs(os.path.dirname(cp), exist_ok=True)
    crop.save(cp)
    mimg.convert('RGB').save(mp)
    wf = comfy.anima(prompt, NEG, model=RDBT, w=UP, h=UP, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(cp)}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
    wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
    model = ['1', 0]
    if lllite:
        wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
        wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': model, 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                               'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
        model = ['A', 0]
    if ipa:
        wf['IPL'] = {'class_type': 'AnimaIPAdapterLoader', 'inputs': {'ip_adapter_name': 'ip_adapter-Character_Reference-10.safetensors', 'auto_download': False}}
        wf['RI'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(APPR)}}
        wf['IPA'] = {'class_type': 'AnimaIPAdapterApply', 'inputs': {
            'model': model, 'ip_adapter': ['IPL', 0], 'ref_image': ['RI', 0], 'strength': float(ipa), 'ref_image_size': 512,
            'siglip_layer': -1, 'ip_cfg_scale': 4.0, 'ip_cfg_separate': False, 'gray_null': False, 'use_lora': True}}
        model = ['IPA', 0]
    wf['7']['inputs'].update(model=model, latent_image=['13', 0], denoise=float(denoise))
    del wf['6']
    wf['9']['inputs']['filename_prefix'] = 'miophone3/' + name
    raw = os.path.join(RAW, 'work', name + '-raw.png')
    comfy.run(wf, raw)
    for d in (HERE,):
        json.dump(wf, open(os.path.join(d, 'workflow-inpaint.json'), 'w'), indent=1)
    new = Image.open(raw).convert('RGB').resize((CB[2] - CB[0], CB[3] - CB[1]), Image.LANCZOS)
    full = src.copy()
    full.paste(new, CB[:2])
    soft = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0))
    return Image.composite(full, src, soft), prompt


def paste_frame(img):
    """The portrait's frame pixels on top of img; hair strands of img itself that cross the frame stay in front."""
    p = parts()
    a = (p['wm'] * (1 - composite.hair_mask(img)))[..., None]
    out = np.asarray(img.convert('RGB')).astype(np.float32) * (1 - a) + p['warped'] * a
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def job_comp():
    name = 'mio-phone3-comp'
    save(parts()['comp'], name)
    log({'name': name, 'method': 'CPU composite (composite.py): approved frame warped lens by lens onto ipa7a-1001, old frame '
         'removed with OpenCV Telea inpainting; no diffusion'})


def leftover_mask():
    p = parts()
    m = ndimage.binary_dilation(p['old'], iterations=2) & ~(p['alpha'] > 0.5)
    return m.astype(np.float32)


def job_clean(seed, denoise=0.75):
    name = f'mio-phone3-clean-{seed}'
    img, prompt = inpaint(parts()['comp'], leftover_mask(), f'{Q}, {FACE}, {GLASSES}', seed, denoise, name=name)
    save(img, name + '-nopaste')
    img = paste_frame(img)
    save(img, name)
    log({'name': name, 'method': f'comp, then the old frame\'s leftovers repainted (RDBT + LLLite inpainting-v2, denoise {denoise}), '
         'approved frame pixels pasted back on top', 'prompt': prompt, 'negative': NEG, 'seed': seed, 'denoise': denoise})


def band_mask(grow=6):
    p = parts()
    m = ndimage.binary_dilation((p['alpha'] > 0.1) | p['old'], iterations=grow)
    return m.astype(np.float32)


def job_blend(d, seed, src, keep_eyes=False, keep_frame=False):
    name = f'mio-phone3-blend{"k" if keep_eyes else ""}{int(round(d * 100))}-{seed}-{src.replace("mio-phone3-", "")}'
    base = Image.open(os.path.join(RAW, src + '.png'))
    m = band_mask(4)
    if keep_eyes:  # her eyes stay as they are
        for x0, y0, x1, y1 in EYES:
            m[y0 + 2:y1 - 1, x0 + 2:x1 - 2] = 0
    if keep_frame:  # round 4: the frame's core stays the portrait's pixels; only its edges and the face around it blend.
        # At 0.2 the img2img still redrew the thin top bar of the left lens with her fringe's pink shadow streaks across it.
        m[ndimage.binary_erosion(parts()['wm'] > 0.5, iterations=1)] = 0
    img, prompt = inpaint(base, m, f'{Q}, {FACE}, {GLASSES}', seed, d, lllite=False, name=name)
    save(img, name)
    log({'name': name, 'method': f'{src}, then a light masked img2img over the glasses band (RDBT, denoise {d}, no inpainting patch); '
         'nothing pasted back' + ('; her eyes left out of the mask' if keep_eyes else '')
         + ('; the frame\'s core left out of the mask (it stays the portrait\'s pixels)' if keep_frame else ''), 'prompt': prompt, 'negative': NEG, 'seed': seed, 'denoise': d})


def job_ipa(seed, denoise=0.8, st=0.7):
    name = f'mio-phone3-ipa-{seed}'
    src = Image.open(TGT)
    img, prompt = inpaint(src, band_mask(8), f'{Q}, {FACE}, {GLASSES}', seed, denoise, ipa=st, name=name)
    save(img, name)
    log({'name': name, 'method': f'diffusion only: glasses band of ipa7a-1001 repainted (RDBT + LLLite inpainting-v2, denoise {denoise}) '
         f'with the Anima IP-Adapter {st} on the approved portrait', 'prompt': prompt, 'negative': NEG, 'seed': seed, 'denoise': denoise})


def job_dip(seed, denoise=0.8, src=None, mask=None, name=None, paste=False):
    """Diptych: approved head (left panel) beside her head (right panel); only the right panel's glasses band is masked.
    With src/mask/paste: the same on the composite, masking only the old frame's leftovers, approved frame pasted back."""
    check_lock()
    name = name or f'mio-phone3-dip-{seed}'
    P = 768
    a = Image.open(APPR).convert('RGB')
    t = (src or Image.open(TGT)).convert('RGB')
    mk = band_mask(8) if mask is None else mask
    AB = (256, 300, 656, 700)  # the same-size box around the approved glasses
    dip = Image.new('RGB', (2 * P, P))
    dip.paste(a.crop(AB).resize((P, P), Image.LANCZOS), (0, 0))
    dip.paste(t.crop(CB).resize((P, P), Image.LANCZOS), (P, 0))
    bm = Image.fromarray((mk * 255).astype('uint8')).crop(CB).resize((P, P), Image.BILINEAR)
    mask = Image.new('L', (2 * P, P), 0)
    mask.paste(bm, (P, 0))
    os.makedirs(os.path.join(RAW, 'work'), exist_ok=True)
    dp, mp = os.path.join(RAW, 'work', name + '-dip.png'), os.path.join(RAW, 'work', name + '-dipmask.png')
    dip.save(dp)
    mask.convert('RGB').save(mp)
    prompt = f'{Q}, safe, 2girls, two close-up pictures side by side of the same woman wearing the same {GLASSES}, black hair with a blunt fringe, light tan eyes, plain light grey background'
    wf = comfy.anima(prompt, NEG, model=RDBT, w=2 * P, h=P, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(dp)}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
    wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
    wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
    wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                           'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
    wf['7']['inputs'].update(model=['A', 0], latent_image=['13', 0], denoise=float(denoise))
    del wf['6']
    wf['9']['inputs']['filename_prefix'] = 'miophone3/' + name
    raw = os.path.join(RAW, 'work', name + '-raw.png')
    comfy.run(wf, raw)
    json.dump(wf, open(os.path.join(HERE, 'workflow-dip.json'), 'w'), indent=1)
    new = Image.open(raw).convert('RGB').crop((P, 0, 2 * P, P)).resize((CB[2] - CB[0], CB[3] - CB[1]), Image.LANCZOS)
    full = t.copy()
    full.paste(new, CB[:2])
    soft = Image.fromarray((mk * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0))
    res = Image.composite(full, t, soft)
    if paste:
        save(res, name + '-nopaste')
        res = paste_frame(res)
    save(res, name)
    method = (f'comp, then the old frame\'s leftovers repainted by the diptych (approved head left, composite right; '
              f'RDBT + LLLite inpainting-v2, denoise {denoise}), approved frame pixels pasted back on top') if paste else (
              f'diffusion only: diptych repaint, approved head left, her head right, glasses band masked '
              f'(RDBT + LLLite inpainting-v2, denoise {denoise})')
    log({'name': name, 'method': method, 'prompt': prompt, 'negative': NEG, 'seed': seed, 'denoise': denoise})


EYES = [(380, 538, 441, 557), (512, 510, 580, 533)]  # her eyes (lids, irises, lashes) on the pick, kept as they are


def job_dipk(seed, denoise=0.8):
    """The diptych repaint with her eyes left out of the mask, so only the glasses and the skin and hair around them change."""
    m = band_mask(8)
    for x0, y0, x1, y1 in EYES:
        m[y0:y1, x0:x1] = 0
    m = ndimage.gaussian_filter(m, 1.0)
    for x0, y0, x1, y1 in EYES:
        m[y0:y1, x0:x1] = 0
    job_dip(seed, denoise, mask=m, name=f'mio-phone3-dipk-{seed}')
    L = json.load(open(LOG))
    for e in L:
        if e['name'] == f'mio-phone3-dipk-{seed}':
            e['method'] = e['method'].replace('glasses band masked', 'glasses band masked except her eyes')
    json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)


def job_exact(seed, denoise=0.9, v=1):
    """Glasses taken off first (the glasses band minus her eyes and nose pads repainted with no glasses), then the approved
    frame pixels (the composite's warp) pasted on the bare face. The frame is the portrait's own pixels."""
    name = f'mio-phone3-exact-{seed}' + ('' if v == 1 else f'-v{v}')
    if v == 2:  # v2: her old pads go too; the portrait's pads come with its frame; no hair pixels in the frame
        composite.PADS_TOO = True
        parts.__dict__.pop('c', None)
    m = band_mask(8)
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    for x0, y0, x1, y1 in EYES:
        m[y0:y1, x0:x1] = 0
    if v == 1:
        for px, py in composite.PADS:
            m[(xx - px) ** 2 + (yy - py) ** 2 < 11 ** 2] = 0
    global NEG
    neg0 = NEG
    NEG = NEG.replace(', silver frames', '') + ', glasses, eyewear, frames'
    try:
        img, prompt = inpaint(Image.open(TGT), m, f'{Q}, {FACE}, no glasses', seed, denoise, name=name)
    finally:
        neg, NEG = NEG, neg0
    save(img, name + '-bare')
    img = paste_frame(img)
    save(img, name)
    log({'name': name, 'method': f'glasses band (minus her eyes and nose pads) repainted without glasses (RDBT + LLLite '
         f'inpainting-v2, denoise {denoise}), then the approved frame pixels warped on (composite.py)', 'prompt': prompt,
         'negative': neg, 'seed': seed, 'denoise': denoise})


def job_repaste(name, bare_dir=None):
    """Round 4: the frame put again on a saved bare face (<name>-bare.png, from bare_dir) with the fixed hair mask; no GPU."""
    composite.PADS_TOO = name.endswith('-v2')
    parts.__dict__.pop('c', None)
    save(paste_frame(Image.open(os.path.join(bare_dir or RAW, name + '-bare.png'))), name)
    log({'name': name, 'method': 'the saved bare face of round 3, then the approved frame pixels warped on (composite.py) with '
         'the fixed hair mask (round 4: the top bar of the left lens is no longer cut)'})


def job_clean2(seed, denoise=0.85):
    p = parts()
    m = ndimage.binary_dilation(p['old'], iterations=3) & ~(p['alpha'] > 0.6)
    job_dip(seed, denoise, src=p['comp'], mask=m.astype(np.float32), name=f'mio-phone3-clean2-{seed}', paste=True)


def cut(names):
    """As in round 2: BiRefNet-HR matting, then tools/matte_refine.py, then 597x768 like the game portraits.
    Round 4: the transplanted frame (composite wm) goes to matte_refine as --opaque, so the matte can't make the frame
    see-through where the left lens overhangs the background (it did on every round-3 cut and on her approved portraits)."""
    tmp = os.path.join(RAW, 'cut')
    os.makedirs(tmp, exist_ok=True)
    composite.PADS_TOO = True
    parts.__dict__.pop('c', None)
    fmask = os.path.join(tmp, 'frame-mask.png')
    Image.fromarray((parts()['wm'].clip(0, 1) * 255).astype('uint8')).save(fmask)
    srcs = [os.path.join(RAW, n + '.png') for n in names]
    subprocess.run(['python3', os.path.join(REPO, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting', *srcs, '--out', tmp], check=True)
    for n in names:
        ref = os.path.join(tmp, n + '-refined.png')
        subprocess.run([os.path.expanduser('~/ai/rmbg/rembg/bin/python'), os.path.join(REPO, 'tools/matte_refine.py'),
                        os.path.join(RAW, n + '.png'), os.path.join(tmp, n + '.png'), ref, '--opaque', fmask], check=True)
        Image.open(ref).resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, n + '-cut.webp'), quality=92)
        print('cut', n, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    if sys.argv[1] == 'cut':
        cut(sys.argv[2:])
        sys.exit()
    for j in sys.argv[1:]:
        k, *a = j.split(':')
        if k == 'comp':
            job_comp()
        elif k == 'clean':
            job_clean(int(a[0]), float(a[1]) if len(a) > 1 else 0.75)
        elif k == 'blend':
            job_blend(float(a[0]), int(a[1]), a[2])
        elif k == 'ipa':
            job_ipa(int(a[0]))
        elif k == 'exact':
            job_exact(int(a[0]), v=int(a[1]) if len(a) > 1 else 1)
        elif k == 'repaste':
            job_repaste(a[0])
        elif k == 'dipk':
            job_dipk(int(a[0]))
        elif k == 'clean2':
            job_clean2(int(a[0]))
        elif k == 'dip':
            job_dip(int(a[0]))
        print('ok', j, flush=True)
