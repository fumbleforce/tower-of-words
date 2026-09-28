"""Portrait candidates for the day-1 people without approved art (game3d): Mori, Kenji, Hamada, plus expressions for the
approved gate guard Ishibashi. Same recipe as the approved cast (tools/production.py portrait(): RDBT Anima, Q tags, safe,
896x1152, Euler A 30 steps CFG 5), then tools/reframe.py's outpaint to 1008x1296 like legacy/proto2/cast-fixed.
Expressions: face-only repaint of the base (crop around the imgutils face box, masked img2img, feathered paste back).
Cut-outs: rembg ISNet anime (tools/rmbg_local.py).

Usage: ~/ai/sd/venv/bin/python tools/portrait_candidates.py gen | reframe | expr <char>:<seed>[,<seed>] ... | guard
Raw output: art/production/PC/ (gitignored)."""
import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
import production
from production import Q, N, FRAME, RDBT
import reframe
from PIL import Image, ImageDraw, ImageFilter

ROOT = production.ROOT
PC = os.path.join(production.OUT, 'PC')
LOG = os.path.join(PC, 'log.json')
OWNER = 'portrait-candidates-agent'
# Round 1 (seeds 701-704) used NEG1 with GUIDE's style-drift words; they pushed the renders away from the cast's flat, outlined look
# (heavier shading, tanned skin), so round 2 (711-714) goes back to the cast negative N plus the build-line words.
NEG1 = N + ', fat, obese, plump, western cartoon, comic book, flat vector, thick outlines, poster art, pop art'
NEG = N + ', fat, obese, plump'
ROUND = int(os.environ.get('PC_ROUND', '2'))
SEEDS = {1: (701, 702, 703), 2: (711, 712, 713), 3: (721, 722, 723)}[ROUND]
VSEED = {1: 704, 2: 714, 3: 724}[ROUND]  # wording variant
# Round 2 wording: round 1 read as men in their thirties, so Mori and Hamada get plain age marks.
AGE = {'mori': ('a kind lined face', 'an older face with wrinkles around his eyes and mouth'),
       'hamada': ('thinning black hair combed flat', 'an older face with wrinkles, balding with thin grey-streaked hair combed over')}
AGE3 = ('thinning black hair combed flat', 'a tired middle-aged face, a receding hairline, short black hair going grey at the temples')
HAMADA_V3 = ('Mr. Hamada, a 54-year-old Japanese salaryman from accounts: thin with narrow shoulders, a tired middle-aged face, '
             'a receding hairline, short black hair going grey at the temples, tired eyes with dark circles, a creased grey suit with a loosened tie, '
             'a worn black briefcase held under his left arm')

CHARS = {
    'mori': dict(
        desc='Mr. Mori, a 58-year-old Japanese man, a former manager on an office IT team: slim with an upright posture, '
             'neatly combed grey hair with a side parting, a kind lined face, dark grey suit with a navy tie, '
             'holding a small cup of green tea in both hands',
        expr='gentle polite smile, head bowed slightly',
        variant='Mr. Mori, a 58-year-old Japanese man, a former manager on an office IT team: slim with an upright posture, '
                'neatly combed grey hair with a side parting, a kind lined face, white shirt with a navy tie under a charcoal cardigan, '
                'company lanyard, hands folded in front of him in a small formal bow',
        faces={'smile': 'warm polite smile, eyes creased', 'flustered': 'flustered, embarrassed, eyebrows raised, a small awkward smile, faint sweat drop'}),
    'kenji': dict(
        desc='Kenji, a 29-year-old Japanese IT engineer: slim average build, messy short black hair, light stubble, '
             'a rumpled light-blue checked shirt with rolled sleeves over a grey t-shirt, company lanyard, '
             'a can of coffee in his right hand, his left hand rubbing the back of his neck',
        expr='cheerful sheepish grin',
        variant='Kenji, a 29-year-old Japanese IT engineer: slim average build, messy short black hair, light stubble, '
                'an unzipped burnt-orange hoodie over a white t-shirt, company lanyard, a can of coffee in his right hand',
        faces={'grin': 'big cheerful grin showing teeth, eyes squeezed happily', 'sheepish': 'sheepish apologetic smile, eyebrows raised, eyes glancing to the side'}),
    'hamada': dict(
        desc='Mr. Hamada, a 54-year-old Japanese salaryman from accounts: thin with narrow shoulders, thinning black hair combed flat, '
             'tired eyes with dark circles, a rumpled navy suit with a crooked tie, clutching a worn black briefcase to his chest with both arms',
        expr='apologetic worried smile',
        variant='Mr. Hamada, a 54-year-old Japanese salaryman from accounts: thin with narrow shoulders, thinning black hair combed flat, '
                'tired eyes with dark circles, a creased beige trench coat over a grey suit and a loosened tie, holding a worn black briefcase',
        faces={'sleepy': 'sleepy, eyes half closed, drowsy, mouth slightly open', 'panicked': 'panicked, eyes wide, mouth open, sweat drops'}),
}
GUARD = dict(src='art/production/RF/ishibashi.png',
             desc='Ishibashi, a 64-year-old company gate guard and retired police officer: completely bald head, a thin white moustache, '
                  'reading glasses with clear lenses pushed up on his forehead',
             faces={'stern': 'stern, frowning, mouth a firm line', 'amused': 'amused, a small dry smile under the moustache, eyes softened'})


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def log(entry):
    L = json.load(open(LOG)) if os.path.exists(LOG) else []
    L = [e for e in L if e['file'] != entry['file']] + [entry]
    json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)


def prompt(desc, expr):
    return production.portrait('1boy', desc, expr)  # f'{Q}, safe, 1boy, solo, {desc}, {expr}, {FRAME}'


def gen():
    for key, c in CHARS.items():
        os.makedirs(os.path.join(PC, key), exist_ok=True)
        d, v = c['desc'], c['variant']
        if ROUND == 2 and key in AGE:
            d, v = d.replace(*AGE[key]), v.replace(*AGE[key])
        if ROUND == 3:  # Hamada only: round 2's age words drew a western caricature; a milder age line, and a waist-up variant
            if key != 'hamada':
                continue
            d = d.replace(*AGE3)
            v = HAMADA_V3
        jobs = [(s, d) for s in SEEDS] + [(VSEED, v)]
        for seed, desc in jobs:
            out = os.path.join(PC, key, f'{key}-{seed}.png')
            if os.path.exists(out):
                continue
            check_lock()
            p = prompt(desc, c['expr'])
            comfy.run(comfy.anima(p, NEG if ROUND >= 2 else NEG1, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), out)
            log({'file': os.path.relpath(out, ROOT), 'kind': 'base', 'model': 'rdbtAnima', 'prompt': p, 'negative': NEG if ROUND >= 2 else NEG1, 'seed': seed,
                 'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5, 'sampler': 'euler_ancestral normal'})
            print('ok', key, seed, flush=True)


def do_reframe(specs):
    """Pad each picked base to 1008x1296 like the approved cast (outpaint only where the figure touches an edge)."""
    for spec in specs:
        key, seeds = spec.split(':')
        for seed in map(int, seeds.split(',')):
            reframe_neg = ERIC_NEG if key == 'eric' else NEG
            src = os.path.join(PC, key, f'{key}-{seed}.png')
            out = os.path.join(PC, key, f'{key}-{seed}-rf.png')
            if os.path.exists(out) or not os.path.exists(src):
                continue
            check_lock()
            k = f'{key}-{seed}'
            p = next(e['prompt'] for e in json.load(open(LOG)) if e['file'] == os.path.relpath(src, ROOT))
            reframe.CAST[k] = (os.path.relpath(src, ROOT), p)
            reframe.RAW = os.path.join(PC, 'rf')
            os.makedirs(reframe.RAW, exist_ok=True)
            reframe.prompt_for = lambda spec, n=reframe_neg: (spec, n) if isinstance(spec, str) else None
            r = reframe.reframe(k, 301)
            os.replace(r, out)


def face_box(path):
    r = subprocess.run([os.path.expanduser('~/ai/consist/.venv/bin/python'), os.path.join(ROOT, 'tools', 'imagegen', 'faces.py'), path],
                       capture_output=True, text=True, check=True)
    boxes = json.loads(r.stdout.strip().splitlines()[-1])[path]
    return max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))


def inpaint_wf(src_png, mask_png, p, seed, denoise, neg=None):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': RDBT, 'weight_dtype': 'default'}},
        '2': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': 'qwen_3_06b_base.safetensors', 'type': 'stable_diffusion'}},
        '3': {'class_type': 'VAELoader', 'inputs': {'vae_name': 'qwen_image_vae.safetensors'}},
        '4': {'class_type': 'CLIPTextEncode', 'inputs': {'text': p, 'clip': ['2', 0]}},
        '5': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg or NEG, 'clip': ['2', 0]}},
        '10': {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(src_png)}},
        '11': {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}},
        '12': {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mask_png), 'channel': 'red'}},
        '14': {'class_type': 'DifferentialDiffusion', 'inputs': {'model': ['1', 0]}},
        '13': {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}},
        '7': {'class_type': 'KSampler', 'inputs': {'model': ['14', 0], 'positive': ['4', 0], 'negative': ['5', 0], 'latent_image': ['13', 0],
                                                   'seed': seed, 'steps': 30, 'cfg': 5, 'sampler_name': 'euler_ancestral', 'scheduler': 'normal', 'denoise': denoise}},
        '8': {'class_type': 'VAEDecode', 'inputs': {'samples': ['7', 0], 'vae': ['3', 0]}},
        '9': {'class_type': 'SaveImage', 'inputs': {'images': ['8', 0], 'filename_prefix': 'pcface'}},
    }


def face_expr(base_path, desc, name, words, out, seed=801, denoise=0.72, grow=0.18, neg=None, tag='1boy', keep=None):
    """Repaint only the face: crop a square around the face box, upscale to 1024, inpaint an oval over the face, paste back."""
    if os.path.exists(out):
        return
    check_lock()
    base = Image.open(base_path).convert('RGB')
    x0, y0, x1, y1 = face_box(base_path)
    cx, cy, s = (x0 + x1) / 2, (y0 + y1) / 2, max(x1 - x0, y1 - y0)
    half = int(s * 1.1)
    crop_box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
    UP = 1024
    k = UP / (2 * half)
    crop = base.crop(crop_box).resize((UP, UP), Image.LANCZOS)
    tmp = os.path.join(PC, 'tmp')
    os.makedirs(tmp, exist_ok=True)
    cp, mp = os.path.join(tmp, 'crop.png'), os.path.join(tmp, 'mask.png')
    crop.save(cp)
    g = s * grow
    ell = ((x0 - g - crop_box[0]) * k, (y0 - g * 0.6 - crop_box[1]) * k, (x1 + g - crop_box[0]) * k, (y1 + g * 0.5 - crop_box[1]) * k)
    m = Image.new('L', (UP, UP), 0)
    ImageDraw.Draw(m).ellipse(ell, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(12))
    if keep is not None:  # pixels to keep exactly (Mio's glasses): out of the repaint mask
        km = Image.fromarray((keep * 255).astype('uint8')).crop(crop_box).resize((UP, UP), Image.NEAREST)
        m = Image.composite(Image.new('L', (UP, UP), 0), m, km)
    m.convert('RGB').save(mp)
    p = f'{Q}, safe, {tag}, solo, {desc}, {words}, close-up of {"her" if tag == "1girl" else "his"} face, plain light grey background, soft even studio light'
    raw = os.path.join(tmp, 'raw.png')
    wf = inpaint_wf(cp, mp, p, seed, denoise, neg)
    inpaint_wf.last = wf
    comfy.run(wf, raw)
    new = Image.open(raw).convert('RGB').resize((2 * half, 2 * half), Image.LANCZOS)
    pm = Image.new('L', base.size, 0)
    ImageDraw.Draw(pm).ellipse((x0 - g, y0 - g * 0.6, x1 + g, y1 + g * 0.5), fill=255)
    pm = pm.filter(ImageFilter.GaussianBlur(5))
    full = base.copy()
    full.paste(new, crop_box[:2])
    res = Image.composite(full, base, pm)
    if keep is not None:  # paste the kept pixels back so they are identical to the source
        km = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.8))
        res = Image.composite(base, res, km)
    res.save(out)
    wf = inpaint_wf.last
    for d in (os.path.join(ROOT, 'tools', 'workflows'), os.path.expanduser('~/ai/workflows')):
        os.makedirs(d, exist_ok=True)
        json.dump(wf, open(os.path.join(d, 'anima-face-expression.json'), 'w'), indent=1)
    log({'file': os.path.relpath(out, ROOT), 'kind': 'expression', 'base': os.path.relpath(base_path, ROOT), 'expression': name,
         'model': 'rdbtAnima (face-only masked img2img, DifferentialDiffusion)', 'prompt': p, 'negative': neg or NEG, 'seed': seed,
         'denoise': denoise, 'face_box': [x0, y0, x1, y1]})
    print('ok expr', os.path.basename(out), flush=True)


def expr(specs):
    for spec in specs:
        key, seeds = spec.split(':')
        c = CHARS[key]
        for seed in seeds.split(','):
            base = os.path.join(PC, key, f'{key}-{seed}-rf.png')
            desc = next(e['prompt'] for e in json.load(open(LOG)) if e['file'].endswith(f'/{key}-{seed}.png'))
            desc = desc.split('solo, ', 1)[1].split(', waist-up')[0]
            short = desc.split(':')[0] + ':' + ','.join(desc.split(':')[1].split(',')[:4])
            for name, words in c['faces'].items():
                face_expr(base, short, name, words, os.path.join(PC, key, f'{key}-{seed}-{name}.png'))


def guard():
    os.makedirs(os.path.join(PC, 'guard'), exist_ok=True)
    base = os.path.join(ROOT, GUARD['src'])
    for name, words in GUARD['faces'].items():
        face_expr(base, GUARD['desc'], name, words, os.path.join(PC, 'guard', f'ishibashi-{name}.png'))


# ---------------- Eric (the player, bible id mc): remake of M-02-it-guy-601 with open eyes ----------------
ERIC_DESC = ('adult, a tired 34-year-old Scandinavian IT guy, short dark-blond hair and a short dark-blond beard, fair pale skin, '
             'light eyebrows, no blush, slim average build, glasses with clear lenses, open blue eyes looking at the viewer, '
             'grey hoodie under a navy blazer, company lanyard')
ERIC_EXPR = 'weary half-smile'
ERIC_NEG = NEG + ', closed eyes'
# v2 (Jørgen: "red light shone on him"): the red is a thin red rim light RDBT draws along his outline in the raw render
# (no red word in the prompt; the reframe didn't touch it). One change: rim light words in the negative.
ERIC_V = os.environ.get('ERIC_V', '1')
if ERIC_V == '2':
    ERIC_NEG = ERIC_NEG + ', rim light, red rim light, backlighting'
ERIC_SEEDS = (731, 732, 733, 734)
ERIC_FACES = {'neutral': 'calm neutral expression, eyes open, mouth closed', 'tired': 'tired smile, eyes open, slightly heavy eyelids',
              'surprised': 'surprised, eyes wide open, eyebrows raised, mouth slightly open'}


def eric_gen(seeds=ERIC_SEEDS):
    os.makedirs(os.path.join(PC, 'eric'), exist_ok=True)
    for seed in seeds:
        out = os.path.join(PC, 'eric', f'eric-{seed}.png' if ERIC_V == '1' else f'eric-v2-{seed}.png')
        if os.path.exists(out):
            continue
        check_lock()
        p = prompt(ERIC_DESC, ERIC_EXPR)
        comfy.run(comfy.anima(p, ERIC_NEG, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), out)
        log({'file': os.path.relpath(out, ROOT), 'kind': 'base', 'model': 'rdbtAnima', 'prompt': p, 'negative': ERIC_NEG, 'seed': seed,
             'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5, 'sampler': 'euler_ancestral normal'})
        print('ok eric', seed, flush=True)


def eric_expr(seeds):
    short = 'Eric, a 34-year-old Scandinavian man, short dark-blond hair, short dark-blond beard, fair pale skin, glasses with clear lenses, blue eyes'
    for seed in seeds:
        base = os.path.join(PC, 'eric', f'eric-{seed}-rf.png')
        for name, words in ERIC_FACES.items():
            face_expr(base, short, name, words, os.path.join(PC, 'eric', f'eric-{seed}-{name}.png'), neg=ERIC_NEG)


if __name__ == '__main__' and sys.argv[1] == 'eric-gen':
    eric_gen(tuple(map(int, sys.argv[2].split(','))) if len(sys.argv) > 2 else ERIC_SEEDS)
if __name__ == '__main__' and sys.argv[1] == 'eric-expr':
    eric_expr(sys.argv[2].split(','))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'gen':
        gen()
    elif cmd == 'reframe':
        do_reframe(sys.argv[2:])
    elif cmd == 'expr':
        expr(sys.argv[2:])
    elif cmd == 'guard':
        guard()


# ---------------- Mio expressions v3: her own glasses kept, irises colour-matched to the portrait ----------------
def mio_frame_mask(src, box=(290, 405, 720, 560), grow=3):
    """The glasses frame of the approved Mio portrait by colour: a low-saturation warm grey (taupe) inside the eye band,
    largest connected piece (frame, bridge and temple arm), grown by a few px to take the dark outline with it."""
    import numpy as np
    from scipy import ndimage
    im = np.asarray(Image.open(src).convert('RGB')).astype(float)
    x0, y0, x1, y1 = box
    sub = im[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    v, sat = sub.max(-1), sub.max(-1) - sub.min(-1)
    m = (v > 50) & (v < 175) & (r >= b) & (r >= g - 3) & (sat < 45)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    cx = ndimage.center_of_mass(m, lab, range(1, n + 1))
    ids = [int(np.argmax(sizes)) + 1] + [i + 1 for i in range(n) if sizes[i] >= 0.08 * sizes.max() and x0 + cx[i][1] > 540]
    keep = np.isin(lab, ids)  # the frame, plus the temple arm that a hair strand cuts off (right of the right lens)
    keep = ndimage.binary_closing(keep, iterations=2)
    keep = ndimage.binary_dilation(keep, iterations=grow)
    full = np.zeros(im.shape[:2], bool)
    full[y0:y1, x0:x1] = keep
    return full


def _rgb2hsv(a):
    import numpy as np
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0)
    return np.stack([h, s, mx], -1)


def _hsv2rgb(h):
    import numpy as np
    H, S, V = h[..., 0] / 60, h[..., 1], h[..., 2]
    i = np.floor(H).astype(int) % 6
    f = H - np.floor(H)
    p, q, t = V * (1 - S), V * (1 - S * f), V * (1 - S * (1 - f))
    out = np.zeros(h.shape)
    for k, (R, G, B) in enumerate([(V, t, p), (q, V, p), (p, V, t), (p, q, V), (t, p, V), (V, p, q)]):
        m = i == k
        out[m] = np.stack([R[m], G[m], B[m]], -1)
    return out


def eye_boxes(path, pad=3):
    """Anime eye boxes from imgutils (CPU, ~/ai/consist/.venv)."""
    code = ('import sys, json\nfrom imgutils.detect import detect_eyes\n'
            'print(json.dumps([list(map(int, b)) for b, _, s in detect_eyes(sys.argv[1]) if s > 0.3]))')
    r = subprocess.run([os.path.expanduser('~/ai/consist/.venv/bin/python'), '-c', code, path], capture_output=True, text=True, check=True)
    return [(x0 - pad, y0 - pad, x1 + pad, y1 + pad) for x0, y0, x1, y1 in json.loads(r.stdout.strip().splitlines()[-1])]


def iris_pixels(a, boxes, strict=False):
    """Coloured iris pixels inside the eye boxes: saturated, not skin or blush (reds and pinks), not the near-black lines."""
    import numpy as np
    hsv = _rgb2hsv(a)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    m = np.zeros(a.shape[:2], bool)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = True
    tan = (h > 35) & (h < 330) & (s > 0.14) & (v > 0.22)
    brown = (s > 0.12) & (v > 0.15) & (v < 0.78)  # darker irises of any hue (browns, mauves); skin and blush are lighter
    if strict:  # the approved portrait: its light tan irises only, no lid strokes
        return m & tan
    cand = m & (tan | brown)
    from scipy import ndimage
    disk = np.hypot(*np.mgrid[-3:4, -3:4]) <= 3
    core = ndimage.binary_opening(cand, structure=disk)  # irises are blobs; eyelid and lash strokes are thin lines
    return cand & ndimage.binary_dilation(core, iterations=2)


def match_iris(src_path, out_path, ref_path):
    """Recolour the repainted irises to the approved portrait's: same hue, saturation and brightness as the portrait's iris
    pixels (sampled from the image), keeping the shading pattern of the new eyes."""
    import numpy as np
    ref = np.asarray(Image.open(ref_path).convert('RGB')).astype(float) / 255
    img = np.asarray(Image.open(src_path).convert('RGB')).astype(float) / 255
    rm, im = iris_pixels(ref, eye_boxes(ref_path), strict=True), iris_pixels(img, eye_boxes(src_path))
    rh, ih = _rgb2hsv(ref)[rm], _rgb2hsv(img)
    th, ts, tv = np.median(rh[:, 0]), np.median(rh[:, 1]), np.median(rh[:, 2])
    new = ih.copy()
    sel = ih[im]
    sel[:, 0] = th
    sel[:, 1] = np.clip(sel[:, 1] / max(np.median(sel[:, 1]), 1e-3) * ts, 0, 1)
    sel[:, 2] = np.clip(sel[:, 2] / max(np.median(sel[:, 2]), 1e-3) * tv, 0, 1)
    new[im] = sel
    out = _hsv2rgb(new)
    Image.fromarray((out * 255 + 0.5).clip(0, 255).astype('uint8')).save(out_path)
    return (th, ts, tv), int(rm.sum()), int(im.sum())


# ---------------- Eric posed (v4): natural pose, face kept close to eric-v2-734 by the Anima IP-Adapter ----------------
ERIC_POSES = {
    'neck': 'body turned slightly to his left, head tilted a little, rubbing the back of his neck with his right hand',
    'strap': 'body turned slightly to his right, a black laptop bag on a strap over his left shoulder, his left hand holding the strap',
    'coffee': 'body turned slightly to his left, holding a paper coffee cup in his right hand at chest height',
    'glasses': 'body turned slightly to his right, head tilted down a little, pushing his glasses up his nose with his right index finger',
    'laptop': 'body turned slightly to his left, a closed laptop tucked under his right arm',
    'pockets': 'body turned slightly to his right, shoulders a little slumped, both hands in his blazer pockets',
}


def eric_posed(ipa_strength=0.6, seed=741, cut=False, tag=''):
    sys.path.insert(0, os.path.join(ROOT, 'tools', 'imagegen'))
    import consist
    ref = os.path.join(PC, 'eric', 'eric-v2-734-rf.png')
    base = [e for e in json.load(open(LOG)) if e['file'].endswith('eric-v2-734.png')][0]
    for key, pose in ERIC_POSES.items():
        out = os.path.join(PC, 'eric', f'eric-pose{tag}-{key}-{seed}.png')
        if os.path.exists(out):
            continue
        check_lock()
        p = base['prompt'].replace('weary half-smile, waist-up portrait facing the viewer at a slight angle',
                                   f'weary half-smile, {pose}, waist-up portrait')
        wf = consist.ipa(comfy.anima(p, base['negative'], model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), ref, ipa_strength, cut=cut)
        comfy.run(wf, out)
        log({'file': os.path.relpath(out, ROOT), 'kind': 'base', 'model': f'rdbtAnima + Anima IP-Adapter Character_Reference {ipa_strength} (ref eric-v2-734' + (' cut out on white' if cut else '') + ')',
             'prompt': p, 'negative': base['negative'], 'seed': seed, 'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5})
        print('ok pose', key, flush=True)


# ---------------- Kenji concept round: 6 design directions, 2 waist-up seeds and 1 full-body each ----------------
KENJI_NEG = NEG + ', rim light, red rim light, backlighting, muscular, bodybuilder, glasses, over-ear headphones, shota'
# Brief v2 (Jørgen): Kenji is 21, the newest on the team, eager to help, easily distracted. Each direction gives him a life of his
# own that pulls his attention (cliche pass: no spiky hair, orange hoodie, headband, gamer headset, energy drink or thumbs-up).
KENJI_DIRS = {
    'a-trains': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: short and slim with narrow shoulders, a neat mushroom haircut, '
                 'a company-issue navy work jacket one size too big with the sleeves over his knuckles, a lanyard covered in enamel monorail pin badges, '
                 'a small pencil behind his ear, holding a pocket notebook full of train numbers, looking off to the side at something that caught his eye',
                 'eager open-mouthed smile'),
    'b-gashapon': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: slim, fluffy black hair with a short undercut, one wireless earbud in, '
                   'an oversized cream knit cardigan over a white company shirt, his lanyard crowded with tiny capsule-toy keychains, '
                   'holding a small capsule toy up to the light between two fingers',
                   'delighted, completely absorbed'),
    'c-citypop': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: slim, centre-parted wavy black hair to his chin, '
                  'a brown and cream retro knit polo shirt with a wide collar, a cassette walkman clipped to his belt with wired earphones around his neck, '
                  'the company lanyard wound around his wrist instead of his neck, fingers tapping a rhythm on his arm',
                  'dreamy half-listening smile'),
    'd-climber': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: slim and wiry, short sun-bleached messy hair held back with a black hair clip, '
                  'white finger tape on two fingers and chalk dust on his hands, a dark green fleece vest over a light blue company shirt, a carabiner of keys on his belt loop, '
                  'leaning forward keen to help while glancing at the phone half out of his pocket',
                  'bright eager grin'),
    'e-plants': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: slim, messy black hair with one thin braid behind his ear, a moss-green bucket hat, '
                 'an untucked white company shirt with a doodle-covered notepad sticking out of the breast pocket, holding a tiny potted cactus in both hands',
                 'proud, gentle beaming smile'),
    'f-rookiesuit': ('Kenji, a 21-year-old young man, the newest hire on an office IT team: slim, hair neatly gelled flat except one cowlick springing up at the back, '
                     'a brand-new stiff black recruit suit slightly too big, a tie knotted too short, the company lanyard tangled around his tie, '
                     'a half-eaten rice ball in his left hand, glancing sideways',
                     'nervous, eager-to-please smile'),
}
FULL = ('full body standing, feet and shoes visible, facing the viewer at a slight angle, (the whole figure inside the frame with empty space above the head:1.2), '
        'plain light grey background, soft even studio light')


def kenji_round():
    os.makedirs(os.path.join(PC, 'kenji2'), exist_ok=True)
    jobs = []
    for d, (desc, expr) in KENJI_DIRS.items():
        for seed in (751, 752):
            jobs.append((f'kenji-{d}-{seed}', f'{Q}, safe, 1boy, solo, adult, {desc}, {expr}, {FRAME}', seed))
        jobs.append((f'kenji-{d}-full-751', f'{Q}, safe, 1boy, solo, adult, {desc}, {expr}, {FULL}', 751))
    for name, p, seed in jobs:
        out = os.path.join(PC, 'kenji2', f'{name}.png')
        if os.path.exists(out):
            continue
        check_lock()
        comfy.run(comfy.anima(p, KENJI_NEG, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), out)
        log({'file': os.path.relpath(out, ROOT), 'kind': 'kenji-concept', 'model': 'rdbtAnima', 'prompt': p, 'negative': KENJI_NEG, 'seed': seed,
             'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5})
        print('ok', name, flush=True)
