"""Kenji concept round 2. Round 1 (hobby costumes) was rejected: "he is at work", and "they are all tall, slim, muscular and
generic looking". Here he is always in work clothes; a hobby shows at most as one small detail. The looks vary through height,
build, face and hair. Same recipe as the approved cast (tools/production.py: RDBT Anima, quality tags, safe, 896x1152,
Euler A 30 steps CFG 5) with the rim-light negative, plus youthful-face and light-build wording because RDBT ages men up.

Usage: ~/ai/sd/venv/bin/python game3d/assets/portrait-candidates/kenji-concept2/gen.py [name ...]
Raw PNGs: art/production/PC/kenji3/ (gitignored); webp copies and prompts.json in this folder."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import comfy
import framecheck
from production import Q, N, FRAME, RDBT
from PIL import Image

OWNER = 'kenji-concept2-agent'
RAW = os.path.join(ROOT, 'art/production/PC/kenji3')
LOG = os.path.join(HERE, 'prompts.json')

AGE = ('a 21-year-old fresh graduate, a young adult man with a youthful boyish face, smooth young skin, big eyes, not handsome, '
       'plain ordinary looks')
WORK = 'at work in a Japanese office, the company lanyard with an ID card around his neck'
BASE_NEG = (N + ', fat, obese, plump, rim light, red rim light, backlighting, mature male, old man, middle-aged, stubble, facial hair, '
            'beard, moustache, square jaw, manly, handsome, bishounen, muscular, athletic, muscles, pectorals, abs, bodybuilder, '
            'broad shoulders, shota, glasses, headphones, hat, costume')
# Soft direction: 'chubby' and 'plump' sit in the cast negative, so they come out of this one negative only (one change).
SOFT_NEG = BASE_NEG.replace(', chubby', '').replace(', plump', '')

DIRS = {
    'a-soft': dict(
        note='Short and soft: round face, fluffy mop, crooked tie, LAN cable, cat charm on the lanyard',
        desc=f'Kenji, {AGE}, short and a little soft with a round face and chubby cheeks, narrow sloping shoulders, '
             'fluffy messy black hair like a mop with a cowlick sticking up, '
             'a white work shirt with the sleeves pushed up, a navy tie knotted loose and crooked, '
             f'{WORK}, a small cat charm hanging from the lanyard, holding a coiled blue network cable in both hands, leaning forward',
        expr='keen eager smile, eyebrows raised', neg=SOFT_NEG + ', tall'),
    'b-gangly': dict(
        note='Tall and gangly: skinny, long neck, messy wavy mop, pen behind the ear, looking off to the side',
        desc=f'Kenji, {AGE}, tall gangly and very skinny with a long thin neck and bony wrists, a few acne marks on his cheeks, '
             'an untidy mop of wavy black hair falling into his eyes, a pen tucked behind his ear, '
             'a light blue work shirt a size too big with one shirt tail untucked, '
             f'{WORK}, a tablet held against his chest with a cat sticker on its back, '
             'his head turned to the side looking at something off to the side',
        expr='distracted open-mouthed curious look', neg=BASE_NEG),
    'c-stocky': dict(
        note='Short and stocky: thick brows, gap-toothed grin, grown-out dyed hair, tie tucked into the shirt, screwdriver',
        desc=f'Kenji, {AGE}, short and stocky with a soft thick-set body, a wide boyish face, thick eyebrows, '
             'grown-out light brown dyed hair with black roots, short and tousled, '
             'a white short-sleeved work shirt with a dark tie tucked into the shirt between two buttons, '
             f'{WORK}, a yellow sticky note stuck on his sleeve, a snack wrapper poking out of his breast pocket, '
             'holding a screwdriver up in his right hand',
        expr='big grin with a gap between his front teeth', neg=SOFT_NEG + ', tall'),
    'd-freckles': dict(
        note='Average height, skinny: freckles, bedhead, one earbud in, laptop balanced on his arm',
        desc=f'Kenji, {AGE}, average height and skinny with narrow shoulders, freckles across his nose and cheeks, '
             'thick messy black bedhead hair sticking up at the back, one small white wireless earbud in his ear, '
             'a navy knit sweater vest over a white work shirt with the sleeves rolled up, '
             f'{WORK}, an open laptop balanced on his left forearm while he types with his right hand, glancing to the side',
        expr='eager, lips pressed in concentration', neg=BASE_NEG + ', tall'),
    'e-buzz': dict(
        note='Short, compact: buzz cut, big ears, company work jacket half zipped, keyboard box and melon soda',
        desc=f'Kenji, {AGE}, short and slight, a round head with a very short black buzz cut, big ears sticking out, '
             'thick straight eyebrows, a navy company work jacket half zipped over a white collared shirt, sleeves pushed up, '
             f'{WORK}, a boxed computer keyboard tucked under his left arm, a green bottle of melon soda in his right hand',
        expr='bright cheerful smile, eyes creased', neg=BASE_NEG + ', tall'),
    # Re-rolls. c came out muscular and mid-twenties ("stocky" reads as muscle to RDBT): one change, the build words.
    'c2-pudgy': dict(
        note='Short and pudgy: round face, thick brows, grown-out dyed hair, tie tucked into the shirt, screwdriver',
        desc=f'Kenji, {AGE}, short and pudgy with a soft round tummy and a round chubby face, thick eyebrows, '
             'grown-out light brown dyed hair with black roots, short and tousled, '
             'a white short-sleeved work shirt with a dark tie tucked into the shirt between two buttons, '
             f'{WORK}, a yellow sticky note stuck on his sleeve, a snack wrapper poking out of his breast pocket, '
             'holding a screwdriver up in his right hand',
        expr='big grin with a gap between his front teeth', neg=SOFT_NEG + ', tall'),
    # e read late twenties: one change, a baby face in place of "a round head".
    'e2-babyface': dict(
        note='Short, compact: buzz cut on a baby face, big ears, company work jacket half zipped, keyboard and melon soda',
        desc=f'Kenji, {AGE}, short and slight, a round baby face with soft full cheeks, a very short black buzz cut, big ears sticking out, '
             'thick straight eyebrows, a navy company work jacket half zipped over a white collared shirt, sleeves pushed up, '
             f'{WORK}, a boxed computer keyboard tucked under his left arm, a green bottle of melon soda in his right hand',
        expr='bright cheerful smile, eyes creased', neg=BASE_NEG + ', tall'),
    # e and e2 read 25+ on four seeds; the buzz cut ages him. One change: the hair.
    'e3-fringe': dict(
        note='Short, compact: blunt straight fringe, big ears, company work jacket half zipped, keyboard and melon soda',
        desc=f'Kenji, {AGE}, short and slight, a round baby face with soft full cheeks, short soft black hair with a blunt straight fringe, big ears sticking out, '
             'thick straight eyebrows, a navy company work jacket half zipped over a white collared shirt, sleeves pushed up, '
             f'{WORK}, a boxed computer keyboard tucked under his left arm, a green bottle of melon soda in his right hand',
        expr='bright cheerful smile, eyes creased', neg=BASE_NEG + ', tall'),
}
FULL = ('full body standing, feet and shoes visible, facing the viewer at a slight angle, (the whole figure inside the frame with '
        'empty space above the head:1.2), plain light grey background, soft even studio light')
SEEDS = (761, 762)
FULL_SEED = 761


def check_lock():
    try:
        if OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            raise SystemExit('GPU lock not ours; stopping')
    except FileNotFoundError:
        raise SystemExit('GPU lock gone; stopping')


def jobs():
    for d, c in DIRS.items():
        for s in SEEDS:
            yield f'kenji2-{d}-{s}', f"{Q}, safe, 1boy, solo, adult, {c['desc']}, {c['expr']}, {FRAME}", c['neg'], s
        yield f'kenji2-{d}-full-{FULL_SEED}', f"{Q}, safe, 1boy, solo, adult, {c['desc']}, {c['expr']}, {FULL}", c['neg'], FULL_SEED


def extra(name, seed):
    """Re-roll: kenji2-<dir>-<seed> or kenji2-<dir>-full-<seed> for a seed not in the default set."""
    d = name[len('kenji2-'):].rsplit('-', 1)[0]
    full = d.endswith('-full')
    d = d[:-5] if full else d
    c = DIRS[d]
    return name, f"{Q}, safe, 1boy, solo, adult, {c['desc']}, {c['expr']}, {FULL if full else FRAME}", c['neg'], seed


def main(names):
    os.makedirs(RAW, exist_ok=True)
    L = json.load(open(LOG)) if os.path.exists(LOG) else {}
    todo = list(jobs()) + [extra(n, int(n.rsplit('-', 1)[1])) for n in names if n not in {j[0] for j in jobs()}]
    for name, p, neg, seed in todo:
        if names and name not in names:
            continue
        out = os.path.join(RAW, name + '.png')
        if not os.path.exists(out):
            check_lock()
            comfy.run(comfy.anima(p, neg, model=RDBT, w=896, h=1152, steps=30, cfg=5, seed=seed), out)
        Image.open(out).convert('RGB').save(os.path.join(HERE, name + '.webp'), quality=90)
        L[name] = {'model': 'rdbtAnima', 'prompt': p, 'negative': neg, 'seed': seed, 'w': 896, 'h': 1152, 'steps': 30, 'cfg': 5,
                   'sampler': 'euler_ancestral normal', 'frame_warn': framecheck.check(out)}
        json.dump(L, open(LOG, 'w'), ensure_ascii=False, indent=1)
        print('ok', name, L[name]['frame_warn'], flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
