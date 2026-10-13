"""carina-portrait-2: 12 distinct options, one seed each, RDBT Anima, same recipe as carina-1 (896x1152)."""
import sys, os, json, time, subprocess
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
NEG = P.N + ', fat, obese, plump, closed eyes, (rim light, red rim light, red outline, backlighting:1.4), holding, holding object, tool, screwdriver, pen, pencil, cup, phone, papers, book, undercut, shaved sides, two-tone hair, sunglasses, tinted eyewear, colored background, green background, gradient background, orange hair, red hair, yellow hair, cropped head, head out of frame, from behind, profile, side view, from side, dark hair, brown hair, black hair'
FRAME2 = ('waist-up portrait, front view, (the whole head inside the frame with a very wide empty margin above the hair:1.7), (head low in the frame:1.3), (plain light grey background:1.3), soft even studio light')
NOGL = ', glasses, eyewear'
TAIL = 'arms relaxed at her sides, body turned only slightly, face toward the viewer, both eyes visible, looking at the viewer, calm neutral expression'
BASE = 'a Scandinavian woman in her late twenties, fair pale skin, slim average build, company lanyard'
EG = '(light grey rectangular glasses:1.2)'
# id, hair colour, style, glasses label, glasses prompt, clothes label, clothes prompt, face prompt, hair prompt
O = [
 ('golden-ponytail', 'golden blond', 'high ponytail', 'none', None, 'white polo shirt', 'plain white polo shirt',
  'blue eyes, golden blond eyebrows, sharp angular jaw, high cheekbones', '(golden blond hair:1.4), warm saturated gold, same colour all over, tied in a high ponytail'),
 ('honey-bob', 'honey blond', 'short bob', 'round thin gold wire', '(round thin gold wire-frame glasses:1.2)', 'denim jacket over white tee', 'denim jacket over a white t-shirt',
  'green eyes, honey blond eyebrows, soft round face, light freckles across her nose', '(honey blond hair:1.4), warm amber-gold tint, same colour all over, chin-length bob with a side parting'),
 ('darkblond-lowbun', 'dark blond', 'low bun', "Eric's light-grey rectangular", EG, 'light beige blazer, white blouse', 'light beige blazer over a white blouse',
  'grey eyes, dark blond eyebrows, oval face, straight calm brows', '(dark blond hair:1.3), deeper golden-brown blond, same colour all over, tied back in a low bun at the nape'),
 ('strawberry-braid', 'strawberry blond', 'single braid', 'none', None, 'light blue work shirt, sleeves rolled', 'light blue work shirt with rolled sleeves',
  'green eyes, strawberry blond eyebrows, heart-shaped face, freckles across her cheeks and nose', '(strawberry blond hair:1.4), reddish-gold with a soft copper tint, same colour all over, one long braid over her shoulder'),
 ('ash-loose', 'light ash', 'shoulder-length loose', 'rimless', '(rimless glasses:1.2)', 'black turtleneck', 'black turtleneck sweater',
  'blue eyes, pale ash blond eyebrows, long narrow face, strong jaw', 'light ash-blond hair, silvery pale, same colour all over, loose shoulder-length hair tucked behind her ears'),
 ('golden-halfup', 'golden blond', 'half-up wavy', 'none', None, 'grey cardigan over white collared shirt', 'grey cardigan over a white collared shirt',
  'grey eyes, golden blond eyebrows, gentle arched brows, soft jaw, dimpled smile lines', '(golden blond wavy hair:1.4), warm saturated gold, same colour all over, long, half tied up at the back'),
 ('darkblond-ponytail', 'dark blond', 'short ponytail', "Eric's light-grey rectangular", EG, 'dark green knit sweater, collar showing', 'dark green knit sweater over a collared shirt',
  'blue eyes, dark blond eyebrows, square jaw, strong straight brows', '(dark blond hair:1.3), deeper golden-brown blond, same colour all over, tied in a short ponytail at the back, a few loose strands by her face'),
 ('honey-loose', 'honey blond', 'shoulder-length loose, side part', 'thick dark', '(thick black-framed glasses:1.2)', 'burgundy cardigan over collared shirt', 'burgundy cardigan over a white collared shirt',
  'green eyes, honey blond eyebrows, round face, full cheeks', '(honey blond wavy hair:1.4), warm amber-gold tint, same colour all over, shoulder length, loose with a side parting'),
 ('strawberry-bob', 'strawberry blond', 'jaw-length bob with fringe', 'none', None, 'light denim shirt', 'light denim button-up shirt',
  'blue eyes, strawberry blond eyebrows, pointed chin, upturned nose, freckles', '(strawberry blond hair:1.4), reddish-gold with a soft copper tint, same colour all over, jaw-length bob with a blunt fringe'),
 ('ash-lowbun', 'light ash', 'low bun', 'thick dark', '(thick black-framed rectangular glasses:1.2)', 'charcoal blazer over white blouse', 'charcoal grey blazer over a white blouse',
  'grey eyes, pale ash blond eyebrows, long oval face, high forehead', 'light ash-blond hair, silvery pale, same colour all over, tied back in a low bun at the nape'),
 ('golden-sideponytail', 'golden blond', 'low side ponytail', "Eric's light-grey rectangular", EG, 'teal knit sweater over collared shirt', 'teal knit sweater over a collared shirt',
  'blue eyes, golden blond eyebrows, diamond face, wide cheekbones', '(golden blond hair:1.4), warm saturated gold, same colour all over, in a low ponytail over one shoulder'),
 ('honey-lowtail', 'honey blond', 'short low ponytail', 'round thin silver wire', '(round thin silver wire-frame glasses:1.2)', 'pale blue blouse', 'pale blue blouse with a soft collar',
  'grey eyes, honey blond eyebrows, strong brows, defined jaw, serious look', '(honey blond hair:1.4), warm amber-gold tint, same colour all over, in a short low ponytail with a middle parting'),
]
SEED0 = 6100
def prompts():
    out = {}
    for i, (k, hc, hs, gl, glp, cl, clp, face, hair) in enumerate(O):
        n = i + 1
        seed = SEED0 + n * 37
        pr = f'{P.Q}, safe, 1girl, solo, {BASE}, {face}, {hair}, ' + (glp + ', ' if glp else '') + f'{clp}, {TAIL}, {FRAME2}'
        neg = NEG + ('' if glp else NOGL)
        out[f'carina2-{n:02d}-{k}-v3'] = dict(n=n, design=k, hair=f'{hc}, {hs}', glasses=gl, clothes=cl, seed=seed, prompt=pr, negative=neg)
    return out
if __name__ == '__main__':
    only = [int(x) for x in sys.argv[1:]]
    log = prompts()
    for name, d in log.items():
        if only and d['n'] not in only: continue
        P.run('carina-2', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-2', name + '.png')
        if os.path.exists(src):
            Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
    for name, d in log.items():
        d.update(file=f'art/candidates/portraits/carina-2/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(log, open(os.path.join(HERE, 'prompts.json'), 'w'), indent=1, ensure_ascii=False)
