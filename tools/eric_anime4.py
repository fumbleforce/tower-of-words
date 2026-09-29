"""Eric (bible id mc) dialogue portrait, round eric-portrait-anime-4.
Jørgen picked eric-p3-909 and eric-p6-1909 from round 3: "this is a good look, we just need to avoid the lower part of his hair
looking much darker and separate from his top hair, the models try to get the almost shaved side look with shorter hair, which we
dont want. We need to describe the desired hair simply, dont overcorrect."
Everything stays as in round 3 (face, pose, outfit, glasses, stubble, style, model, settings, seeds); only the hair changes:
  h1: the hair words become 'dark-blond hair, same colour all over, tied in a short ponytail at the back' (was 'dark-blond hair
      tied in a short ponytail at the back').
  h2: h1 plus a light negative: 'undercut, shaved sides, two-tone hair' (unweighted).
  m*: second approach: the round 3 picture itself, only the side hair repainted (masked, low denoise, Anima LLLite inpainting)
      with the h2 words.
Seeds: the round 3 seed of each pick (p3 909, p6 1909) plus 2909 and 3909.
Every render keeps the weighted red-rim negative and is measured with tools/redrim.py.

Usage: ~/ai/sd/venv/bin/python tools/eric_anime4.py [ids]   (needs the GPU lock with owner eric-anime4 and ComfyUI on :8188)
       ~/ai/sd/venv/bin/python tools/eric_anime4.py sheet
Raw PNGs: art/production/PC/eric-anime4/ (gitignored); webp copies for review: art/candidates/portraits/eric-anime4/"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from production import OUT, ROOT, RDBT
from redrim import red_rim
from eric_anime3 import NEG, A09, POSES, prompt

OWNER = 'eric-anime4'
RAW = os.path.join(OUT, 'PC', 'eric-anime4')
RAW3 = os.path.join(OUT, 'PC', 'eric-anime3')
WEB = os.path.join(ROOT, 'art', 'candidates', 'portraits', 'eric-anime4')
WEB3 = os.path.join(ROOT, 'art', 'candidates', 'portraits', 'eric-anime3')
LOG = os.path.join(WEB, 'log.json')
HAIR = 'dark-blond hair, same colour all over, tied in a short ponytail at the back'
NEG2 = NEG + ', undercut, shaved sides, two-tone hair'
PICKS = {'p3': 909, 'p6': 1909}
SEEDS = {'p3': (909, 2909, 3909), 'p6': (1909, 2909, 3909)}


def jobs():
    j = []
    for pid in PICKS:
        pose = POSES[pid]
        p = prompt(HAIR, *A09[1:], f'{pose}, faint smile')
        for seed in SEEDS[pid]:
            j.append((f'{pid}h1', seed, p, NEG, f'{pid} with the hair words "{HAIR}"'))
        for seed in SEEDS[pid]:
            j.append((f'{pid}h2', seed, p, NEG2, f'{pid}h1 plus the negative "undercut, shaved sides, two-tone hair"'))
    return j


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def entry(web, what, seed, p, neg, raw, **extra):
    return dict(file=os.path.relpath(web, ROOT), what=what, model='rdbtAnima', seed=seed, prompt=p, negative=neg,
                settings='896x1152, euler_ancestral normal, 30 steps, CFG 5', red_rim_pct=round(red_rim(raw) * 100, 2), **extra)


def main(only=None):
    import comfy
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(WEB, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for sid, seed, p, neg, what in jobs():
        if only and sid not in only and f'{sid}-{seed}' not in only:
            continue
        raw = os.path.join(RAW, f'eric-{sid}-{seed}.png')
        web = os.path.join(WEB, f'eric-{sid}-{seed}.webp')
        if not os.path.exists(raw):
            check_lock()
            comfy.run(comfy.anima(p, neg, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), raw)
        Image.open(raw).convert('RGB').save(web, quality=92)
        log[f'{sid}-{seed}'] = entry(web, what, seed, p, neg, raw)
        json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', sid, seed, log[f'{sid}-{seed}']['red_rim_pct'], flush=True)


# Masked repaint of the side hair only. Polygons (in 896x1152 pixels) cover the darker short hair above and behind the ear.
MASKS = {
    'p3': [[(455, 150), (520, 135), (590, 160), (610, 200), (605, 235), (580, 215), (545, 205), (520, 215), (505, 250), (485, 215)]],
    'p6': [[(380, 160), (450, 145), (530, 170), (555, 215), (550, 240), (520, 225), (490, 225), (470, 260), (455, 300), (430, 260), (400, 200)]],
}


def repaint(only=None, denoise=0.45, seeds=(4909,), patch=True):
    import comfy
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for pid, polys in MASKS.items():
        if only and pid not in only:
            continue
        src = os.path.join(RAW3, f'eric-{pid}-{PICKS[pid]}.png')
        mask = os.path.join(RAW, f'mask-{pid}.png')
        m = Image.new('L', (896, 1152), 0)
        d = ImageDraw.Draw(m)
        for poly in polys:
            d.polygon(poly, fill=255)
        m.filter(ImageFilter.GaussianBlur(6)).convert('RGB').save(mask)
        p = prompt(HAIR, *A09[1:], f'{POSES[pid]}, faint smile')
        for seed in seeds:
            sid = f'{pid}m{int(denoise * 100)}' + ('' if patch else 'n')
            raw = os.path.join(RAW, f'eric-{sid}-{seed}.png')
            web = os.path.join(WEB, f'eric-{sid}-{seed}.webp')
            check_lock()
            wf = comfy.anima(p, NEG2, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed)
            wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(src)}}
            wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
            wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mask), 'channel': 'red'}}
            wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
            wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': 'anima-lllite-inpainting-v2.safetensors'}}
            wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0],
                                                                   'mask': ['12', 0], 'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
            wf['7']['inputs'].update(latent_image=['13', 0], model=['A', 0], denoise=denoise)
            if not patch:  # plain masked img2img: the model doesn't see the original through the patch
                wf['7']['inputs']['model'] = ['1', 0]
                del wf['A'], wf['P']
            del wf['6']
            comfy.run(wf, raw)
            # paste back through the mask so nothing outside the side hair changes
            base = Image.open(src).convert('RGB')
            new = Image.open(raw).convert('RGB')
            Image.composite(new, base, Image.open(mask).convert('L')).save(raw)
            Image.open(raw).save(web, quality=92)
            log[f'{sid}-{seed}'] = entry(web, f'{pid} from round 3 with only the side hair repainted (mask, denoise {denoise}, '
                                         + ('Anima LLLite inpainting' if patch else 'no inpainting patch') + ') using the h2 words', seed, p, NEG2, raw,
                                         source=os.path.relpath(src, ROOT), mask=os.path.relpath(mask, ROOT))
            json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
            print('ok', sid, seed, log[f'{sid}-{seed}']['red_rim_pct'], flush=True)


def sheet():
    """Two rows per pick (prompt attempts, then repaints), each starting with the round 3 pick; labels give id and red-rim %."""
    log = json.load(open(LOG))
    rows = []
    for pid, seed in PICKS.items():
        src = os.path.join(RAW3, f'eric-{pid}-{seed}.png')
        first = (f'{pid}-{seed} (round 3 pick)', os.path.join(WEB3, f'eric-{pid}-{seed}.webp'), round(red_rim(src) * 100, 2))
        for kind in ('h', 'm'):
            rows.append([first] + [(k, os.path.join(ROOT, v['file']), v['red_rim_pct']) for k, v in log.items()
                                   if k.startswith(pid + kind)])
    tw, th = 448, 576
    cols = max(len(r) for r in rows)
    S = Image.new('RGB', (tw * cols, (th + 40) * len(rows)), (245, 245, 245))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    for r, row in enumerate(rows):
        for c, (name, path, pct) in enumerate(row):
            x, y = c * tw, r * (th + 40)
            S.paste(Image.open(path).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
            d.text((x + 8, y + th + 8), f'{name}  red {pct:.2f}%', fill=(20, 20, 20), font=font)
    S.save(os.path.join(ROOT, 'art', 'candidates', 'portraits', 'eric-anime4-sheet.png'))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a == ['sheet']:
        sheet()
    elif a[:1] == ['repaint']:
        for dn in (0.45, 0.6, 0.75):
            repaint(a[1:] or None, denoise=dn, seeds=(4909, 5909))
        repaint(a[1:] or None, denoise=0.6, seeds=(4909, 5909), patch=False)
    else:
        main(a or None)
