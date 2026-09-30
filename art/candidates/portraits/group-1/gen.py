"""Group portrait experiment, round 1: the B2 team in one picture, to compare style with the standalone portraits.

Jørgen (2026-09-30): "I have become a little worried over our portrait style consistency. Could you run an experiment where
you try to put the main cast into one picture, so we can get them all generated at the same time in the same style, and see
how it looks compared to the existing standalone ones."

Staging note (for checking, not in the prompt):
- Beat: a team photo of B2, everyone in one style, so each face can be cut out as a dialogue portrait.
- Camera: inside the B2 basement office, eye level, facing the five of them straight on, about 3 m away; medium shot, waist up.
- In front of the lens, image left to right: Eric, Mio, Kenji, Mr. Mori, Emi, side by side, a little space between them,
  facing the viewer, arms relaxed at their sides, empty hands. Behind them the office wall and desks, soft.
- Heights (game figures: Eric and Mori 1.2, Mio 1.12; Kenji's design says short; Emi has no figure, taken as Mio's):
  Eric's and Mori's heads highest, Mio and Emi a little lower, Kenji lowest.
- Eyelines: everyone at the camera.
- Light: even indoor office light from above-front; no rim light.
- Physical sense: five people, ten hands, nobody holding anything, no one merged with a neighbour, glasses on Eric (silver
  rectangles), Mio (taupe-grey rounded rectangles) and Emi (tortoiseshell), none on Kenji and Mori.

Approaches (one change each, same seeds):
  a  one plain prompt, one block per character, left to right.
  b  a's prompt as the base, plus Anima regional conditioning: five vertical strips, each with that character's block
     (Comfyui-Anima-Regional-Conditioning, README's tested values).
  c  a's prompt, img2img from a layout collage: the five approved game portraits (cut-outs), scaled to the same face size and
     the heights above, pasted on the approved B2 office (art/approved/office/office-reverse-5202-fix-a.webp).
Later jobs change one knob of the best of these; see JOBS.

Usage: ~/ai/sd/venv/bin/python art/candidates/portraits/group-1/gen.py [job ...]   (collage: gen.py collage)
Raw PNGs: art/production/PC/group-1/ (git-ignored); webp copies and prompts.json here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
from production import Q, N, RDBT
from PIL import Image, ImageFilter

OWNER = 'claude-agent:group-portrait'
RAW = os.path.join(ROOT, 'art/production/PC/group-1')
LOG = os.path.join(HERE, 'prompts.json')
W, H = 1664, 896
SEEDS = (1001, 1002, 1003, 1004)
ORDER = ['eric', 'mio', 'kenji', 'mori', 'emi']

# Each block is the approved portrait's own wording (eric-r4-909, mio B-mio / production CAST, kenji3-h4-bedhead, mori-713,
# emi round-3 seed 41), cut to the look: hair, eyes, glasses, clothes, build, a neutral face. Props and poses left out.
CHAR = {
    'eric': ('1boy', 'Eric, a Scandinavian man in his early thirties, fair pale skin, blue eyes, dark-blond hair, same colour all over, '
                     'tied in a short ponytail at the back, (facial hair, dark-blond stubble:1.3), (silver rectangular glasses:1.2), grey hoodie under a navy blazer, '
                     'company lanyard, faint smile'),
    'mio': ('1girl', 'Mio, a 25-year-old woman, slim with soft curves, messy black hair with green underneath in a loose bun, bangs, '
                     'light tan eyes, taupe-grey glasses with clear lenses, large headphones around her neck, oversized dark green hoodie, '
                     'company lanyard, calm deadpan expression'),
    'kenji': ('1boy', 'Kenji, a 21-year-old young man with a youthful boyish face, short and pudgy with a round chubby face, thick eyebrows, '
                      'messy black bedhead hair with a cowlick, a white short-sleeved work shirt with a dark tie, '
                      'company lanyard with an ID card, friendly smile'),
    'mori': ('1boy', 'Mr. Mori, a 58-year-old Japanese man, slim with an upright posture, neatly combed grey hair with a side parting, '
                     'an older face with wrinkles around his eyes and mouth, dark grey suit with a navy tie, gentle polite smile'),
    'emi': ('1girl', 'Emi, a 32-year-old British woman, fair skin, auburn shoulder-length bob with side-swept bangs, warm brown eyes, '
                     'brown tortoiseshell glasses with clear lenses, soft rounded face, curvy, fitted charcoal blazer over a cream blouse, '
                     'company lanyard, warm smile'),
}
SCENE = ('All five stand side by side in a row facing the viewer, arms relaxed at their sides, empty hands. '
         'Eric and Mr. Mori are the tallest, Mio and Emi are a little shorter, Kenji is the shortest. '
         'waist-up group portrait, (every head inside the frame with empty space above the hair:1.2), '
         'behind them a Japanese office with desks and computers, soft even indoor light')
PROMPT = (f'{Q}, safe, 3boys, 2girls, group photo, from left to right: '
          + '; '.join(CHAR[k][1] for k in ORDER) + f'. {SCENE}')
# N minus chubby (Kenji is pudgy by design, as in his round), plus the build line, the weighted red rim, props, Eric's hair.
NEG = (N.replace(', chubby', '') + ', fat, obese, (rim light, red rim light, red outline, backlighting:1.4), '
       'holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, two-tone hair, '
       'extra person, merged bodies')


def region_prompt(k):
    tag, desc = CHAR[k]
    return f'{Q}, safe, {tag}, solo, {desc}, standing, facing the viewer, arms at sides, waist-up, office background'


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def strips(overlap=0):
    """Five vertical strip masks, one per character, left to right (white = the region)."""
    out = []
    for i, k in enumerate(ORDER):
        p = os.path.join(RAW, f'mask-{i}-{k}-o{overlap}.png')
        if not os.path.exists(p):
            m = Image.new('L', (W, H), 0)
            x0, x1 = max(0, i * W // 5 - overlap), min(W, (i + 1) * W // 5 + overlap)
            m.paste(255, (x0, 0, x1, H))
            m.save(p)
        out.append(p)
    return out


def add_regional(wf, end=0.35, self_mask=0.2, overlap=0):
    prev = None
    for i, (k, mp) in enumerate(zip(ORDER, strips(overlap))):
        wf[f'RM{i}'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
        wf[f'RT{i}'] = {'class_type': 'CLIPTextEncode', 'inputs': {'text': region_prompt(k), 'clip': ['2', 0]}}
        inp = {'mask': [f'RM{i}', 0], 'conditioning': [f'RT{i}', 0], 'weight': 1.0}
        if prev:
            inp['regions'] = [prev, 0]
        wf[f'RC{i}'] = {'class_type': 'AnimaConditioningRegion', 'inputs': inp}
        prev = f'RC{i}'
    wf['RP'] = {'class_type': 'ApplyAnimaRegionalConditioningPatch', 'inputs': {
        'model': wf['7']['inputs']['model'], 'regions': [prev, 0], 'base_mode': 'disabled', 'base_strength': 0.2,
        'end_percent': end, 'cross_mask_strength': 1.0, 'self_mask_strength': self_mask, 'base_ratio': 0.1,
        'cross_inject_every_n_blocks': 1, 'self_inject_every_n_blocks': 1, 'start_percent': 0.0}}
    wf['7']['inputs']['model'] = ['RP', 0]
    return wf


def add_init(wf, image, denoise):
    wf['I0'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(image)}}
    wf['I1'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['I0', 0], 'vae': ['3', 0]}}
    wf['7']['inputs']['latent_image'] = ['I1', 0]
    wf['7']['inputs']['denoise'] = denoise
    return wf


# ---- layout collage for approach c ----
FACE = {  # game3d/js/ui/portraits.js FACE: canvas and face box of each approved game portrait
    'eric': (648, 768, (112, 208, 348, 399)), 'mio': (597, 768, (192, 214, 361, 383)), 'kenji': (597, 768, (221, 167, 384, 335)),
    'mori': (597, 768, (234, 171, 372, 339)), 'emi': (597, 768, (203, 159, 395, 349)),
}
FH = 118                                                    # face height in the collage, px
CHIN = {'eric': 360, 'mori': 360, 'mio': 385, 'emi': 385, 'kenji': 410}   # chin y: the heights in the staging note
COLLAGE = os.path.join(RAW, 'collage.png')
NOPROP = {'mori': ((205, 560, 430, 710), (150, 560, 200, 710))}  # (box, a strip of his jacket beside it) on mori-neutral.webp: his tea cup and hands


def collage():
    os.makedirs(RAW, exist_ok=True)
    bg = Image.open(os.path.join(ROOT, 'art/approved/office/office-reverse-5202-fix-a.webp')).convert('RGB')
    s = max(W / bg.width, H / bg.height)
    bg = bg.resize((round(bg.width * s), round(bg.height * s)), Image.LANCZOS)
    x0, y0 = (bg.width - W) // 2, (bg.height - H) // 2
    canvas = bg.crop((x0, y0, x0 + W, y0 + H)).convert('RGBA')
    for i, k in enumerate(ORDER):
        cw, ch, (fx0, fy0, fx1, fy1) = FACE[k]
        im = Image.open(os.path.join(ROOT, f'game3d/assets/portraits/{k}-neutral.webp')).convert('RGBA')
        if k in NOPROP:  # the provisional portrait's held prop, painted over with the clothes' colour (no props in base portraits)
            box, side = NOPROP[k]
            px = [p for p in im.crop(side).getdata() if p[3] > 250]
            col = tuple(sorted(c[j] for c in px)[len(px) // 2] for j in range(3)) + (255,)
            fill = Image.new('RGBA', im.size, (0, 0, 0, 0))
            fill.paste(col, box)
            m = Image.new('L', im.size, 0)
            m.paste(255, box)
            im = Image.composite(fill, im, m.filter(ImageFilter.GaussianBlur(8)))
        sc = FH / (fy1 - fy0)
        # the cut-outs end at the waist: stretch the last rows down so every body reaches the bottom edge
        need = int((H - CHIN[k]) / sc) + fy1 + 4
        if need > im.height:
            ext = Image.new('RGBA', (im.width, need))
            ext.paste(im, (0, 0))
            tail = im.crop((0, im.height - 2, im.width, im.height)).resize((im.width, need - im.height))
            ext.paste(tail.filter(ImageFilter.BoxBlur(10)), (0, im.height))  # soften the stretched fold stripes
            im = ext
        im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
        cx = (i + 0.5) * W / 5
        x = round(cx - (fx0 + fx1) / 2 * sc)
        y = round(CHIN[k] - fy1 * sc)
        canvas.alpha_composite(im, (x, y))
    canvas.convert('RGB').save(COLLAGE)
    canvas.convert('RGB').save(os.path.join(HERE, 'group1-collage.webp'), quality=90)
    print('collage', COLLAGE)


def job_wf(kind, seed, **kw):
    wf = comfy.anima(PROMPT, NEG, model=RDBT, w=W, h=H, steps=30, cfg=5, seed=seed)
    meta = {}
    if 'r' in kind:
        add_regional(wf, **{k: kw[k] for k in ('end', 'self_mask', 'overlap') if k in kw})
        meta['regional'] = {'regions': {k: region_prompt(k) for k in ORDER}, 'masks': '5 equal vertical strips',
                            'base_mode': 'disabled', 'end_percent': kw.get('end', 0.35), 'self_mask_strength': kw.get('self_mask', 0.2),
                            'cross_mask_strength': 1.0, 'base_ratio': 0.1, 'overlap_px': kw.get('overlap', 0)}
    if 'c' in kind:
        add_init(wf, COLLAGE, kw.get('denoise', 0.65))
        meta['img2img'] = {'init': 'group1-collage.webp', 'denoise': kw.get('denoise', 0.65)}
    return wf, meta


# name -> (kind, seed, knobs). kind letters: r = regional, c = collage init.
JOBS = {}
for s in SEEDS:
    JOBS[f'a-{s}'] = ('a', s, {})
    JOBS[f'b-{s}'] = ('r', s, {})
    JOBS[f'c-{s}'] = ('c', s, {})
# step 2: b's regional prompts on c's collage start (b kept identity, c kept layout and headroom)
for s in SEEDS:
    JOBS[f'bc-{s}'] = ('rc', s, {})
# step 3: bc was the same as c, because the patch stops at 35% of the schedule and a 0.65 img2img starts after that;
# the regional patch runs to 70% instead
for s in SEEDS:
    JOBS[f'bce70-{s}'] = ('rc', s, {'end': 0.7})
# step 4: bce70 split into five panels with their own backgrounds; self-attention masking off so the strips see each other
for s in SEEDS:
    JOBS[f'bce70s0-{s}'] = ('rc', s, {'end': 0.7, 'self_mask': 0.0})


# step 5: hires on the picks of step 4, so each face reaches the portrait size (face ~110 px -> ~165 px, Kenji's box 168):
# the render scaled 1.5x (Lanczos) and repainted at denoise 0.35, plain prompt (PROMPTS.md "Settings": hires fixes no
# layout, only detail).
HR = {f'hr-bce70s0-{s}': f'bce70s0-{s}' for s in (1001, 1003)}


def hires(name, src):
    out = os.path.join(RAW, f'group1-{name}.png')
    up = os.path.join(RAW, f'up-{src}.png')
    im = Image.open(os.path.join(RAW, f'group1-{src}.png')).convert('RGB')
    im.resize((W * 3 // 2, H * 3 // 2), Image.LANCZOS).save(up)
    seed = JOBS[src][1]
    wf = add_init(comfy.anima(PROMPT, NEG, model=RDBT, w=W * 3 // 2, h=H * 3 // 2, steps=30, cfg=5, seed=seed), up, 0.35)
    if not os.path.exists(out):
        check_lock()
        comfy.run(wf, out)
    Image.open(out).convert('RGB').save(os.path.join(HERE, f'group1-{name}.webp'), quality=90)
    return {'model': 'rdbtAnima', 'prompt': PROMPT, 'negative': NEG, 'seed': seed, 'w': W * 3 // 2, 'h': H * 3 // 2, 'steps': 30,
            'cfg': 5, 'sampler': 'euler_ancestral normal', 'img2img': {'init': f'group1-{src} scaled 1.5x (Lanczos)', 'denoise': 0.35}}


def main(names):
    os.makedirs(RAW, exist_ok=True)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for name, src in HR.items():
        if name in names:
            L[name] = hires(name, src)
            json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
            print('ok', name, flush=True)
    for name, (kind, seed, kw) in JOBS.items():
        if names and name not in names:
            continue
        out = os.path.join(RAW, f'group1-{name}.png')
        wf, meta = job_wf(kind, seed, **kw)
        if not os.path.exists(out):
            check_lock()
            comfy.run(wf, out)
        Image.open(out).convert('RGB').save(os.path.join(HERE, f'group1-{name}.webp'), quality=90)
        L[name] = {'model': 'rdbtAnima', 'prompt': PROMPT, 'negative': NEG, 'seed': seed, 'w': W, 'h': H, 'steps': 30, 'cfg': 5,
                   'sampler': 'euler_ancestral normal', **meta}
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, flush=True)


if __name__ == '__main__':
    if sys.argv[1:] == ['collage']:
        collage()
    else:
        main(sys.argv[1:])
