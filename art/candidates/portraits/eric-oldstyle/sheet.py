"""Comparison sheet: the old gallery set, the current 734 set, the new old-style set, next to Mio and Mori, plus every attempt.
Run: ~/ai/sd/venv/bin/python sheet.py <picks json: {"neutral": seed, "surprised": seed, "tired": seed}>"""
import sys, os, json, glob
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'art', 'candidates', 'portraits', 'eric-oldstyle-sheet.png')
WORK = os.environ.get('WORK', '/tmp/claude-1000/eric-oldstyle')
picks = json.loads(sys.argv[1])
NOTE = [
    'Start: the old approved portrait (mc-it-guy-after, full size), not a new render. Hair, outfit, glasses and pose are the same pixels.',
    'Red rim: the red outline strokes and dark maroon shadows turned to the navy line colour; the peach bands on the shoulders filled with the',
    '  cloth colour next to them (derim.py). Only the lit right side of the hood was repainted (masked, denoise 0.5).',
    'Eyes: face-only repaint (RDBT, the Mio method) with his glasses pasted back pixel for pixel. No iris recolour: the repaint gives blue eyes,',
    '  and matching them to the 734 blue painted his lower lids blue. The repaint also redraws the beard a little fuller than the original.',
    'Tired uses the 811 wording. Cut-outs: BiRefNet-HR + matte_refine, 597x768 like the game portraits.',
]
F = '/usr/share/fonts/TTF/DejaVuSans.ttf'
if not os.path.exists(F):
    F = glob.glob('/usr/share/fonts/**/DejaVuSans.ttf', recursive=True)[0]
font, small, big = ImageFont.truetype(F, 22), ImageFont.truetype(F, 17), ImageFont.truetype(F, 30)
BG, PANEL, INK, SUB = (38, 42, 50), (70, 76, 88), (235, 236, 240), (170, 175, 185)
CH = 560  # cell height


def cell(path, label, h=CH):
    im = Image.open(os.path.join(ROOT, path) if not path.startswith('/') else path).convert('RGBA')
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    c = Image.new('RGBA', im.size, PANEL + (255,))
    c.alpha_composite(im)
    return c.convert('RGB'), label


def row(title, note, cells):
    w = max(1800, sum(c.width for c, _ in cells) + 24 * (len(cells) + 1))
    r = Image.new('RGB', (w, CH + 150), BG)
    d = ImageDraw.Draw(r)
    d.text((24, 14), title, font=big, fill=INK)
    d.text((24, 52), note, font=small, fill=SUB)
    x = 24
    for c, label in cells:
        r.paste(c, (x, 86))
        d.text((x, 86 + c.height + 8), label, font=small, fill=INK)
        x += c.width + 24
    return r


P = 'game3d/assets/portraits/'
C = 'art/candidates/portraits/eric-oldstyle/'
rows = [
    row('1. Old set (gallery M-02-it-guy-601, approved as mc-it-guy-after)',
        'The old approved portrait, its gallery sibling 602, and the eyes-open frame made for the opening (art/opening/eyes). Eyes shut and a red rim light in the approved one.',
        [cell('art/approved/mc/mc-it-guy-after.webp', 'approved: mc-it-guy-after'), cell('legacy/proto2/gallery/M-02-it-guy-601.webp', 'gallery 601 (raw)'),
         cell('legacy/proto2/gallery/M-02-it-guy-602.webp', 'gallery 602'), cell('art/opening/eyes/mc-open-1.png', 'opening eyes-open frame')]),
    row('2. Current set (seed 734 v2, in the game now)',
        'game3d/assets/portraits/eric-*.webp',
        [cell(P + 'eric-neutral.webp', 'neutral'), cell(P + 'eric-surprised.webp', 'surprised'), cell(P + 'eric-tired.webp', 'tired (811)')]),
    row('3. New: the old portrait, eyes open, red rim removed',
        'Base = the old approved image with a colour fix on the red outline and the peach shoulder bands, plus a small repaint of the hood edge. '
        'Faces: face-only repaint with the glasses pasted back from the original.',
        [cell(C + 'eric-old-base-cut.webp', 'base (eyes still shut)')] + [cell(C + f'eric-old-{n}-{s}-cut.webp', f'{n} (seed {s})') for n, s in picks.items()]),
    row('4. Cast for style comparison', 'Approved Mio (in game) and the Mori portrait in the game now',
        [cell(P + 'mio-neutral.webp', 'Mio neutral'), cell(P + 'mio-tired.webp', 'Mio tired'), cell(P + 'mori-neutral.webp', 'Mori neutral'),
         cell(C + f'eric-old-neutral-{picks["neutral"]}-cut.webp', 'new Eric neutral')]),
]
# every attempt: face crops of all seeds, uncut
att = []
for n in ('neutral', 'neutral-d60', 'surprised', 'tired'):
    for f in sorted(glob.glob(os.path.join(HERE, f'eric-old-{n}-8??.webp'))):
        im = Image.open(f).convert('RGB').crop((330, 250, 730, 700)).resize((267, 300), Image.LANCZOS)
        att.append((im, os.path.basename(f)[9:-5]))
aw = 24 + 8 * (267 + 12)
per = 8
attempts = Image.new('RGB', (max(aw, 1800), 90 + ((len(att) + per - 1) // per) * 340), BG)
d = ImageDraw.Draw(attempts)
d.text((24, 14), 'Every attempt (face crops, before cut-out)', font=big, fill=INK)
d.text((24, 52), 'Four seeds per expression at denoise 0.72, plus neutral at 0.6 (d60, closer to the original face); the ones in row 3 are my picks.', font=small, fill=SUB)
for i, (im, lab) in enumerate(att):
    x, y = 24 + (i % per) * 279, 86 + (i // per) * 340
    attempts.paste(im, (x, y)); d.text((x, y + 304), lab, font=small, fill=INK)
rows.append(attempts)
rows.insert(3, row('Base attempts (rim removal)', 'Colour fix only; then the hood-edge repaint: 841 (grey hoodie wording, came out cream), 842 before the maroon-shadow fix, 843 (teal streak), and 842 picked.',
    [cell(C + 'eric-old-base-colourfix-only.webp', 'colour fix only', 420), cell(C + 'eric-old-base-hood-841.webp', 'hood 841', 420),
     cell(C + 'eric-old-base-hood-842-v1.webp', 'hood 842, maroon left', 420), cell(C + 'eric-old-base-hood-843.webp', 'hood 843', 420),
     cell(C + 'eric-old-base.webp', 'hood 842 (picked)', 420)]))
note = Image.new('RGB', (1800, 250), BG)
d = ImageDraw.Draw(note)
lines = NOTE
d.text((24, 14), 'What changed', font=big, fill=INK)
for i, l in enumerate(lines):
    d.text((24, 60 + i * 28), l, font=font, fill=INK)
rows.insert(0, note)
W = max(r.width for r in rows)
sheet = Image.new('RGB', (W, sum(r.height for r in rows)), BG)
y = 0
for r in rows:
    sheet.paste(r, (0, y)); y += r.height
sheet.save(OUT, optimize=True)
print(OUT, sheet.size)
