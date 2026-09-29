"""Eric (bible id mc) dialogue portrait, round eric-portrait-anime-2.
Jørgen: the old first anime-figure set (legacy/proto2/gallery/A-mc-*) is the style he means, but those had no beard or glasses,
were "variations of the exact same face", and had "the red outline everywhere". So: the cast recipe of the A set
(tools/production.py: RDBT Anima, Q tags, safe, 896x1152, Euler A 30 steps CFG 5) with Eric's design (dark-blond hair, short
beard, glasses, grey hoodie under a navy blazer, lanyard), and every attempt a different face, hair, angle, pose and expression.
Red outline: RDBT draws a red rim light along the silhouette; the A set had no rim words in the negative (tools/redrim.py measures
18-40% red in the outline band there, 0.3% on eric-v2-734 which had them). This round keeps the rim words in the negative.

Staging (every shot): dialogue portrait, waist-up, camera at eye level a couple of metres in front, plain light grey backdrop,
soft even front light, nothing else in frame. Eyelines per shot (at the viewer, or off to one side).

Usage: ~/ai/sd/venv/bin/python tools/eric_anime2.py   (needs the GPU lock with owner eric-anime2 and ComfyUI on :8188)
Raw PNGs: art/production/PC/eric-anime2/ (gitignored); webp copies for review: game3d/assets/portrait-candidates/eric-anime2/"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy
from production import Q, N, FRAME, RDBT, OUT, ROOT
from redrim import red_rim
from PIL import Image

OWNER = 'eric-anime2'
RAW = os.path.join(OUT, 'PC', 'eric-anime2')
WEB = os.path.join(ROOT, 'game3d', 'assets', 'portrait-candidates', 'eric-anime2')
LOG = os.path.join(WEB, 'log.json')
NEG = N + ', fat, obese, plump, closed eyes, rim light, red rim light, backlighting'

BASE = 'a Scandinavian man in his early thirties, fair pale skin, blue eyes, company lanyard'
OUTFIT = 'grey hoodie under a navy blazer'

# id, seed, model, hair, beard, glasses, face/pose/expression
SHOTS = [
    ('a01', 901, RDBT, 'messy short dark-blond hair with a fringe', 'short dark-blond beard', 'black rectangular glasses',
     'facing the viewer, calm small smile'),
    ('a02', 902, RDBT, 'dark-blond hair swept back', 'dark-blond stubble on his jaw', 'thin silver round glasses',
     'three-quarter view turned to the left, looking to the side, flat deadpan expression'),
    ('a03', 903, RDBT, 'neat dark-blond side-parted hair', 'short dark-blond chin beard and moustache', 'half-rim glasses',
     'pushing his glasses up with one finger, focused serious look'),
    ('a04', 904, RDBT, 'tousled dark-blond hair, short on the sides', 'full short dark-blond beard', 'thick black-framed glasses',
     'rubbing the back of his neck with one hand, sheepish grin showing teeth'),
    ('a05', 905, RDBT, 'wavy dark-blond hair down to his ears', 'dark-blond stubble', 'round tortoiseshell glasses',
     'holding a paper coffee cup in his right hand, sleepy half-lidded eyes, small yawn'),
    ('a06', 906, RDBT, 'spiky short dark-blond hair', 'short dark-blond beard', 'black rectangular glasses',
     'head tilted, laughing, mouth open, eyes open'),
    ('a07', 907, RDBT, 'messy dark-blond hair falling over his forehead', 'short dark-blond beard', 'thin black glasses',
     'surprised, eyes wide behind his glasses, eyebrows raised, mouth slightly open'),
    ('a08', 908, RDBT, 'short dark-blond hair pushed up at the front', 'trimmed dark-blond beard', 'dark grey rectangular glasses',
     'arms crossed, confident smirk, seen from slightly below'),
    ('a09', 909, RDBT, 'dark-blond hair tied in a short ponytail at the back', 'dark-blond stubble', 'silver rectangular glasses',
     'looking back at the viewer over his shoulder, faint smile'),
    ('a10', 910, RDBT, 'curly short dark-blond hair', 'full short dark-blond beard', 'round black glasses',
     'hands in his blazer pockets, relaxed friendly smile'),
    ('a11', 911, RDBT, 'dark-blond undercut with longer hair on top', 'short dark-blond beard', 'black rectangular glasses',
     'worried expression, eyebrows drawn together, one hand raised to his chin'),
    ('a12', 912, RDBT, 'short messy dark-blond hair, a little bed hair', 'dark-blond stubble on his jaw and chin', 'thin silver glasses',
     'tired, dark circles under his eyes, weary look, mouth closed'),
    ('a13', 913, RDBT, 'dark-blond hair parted in the middle', 'short dark-blond goatee', 'black half-rim glasses',
     'three-quarter view turned to the right, looking at the viewer, gentle smile'),
    ('a14', 914, RDBT, 'short cropped dark-blond hair', 'full short dark-blond beard', 'thick black-framed glasses',
     'holding a laptop under one arm, waving with his free hand, cheerful open-mouth smile'),
    ('j15', 915, 'janima.safetensors', 'messy short dark-blond hair with a fringe', 'short dark-blond beard', 'black rectangular glasses',
     'facing the viewer, calm small smile'),
    ('j16', 916, 'janima.safetensors', 'tousled dark-blond hair, short on the sides', 'dark-blond stubble', 'round silver glasses',
     'three-quarter view turned to the left, looking at the viewer, slight grin'),
]

# Batch b: a01-j16 kept the beard and glasses but drew a mature, realistic face (the graphic-novel look again). One change:
# the identity wording of the old A set (tools/production.py MC: "a 29-year-old Nordic man ... slim average build, no blush")
# in place of "a Scandinavian man in his early thirties".
BASE_B = 'a 29-year-old Nordic man, fair pale skin, light blond eyebrows, blue eyes, slim average build, no blush, company lanyard'
SHOTS_B = [
    ('b01', 921, RDBT, 'messy sandy-blond hair', 'short sandy-blond beard', 'black rectangular glasses', 'facing the viewer, calm neutral expression'),
    ('b02', 922, RDBT, 'messy sandy-blond hair with a fringe over his eyes', 'light sandy-blond stubble', 'thin silver glasses',
     'friendly open smile, looking at the viewer'),
    ('b03', 923, RDBT, 'fluffy sandy-blond hair', 'short sandy-blond beard', 'round black glasses', 'nervous awkward smile, sweat drop'),
    ('b04', 924, RDBT, 'short sandy-blond hair swept to one side', 'short sandy-blond beard', 'black half-rim glasses',
     'three-quarter view turned to the left, glancing at the viewer, slight frown'),
    ('b05', 925, RDBT, 'messy sandy-blond hair, a little long at the back', 'sandy-blond stubble on his jaw', 'dark rectangular glasses',
     'tired, heavy eyelids, small weary smile, holding a can of coffee'),
    ('b06', 926, RDBT, 'spiky sandy-blond hair', 'short sandy-blond beard', 'silver round glasses', 'surprised, eyes wide, mouth open'),
    ('b07', 927, RDBT, 'soft sandy-blond hair parted to the side', 'trimmed sandy-blond beard', 'black rectangular glasses',
     'head tilted, warm smile, one hand scratching his cheek'),
    ('b08', 928, RDBT, 'messy sandy-blond hair', 'sandy-blond stubble', 'thick black-framed glasses', 'serious focused look, adjusting his glasses'),
]

# Retry r: a06 and a07 still had the red outline (about 19% of the outline band) with the plain rim words in the negative.
# One change: the rim words weighted, plus "red outline". Same prompt and seed as the original.
NEG_R = N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4)'
RETRY = {'a06r': 'a06', 'a07r': 'a07', 'b03r': 'b03', 'b06r': 'b06', 'b07r': 'b07'}  # b03, b06, b07 had it too (19%, 27%, 13%)


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def prompt(hair, beard, glasses, face, base=BASE):
    desc = f'{base}, {hair}, (facial hair, {beard}:1.3), ({glasses}:1.2), {OUTFIT}'
    return f'{Q}, safe, 1boy, solo, male focus, {desc}, {face}, {FRAME}'


def main(only=None):
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(WEB, exist_ok=True)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    jobs = SHOTS + SHOTS_B + [(r,) + next(x for x in SHOTS + SHOTS_B if x[0] == src)[1:] for r, src in RETRY.items()]
    for sid, seed, model, hair, beard, glasses, face in jobs:
        if only and sid not in only:
            continue
        base = BASE_B if sid.startswith('b') else BASE
        raw = os.path.join(RAW, f'eric-{sid}-{seed}.png')
        web = os.path.join(WEB, f'eric-{sid}-{seed}.webp')
        p = prompt(hair, beard, glasses, face, base)
        if not os.path.exists(raw):
            check_lock()
            comfy.run(comfy.anima(p, NEG_R if sid in RETRY else NEG, model=model, w=896, h=1152, steps=30, cfg=5, seed=seed), raw)
        Image.open(raw).convert('RGB').save(web, quality=92)
        log[sid] = {'file': os.path.relpath(web, ROOT), 'model': model.split('.')[0], 'seed': seed, 'prompt': p, 'negative': NEG_R if sid in RETRY else NEG,
                    'settings': '896x1152, euler_ancestral normal, 30 steps, CFG 5', 'red_rim_pct': round(red_rim(raw) * 100, 2)}
        json.dump(log, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', sid, log[sid]['red_rim_pct'], flush=True)


if __name__ == '__main__':
    main(sys.argv[1:] or None)
