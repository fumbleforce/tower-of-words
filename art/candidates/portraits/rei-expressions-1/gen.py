"""rei-expressions-1: four game faces for Rei (scolding, cold, smug, caught off guard) from her installed portrait (issue #386).

Jørgen on Showcase register-reactions-1 (Rei's reaction line, desktop): "lacking emotion in the dialogue picture."
Rei has only game3d/assets/portraits/rei-neutral.webp, which is rei-body-1 b-s11 scaled 0.5951. This round repaints only
her face on that render, the same method as eric-expressions-1 and kenji-expressions-1 (art/PROMPTS.md "Eric (mc)
portrait", Expressions): a 300 px square around the face upscaled to 1024, RDBT masked img2img (DifferentialDiffusion)
inside a polygon from the brows to the chin, inside the jaw line, below the fringe and left of the hair strand that
crosses her left cheek (image right), pasted back with a 3 px feather. Hair, hoops, suit and background are b-s11's own
pixels, so the cut-out reuses b-s11's matte (cut.py).

Staging note (for checking only, not in the prompt): the b-s11 shot is fixed; cut at the waist, slight three-quarter turn
with her head tilted towards her right (image left), plain light grey background, soft even light, eyes on the viewer.
Only the face moves. Scolding: sharp and displeased, brows drawn down, mouth open mid-word. Cold: unimpressed flat stare,
heavy lids, mouth closed and level. Smug: a thin knowing smile, closed mouth. Caught off guard: a flicker, eyes a little
wider, brows up, lips parted, a faint blush.

Usage (GPU lock held as OWNER): ~/ai/sd/venv/bin/python gen.py s:0.7:1,2,3 ...   (expression:denoise:seeds)
Raw PNGs: art/production/PC/rei-expr1/ (git-ignored); prompts.json log here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
import cast_looks
from portrait_candidates import inpaint_wf
from production import Q
from PIL import Image, ImageDraw, ImageFilter

OWNER = 'rei-expressions-1'
BASE = os.path.join(ROOT, 'art/production/PC/rei-body-1/b-s11.png')
RAW = os.path.join(ROOT, 'art/production/PC/rei-expr1')
LOG = os.path.join(HERE, 'prompts.json')
DESC = f'safe, 1girl, solo, {cast_looks.line("rei")}'
TAIL = 'close-up of her face, plain light grey background, soft even studio light'
# art/PROMPTS.md "Negative prompt base", the style-drift words, the weighted red-rim line and her own negative from cast-looks
NEG0 = ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, '
        'bad anatomy, text, watermark, signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, '
        'western cartoon, comic book, flat vector, thick outlines, poster art, pop art, '
        f'(rim light, red rim light, red outline, backlighting:1.4), {cast_looks.negative("rei")}')
WORDS = {
    's': ('scolding', 'scolding, sharp displeased look, eyebrows drawn down, narrowed eyes, mouth open mid-word, looking at the viewer',
          NEG0 + ', smile, grin, happy, crying, tears'),
    # s drew pointed vampire fangs on all three seeds (big on 1 and 3); one change: fangs in the negative
    's2': ('scolding', 'scolding, sharp displeased look, eyebrows drawn down, narrowed eyes, mouth open mid-word, looking at the viewer',
           NEG0 + ', smile, grin, happy, crying, tears, fang, fangs, sharp teeth'),
    'c': ('cold', 'cold unimpressed stare, heavy-lidded eyes, expressionless, mouth closed in a flat line, looking down at the viewer',
          NEG0 + ', smile, grin, happy, open mouth, teeth, angry'),
    'm': ('smug', 'smug thin knowing smile, closed mouth, half-lidded eyes, looking at the viewer',
          NEG0 + ', grin, teeth, open mouth, frown, furrowed brow, angry'),
    'o': ('caught off guard', 'caught off guard, slightly widened eyes, eyebrows raised, lips slightly parted, faint blush, looking at the viewer',
          NEG0 + ', frown, furrowed brow, angry, smile, grin, crying, tears'),
}
# repaint area (source coords of the 896x1408 render): her left brow to the chin, inside the jaw line, below the fringe,
# left of the hair strand at x 455 (image right)
POLY = [(382, 392), (450, 390), (453, 450), (452, 530), (447, 578), (425, 600), (405, 617), (385, 605), (350, 572),
        (322, 532), (300, 512), (292, 490), (296, 470), (325, 462), (352, 448), (368, 420)]
CROP = (260, 340, 560, 640)
UP = 1024


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def run(wid, seed, denoise):
    name = f'{wid}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'rei-{name}.png')
    crop_out = os.path.join(RAW, f'rei-{name}-crop1024.png')
    expr, words, neg = WORDS[wid]
    p = f'{Q}, {DESC}, {words}, {TAIL}'
    wf = None
    if not os.path.exists(out):
        check_lock()
        base = Image.open(BASE).convert('RGB')
        k = UP / (CROP[2] - CROP[0])
        cp, mp = os.path.join(RAW, 'crop.png'), os.path.join(RAW, 'mask.png')
        base.crop(CROP).resize((UP, UP), Image.LANCZOS).save(cp)
        m = Image.new('L', (UP, UP), 0)
        ImageDraw.Draw(m).polygon([((x - CROP[0]) * k, (y - CROP[1]) * k) for x, y in POLY], fill=255)
        m.filter(ImageFilter.GaussianBlur(10)).convert('RGB').save(mp)
        wf = inpaint_wf(cp, mp, p, seed, denoise, neg)
        comfy.run(wf, crop_out)  # logged in the dashboard under this path (its #n)
        new = Image.open(crop_out).convert('RGB').resize((CROP[2] - CROP[0],) * 2, Image.LANCZOS)
        full = base.copy()
        full.paste(new, CROP[:2])
        pm = Image.new('L', base.size, 0)
        ImageDraw.Draw(pm).polygon(POLY, fill=255)
        Image.composite(full, base, pm.filter(ImageFilter.GaussianBlur(3))).save(out)
        json.dump(wf, open(os.path.join(RAW, 'workflow-anima-face-expression.json'), 'w'), indent=1)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = dict(expression=expr, words=words, prompt=p, negative=neg, seed=seed, denoise=denoise, source='rei-body-1 b-s11 (rei-neutral.webp)',
                   method='RDBT Anima masked img2img (DifferentialDiffusion) on a 300 px crop of b-s11 upscaled to 1024, pasted back '
                          'through the face polygon (3 px feather)', settings='euler_ancestral normal, 30 steps, CFG 5')
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for spec in sys.argv[1:]:
        wid, dn, seeds = spec.split(':')
        for s in seeds.split(','):
            run(wid, int(s), float(dn))
