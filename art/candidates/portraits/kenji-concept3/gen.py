"""Kenji concept round 3, from round 2's option c (kenji2-c2-pudgy). Jørgen: "Interesting but try different hair styles, and he
is too intense looking, dont overcorrect."

Everything is c's exact recipe (prompt, negative, RDBT, seeds 761 and 762, 896x1152, Euler A 30 steps CFG 5). Each option swaps
one phrase of c's prompt, so the seed keeps the face, build and shirt as close as the model allows:
  step 1 (x-*): the expression phrase only ("big grin with a gap between his front teeth").
  step 2 (h-*): the hair phrase only, on top of the expression picked in step 1 (XPICK).

Usage: ~/ai/sd/venv/bin/python art/candidates/portraits/kenji-concept3/gen.py [name ...]
Raw PNGs: art/production/PC/kenji4/ (gitignored); webp copies and prompts.json in this folder."""
import sys, os, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
import framecheck
from production import Q, FRAME, RDBT
from PIL import Image

spec = importlib.util.spec_from_file_location('r2', os.path.join(HERE, '../kenji-concept2/gen.py'))
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
C = r2.DIRS['c2-pudgy']
FULL = r2.FULL

OWNER = 'kenji-concept3-agent'
RAW = os.path.join(ROOT, 'art/production/PC/kenji4')
LOG = os.path.join(HERE, 'prompts.json')

C_EXPR = C['expr']
C_HAIR = 'grown-out light brown dyed hair with black roots, short and tousled'
assert C_HAIR in C['desc']

EXPR = {
    'x1-smile': 'friendly smile, relaxed eyes',
    'x2-small-grin': 'small easy grin with a gap between his front teeth, relaxed eyes',
    'x3-open-smile': 'cheerful open-mouthed smile, soft eyebrows, relaxed eyes',
}
XPICK = os.environ.get('XPICK', '')

HAIR = {
    'h1-mushroom': 'soft black hair in a rounded mushroom cut with a thick fringe down to his eyebrows',
    'h2-perm': 'fluffy light brown permed hair with loose soft curls',
    'h3-centre-part': 'black hair parted in the middle with long curtain bangs falling to his cheekbones',
    'h4-bedhead': 'messy black bedhead hair flattened on one side with a cowlick sticking up at the back',
    'h5-side-part': 'light brown dyed hair with black roots, neatly combed over to one side with a side part',
    'h6-ponytail': 'black hair grown out to his jaw, tied back in a small stubby ponytail, a few loose strands at the front',
}
SEEDS = (761, 762)
FULL_SEED = 761


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def prompt(desc, expr, frame):
    return f"{Q}, safe, 1boy, solo, adult, {desc}, {expr}, {frame}"


def jobs():
    for s in SEEDS:  # c itself, re-rendered to confirm the recipe reproduces it
        yield f'kenji3-c-{s}', prompt(C['desc'], C_EXPR, FRAME), s
    for k, e in EXPR.items():
        for s in SEEDS:
            yield f'kenji3-{k}-{s}', prompt(C['desc'], e, FRAME), s
    if XPICK:
        e = EXPR[XPICK]
        for k, h in HAIR.items():
            d = C['desc'].replace(C_HAIR, h)
            for s in SEEDS:
                yield f'kenji3-{k}-{s}', prompt(d, e, FRAME), s
            yield f'kenji3-{k}-full-{FULL_SEED}', prompt(d, e, FULL), FULL_SEED


def main(names):
    os.makedirs(RAW, exist_ok=True)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    for name, p, seed in jobs():
        if names and name not in names:
            continue
        out = os.path.join(RAW, name + '.png')
        if not os.path.exists(out):
            check_lock()
            comfy.run(comfy.anima(p, C['neg'], model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), out)
        Image.open(out).convert('RGB').save(os.path.join(HERE, name + '.webp'), quality=90)
        L[name] = {'model': 'rdbtAnima', 'prompt': p, 'negative': C['neg'], 'seed': seed, 'w': 896, 'h': 1152, 'steps': 30,
                   'cfg': 5, 'sampler': 'euler_ancestral normal', 'xpick': XPICK or None, 'frame_warn': framecheck.check(out)}
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, L[name]['frame_warn'], flush=True)


def sheet():
    """The whole round on one labelled sheet: c from round 2, step 1 (expression), step 2 (hair on x3)."""
    from PIL import ImageDraw, ImageFont
    rows = [('c (round 2), then c re-rendered', ['../kenji-concept2/kenji2-c2-pudgy-761', '../kenji-concept2/kenji2-c2-pudgy-762',
                                                  'kenji3-c-761', 'kenji3-c-762']),
            ('step 1: x1 / x2', ['kenji3-x1-smile-761', 'kenji3-x1-smile-762', 'kenji3-x2-small-grin-761', 'kenji3-x2-small-grin-762']),
            ('step 1: x3 (used for step 2)', ['kenji3-x3-open-smile-761', 'kenji3-x3-open-smile-762'])]
    rows += [(f'step 2: {k}', [f'kenji3-{k}-761', f'kenji3-{k}-762', f'kenji3-{k}-full-761']) for k in HAIR]
    W, H, T = 448, 576, 34
    img = Image.new('RGB', (W * 4, (H + T) * len(rows)), 'white')
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
    except OSError:
        f = ImageFont.load_default()
    for r, (label, names) in enumerate(rows):
        y = r * (H + T)
        for i, n in enumerate(names):
            img.paste(Image.open(os.path.join(HERE, n + '.webp')).convert('RGB').resize((W, H)), (i * W, y + T))
            d.text((i * W + 8, y + 8), os.path.basename(n), fill='black', font=f)
    img.save(os.path.join(HERE, '..', 'kenji-concept3-sheet.png'))


if __name__ == '__main__':
    if sys.argv[1:] == ['sheet']:
        sheet()
    else:
        main(sys.argv[1:])
