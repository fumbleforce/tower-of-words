"""Style alignment, round 1: the B2 team and the regulars re-drawn in the style of Mio's and Kuro's portraits.

Jørgen (2026-09-30, on reviews/group-portrait-1): "to be clear the original Mio and Kuro are my favorites so if we can try
to align the world around those, that is the idea, but I think it can be tough. we can milden the stylization of mio a
little bit, and make kenji look less like a miyazaki character".

What the anchors look like: art/PROMPTS.md "House portrait style: Mio and Kuro".

Staging note (for checking, not in the prompt): the same shot as each game portrait. Waist-up, eye level, facing the viewer
at a slight angle, plain pale cool-grey background, soft even light, no rim light. Both hands empty (hanging at the sides,
in pockets or out of frame); nothing held. Head, hair, glasses, clothes and build as the approved portrait: Eric's
ponytail, stubble and silver glasses; Emi's auburn bob and tortoiseshell glasses; Mori's grey hair, no glasses, 58;
Kenji's round face, pudgy build, bedhead, no pocket snack and no sticky note.

Source of every render: the character's game portrait (cut-out, game3d/assets/portraits/<id>-neutral.webp; for Mori,
Hamada and the guard the empty-handed repaints from reviews/npc-base-1, because their game portraits hold a cup, a
briefcase and a clipboard), put on the anchors' background colour and scaled 1.5x, so every render maps straight back to
the game canvas (597x768; Eric 648x768) with the face where the game puts it.

Methods, one change at a time on the same seeds (JOBS below says which step each job belongs to):
  i2i   img2img from the source, the portrait's own prompt, denoise D. The baseline: how far the plain model moves.
  sty   the same, but the source sits beside a style anchor (Kuro or Mio) on one wide canvas, and only the right half is
        repainted (LLLite inpainting-v2, strength 1.0): the model continues the anchor's drawing in the other half.
  ipa   i2i with the Anima IP-Adapter (Character_Reference) fed the style anchor at a low strength.
Mio: img2img of her own portrait at a low denoise with softer shading words, then her exact frame pasted back from the
source (art/PROMPTS.md "Mio's glasses": the transplant; same pose, so it is a straight paste, no warp).

Usage: ~/ai/sd/venv/bin/python art/candidates/portraits/style-align-1/gen.py [job ...]   (no job = all)
Raw PNGs: art/production/PC/style-align-1/ (git-ignored); webp copies (game canvas, on grey) and prompts.json here."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
from production import Q, N, RDBT
from PIL import Image, ImageDraw, ImageFilter

OWNER = 'claude-agent:style-align'
RAW = os.path.join(ROOT, 'art/production/PC/style-align-1')
LOG = os.path.join(HERE, 'prompts.json')
BG = (210, 218, 225)                      # Mio's anchor background
K = 1.5                                    # game canvas -> render
LLLITE_INPAINT = 'anima-lllite-inpainting-v2.safetensors'
IPA_FILE = 'ip_adapter-Character_Reference-10.safetensors'
ANCHOR = {'kuro': os.path.join(ROOT, 'art/approved/kuro/kuro-after.webp'),
          'mio': os.path.join(ROOT, 'art/approved/mio/mio-after.webp')}

P = 'game3d/assets/portraits/'
NB = 'art/candidates/portraits/npc-base-1/'
FRAME = 'waist-up portrait facing the viewer at a slight angle, plain light grey background, soft even studio light'
# Each block is the approved portrait's own wording (eric-r4-909, kenji3-h4-bedhead, npc-base-1 mori/hamada/guard, emi as in
# group-1), with the hands made empty where they held something and Kenji's snack and sticky note taken out.
CHAR = {
    'eric': dict(src=P + 'eric-neutral.webp', tag='1boy', neg=', undercut, shaved sides, two-tone hair, closed eyes',
                 desc='male focus, a Scandinavian man in his early thirties, fair pale skin, blue eyes, company lanyard, dark-blond hair, '
                      'same colour all over, tied in a short ponytail at the back, (facial hair, dark-blond stubble:1.3), '
                      '(silver rectangular glasses:1.2), grey hoodie under a navy blazer, one hand in his pocket, slight three-quarter '
                      'turn, looking at the viewer, faint smile'),
    'kenji': dict(src=P + 'kenji-neutral.webp', tag='1boy', chubby_ok=True,
                  neg=', mature male, old man, middle-aged, stubble, facial hair, beard, moustache, square jaw, muscular, glasses, headphones, hat, tall',
                  desc='adult, Kenji, a 21-year-old fresh graduate, a young adult man with a youthful face, short and pudgy with a round face, '
                       'thick eyebrows, messy black bedhead hair flattened on one side with a cowlick sticking up at the back, a white '
                       'short-sleeved work shirt with a dark tie, the company lanyard with an ID card around his neck, arms relaxed at his '
                       'sides, empty hands, friendly smile'),
    'mori': dict(src=NB + 'mori-arm-1-framed.webp', tag='1boy', neg=', glasses',
                 desc='Mr. Mori, a 58-year-old Japanese man, a former manager on an office IT team: slim with an upright posture, neatly '
                      'combed grey hair with a side parting, an older face with wrinkles around his eyes and mouth, dark grey suit with a '
                      'navy tie, arms relaxed at his sides, empty hands, gentle polite smile, head bowed slightly'),
    'emi': dict(src=P + 'emi-neutral.webp', tag='1girl',
                desc='Emi, a 32-year-old British woman, fair skin, reddish auburn shoulder-length bob with side-swept bangs, warm brown eyes, '
                     'brown tortoiseshell glasses with clear lenses, curvy, fitted charcoal blazer over a cream blouse, company lanyard, '
                     'hands behind her back, warm smile'),
    'aoi': dict(src=P + 'aoi-neutral.webp', tag='1girl',
                desc='Aoi, a 22-year-old woman, slim with small breasts, shoulder-length pink-dyed hair with dark roots, oversized '
                     'varsity jacket over a white top, company lanyard, playful grin, winking'),
    'kuroda': dict(src=NB + 'hamada-arm-1-framed.webp', tag='1boy',
                   desc='Mr. Hamada, a 54-year-old Japanese salaryman from accounts: thin with narrow shoulders, a tired middle-aged face, a '
                        'receding hairline, short black hair going grey at the temples, tired eyes with dark circles, a rumpled navy suit '
                        'with a crooked tie, arms relaxed at his sides, empty hands, apologetic worried smile'),
    'guard': dict(src=NB + 'guard-fig-1-framed.webp', tag='1boy',
                  desc='Ishibashi, a 64-year-old company gate guard and retired police officer: small and wiry, completely bald head, a thin '
                       'white moustache, reading glasses with clear lenses pushed up on his forehead, navy security uniform and white '
                       'gloves, arms relaxed at his sides, empty hands, suspicious narrowed eyes'),
    'mio': dict(src=P + 'mio-neutral.webp', tag='1girl',
                desc='Mio, a 25-year-old woman: messy black hair with green underneath in a loose bun, pale tan eyes, glasses with clear lenses, '
                     'oversized black hoodie, headphones around her neck, company lanyard, calm deadpan expression, half-lidded eyes'),
}
NOPROP = ', (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, briefcase, bag, clipboard'
# Kenji's game portrait still shows the snack in his breast pocket and the sticky note on his sleeve (image right): painted
# over with the shirt colour before any render, boxes on the 597x768 canvas.
PAINT = {'kenji': [((349, 414, 421, 467), (300, 380, 500, 560)), ((502, 452, 592, 534), (300, 380, 500, 560))]}


def prompt(who, extra=''):
    c = CHAR[who]
    return f"{Q}, safe, {c['tag']}, solo, {c['desc']}{extra}, {FRAME}"


def negative(who, extra=''):
    c = CHAR[who]
    base = N.replace(', chubby', '') if c.get('chubby_ok') else N
    return base + ', fat, obese' + NOPROP + c.get('neg', '') + extra


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def game_canvas(who):
    """The source on the anchor background, at game size (RGB), with held props painted over."""
    im = Image.open(os.path.join(ROOT, CHAR[who]['src'])).convert('RGBA')
    for box, sample in PAINT.get(who, []):
        px = sorted(p for p in im.crop(sample).getdata() if p[3] > 250 and min(p[:3]) > 190)  # the shirt's light cream, not its teal
        col = px[len(px) // 2]
        fill = Image.new('RGBA', im.size, (0, 0, 0, 0))
        fill.paste(col[:3] + (255,), box)
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).rounded_rectangle(box, 8, fill=255)
        m = Image.composite(m, Image.new('L', im.size, 0), im.getchannel('A'))
        im = Image.composite(fill, im, m.filter(ImageFilter.GaussianBlur(3)))
    g = Image.new('RGBA', im.size, BG + (255,))
    g.alpha_composite(im)
    return g.convert('RGB')


def dims(who):
    w, h = Image.open(os.path.join(ROOT, CHAR[who]['src'])).size
    return w, h, -(-round(w * K) // 16) * 16, -(-round(h * K) // 16) * 16


def init_png(who):
    os.makedirs(RAW, exist_ok=True)
    p = os.path.join(RAW, f'init-{who}.png')
    if not os.path.exists(p):
        w, h, W, H = dims(who)
        c = Image.new('RGB', (W, H), BG)
        c.paste(game_canvas(who).resize((round(w * K), round(h * K)), Image.LANCZOS), (0, 0))
        c.save(p)
    return p


def anchor_panel(name, W, H):
    """The style anchor fitted to W x H: scaled to the height, centred, padded with its own background."""
    a = Image.open(ANCHOR[name]).convert('RGB')
    s = H / a.height
    a = a.resize((round(a.width * s), H), Image.LANCZOS)
    c = Image.new('RGB', (W, H), a.getpixel((4, 4)))
    c.paste(a, ((W - a.width) // 2, 0))
    return c


def wf_i2i(who, seed, d, extra='', negx=''):
    _, _, W, H = dims(who)
    wf = comfy.anima(prompt(who, extra), negative(who, negx), model=RDBT, w=W, h=H, steps=30, cfg=5, seed=seed)
    wf['I0'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(init_png(who))}}
    wf['I1'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['I0', 0], 'vae': ['3', 0]}}
    wf['7']['inputs'].update(latent_image=['I1', 0], denoise=d)
    return wf


def wf_sty(who, seed, d, anchor, extra='', negx=''):
    """Anchor | source on one canvas; only the right half repainted."""
    _, _, W, H = dims(who)
    dp = os.path.join(RAW, f'dip-{who}-{anchor}.png')
    mp = os.path.join(RAW, f'dipmask-{W}x{H}.png')
    if not os.path.exists(dp):
        c = Image.new('RGB', (W * 2, H))
        c.paste(anchor_panel(anchor, W, H), (0, 0))
        c.paste(Image.open(init_png(who)), (W, 0))
        c.save(dp)
    if not os.path.exists(mp):
        m = Image.new('L', (W * 2, H), 0)
        m.paste(255, (W, 0, W * 2, H))
        m.save(mp)
    c = CHAR[who]
    tags = '1boy, 1girl' if c['tag'] == '1boy' else '2girls'
    p = f"{Q}, safe, {tags}, two portraits side by side by the same artist, on the right: {c['desc']}{extra}, {FRAME}"
    wf = comfy.anima(p, negative(who, negx), model=RDBT, w=W * 2, h=H, steps=30, cfg=5, seed=seed)
    wf['10'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(dp)}}
    wf['11'] = {'class_type': 'VAEEncode', 'inputs': {'pixels': ['10', 0], 'vae': ['3', 0]}}
    wf['12'] = {'class_type': 'LoadImageMask', 'inputs': {'image': comfy.upload(mp), 'channel': 'red'}}
    wf['13'] = {'class_type': 'SetLatentNoiseMask', 'inputs': {'samples': ['11', 0], 'mask': ['12', 0]}}
    wf['P'] = {'class_type': 'ModelPatchLoader', 'inputs': {'name': LLLITE_INPAINT}}
    wf['A'] = {'class_type': 'AnimaLLLiteApply', 'inputs': {'model': ['1', 0], 'model_patch': ['P', 0], 'image': ['10', 0], 'mask': ['12', 0],
                                                           'strength': 1.0, 'start_percent': 0.0, 'end_percent': 1.0}}
    wf['7']['inputs'].update(model=['A', 0], latent_image=['13', 0], denoise=d)
    del wf['6']
    return wf, p


def wf_ipa(who, seed, d, anchor, st, extra='', negx=''):
    wf = wf_i2i(who, seed, d, extra, negx)
    ref = os.path.join(RAW, f'anchor-{anchor}.png')
    if not os.path.exists(ref):
        Image.open(ANCHOR[anchor]).convert('RGB').save(ref)
    wf['IPL'] = {'class_type': 'AnimaIPAdapterLoader', 'inputs': {'ip_adapter_name': IPA_FILE, 'auto_download': False}}
    wf['RI'] = {'class_type': 'LoadImage', 'inputs': {'image': comfy.upload(ref)}}
    wf['IPA'] = {'class_type': 'AnimaIPAdapterApply', 'inputs': {
        'model': wf['7']['inputs']['model'], 'ip_adapter': ['IPL', 0], 'ref_image': ['RI', 0], 'strength': float(st),
        'ref_image_size': 512, 'siglip_layer': -1, 'ip_cfg_scale': 4.0, 'ip_cfg_separate': False, 'gray_null': False, 'use_lora': True}}
    wf['7']['inputs']['model'] = ['IPA', 0]
    return wf


# ---- Mio's frame, pasted back from the source (tools/imgqa-ref/mio-glasses.json: runs [y, x0, x1] on mio-neutral) ----
def mio_frame(img_game):
    """img_game: the render brought back to 597x768. Returns it with the source's frame pixels on top."""
    ref = json.load(open(os.path.join(ROOT, 'tools/imgqa-ref/mio-glasses.json')))
    runs = json.loads(ref['runs']) if isinstance(ref['runs'], str) else ref['runs']
    m = Image.new('L', img_game.size, 0)
    dr = ImageDraw.Draw(m)
    for y, x0, x1 in runs:
        dr.line((x0, y, x1, y), fill=255)
    m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    # her eyes too (art/PROMPTS.md "Mio's glasses": always keep her eyes; every repaint changed her irises), soft ovals
    e = Image.new('L', img_game.size, 0)
    for box in MIO_EYES:
        ImageDraw.Draw(e).ellipse(box, fill=255)
    e = e.filter(ImageFilter.GaussianBlur(4))
    src = game_canvas('mio')
    return Image.composite(src, Image.composite(src, img_game, e), m)


MIO_EYES = [(206, 260, 264, 302), (274, 242, 336, 294)]  # her right eye (image left) and left eye (image right) on mio-neutral


def to_game(who, png):
    w, h, W, H = dims(who)
    im = Image.open(png).convert('RGB')
    if im.width == W * 2:
        im = im.crop((W, 0, W * 2, H))
    return im.crop((0, 0, round(w * K), round(h * K))).resize((w, h), Image.LANCZOS)


SEEDS = (2001, 2002)
JOBS = {}


def job(name, who, kind, seed, **kw):
    JOBS[name] = (who, kind, seed, kw)


# step 1, Kenji only (the hardest one), to pick the method: plain img2img at two strengths, then the anchor beside him
# (Kuro, then Mio), then the IP-Adapter fed the anchor.
for s in SEEDS:
    job(f'kenji-i2i55-{s}', 'kenji', 'i2i', s, d=0.55)
    job(f'kenji-i2i70-{s}', 'kenji', 'i2i', s, d=0.70)
    job(f'kenji-stykuro70-{s}', 'kenji', 'sty', s, d=0.70, anchor='kuro')
    job(f'kenji-stymio70-{s}', 'kenji', 'sty', s, d=0.70, anchor='mio')
    job(f'kenji-ipakuro70-{s}', 'kenji', 'ipa', s, d=0.70, anchor='kuro', st=0.4)

# step 2, Kenji: step 1 made his arms muscular on every method and the anchor beside him (sty) turned him into someone
# slimmer; Jørgen on group-1 (2026-09-30): "kenji is suddenly turning extremely muscular". Plain img2img at 0.6 with the
# muscle words and his "less like a miyazaki character" in the negative (NK), then one phrase more each:
NK = ', muscular, muscles, veins, studio ghibli'
for s in SEEDS:
    job(f'kenji-n60-{s}', 'kenji', 'i2i', s, d=0.60, negx=NK)
    job(f'kenji-n60e-{s}', 'kenji', 'i2i', s, d=0.60, negx=NK, extra=', sharp narrow eyes, pale skin')
    job(f'kenji-n60ek-{s}', 'kenji', 'sty', s, d=0.60, anchor='kuro', negx=NK, extra=', sharp narrow eyes, pale skin')

# step 3, Kenji: n60 keeps him and is less orange and round than the source, but his arms stay muscular and his eyes stay
# the round dots; "sharp narrow eyes, pale skin" (n60e) blanked his irises. One phrase each on n60: the eyes here (n60l);
# the arms (", soft chubby arms") became his step-4 job kenji-base, rendered once there.
for s in SEEDS:
    job(f'kenji-n60l-{s}', 'kenji', 'i2i', s, d=0.60, negx=NK, extra=', detailed eyes with thick upper lashes')

# Jørgen on group-1 (2026-09-30, via the coordinator): "kenji is suddenly turning extremely muscular, and more people are
# blushing. Mio should have pale tan eye color, and Emi reddish auburn hair". So: blush in the negative for everyone whose
# approved portrait has none (Eric, Mori, Hamada, the guard), Mio's eyes "pale tan eyes", Emi "reddish auburn".
NEGX = {'eric': ', blush', 'mori': ', blush', 'kuroda': ', blush', 'guard': ', blush', 'kenji': NK, 'emi': '', 'aoi': '',
        'mio': ', blue eyes, green eyes'}
EXTRA = {'kenji': ', soft chubby arms'}
INK = ', high contrast, deep black shadows'

# step 4, everyone: the method from Kenji's steps (img2img at 0.6 from the game portrait, the portrait's own prompt), then
# the same with one style phrase taken from the anchors' look (INK).
for who in ('eric', 'kenji', 'mori', 'emi', 'aoi', 'kuroda', 'guard'):
    for s in SEEDS:
        job(f'{who}-base-{s}', who, 'i2i', s, d=0.60, negx=NEGX[who], extra=EXTRA.get(who, ''))
    for s in SEEDS:
        job(f'{who}-ink-{s}', who, 'i2i', s, d=0.60, negx=NEGX[who], extra=EXTRA.get(who, '') + INK)

# Mio, milder: her own portrait at a low denoise, then her frame pasted back. d 0.35 and 0.45 with no new words, then
# ", soft shading" at 0.45.
for s in SEEDS:
    job(f'mio-m35-{s}', 'mio', 'i2i', s, d=0.35, negx=NEGX['mio'], frame=True)
    job(f'mio-m45-{s}', 'mio', 'i2i', s, d=0.45, negx=NEGX['mio'], frame=True)
    job(f'mio-m45s-{s}', 'mio', 'i2i', s, d=0.45, negx=NEGX['mio'], extra=', soft shading', frame=True)

# step 5: ink at denoise 0.75 instead of 0.6 on the B2 four, to see whether more freedom brings the anchors' heavier
# black shapes (at 0.6 the ink phrase only darkens the clothes a little).
for who in ('eric', 'kenji', 'mori', 'emi'):
    for s in SEEDS:
        job(f'{who}-ink75-{s}', who, 'i2i', s, d=0.75, negx=NEGX[who], extra=EXTRA.get(who, '') + INK)


def render(name):
    who, kind, seed, kw = JOBS[name]
    out = os.path.join(RAW, f'{name}.png')
    meta = {'who': who, 'method': kind, 'seed': seed, 'model': 'rdbtAnima', 'steps': 30, 'cfg': 5, 'sampler': 'euler_ancestral normal',
            'source': CHAR[who]['src'], **kw}
    ex, nx = kw.get('extra', ''), kw.get('negx', '')
    if kind == 'i2i':
        wf = wf_i2i(who, seed, kw['d'], ex, nx)
        meta['prompt'] = prompt(who, ex)
    elif kind == 'sty':
        wf, meta['prompt'] = wf_sty(who, seed, kw['d'], kw['anchor'], ex, nx)
        meta['canvas'] = f"{kw['anchor']} anchor (left) | source (right), right half masked, LLLite inpainting-v2 1.0"
    elif kind == 'ipa':
        wf = wf_ipa(who, seed, kw['d'], kw['anchor'], kw['st'], ex, nx)
        meta['prompt'] = prompt(who, ex)
        meta['ip_adapter'] = f"{IPA_FILE}, ref {kw['anchor']} anchor, strength {kw['st']}"
    meta['negative'] = negative(who, nx)
    if not os.path.exists(out):
        check_lock()
        comfy.run(wf, out)
    g = to_game(who, out)
    if who == 'mio' and kw.get('frame'):
        g = mio_frame(g)
        meta['glasses'] = 'frame pixels (tools/imgqa-ref/mio-glasses.json line, 1 px grown) and both eyes (soft ovals, MIO_EYES) pasted back from mio-neutral'
    g.save(os.path.join(HERE, f'{name}.webp'), quality=92)
    return meta


def main(names):
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for name in JOBS:
        if names and name not in names and not any(name.startswith(n.rstrip('*')) and n.endswith('*') for n in names):
            continue
        L[name] = render(name)
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
