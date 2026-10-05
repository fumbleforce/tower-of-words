"""carina-portrait-5: 12 options, BLONDE hair with dark roots only (or thin dark stripes), relaxed warm face.
Recipe as carina-4 (RDBT Anima, 896x1152, matte negatives, headroom), one seed each.
Usage: python3 gen.py                  -> the 12 (attempt 1)
       ROUND=2 ONLY=3,5 python3 gen.py -> re-roll with the change in reroll.json (one change, same seed)
       python3 gen.py extra 4 8        -> two more seeds of options 4 and 8"""
import sys, os, json
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
import production as P
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
OWNER = 'carina-art-round5'
C4 = open('/home/jorgen/repo/japanese/art/candidates/portraits/carina-4/gen.py').read()
# carina-4 negative, minus 'black hair' kept; plus the round-5 hair and expression negatives
NEG4 = C4.split("NEG = P.N + ', ")[1].split("'\n")[0]
NEG = (P.N + ', ' + NEG4 + ', (dark brown hair on top, brown hair, ombre, dip dye, gradient hair, balayage, two-tone hair, dark hair with blonde ends, dark hair, dark roots halfway down:1.5),'
       ' (heavy eyebrows, thick dark eyebrows, heavy eyelashes, thick eyelashes, heavy eyeliner, intense stare, glaring, serious face, angry, smirk, scary:1.4)')
MATTE = '(matte, flat colour fills, soft cel shading, bold clean dark lineart, thick outlines:1.25)'
FRAME = 'waist-up portrait, three-quarter view, (the whole head inside the frame with a very wide empty margin above the hair:3.2), (head low in the frame:1.9), (plain light grey background:1.3), soft even studio light'
FRAME2 = FRAME.replace(':3.2)', ':2.4)').replace('low in the frame:1.9', 'low in the frame:1.6')
NOGL = ', glasses, eyewear'
WIDE = '(wide-set eyes, wide space between the eyes:1.5)'
ROOT = '(short dark roots at the scalp only, a thin band of dark brown roots at the parting, root regrowth:1.4)'
ROOT2 = '(dark brown roots at the scalp, about a thumb-width of dark root along the parting, the rest of the hair bright golden blonde:1.6), (root regrowth:1.4)'
STRIPE2 = '(thin dark brown stripes and lowlights running through bright golden blonde hair:1.5), (a few dark streaks:1.2), (small dark brown roots at the scalp:1.4)'
ROOT3 = '(dark roots, dark brown roots at the scalp and along the parting, short band of root regrowth:1.7), (blonde lengths:1.4)'
STRIPE3 = '(streaked hair, dark brown streaks in blonde hair, thin dark stripes through the blonde:1.6), (dark roots at the scalp:1.5)'
ROOT4 = '(dark roots:1.3), (brown hair on the top of the head along the parting only, a thin dark brown band at the scalp, then bright golden blonde hair from the roots down:1.5)'
STRIPE4 = '(bright golden blonde hair with thin dark brown lowlights, a few dark brown strands woven through the blonde:1.5), (brown roots at the scalp along the parting:1.4)'
ROOT5 = '(dark roots, dark brown roots at the crown fading quickly into golden blonde, obvious root regrowth, a short dark band at the scalp:{w}), (bright golden blonde lengths:1.3)'
STRIPE5 = '(dark brown stripes running through golden blonde hair, lowlights, streaked hair:1.4), (dark roots at the crown, obvious root regrowth:1.3), (bright golden blonde lengths:1.3)'
STRIPE = '(thin dark brown stripes and lowlights running through the golden hair, a few dark streaks:1.3), (small dark roots at the scalp only:1.2)'
BLONDE = '(blonde hair, {}, mostly blonde hair:1.5), (shoulder-length hair:1.4)'
BASE = 'a beautiful Swedish woman in her late twenties, (attractive:1.2), fair skin, flat skin colour, light natural makeup, soft pink full lips, thin gold chain necklace, company lanyard, (slim narrow build, narrow shoulders, small bust:1.3)'
TAIL = ('arms relaxed at her sides, body turned slightly, face toward the viewer, both eyes visible, '
        '(relaxed warm amused expression, soft easy closed-mouth smile:1.3), soft gentle eyes, light thin brows, light eyelashes, friendly direct look at the viewer')
SK = 'high cheekbones, straight nose, full lips, light soft brows'
GF = '(thin gold-framed glasses:1.2)'
DG = '(thin dark rectangular glasses:1.2)'
G, H, A = 'golden blonde hair', 'honey blonde hair', 'light ash-gold blonde hair'
# n, key, label, glasses label, glasses prompt, clothes, face, colour, kind(root/stripe/free), hair
O = [
 (1, 'bob-behind-ear', 'root only, golden, bob tucked behind her left ear', 'none', None, 'fitted black knit top and small silver studs',
  'pale grey-blue eyes, ' + SK + ', long face, soft jaw', G, ROOT, 'sleek long bob to the shoulders, side parting, one side tucked behind her left ear (image right)'),
 (2, 'blunt-lob', 'root only, honey, blunt lob', 'none', None, 'fitted white blouse with the top button open and small gold hoop earrings',
  'blue eyes, ' + SK + ', oval face', H, ROOT, '(blunt straight lob cut at the shoulders, hair ends level with the jaw line:1.3), side parting on her right (image left)'),
 (3, 'layered-ashgold', 'root only, light ash-gold, layered', 'none', None, 'tailored navy blazer over a fitted white top and small gold studs',
  'green-grey eyes, ' + SK + ', angular face', A, '(slightly wider band of dark roots at the parting, root regrowth:1.4)', 'layered shoulder-length hair with face-framing layers, side parting, one side tucked behind her right ear (image left)'),
 (4, 'soft-waves', 'root only, golden, soft waves', 'none', None, 'fitted cream knit sweater and small gold hoop earrings',
  'light hazel eyes, ' + SK + ', oval face', G, ROOT, 'soft loose waves to the shoulders, side parting on her left (image right), one side tucked behind her left ear'),
 (5, 'long-bob-framing', 'root only, honey, long bob with face-framing pieces', 'none', None, 'light grey knit with a collared shirt under it',
  'pale blue eyes, ' + SK + ', heart-shaped face', H, ROOT, 'long bob with two face-framing pieces, deep side parting on her right (image left)'),
 (6, 'low-pony-glasses', 'root only, golden, half-tied low pony, glasses', 'thin gold-rimmed', GF, 'tailored cream blazer over a white shirt',
  'green-grey eyes, ' + SK + ', oval face', G, ROOT, 'half-tied low ponytail at shoulder length, loose lengths over her shoulders, side parting, a few strands by her face'),
 (7, 'stripes-bob', 'thin dark stripes, golden, bob behind ear', 'none', None, 'fitted teal knit sweater and small gold hoop earrings',
  'blue eyes, ' + SK + ', long face, soft jaw', G, STRIPE, 'sleek bob to the shoulders, side parting, one side tucked behind her left ear (image right)'),
 (8, 'stripes-layered', 'thin dark stripes, honey, layered', 'none', None, 'fitted light denim shirt with the top button open',
  'light hazel eyes, ' + SK + ', angular face', H, STRIPE, 'layered shoulder-length hair, side parting, one side tucked behind her right ear (image left)'),
 (9, 'stripes-lob-glasses', 'thin dark stripes, golden, lob, glasses', 'dark thin rectangular', DG, 'fitted white shirt with rolled sleeves',
  'pale grey-blue eyes, ' + SK + ', oval face', G, STRIPE, 'blunt lob at the shoulders, deep side parting'),
 (10, 'free-swept', 'free: golden, swept behind one ear', 'none', None, 'tailored charcoal blazer over a white shirt and small gold studs',
  'light green-grey eyes, ' + SK + ', oval face with strong cheekbones', G, ROOT, 'smooth shoulder-length hair with a deep side parting, swept behind her left ear (image right), ends turned in'),
 (11, 'free-fringe', 'free: honey, soft side fringe', 'none', None, 'fitted burgundy blouse with the top button open',
  'blue eyes, ' + SK + ', long face', H, ROOT, 'shoulder-length hair with a soft side-swept fringe, one side tucked behind her left ear (image right)'),
 (12, 'free-glasses', 'free: golden, long bob, glasses', 'thin gold-rimmed', GF, 'fitted olive knit cardigan over a white tee',
  'pale grey-blue eyes, ' + SK + ', long face, soft jaw', G, ROOT, 'sleek long bob to the shoulders, side parting, one side tucked behind her left ear (image right)'),
]
SEED0 = 9100
REROLL = json.load(open(os.path.join(HERE, 'reroll.json'))) if os.path.exists(os.path.join(HERE, 'reroll.json')) else {}
def build(ROUND):
    out = {}
    for (n, k, hs, gl, glp, clp, face, col, rootp, hair) in O:
        seed = SEED0 + n * 37
        pos_extra, neg_extra, why = REROLL.get(str(n), ['', '', '']) if ROUND != '1' else ['', '', '']
        pr = (f'{P.Q}, safe, 1girl, solo, {BASE}, {face}, {WIDE}, {BLONDE.format(col)}, {rootp}, {hair}, ' + (glp + ', ' if glp else '')
              + f'{clp}, {TAIL}, {MATTE}, {FRAME2 if why.startswith("margin") else FRAME}' + (', ' + pos_extra if pos_extra else ''))
        neg = NEG + ('' if glp else NOGL) + (', ' + neg_extra if neg_extra else '')
        if ROUND != '1':   # attempt 2, all options: the a1 negative held 'brown hair, dark hair', which forbids the roots; margin weight lowered (rings); 3/4 turn
            neg = neg.replace('brown hair, ombre', 'ombre').replace(', dark hair, dark roots halfway down', ', dark roots halfway down')
            pr = pr.replace(ROOT, ROOT2).replace('(slightly wider band of dark roots at the parting, root regrowth:1.4)', ROOT2.replace('thumb-width', 'slightly wider than a thumb-width')).replace(STRIPE, STRIPE2).replace(FRAME, FRAME2) + ', (three-quarter view, head turned slightly toward her left:1.3)'
        if ROUND == '6':   # attempt 6: attempt 5 wording, the ombre negative group weighted 1.0 instead of 1.5 (it was cancelling the roots)
            neg = neg.replace('dark roots halfway down:1.5)', 'dark roots halfway down:0.9)')
        if ROUND == '7':   # attempt 7: attempt 5 wording plus a light 'ombre hair' in the positive (round 4 only got dark roots with it), ombre out of the negative
            neg = neg.replace('ombre, ', '').replace('dark roots halfway down:1.5)', 'dark roots halfway down:0.9)')
            pr = pr.replace('(dark roots,', '(ombre hair:%s), (dark roots,' % ('0.9' if n in (1, 4, 7, 10) else '1.3'), 1)
        if ROUND == '8':   # attempt 8: round-4 root wording at a low weight (1.0 / 1.3), blonde weight 1.5 kept, ombre in neither list, brown negatives off
            w8 = '1.0' if n in (1, 4, 7, 10, 3, 12) else '1.3'
            neg = neg.replace('ombre, ', '').replace('(dark brown hair on top, ', '(').replace('dark roots halfway down:1.5)', 'dark roots halfway down:0.8)')
            pr = pr.replace(ROOT2, '(dark roots, dark brown roots at the crown fading into golden blonde lengths, obvious root regrowth:%s)' % w8).replace(STRIPE2, '(dark brown stripes and lowlights through golden blonde hair:1.4), (dark roots at the crown fading into golden blonde, root regrowth:%s)' % w8)
        if ROUND in ('3', '4', '5', '6', '7'):   # attempts 3 and 4: from attempt 2, only the root / stripe wording changes
            R_, S_ = {'3': (ROOT3, STRIPE3), '4': (ROOT4, STRIPE4), '7': (ROOT5.format(w='1.5' if n in (1, 3, 4, 7, 10, 12) else '1.15'), STRIPE5), '6': (ROOT5.format(w='1.5' if n in (1, 3, 4, 7, 10, 12) else '1.15'), STRIPE5), '5': (ROOT5.format(w='1.5' if n in (1, 3, 4, 7, 10, 12) else '1.15'), STRIPE5)}[ROUND]
            pr = pr.replace(ROOT2, R_).replace(ROOT2.replace('thumb-width', 'slightly wider than a thumb-width'), R_).replace(STRIPE2, S_)
        if n == 3: neg = neg.replace('(ash blond hair, grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3)', '(grey hair, silver hair, white hair, platinum hair, dull hair, muted colours:1.3)')
        out[f'carina5-{n:02d}-{k}-a{ROUND}'] = dict(n=n, design=k, hair=hs, glasses=gl, clothes=clp, seed=seed, prompt=pr, negative=neg, change=why)
    return out
if __name__ == '__main__':
    ROUND = os.environ.get('ROUND', '1')
    log = build(ROUND); jobs = log; pf = os.path.join(HERE, f'prompts-a{ROUND}.json')
    if sys.argv[1:2] == ['extra']:
        jobs = {}
        for n in map(int, sys.argv[2:]):
            base = [d for d in build('2').values() if d['n'] == n][0]   # extras use the attempt-2 prompt
            if str(n) in REROLL: base = [d for d in build('2').values() if d['n'] == n][0]
            for j, off in enumerate((1000, 2000), 2):
                jobs[f"carina5-{n:02d}-{base['design']}-s{j}"] = dict(base, seed=base['seed'] + off)
        pf = os.path.join(HERE, 'prompts-extra.json')
    ONLY = [int(x) for x in os.environ.get('ONLY', '').split(',') if x]
    if ONLY: jobs = {k: v for k, v in jobs.items() if v['n'] in ONLY}
    if os.environ.get('DRY'): print(list(jobs.values())[0]['prompt']); sys.exit()
    for name, d in jobs.items():
        if not os.path.exists('/tmp/claude-1000/gpu.lock/owner') or OWNER not in open('/tmp/claude-1000/gpu.lock/owner').read():
            sys.exit('lost the GPU lock')
        P.run('carina-5', name, d['prompt'], d['negative'], 896, 1152, d['seed'], P.RDBT)
        src = os.path.join(P.OUT, 'carina-5', name + '.png')
        if os.path.exists(src):
            Image.open(src).save(os.path.join(HERE, name + '.webp'), quality=92)
    for name, d in jobs.items():
        d.update(file=f'art/candidates/portraits/carina-5/{name}.webp', model='rdbtAnima', settings='896x1152, euler_ancestral normal, 30 steps, CFG 5')
    json.dump(jobs, open(pf, 'w'), indent=1, ensure_ascii=False)
