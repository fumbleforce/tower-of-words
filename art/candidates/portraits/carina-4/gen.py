"""carina-portrait-4: 12 options with dark roots, shoulder-length hair of different shapes, wide-set eyes.
Recipe as carina-3 (RDBT Anima, 896x1152), v5 framing from the start (headroom), one seed each.
Usage: python3 gen.py                 -> the 12 (attempt 1)
       ROUND=2 ONLY=3,5 python3 gen.py -> re-roll named options with the change in REROLL (one change, same seed)
       python3 gen.py extra 4 8       -> two more seeds of options 4 and 8"""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OWNER = 'carina-art-round4'
# carina-3 negative, minus the words that forbid roots / darker hair; plus long hair (we want shoulder length)
NEG = P.N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, sunglasses, tinted eyewear, colored background, green background, gradient background, red hair, orange hair, cropped head, head out of frame, from behind, profile, side view, from side, black hair, (ash blond hair, grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3), cleavage, (large breasts, huge breasts, wide shoulders, broad shoulders:1.3), canary yellow hair, neon yellow hair, (very long hair, hair past the chest, waist-length hair:1.3), (close-set eyes, narrow space between the eyes:1.3), circle, halo, nude, shy, sad, frown, tan skin, glossy, shiny hair, specular highlights, glossy skin, wet skin, oily skin, airbrushed, smooth gradient shading, 3d render, glossy lips, lens flare'
MATTE = '(matte, flat colour fills, soft cel shading, bold clean dark lineart, thick outlines:1.25)'
FRAME = 'waist-up portrait, three-quarter view, (the whole head inside the frame with a very wide empty margin above the hair:3.2), (head low in the frame:1.9), (plain light grey background:1.3), soft even studio light'
FRAME2 = FRAME.replace(':3.2)', ':2.4)').replace('low in the frame:1.9', 'low in the frame:1.6')
NOGL = ', glasses, eyewear'
WIDE = '(wide-set eyes, wide space between the eyes:1.5)'
ROOTS = '(dark roots, dark brown roots at the crown fading into honey blonde and golden lengths, obvious root regrowth, ombre hair:1.5), (shoulder-length hair:1.4)'
BASE = 'a beautiful Swedish woman in her late twenties, (attractive:1.2), fair skin, flat skin colour, light natural makeup, soft pink full lips, long eyelashes, thin gold chain necklace, company lanyard, (slim narrow build, narrow shoulders, small bust:1.3)'
TAIL = 'arms relaxed at her sides, body turned slightly, face toward the viewer, both eyes visible, looking at the viewer, (confident slight smile:1.2)'
SLEEK = 'high cheekbones, strong defined brows, strong straight nose, full lips'
GF = '(thin gold-framed glasses:1.2)'
DG = '(thin dark rectangular glasses:1.2)'
# n, key, label, glasses label, glasses prompt, clothes label, clothes, face, hair
O = [
 (1, 'blunt-lob', 'blunt lob, centre parting', 'none', None, 'white blouse', 'fitted white blouse with the top button open and small gold hoop earrings',
  'big light blue eyes, almond eye shape, soft arched brows, heart-shaped face, small straight nose', 'blunt straight lob cut at the shoulders, centre parting'),
 (2, 'layered', 'layered shoulder-length', 'none', None, 'navy blazer', 'tailored navy blazer over a fitted white top and small gold stud earrings',
  'green eyes, slightly upturned cat-eye shape, straight sharp brows, angular face, defined jaw, narrow straight nose', 'layered shoulder-length hair with face-framing layers, side parting'),
 (3, 'beach-waves', 'beach waves', 'none', None, 'cream knit', 'fitted cream knit sweater and small gold hoop earrings',
  'hazel eyes, round eyes, soft natural brows, round face, button nose, full cheeks', 'tousled wavy beach waves to the shoulders, loose and textured'),
 (4, 'sleek-middle-a', 'sleek high-cheekbone type, centre part', 'none', None, 'charcoal blazer', 'tailored charcoal blazer over a white shirt and small gold studs',
  'light grey-blue eyes, ' + SLEEK + ', oval face with strong cheekbones', 'sleek straight shoulder-length hair, centre parting, smooth and glossy, tucked behind her ears'),
 (5, 'curtain-fringe', 'curtain fringe', 'none', None, 'light grey knit', 'fitted light grey knit with a collared shirt under it',
  'blue eyes, soft rounded brows, oval face with a pointed chin, small button nose, prominent full lips', 'shoulder-length hair with curtain bangs framing her face, soft flicked ends'),
 (6, 'side-swept-flip', 'side-swept, flipped end, glasses', 'thin gold-rimmed', GF, 'burgundy blouse', 'fitted deep red blouse with the top button open',
  'blue-green eyes, hooded eyes, strongly arched brows, diamond face, wide cheekbones, straight nose', 'side-swept fringe, shoulder-length hair with the ends flipped outward'),
 (7, 'shaggy', 'shaggy cut', 'none', None, 'olive cardigan', 'olive green fitted knit cardigan over a white tee',
  'hazel-green eyes, thick straight brows, square face, strong jaw, wide straight nose', 'choppy shaggy layered cut at the shoulders, wispy bangs, messy and textured'),
 (8, 'bob-behind-ear', 'sleek high-cheekbone type, long bob behind one ear', 'none', None, 'black knit', 'fitted black knit top and small silver studs',
  'pale grey eyes, ' + SLEEK + ', long face, soft jaw', 'sleek long bob to the shoulders, side parting, one side tucked behind her left ear (image right)'),
 (9, 'low-pony-glasses', 'half-tied low pony, glasses', 'dark thin rectangular', DG, 'cream blazer', 'tailored cream blazer over a white shirt',
  'green eyes, almond eyes, defined straight brows, oval face, straight slim nose', 'half-tied low ponytail at shoulder length, loose lengths over her shoulders, a few strands by her face'),
 (10, 'sleek-side-b', 'sleek high-cheekbone type, side part', 'none', None, 'teal knit', 'fitted teal knit sweater and small gold hoop earrings',
  'light blue eyes, ' + SLEEK + ', angular face, defined jaw', 'sleek smooth shoulder-length hair with a deep side parting, swept behind one ear, ends turned in'),
 (11, 'sleek-lob-c', 'sleek high-cheekbone type, glossy lob', 'none', None, 'denim shirt', 'fitted light denim shirt with the top button open, collar up',
  'light green-grey eyes, ' + SLEEK + ', heart-shaped face', 'glossy straight lob just touching the shoulders, centre parting, sleek and polished'),
 (12, 'sleek-glasses-d', 'sleek high-cheekbone type, soft ends, glasses', 'thin gold-rimmed', GF, 'white shirt', 'fitted white shirt with rolled sleeves and a thin chain necklace',
  'pale blue eyes, ' + SLEEK + ', oval face', 'sleek straight shoulder-length hair, centre parting, ends softly curled under'),
]
SEED0 = 8200
# the one change per DRIFT re-roll: option number -> (extra positive words, extra negative words, what changed)
REROLL = json.load(open(os.path.join(HERE, 'reroll.json'))) if os.path.exists(os.path.join(HERE, 'reroll.json')) else {}
def build(ROUND):
    out = {}
    for (n, k, hs, gl, glp, cl, clp, face, hair) in O:
        seed = SEED0 + n * 37
        pos_extra, neg_extra, why = REROLL.get(str(n), ['', '', '']) if ROUND != '1' else ['', '', '']
        pr = f'{P.Q}, safe, 1girl, solo, {BASE}, {face}, {WIDE}, {ROOTS}, {hair}, ' + (glp + ', ' if glp else '') + f'{clp}, {TAIL}, {MATTE}, {FRAME2 if why.startswith("margin") else FRAME}' + (', ' + pos_extra if pos_extra else '')
        neg = NEG + ('' if glp else NOGL) + (', ' + neg_extra if neg_extra else '')
        out[f'carina4-{n:02d}-{k}-a{ROUND}'] = dict(n=n, design=k, hair=hs, glasses=gl, clothes=cl, seed=seed, prompt=pr, negative=neg, change=why)
    return out
if __name__ == '__main__':
    ROUND = os.environ.get('ROUND', '1')
    log = build(ROUND)
    jobs = log; pf = os.path.join(HERE, f'prompts-a{ROUND}.json')
    if sys.argv[1:2] == ['extra']:
        jobs = {}
        for n in map(int, sys.argv[2:]):
            base = [d for d in build('1').values() if d['n'] == n][0]
            if str(n) in REROLL: base = [d for d in build('2').values() if d['n'] == n][0]
            for j, off in enumerate((1000, 2000), 2):
                jobs[f"carina4-{n:02d}-{base['design']}-s{j}"] = dict(base, seed=base['seed'] + off)
        pf = os.path.join(HERE, 'prompts-extra.json')
    ONLY = [int(x) for x in os.environ.get('ONLY', '').split(',') if x]
    if ONLY: jobs = {k: v for k, v in jobs.items() if v['n'] in ONLY}
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            sys.exit('lost the GPU lock')
        P.run('carina-4', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-4', name + '.png')
        if os.path.exists(src):
            Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
    for name, d in jobs.items():
        d.update(file=f'art/candidates/portraits/carina-4/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(pf, 'w'), indent=1, ensure_ascii=False)
