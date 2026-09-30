"""cast-faces-1: the picked bases of the new cast, small fixes on them, and each person's game faces as face-only repaints.

Jørgen's picks (reviews/style-align-1 and reviews/npc-base-1, 2026-09-30): Eric eric-ink-2001, Kenji kenji-ink-2001,
Emi emi-base-2001, Aoi aoi-base-2001, the guard guard-ink-2001 (style-align-1); Mori mori-new-713 and Hamada
hamada-new-743 (npc-base-1). Mio keeps her portraits, untouched.

Fixes before any face (brief: "the guard's chest tag read a garbled POLICE on some attempts and Aoi's patch turned into
letters (fix by small inpaint if present on the picked ones)"). Both are present on the picks: the guard's name plate
reads "BVIER", his shoulder patch "SOLICY" and his collar pin "G2"; Aoi's chest patch reads "IN". Each is a masked
img2img of that patch alone (RDBT, DifferentialDiffusion, a square crop upscaled to 1024), pasted back through a
feathered mask, with letters and text in the negative.

Faces: the method of kenji-expressions-1 and eric-expressions-1: a square around the detected face (imgutils) upscaled to
1024, RDBT masked img2img inside an oval from the brows to the chin, pasted back through the same oval with a 3 px
feather. Hair, clothes and background are the base's own pixels. Eric's and the guard's glasses frames are pasted back
from the base afterwards, so they stay identical. Each person keeps the face names the game already has
(game3d/js/ui/portrait-data.js); the base itself is the neutral. Emi and Aoi have only a neutral.
Words per face: the ones that made the current faces (tools/portrait_candidates.py for Mori, Hamada and the guard,
eric-expressions-1 s2 and t3 for Eric, kenji-expressions-1 g and s3 for Kenji), with each base's own description.
No blush words anywhere (Jørgen on group-1: "more people are blushing"); "blush" is in the negative for everyone whose
base has none (Eric, the guard, Mori, Hamada). The ink style phrase stays on those whose base was an ink render.

Staging note (for checking, not in the prompts): each base's shot is fixed; waist-up, facing the viewer at a slight
angle, plain grey background, soft even light. Only the face moves, eyes on the viewer.

Usage: ~/ai/sd/venv/bin/python gen.py fix | faces <who>:<face>:<denoise>:<seeds> ... | masks
Raw PNGs: art/production/PC/cast-faces-1/ (git-ignored); prompts.json here."""
import sys, os, json, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = '/home/jorgen/repo/japanese'          # raw renders live in the main checkout (git-ignored)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from PIL import Image, ImageDraw, ImageFilter

OWNER = 'claude-agent:portrait-install'
RAW = os.path.join(ROOT, 'art/production/PC/cast-faces-1')
LOG = os.path.join(HERE, 'prompts.json')
SA = os.path.join(ROOT, 'art/production/PC/style-align-1')
NB = os.path.join(ROOT, 'art/production/PC/npc-base-1')
QT = ('masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '
      'anime screenshot, anime coloring, 2d, cel shading, clean lineart')
NEG0 = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, '
        'text, watermark, signature, 3d, realistic, photorealistic, render, nude, nsfw, child, loli, '
        '(rim light, red rim light, red outline, backlighting:1.4)')
INK = ', high contrast, deep black shadows'
TAIL = 'close-up of his face, plain light grey background, soft even studio light'

# face box: imgutils detect_faces on the base (tools/imagegen/faces.py). oval: the repaint area as fractions of the face
# box (left, top, right, bottom), checked on masks-*.png over each base.
BASE = {
    'eric': dict(src=f'{SA}/eric-ink-2001.png', game='eric', box=(177, 257, 511, 591), glasses=True,
                 oval=(0.06, 0.12, 0.92, 0.99),
                 desc='1boy, solo, male focus, a Scandinavian man in his early thirties, fair pale skin, blue eyes, '
                      '(facial hair, dark-blond stubble:1.3), (silver rectangular glasses:1.2)' + INK,
                 neg=', chubby, fat, obese, plump, blush'),
    'kenji': dict(src=f'{SA}/kenji-ink-2001.png', game='kenji', box=(331, 252, 569, 499), oval=(0.08, 0.10, 0.92, 0.97),
                  desc='1boy, solo, adult, Kenji, a 21-year-old young adult man with a youthful face, round chubby face, '
                       'thick eyebrows, messy black bedhead hair' + INK,
                  neg=', mature male, old man, middle-aged, stubble, facial hair, beard, moustache, square jaw, glasses, muscular'),
    'emi': dict(src=f'{SA}/emi-base-2001.png', game='emi', box=(311, 238, 591, 523)),
    'aoi': dict(src=f'{SA}/aoi-base-2001.png', game='aoi', box=(334, 290, 616, 580)),
    'guard': dict(src=f'{SA}/guard-ink-2001.png', game='guard', box=(335, 253, 557, 494), glasses=True,
                  oval=(0.09, 0.08, 0.92, 0.97),
                  desc='1boy, solo, Ishibashi, a 64-year-old man, completely bald head, bushy white eyebrows, a thin white '
                       'moustache, thin silver glasses with clear lenses' + INK,
                  neg=', chubby, fat, obese, plump, blush'),
    'mori': dict(src=f'{NB}/mori-new-713.png', game='mori', box=(372, 114, 542, 309), oval=(0.08, 0.16, 0.92, 1.00),
                 desc='1boy, solo, Mr. Mori, a 58-year-old Japanese man, neatly combed grey hair with a side parting, an older '
                      'face with wrinkles around his eyes and mouth',
                 neg=', chubby, fat, obese, plump, blush, glasses'),
    'hamada': dict(src=f'{NB}/hamada-new-743.png', game='kuroda', box=(351, 107, 557, 382), oval=(0.05, 0.08, 0.93, 0.97),
                   desc='1boy, solo, Mr. Hamada, a 54-year-old Japanese man, a tired middle-aged face, a receding hairline, short '
                        'black hair going grey at the temples, tired eyes with dark circles',
                   neg=', chubby, fat, obese, plump, blush'),
}
FF = ', frown, furrowed brow, angry'
FACES = {
    ('eric', 'surprised'): ('surprised, eyes wide open, eyebrows raised, mouth slightly open', ', closed eyes, smile' + FF),
    ('eric', 'tired'): ('tired, weary, heavy-lidded eyes, mouth closed, no smile', ', smile, grin, flushed cheeks' + FF),
    ('kenji', 'grin'): ('big happy grin showing his teeth, bright eyes, looking at the viewer', FF + ', closed eyes'),
    ('kenji', 'sheepish'): ('sheepish nervous smile, (worried eyebrows:1.3), sweatdrop, looking at the viewer', FF + ', crying, tears'),
    # pass 2, Kenji: pass 1 made his cheeks and nose redder than the base on most seeds; one change, blush in the negative
    ('kenji', 'grin-nb'): ('big happy grin showing his teeth, bright eyes, looking at the viewer', FF + ', closed eyes, blush'),
    ('kenji', 'sheepish-nb'): ('sheepish nervous smile, (worried eyebrows:1.3), sweatdrop, looking at the viewer', FF + ', crying, tears, blush'),
    ('guard', 'stern'): ('stern, frowning, mouth a firm line', ', smile'),
    ('guard', 'amused'): ('amused, a small dry smile under the moustache, eyes softened', FF),
    ('mori', 'smile'): ('warm polite smile, eyes creased', FF),
    ('mori', 'flustered'): ('flustered, embarrassed, eyebrows raised, a small awkward smile, faint sweat drop', ', angry'),
    ('hamada', 'sleepy'): ('sleepy, eyes half closed, drowsy, mouth slightly open', ', smile' + FF),
    ('hamada', 'panicked'): ('panicked, eyes wide, mouth open, sweat drops', ', smile'),
}

# patch fixes: (who, name, box of the patch on the base, crop box, prompt words)
FIX_NEG = NEG0 + ', text, letters, words, numbers, logo text, writing, english text, alphabet'
FIXES = {
    'guard-plate': ('guard', (296, 616, 416, 652), (236, 514, 476, 754),
                    '1boy, navy security uniform jacket, a small blank gold name plate on the chest pocket, plain metal bar'),
    'guard-patch': ('guard', (94, 606, 182, 726), (58, 586, 218, 746),
                    '1boy, navy security uniform sleeve, a shoulder patch with a gold border and a simple winged emblem'),
    'guard-collar': ('guard', (310, 544, 362, 574), (276, 499, 396, 619),
                     '1boy, navy security uniform collar, a small plain gold collar pin'),
    'aoi-patch': ('aoi', (512, 776, 646, 916), (459, 726, 699, 966),
                  '1girl, dark green varsity jacket, a small pink star patch on the chest'),
}


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def log(name, entry):
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = entry
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)


def fixed_base(who):
    """The base with its picked fixes (fix-<who>.png) or the raw pick."""
    p = os.path.join(RAW, f'base-{who}.png')
    return p if os.path.exists(p) else BASE[who]['src']


FIGURE = {'on': True}


def figure(base):
    """The figure without its outer outline: pixels away from the background colour, shrunk by 5 px."""
    if not FIGURE['on']:
        return None
    import numpy as np
    from scipy import ndimage
    a = np.asarray(base).astype(np.int32)
    bg = np.median(np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3)]), axis=0)
    fg = np.abs(a - bg).sum(-1) > 30
    fg = ndimage.binary_fill_holes(ndimage.binary_opening(fg, iterations=2))
    fg = ndimage.binary_erosion(fg, iterations=5)
    return Image.fromarray((fg * 255).astype(np.uint8))


def repaint(src, crop, mask_fn, p, neg, seed, denoise, out, feather=3):
    """Masked img2img of crop (square box on src) at 1024; mask_fn(draw, map) draws the area in source coords."""
    import comfy
    from portrait_candidates import inpaint_wf
    check_lock()
    base = Image.open(src).convert('RGB')
    side = crop[2] - crop[0]
    k = 1024 / side
    cp, mp = os.path.join(RAW, 'crop.png'), os.path.join(RAW, 'mask.png')
    pad = Image.new('RGB', (base.width + 2 * side, base.height + 2 * side), base.getpixel((4, 4)))
    pad.paste(base, (side, side))
    pad.crop(tuple(v + side for v in crop)).resize((1024, 1024), Image.LANCZOS).save(cp)
    m = Image.new('L', (1024, 1024), 0)
    mask_fn(ImageDraw.Draw(m), lambda x, y: ((x - crop[0]) * k, (y - crop[1]) * k))
    fg = figure(base)
    if fg is not None:   # keep the plain background and the figure's outline out of the repaint
        fgp = Image.new('L', pad.size, 0)
        fgp.paste(fg, (side, side))
        fgc = fgp.crop(tuple(v + side for v in crop)).resize((1024, 1024), Image.BILINEAR)
        m = Image.fromarray(__import__('numpy').minimum(__import__('numpy').asarray(m), __import__('numpy').asarray(fgc)))
    m.filter(ImageFilter.GaussianBlur(10)).convert('RGB').save(mp)
    wf = inpaint_wf(cp, mp, p, seed, denoise, neg)
    tmp = out + '.crop.png'
    comfy.run(wf, tmp)
    new = Image.open(tmp).convert('RGB').resize((side, side), Image.LANCZOS)
    full = pad.copy()
    full.paste(new, (crop[0] + side, crop[1] + side))
    full = full.crop((side, side, side + base.width, side + base.height))
    pm = Image.new('L', base.size, 0)
    mask_fn(ImageDraw.Draw(pm), lambda x, y: (x, y))
    if fg is not None:
        pm = Image.fromarray(__import__('numpy').minimum(__import__('numpy').asarray(pm), __import__('numpy').asarray(fg)))
    Image.composite(full, base, pm.filter(ImageFilter.GaussianBlur(feather))).save(out)
    os.replace(tmp, out.replace('.png', '-crop1024.png'))
    json.dump(wf, open(os.path.join(RAW, 'workflow-cast-faces-1.json'), 'w'), indent=1)


def oval(who):
    b, o = BASE[who]['box'], BASE[who]['oval']
    w, h = b[2] - b[0], b[3] - b[1]
    return (b[0] + o[0] * w, b[1] + o[1] * h, b[0] + o[2] * w, b[1] + o[3] * h)


def face_crop(who):
    b = BASE[who]['box']
    cx, cy, s = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, max(b[2] - b[0], b[3] - b[1])
    half = int(s * 0.65)
    return (int(cx - half), int(cy - half), int(cx - half) + 2 * half, int(cy - half) + 2 * half)


def run_fix(name, seed, denoise=0.75):
    who, box, crop, words = FIXES[name]
    src = BASE[who]['src']
    tag = f'{name}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'fix-{tag}.png')
    p = f'{QT}, safe, {words}'
    if not os.path.exists(out):
        repaint(src, crop, lambda d, t: d.rounded_rectangle([*t(box[0], box[1]), *t(box[2], box[3])], 12, fill=255),
                p, FIX_NEG, seed, denoise, out, feather=2)
    log(f'fix-{tag}', dict(kind='fix', who=who, source=os.path.relpath(src, ROOT), box=box, crop=crop, prompt=p,
                                   negative=FIX_NEG, seed=seed, denoise=denoise, model='rdbtAnima',
                                   settings='euler_ancestral normal, 30 steps, CFG 5, DifferentialDiffusion, crop upscaled to 1024'))
    print('ok', tag, flush=True)


def run_face(who, face, denoise, seed):
    c = BASE[who]
    words, negx = FACES[(who, face)]
    name = f'{who}-{face}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'{name}.png')
    tail = TAIL
    p = f"{QT}, safe, {c['desc']}, {words}, {tail}"
    neg = NEG0 + c['neg'] + negx
    src = fixed_base(who)
    if not os.path.exists(out):
        ov = oval(who)
        repaint(src, face_crop(who), lambda d, t: d.ellipse([*t(ov[0], ov[1]), *t(ov[2], ov[3])], fill=255), p, neg, seed,
                denoise, out)
    log(name, dict(kind='face', who=who, face=face, words=words, prompt=p, negative=neg, seed=seed, denoise=denoise,
                   source=os.path.relpath(src, ROOT), crop=face_crop(who), oval=[round(v) for v in oval(who)], model='rdbtAnima',
                   settings='euler_ancestral normal, 30 steps, CFG 5, DifferentialDiffusion, face crop upscaled to 1024, 3 px feather'))
    print('ok', name, flush=True)


def masks():
    """Each base with its repaint oval and face crop drawn on, for checking."""
    for who, c in BASE.items():
        if 'oval' not in c:
            continue
        im = Image.open(fixed_base(who)).convert('RGB')
        d = ImageDraw.Draw(im)
        d.ellipse(oval(who), outline=(255, 0, 0), width=3)
        d.rectangle(face_crop(who), outline=(0, 160, 255), width=3)
        im.crop(face_crop(who)).save(os.path.join(RAW, f'masks-{who}.png'))


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'masks':
        masks()
    elif cmd == 'fix':
        for spec in args:                      # name:seeds[:denoise]
            n, seeds, *d = spec.split(':')
            for s in seeds.split(','):
                run_fix(n, int(s), float(d[0]) if d else 0.75)
    elif cmd == 'faces':
        for spec in args:                      # who:face:denoise:seeds
            who, face, dn, seeds = spec.split(':')
            for s in seeds.split(','):
                run_face(who, face, float(dn), int(s))
