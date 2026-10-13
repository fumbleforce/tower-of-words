"""carina-portrait-3: 12 striking Swedish-blonde options (one seed each), then 2 extra seeds of two picks.
Recipe as carina-2 pass 3 (RDBT Anima, 896x1152), hair colour words weighted, faces varied.
Usage: python3 gen.py            -> the 12
       python3 gen.py extra 5 9  -> two more seeds of options 5 and 9"""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
NEG = P.N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, two-tone hair, roots, sunglasses, tinted eyewear, colored background, green background, gradient background, red hair, orange hair, cropped head, head out of frame, from behind, profile, side view, from side, dark hair, brown hair, black hair, (ash blond hair, grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3), cleavage, (large breasts, huge breasts, wide shoulders, broad shoulders:1.3), canary yellow hair, neon yellow hair, (dirty blonde hair, tan hair, brown-blond hair, bronze hair, dark blond hair:1.3), circle, halo, nude, shy, sad, frown, tan skin'
import os as _o
TALL = _o.environ.get('TALL')
FRAME2 = ('waist-up portrait, front view, (the whole head inside the frame with a very wide empty margin above the hair:1.9), (head low in the frame:1.4), (plain light grey background:1.3), soft even studio light') if not TALL else ('waist-up portrait, front view, (the whole head inside the frame with a very wide empty margin above the hair:' + ('3.2' if TALL == '2' else '2.4') + '), (head low in the frame:1.' + ('9' if TALL == '2' else '6') + '), (plain light grey background:1.3), soft even studio light')
NOGL = ', glasses, eyewear'
GOLD = '(bright golden blonde hair:1.6), (vivid sunny gold, light gold highlights:1.35), glossy shiny hair, same colour all over'
BASE = 'a beautiful Swedish woman in her late twenties, (attractive:1.2), glowing fair skin with a warm healthy glow, light natural makeup, soft pink glossy full lips, long eyelashes, thin gold chain necklace, company lanyard, (slim narrow build, narrow shoulders, small bust:1.3)'
TAIL = 'arms relaxed at her sides, body turned slightly, face toward the viewer, both eyes visible, looking at the viewer, (confident slight smile:1.2)'
GF = '(thin gold-framed glasses:1.2)'
# id, hair label, glasses label, glasses prompt, clothes label, clothes prompt, face, hair
O = [
 ('long-waves', 'long loose golden waves', 'none', None, 'fitted white blouse, top button open', 'fitted white blouse with the top button open and small gold hoop earrings',
  'big bright blue eyes, almond eye shape, high arched brows, heart-shaped face, small straight nose, high cheekbones', 'very long loose wavy hair, centre parting'),
 ('sleek-ponytail', 'sleek high ponytail', 'none', None, 'tailored navy blazer over white tee', 'tailored navy blazer over a fitted white top and small gold hoop earrings',
  'light blue eyes, slightly upturned cat-eye shape, straight sharp brows, angular face, defined jaw, narrow straight nose', 'sleek smooth hair pulled into a high ponytail, a few long face-framing strands'),
 ('messy-bun', 'messy bun, loose strands', 'none', None, 'fitted cream knit', 'fitted cream knit sweater',
  'green eyes, wide round eyes, soft natural brows, round face, button nose, full cheeks', 'messy high bun with loose strands falling around her face'),
 ('side-braid', 'long braid over one shoulder', 'stylish gold-rimmed', GF, 'shirt-dress in pale blue', 'pale blue shirt-dress with a belt',
  'blue eyes, hooded eyes, low soft flat brows, square face, strong jaw, wide straight nose', 'long thick braid over her left shoulder (image right), wispy strands by her ears'),
 ('glossy-bob', 'glossy shoulder-length cut', 'none', None, 'fitted black knit', 'fitted black knit top and small silver studs',
  'light blue eyes, large round eyes, thick straight brows, oval-round face, short slightly upturned nose, soft chin', 'glossy straight shoulder-length hair, tucked behind one ear, side parting'),
 ('half-up', 'half-up, long waves', 'none', None, 'burgundy fitted blouse', 'fitted deep red blouse with the top button open',
  'green eyes, deep-set eyes, strongly arched brows, diamond face, wide cheekbones, slightly pointed chin, straight nose', 'half-up half-down, long wavy hair, a few loose strands'),
 ('curtain-fringe', 'long with curtain fringe', 'none', None, 'fitted light grey knit', 'fitted light grey knit with a collared shirt under it',
  'blue eyes, wide-set eyes, soft rounded brows, oval face with a pointed chin, small button nose, prominent full lips', 'long straight hair with curtain bangs framing her face'),
 ('lowtail-glasses', 'low loose ponytail', 'stylish tortoise-shell', '(tortoiseshell cat-eye glasses:1.2)', 'tailored cream blazer', 'tailored cream blazer over a white shirt, thin gold necklace',
  'light green eyes, almond eyes, defined straight brows, long face with a soft jaw, straight slim nose', 'low loose ponytail at the nape, soft waves, a few strands by her face'),
 ('shoulder-waves', 'shoulder-length waves', 'none', None, 'fitted denim shirt', 'fitted light denim shirt with the top button open, collar up',
  'blue eyes, big bright eyes, thin high arched brows, wide round face, small nose, dimples', 'bouncy wavy shoulder-length hair, side parting'),
 ('twin-low-braids', 'two loose side braids', 'none', None, 'olive knit cardigan', 'olive green fitted knit cardigan over a white tee',
  'light blue eyes, narrow eyes, thin straight brows, long heart-shaped face, sharp chin, high bridged nose', 'two loose braids hanging in front of her shoulders, golden wisps'),
 ('top-knot-glasses', 'high top knot', 'stylish round clear-rim', '(round clear-rimmed glasses:1.2)', 'fitted white shirt, rolled sleeves', 'fitted white shirt with rolled sleeves and a thin chain necklace',
  'blue eyes, big round eyes, soft brows, round baby face, tiny nose, rosy cheeks', 'high top knot bun with loose face-framing strands'),
 ('windswept-long', 'long windswept layers', 'none', None, 'teal fitted knit', 'fitted teal knit sweater and small gold hoop earrings',
  'green-blue eyes, upturned eyes, bold arched brows, strong square-oval face, full cheeks, straight nose, small beauty mark', 'long layered hair with volume, swept over one shoulder'),
]
SEED0 = 7100
def prompts():
    out = {}
    for i, (k, hs, gl, glp, cl, clp, face, hair) in enumerate(O):
        n = i + 1
        seed = SEED0 + n * 41
        pr = f'{P.Q}, safe, 1girl, solo, {BASE}, {face}, {GOLD}, {hair}, ' + (glp + ', ' if glp else '') + f'{clp}, {TAIL}, {FRAME2}'
        neg = NEG + ('' if glp else NOGL)
        out[f'carina3-{n:02d}-{k}' + ('-v5' if TALL == '2' else '-v4' if TALL else '-v3')] = dict(n=n, design=k, hair=hs, glasses=gl, clothes=cl, seed=seed, prompt=pr, negative=neg)
    return out
if __name__ == '__main__':
    log = prompts()
    jobs = {}
    if sys.argv[1:2] == ['extra']:
        for n in map(int, sys.argv[2:]):
            base = [d for d in log.values() if d['n'] == n][0]
            for j, off in enumerate((1000, 2000), 1):
                d = dict(base, seed=base['seed'] + off)
                jobs[f"carina3-{n:02d}-{base['design']}-v3-s{j + 1}"] = d
        pf = os.path.join(HERE, 'prompts-extra.json')
    else:
        jobs = log; pf = os.path.join(HERE, ('prompts-v5.json' if TALL == '2' else 'prompts-v4.json') if TALL else 'prompts.json')
    ONLY = [int(x) for x in os.environ.get('ONLY', '').split(',') if x]
    if ONLY: jobs = {k: v for k, v in jobs.items() if v['n'] in ONLY}
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or 'carina-art-round3' not in open('/tmp/claude-1000/gpu.lock/owner').read():
            sys.exit('lost the GPU lock')
        P.run('carina-3', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-3', name + '.png')
        if os.path.exists(src):
            Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
    for name, d in jobs.items():
        d.update(file=f'art/candidates/portraits/carina-3/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(pf, 'w'), indent=1, ensure_ascii=False)
