"""Eric (bible id mc) dialogue portrait, round eric-portrait-anime-3.
Jørgen picked two from eric-portrait-anime-2: a09 ("try a few poses") and a13 ("try a couple of variations on his saturation,
hair color"). One change per render:
  p*: a09's prompt with only the pose words swapped (same hair, beard, glasses, outfit, face words), seeds 909 and 1909.
  c*: a13's prompt with only the hair (and beard) colour word swapped, or a saturation word added, seed 913.
  x*: a13 itself recoloured in pixels (tools/eric_anime3.py recolour): only the hair/brow/beard hue or the overall saturation
      changes, every line stays identical. This is the way to get his colour exactly; the prompt versions show what the words do.
  a09w, a13w: a09 and a13 re-rendered with the weighted red-rim negative, the control every p* and c* render compares to
      (the negative alone changes the picture a little at the same seed).
Every render uses the weighted red-rim negative from round 2 and is measured with tools/redrim.py.

Staging (every shot): dialogue portrait, waist-up, camera at eye level a couple of metres in front, plain light grey backdrop,
soft even front light, nothing else in frame; a09 family looks at the viewer, a13 family is turned to the right looking at the viewer.

Usage: ~/ai/sd/venv/bin/python tools/eric_anime3.py [ids]   (needs the GPU lock with owner eric-anime3 and ComfyUI on :8188)
       ~/ai/sd/venv/bin/python tools/eric_anime3.py sheet
Raw PNGs: art/production/PC/eric-anime3/ (gitignored); webp copies for review: game3d/assets/portrait-candidates/eric-anime3/"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from production import Q, N, FRAME, RDBT, OUT, ROOT
from redrim import red_rim

OWNER = 'eric-anime3'
RAW = os.path.join(OUT, 'PC', 'eric-anime3')
RAW2 = os.path.join(OUT, 'PC', 'eric-anime2')
WEB = os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime3')
WEB2 = os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime2')
LOG = os.path.join(WEB, 'log.json')
NEG = N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4)'
BASE = 'a Scandinavian man in his early thirties, fair pale skin, blue eyes, company lanyard'
OUTFIT = 'grey hoodie under a navy blazer'


def prompt(hair, beard, glasses, face, extra=''):
    desc = f'{BASE}, {hair}, (facial hair, {beard}:1.3), ({glasses}:1.2), {OUTFIT}'
    return f'{Q}, {extra}safe, 1boy, solo, male focus, {desc}, {face}, {FRAME}'


A09 = ('dark-blond hair tied in a short ponytail at the back', 'dark-blond stubble', 'silver rectangular glasses')
A13 = ('hair parted in the middle', 'short goatee', 'black half-rim glasses', 'three-quarter view turned to the right, looking at the viewer, gentle smile')
POSES = {  # id: pose words (a09's were "looking back at the viewer over his shoulder")
    'p1': 'pushing his glasses up with one finger',
    'p2': 'arms crossed',
    'p3': 'holding a paper coffee cup in one hand',
    'p4': 'leaning forward toward the viewer',
    'p5': 'hands in his blazer pockets',
    'p6': 'rubbing the back of his neck with one hand',
}
HAIR = {'c1': 'ash-blond', 'c2': 'warm golden-blond', 'c3': 'light brown'}  # a13 is dark-blond
SAT = {'c4': '(muted desaturated colors:1.2), ', 'c5': '(vivid saturated colors:1.2), '}


def jobs():
    j = [('a09w', 909, prompt(*A09, 'looking back at the viewer over his shoulder, faint smile'), 'a09 again, weighted negative only')]
    for pid, pose in POSES.items():
        for seed in (909, 1909):
            j.append((f'{pid}', seed, prompt(*A09, f'{pose}, faint smile'), f'a09, pose: {pose}'))
    h, b, g, f = A13
    j.append(('a13w', 913, prompt(f'dark-blond {h}', f'short dark-blond goatee', g, f), 'a13 again, weighted negative only'))
    for cid, col in HAIR.items():
        j.append((cid, 913, prompt(f'{col} {h}', f'short {col} goatee', g, f), f'a13, hair and goatee: {col}'))
    for cid, extra in SAT.items():
        j.append((cid, 913, prompt(f'dark-blond {h}', 'short dark-blond goatee', g, f, extra), f'a13, added {extra.strip(", ")}'))
    return j


# Pixel recolours of a13 (x*). Hair, brows and goatee are the khaki pixels (PIL hue 22-48 of 255, sat >= 45) in the head box.
RECOLOUR = {
    'x1': ('hair', dict(hue=None, sat=0.45, val=0.95), 'a13 in pixels, hair ashier (less yellow)'),
    'x2': ('hair', dict(hue=24, sat=1.45, val=1.05), 'a13 in pixels, hair warmer golden blond'),
    'x3': ('hair', dict(hue=17, sat=1.25, val=0.72), 'a13 in pixels, hair light brown'),
    'x4': ('all', dict(sat=0.7), 'a13 in pixels, 30% less saturated'),
    'x5': ('all', dict(sat=1.3), 'a13 in pixels, 30% more saturated'),
}


def recolour(src, dst, what, hue=None, sat=1.0, val=1.0):
    im = Image.open(src).convert('RGB')
    hsv = np.asarray(im.convert('HSV')).astype(float)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    if what == 'all':
        m = np.ones(H.shape)
    else:
        m = ((H >= 22) & (H <= 48) & (S >= 45) & (V >= 40)).astype(float)
        box = np.zeros(H.shape)
        box[:560, 280:780] = 1  # head only (the lanyard card and buttons share the colour)
        m = np.asarray(Image.fromarray((m * box * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))) / 255.0
    out = hsv.copy()
    if hue is not None:
        out[..., 0] = hue
    out[..., 1] = np.clip(S * sat, 0, 255)
    out[..., 2] = np.clip(V * val, 0, 255)
    rgb_new = np.asarray(Image.fromarray(out.astype('uint8'), 'HSV').convert('RGB')).astype(float)
    rgb = np.asarray(im).astype(float)
    res = rgb * (1 - m[..., None]) + rgb_new * m[..., None]
    Image.fromarray(res.round().astype('uint8')).save(dst)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def main(only=None):
    import comfy
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(WEB, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for sid, seed, p, what in jobs():
        if only and sid not in only and f'{sid}-{seed}' not in only:
            continue
        raw = os.path.join(RAW, f'eric-{sid}-{seed}.png')
        web = os.path.join(WEB, f'eric-{sid}-{seed}.webp')
        if not os.path.exists(raw):
            check_lock()
            comfy.run(comfy.anima(p, NEG, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), raw)
        Image.open(raw).convert('RGB').save(web, quality=92)
        log[f'{sid}-{seed}'] = {'file': os.path.relpath(web, ROOT), 'what': what, 'model': 'rdbtAnima', 'seed': seed, 'prompt': p,
                                'negative': NEG, 'settings': '896x1152, euler_ancestral normal, 30 steps, CFG 5',
                                'red_rim_pct': round(red_rim(raw) * 100, 2)}
        json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', sid, seed, log[f'{sid}-{seed}']['red_rim_pct'], flush=True)
    src = os.path.join(RAW2, 'eric-a13-913.png')
    for xid, (what, kw, desc) in RECOLOUR.items():
        raw = os.path.join(RAW, f'eric-{xid}-913.png')
        recolour(src, raw, what, **kw)
        web = os.path.join(WEB, f'eric-{xid}-913.webp')
        Image.open(raw).save(web, quality=92)
        log[f'{xid}-913'] = {'file': os.path.relpath(web, ROOT), 'what': desc, 'source': 'art/production/PC/eric-anime2/eric-a13-913.png',
                             'recolour': dict(what=what, **kw), 'red_rim_pct': round(red_rim(raw) * 100, 2)}
    json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)


def sheet():
    """Every attempt in order, a09 and a13 from round 2 first; the label under each gives the id and red-rim %."""
    log = json.load(open(LOG))
    tiles = [('eric-a09-909 (round 2)', os.path.join(WEB2, 'eric-a09-909.webp'), 0.11)]
    tiles += [(f'eric-{k}', os.path.join(ROOT, v['file']), v['red_rim_pct']) for k, v in log.items() if k.startswith(('a09w', 'p'))]
    tiles += [('eric-a13-913 (round 2)', os.path.join(WEB2, 'eric-a13-913.webp'), 0.0)]
    tiles += [(f'eric-{k}', os.path.join(ROOT, v['file']), v['red_rim_pct']) for k, v in log.items() if k.startswith(('a13w', 'c', 'x'))]
    tw, th, cols = 448, 576, 7
    n09 = 2 + sum(k.startswith('p') for k in log)  # a09 group first; the a13 group starts on a new row
    pad = -n09 % cols
    tiles = tiles[:n09] + [None] * pad + tiles[n09:]
    rows = -(-len(tiles) // cols)
    S = Image.new('RGB', (tw * cols, (th + 40) * rows), (245, 245, 245))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
    except OSError:
        font = ImageFont.load_default()
    for i, t in enumerate(tiles):
        if t is None:
            continue
        name, path, pct = t
        x, y = (i % cols) * tw, (i // cols) * (th + 40)
        S.paste(Image.open(path).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x + 8, y + th + 8), f'{name.replace("eric-", "")}  red {pct:.2f}%', fill=(20, 20, 20), font=font)
    S.save(os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime3-sheet.png'))


if __name__ == '__main__':
    if sys.argv[1:] == ['sheet']:
        sheet()
    else:
        main(sys.argv[1:] or None)
