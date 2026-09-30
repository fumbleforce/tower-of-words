"""kenji-expressions-1: Kenji's three game faces (neutral, grin, sheepish) from the picked concept h4
(reviews/kenji-concept-3, Jørgen: "looks nice"; kenji3-h4-bedhead-761).

Face-only repaint of h4, the same method as eric-expressions-1 (art/PROMPTS.md "Eric (mc) portrait", Expressions): a 300 px
square around the face upscaled to 1024, RDBT masked img2img (DifferentialDiffusion) inside a polygon from the brows to the
chin that stays inside the jaw line and below the fringe, pasted back with a 3 px feather. Hair, shirt, hands and background
are h4's own pixels. The grin also has h4 itself unchanged (its open smile), as option g0.

Staging note (for checking only, not in the prompt): the h4 shot is fixed; waist-up, facing the viewer at a slight angle,
plain light grey background, soft even studio light, eyes on the viewer. Only the face moves. Neutral: calm, mouth closed, the
default for plain lines. Grin: bright and eager ("I am Kenji! ... now I am not the newest"). Sheepish: apologising for the
borrowed chair ("Ah, sorry, sorry. Your chair... I borrowed it").

Usage: ~/ai/sd/venv/bin/python art/candidates/portraits/kenji-expressions-1/gen.py n:0.65:1,2,3 ...  (expression:denoise:seeds)
Raw PNGs: art/production/PC/kenji-expr1/ (git-ignored); prompts.json log here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
from portrait_candidates import inpaint_wf
from production import Q
from PIL import Image, ImageDraw, ImageFilter

OWNER = 'kenji-expressions-1'
BASE = os.path.join(ROOT, 'art/production/PC/kenji4/kenji3-h4-bedhead-761.png')
RAW = os.path.join(ROOT, 'art/production/PC/kenji-expr1')
LOG = os.path.join(HERE, 'prompts.json')
DESC = ('safe, 1boy, solo, adult, Kenji, a 21-year-old young adult man with a youthful boyish face, round chubby face, '
        'thick eyebrows, big eyes, light blush on his cheeks, messy black bedhead hair')
TAIL = 'close-up of his face, plain light grey background, soft even studio light'
# h4's own negative, less the build words that don't apply to a face crop, plus the weighted red-rim line
NEG0 = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, bad anatomy, '
        'text, watermark, signature, 3d, realistic, photorealistic, render, nude, nsfw, child, loli, '
        '(rim light, red rim light, red outline, backlighting:1.4), mature male, old man, middle-aged, stubble, facial hair, '
        'beard, moustache, square jaw, manly, handsome, bishounen, shota, glasses')
WORDS = {
    'n': ('neutral', 'calm relaxed expression, mouth closed, soft eyebrows, looking at the viewer',
          NEG0 + ', open mouth, teeth, grin, frown, furrowed brow, angry, sad'),
    'g': ('grin', 'big happy grin showing his teeth, bright eyes, looking at the viewer',
          NEG0 + ', frown, furrowed brow, angry, closed eyes'),
    's': ('sheepish', 'sheepish apologetic smile, eyebrows tilted up in the middle, looking at the viewer',
          NEG0 + ', frown, furrowed brow, angry, crying, tears'),
    # the first sheepish (s, denoise 0.8) read as a pleased smile with level brows; one change: 'nervous' and a sweat drop
    's2': ('sheepish', 'sheepish nervous smile, eyebrows tilted up in the middle, sweatdrop, looking at the viewer',
           NEG0 + ', frown, furrowed brow, angry, crying, tears'),
    # s2 got the sweat drop but his brows stayed level on all three seeds; one change: the brow words weighted
    's3': ('sheepish', 'sheepish nervous smile, (worried eyebrows:1.3), sweatdrop, looking at the viewer',
           NEG0 + ', frown, furrowed brow, angry, crying, tears'),
}
# ids ending in 'k' (nk, gk, sk, s2k) keep h4's own nose: at denoise 0.8 the first renders redrew it bigger and browner.
# The nose ellipse is left out of the repaint mask and pasted back from h4.
NOSE = (386, 276, 424, 312)
# repaint area (source coords of the 896x1152 render): brows to chin, inside the cheek and jaw line, below the fringe
POLY = [(412, 180), (470, 172), (530, 180), (545, 215), (548, 260), (540, 300), (530, 340), (505, 370), (470, 390),
        (430, 396), (400, 390), (372, 370), (358, 340), (352, 300), (356, 262), (365, 235), (385, 215), (405, 200)]
CROP = (300, 130, 600, 430)
UP = 1024


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def run(wid, seed, denoise):
    name = f'{wid}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'kenji-{name}.png')
    keep = wid.endswith('k')
    expr, words, neg = WORDS[wid[:-1] if keep else wid]
    p = f'{Q}, {DESC}, {words}, {TAIL}'
    if not os.path.exists(out):
        check_lock()
        base = Image.open(BASE).convert('RGB')
        k = UP / (CROP[2] - CROP[0])
        cp, mp = os.path.join(RAW, 'crop.png'), os.path.join(RAW, 'mask.png')
        base.crop(CROP).resize((UP, UP), Image.LANCZOS).save(cp)
        m = Image.new('L', (UP, UP), 0)
        ImageDraw.Draw(m).polygon([((x - CROP[0]) * k, (y - CROP[1]) * k) for x, y in POLY], fill=255)
        if keep:
            ImageDraw.Draw(m).ellipse([(v - CROP[i % 2]) * k for i, v in enumerate(NOSE)], fill=0)
        m.filter(ImageFilter.GaussianBlur(10)).convert('RGB').save(mp)
        wf = inpaint_wf(cp, mp, p, seed, denoise, neg)
        tmp = out + '.crop.png'
        comfy.run(wf, tmp)
        new = Image.open(tmp).convert('RGB').resize((CROP[2] - CROP[0],) * 2, Image.LANCZOS)
        full = base.copy()
        full.paste(new, CROP[:2])
        pm = Image.new('L', base.size, 0)
        ImageDraw.Draw(pm).polygon(POLY, fill=255)
        if keep:
            ImageDraw.Draw(pm).ellipse(NOSE, fill=0)
        Image.composite(full, base, pm.filter(ImageFilter.GaussianBlur(3))).save(out)
        os.replace(tmp, os.path.join(RAW, f'kenji-{name}-crop1024.png'))
        json.dump(wf, open(os.path.join(RAW, 'workflow-anima-face-expression.json'), 'w'), indent=1)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = dict(expression=expr, words=words, prompt=p, negative=neg, seed=seed, denoise=denoise, source='kenji3-h4-bedhead-761', nose_kept=keep,
                   method='RDBT Anima masked img2img (DifferentialDiffusion) on a 300 px crop of h4 upscaled to 1024, pasted back '
                          'through the face polygon (3 px feather)', settings='euler_ancestral normal, 30 steps, CFG 5')
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for spec in sys.argv[1:]:
        wid, dn, seeds = spec.split(':')
        for s in seeds.split(','):
            run(wid, int(s), float(dn))
