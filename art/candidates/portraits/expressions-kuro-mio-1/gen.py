"""expressions-kuro-mio-1: Kuro's four game faces and Mio's missing one, repainted onto each neutral portrait's own render.

Jørgen on Showcase register-reactions-1 (Rei's reaction line): "lacking emotion in the dialogue picture." Rei only had a
neutral; rei-expressions-1 fixed that. Kuro has the same gap (only kuro-neutral.webp), and Mio's voice sheet asks for one
face her installed set lacks. Faces from the voice sheets (notes/characters/<id>/voice.md):
  Kuro: flirtatious smile, teasing, pleased (flattered by a compliment), cool front-desk politeness.
  Mio: dry/deadpan (mio-deadpan), rare small smile (mio-smile), flustered (mio-embarrassed) exist; mildly annoyed is new.

Method: the one of rei-expressions-1. A 300 px square around the face upscaled to 1024, RDBT masked img2img
(DifferentialDiffusion) inside a polygon from below the fringe to the chin, inside the jaw line, pasted back with a 3 px
feather. The glasses frame is kept out of the repaint mask and pasted back from the neutral afterwards, so it stays
identical (Kuro: dark pixels in the glasses band, her eyes left out; Mio: portrait_candidates.mio_frame_mask, art/PROMPTS.md
"Mio's glasses"). Hair, outfit, background and framing are the neutral's own pixels, so the cut-out is the installed one.
Fangs are in every negative (rei-expressions-1: the first scolding seeds drew vampire fangs).

Sources:
  Kuro: art/production/KB/c-s11.png (1096x1824, kuro-body-1 c-s11 = game3d/assets/portraits/kuro-neutral.webp at 0.5748).
  Mio: art/production/PC/mio/mio-v3-neutral-823.png (1008x1296, the v3 neutral = game3d/assets/portraits/mio-neutral.webp,
       597x768). All her installed faces are face repaints of this same render.

Staging note (for checking only, not in the prompt): each neutral's shot is fixed. Kuro: cut at the waist, three-quarter
turn towards her right (image left), head tilted down a little, eyes on the viewer over her glasses, plain mint background.
Mio: head and shoulders, three-quarter turn towards her right (image left), headphones round her neck, plain light grey.
Only the face moves. Kuro flirtatious: half-lidded, a slow closed-mouth smile. Teasing: a one-sided smirk, amused eyes.
Pleased: a softer, warmer smile, faint blush, a compliment landed. Polite: a cool small professional smile, calm level eyes.
Mio annoyed: mildly, a small frown, flat or slightly pouting mouth, still looking at him.

Usage (GPU lock held as OWNER): ~/ai/sd/venv/bin/python gen.py kf:0.7:1,2,3 ...   (face:denoise:seeds)
Raw PNGs: art/production/PC/expr-kuro-mio-1/ (git-ignored); prompts.json log here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import cast_looks
from production import Q
from PIL import Image, ImageDraw, ImageFilter

OWNER = 'expressions-kuro-mio-1'
RAW = os.path.join(ROOT, 'art/production/PC/expr-kuro-mio-1')
LOG = os.path.join(HERE, 'prompts.json')
TAIL = 'close-up of her face, plain light grey background, soft even studio light'
FANGS = 'fang, fangs, sharp teeth'


def neg0(who):
    # art/PROMPTS.md "Negative prompt base", the style-drift words, the weighted red-rim line, her own negative, fangs
    return ('worst quality, low quality, early, old, score_1, score_2, score_3, artist name, blurry, jpeg artifacts, lowres, '
            'bad anatomy, text, watermark, signature, 3d, realistic, photorealistic, render, chubby, nude, nsfw, child, loli, '
            'western cartoon, comic book, flat vector, thick outlines, poster art, pop art, '
            f'(rim light, red rim light, red outline, backlighting:1.4), {cast_looks.negative(who)}, {FANGS}')


PEOPLE = {
    'kuro': dict(
        base=os.path.join(ROOT, 'art/production/KB/c-s11.png'), source='kuro-body-1 c-s11 (kuro-neutral.webp)',
        # below the fringe and the frame's top bar, inside her jaw line, left of the blue-streaked side lock at x 737
        poly=[(512, 640), (560, 636), (610, 640), (660, 652), (700, 668), (734, 684), (734, 745), (700, 768), (670, 808),
              (645, 848), (622, 875), (600, 876), (570, 855), (532, 822), (516, 788), (511, 745), (510, 700)],
        crop=(470, 610, 770, 910)),
    'mio': dict(
        base=os.path.join(ROOT, 'art/production/PC/mio/mio-v3-neutral-823.png'), source='mio-v3-neutral-823 (mio-neutral.webp)',
        # below the fringe, inside the jaw line, left of the hair strand across her left cheek (image right) at x 548
        poly=[(354, 447), (420, 432), (470, 425), (510, 420), (545, 420), (546, 440), (546, 560), (530, 580), (505, 605),
              (482, 618), (462, 616), (430, 595), (400, 565), (378, 540), (354, 528)],
        crop=(300, 380, 600, 680)),
}

FACES = {
    'kf': ('kuro', 'flirtatious smile', 'flirtatious smile, closed mouth, half-lidded eyes, looking at the viewer',
           ', grin, teeth, open mouth, frown, furrowed brow, angry, crying, tears'),
    'kt': ('kuro', 'teasing', 'teasing playful smirk, one corner of the mouth raised, amused eyes, looking at the viewer',
           ', frown, furrowed brow, angry, crying, tears'),
    'kp': ('kuro', 'pleased', 'pleased, flattered by a compliment, soft happy smile, faint blush, looking at the viewer',
           ', grin, frown, furrowed brow, angry, crying, tears'),
    'kc': ('kuro', 'cool politeness', 'cool polite professional expression, small polite closed-mouth smile, calm eyes, looking at the viewer',
           ', grin, teeth, open mouth, frown, angry, blush, crying, tears'),
    'ma': ('mio', 'mildly annoyed', 'mildly annoyed, slight frown, eyebrows drawn together a little, small flat pout, looking at the viewer',
           ', smile, grin, happy, open mouth, shouting, blush, crying, tears'),
}
# Round 1 (d70) and 2 (d55): Kuro's eyes came out wide and round under thin lids and her black lips glossy navy-purple on
# every seed, at both denoise levels. Round 3, one change for her, back at 0.7: those words in the negative.
KURO_OFF = ', wide eyes, round eyes, glossy lips, shiny lips, purple lips'
for f in ('kf', 'kt', 'kp', 'kc'):
    w, e, words, extra = FACES[f]
    FACES[f + '3'] = (w, e, words, extra + KURO_OFF)
# Mio rounds 1 and 2: a second lens rim drawn just inside her kept frame. Round 3, one change for her, back at 0.7: the
# kept frame grown by 6 px more (mio_frame_mask grow 3 -> 9), so the band inside the frame stays the neutral's.
FACES['ma3'] = FACES['ma']
GROW = {'ma3': 9}


def frame_mask(who, base, grow=3):
    """The glasses frame of the neutral render, as a bool array: these pixels stay the neutral's."""
    import numpy as np
    from scipy import ndimage
    if who == 'mio':
        from portrait_candidates import mio_frame_mask
        return mio_frame_mask(base, grow=grow)
    im = np.asarray(Image.open(base).convert('RGB')).astype(int)
    dark = im.max(-1) < 90
    x0, y0, x1, y1 = 495, 628, 792, 762  # the glasses band
    m = np.zeros_like(dark)
    m[y0:y1, x0:x1] = dark[y0:y1, x0:x1]
    eyes = Image.new('L', (im.shape[1], im.shape[0]), 0)
    d = ImageDraw.Draw(eyes)
    d.ellipse((526, 654, 620, 700), fill=255)  # her right eye (image left) and its lashes: repainted
    d.ellipse((678, 684, 752, 718), fill=255)  # her left eye (image right)
    m &= ~(np.asarray(eyes) > 0)
    m = ndimage.binary_opening(m, iterations=1)  # drops the skin's screen-tone dots
    lab, n = ndimage.label(m)
    sz = ndimage.sum(m, lab, range(1, n + 1))
    k = np.isin(lab, [i + 1 for i in range(n) if sz[i] >= 300])
    k = ndimage.binary_closing(k, iterations=2)
    return ndimage.binary_dilation(k, iterations=1)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def run(fid, seed, denoise):
    import numpy as np
    who, expr, words, extra = FACES[fid]
    P = PEOPLE[who]
    name = f'{fid}-d{int(round(denoise * 100))}-{seed}'
    out = os.path.join(RAW, f'{name}.png')
    crop_out = os.path.join(RAW, f'{who}-{name}-crop1024.png')
    neg = neg0(who) + extra
    p = f'{Q}, safe, 1girl, solo, {cast_looks.line(who)}, {words}, {TAIL}'
    if not os.path.exists(out):
        import comfy
        from portrait_candidates import inpaint_wf
        check_lock()
        base = Image.open(P['base']).convert('RGB')
        C, UP = P['crop'], 1024
        k = UP / (C[2] - C[0])
        keep = Image.fromarray((frame_mask(who, P['base'], GROW.get(fid, 3)) * 255).astype('uint8'))
        cp, mp = os.path.join(RAW, f'{who}-crop.png'), os.path.join(RAW, f'{who}-mask.png')
        base.crop(C).resize((UP, UP), Image.LANCZOS).save(cp)
        m = Image.new('L', (UP, UP), 0)
        ImageDraw.Draw(m).polygon([((x - C[0]) * k, (y - C[1]) * k) for x, y in P['poly']], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(10))
        km = keep.crop(C).resize((UP, UP), Image.NEAREST)
        m = Image.composite(Image.new('L', (UP, UP), 0), m, km)  # the frame is not repainted
        m.convert('RGB').save(mp)
        wf = inpaint_wf(cp, mp, p, seed, denoise, neg)
        comfy.run(wf, crop_out)  # logged in the dashboard under this path (its #n)
        new = Image.open(crop_out).convert('RGB').resize((C[2] - C[0],) * 2, Image.LANCZOS)
        full = base.copy()
        full.paste(new, C[:2])
        pm = Image.new('L', base.size, 0)
        ImageDraw.Draw(pm).polygon(P['poly'], fill=255)
        res = Image.composite(full, base, pm.filter(ImageFilter.GaussianBlur(3)))
        res = Image.composite(base, res, keep.filter(ImageFilter.GaussianBlur(0.8)))  # frame back, identical
        res.save(out)
        json.dump(wf, open(os.path.join(RAW, 'workflow-anima-face-expression.json'), 'w'), indent=1)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    L[name] = dict(who=who, expression=expr, words=words, prompt=p, negative=neg, seed=seed, denoise=denoise, source=P['source'],
                   method='RDBT Anima masked img2img (DifferentialDiffusion) on a 300 px crop of the neutral render upscaled to 1024, '
                          'pasted back through the face polygon (3 px feather), glasses frame kept out of the mask and pasted back',
                   settings='euler_ancestral normal, 30 steps, CFG 5')
    json.dump(L, open(LOG, 'w'), indent=1, ensure_ascii=False)
    print('ok', name, flush=True)


if __name__ == '__main__':
    os.makedirs(RAW, exist_ok=True)
    for spec in sys.argv[1:]:
        fid, dn, seeds = spec.split(':')
        for s in seeds.split(','):
            run(fid, int(s), float(dn))
