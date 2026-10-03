"""Contact sheets for reviews/chibi-proportions-1, from game3d/tools/chibi-proportions.mjs captures and the Rei inputs.
  python3 art/candidates/chibi-proportions-1/sheets.py
Reads the worktree's game3d/shots/chibi-proportions/ and the main checkout's art/parts/chibi-proportions-1/, writes
the sheets (webp) to the main checkout's art/parts/chibi-proportions-1/ (local, git-ignored, served on 8771).
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
SHOTS = os.path.join(ROOT, 'game3d/shots/chibi-proportions')
OUT = os.path.join(MAIN, 'art/parts/chibi-proportions-1')
PARTS = os.path.join(MAIN, 'art/parts')
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
BIG = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 26)


def crop(path, half):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    return im if not half else im.crop((max(0, w // 2 - half), 0, min(w, w // 2 + half), h))


def sheet(name, title, rows, half=0, scale=1.0):
    """rows: [(row label, [(file, caption), ...]), ...]"""
    cells = [[(crop(f, half), c) for f, c in r] for _, r in rows]
    cw = max(im.width for r in cells for im, _ in r)
    ch = max(im.height for r in cells for im, _ in r)
    cw, ch = int(cw * scale), int(ch * scale)
    pad, lab, head = 10, 34, 50
    W = pad + max(len(r) for r in cells) * (cw + pad)
    H = head + len(cells) * (ch + lab + pad)
    o = Image.new('RGB', (W, H), (236, 238, 242))
    d = ImageDraw.Draw(o)
    d.text((pad, 12), title, fill=(20, 20, 20), font=BIG)
    for y, ((rl, _), r) in enumerate(zip(rows, cells)):
        for x, (im, cap) in enumerate(r):
            im = im.resize((int(im.width * scale), int(im.height * scale)))
            px, py = pad + x * (cw + pad), head + y * (ch + lab + pad)
            o.paste(im, (px, py))
            d.text((px, py + ch + 4), f'{rl}: {cap}' if rl else cap, fill=(20, 20, 20), font=FONT)
    o.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    print(name, o.size)


def s(size, f):
    return os.path.join(SHOTS, size, f + '.png')


VIEWS = [('front', 'front'), ('34', 'her left 3/4'), ('side', 'her left side'), ('walk', 'walking')]
for size, half, sc in (('1366x860', 300, 1.0), ('390x844', 0, 0.55)):
    tag = 'desktop' if size[0] == '1' else 'phone'
    sheet(f'kuro-{tag}', f'Kuro, before (Meshy proportions, head 0.85) and after (her build), {tag} {size}', [
        ('before', [(s(size, f'before-kuro-{v}'), c) for v, c in VIEWS]),
        ('after', [(s(size, f'after-kuro-{v}'), c) for v, c in VIEWS]),
    ], half, sc)
    sheet(f'lineup-{tag}', f'All ten on the plaza, {tag} {size}: Eric, Mio, Kuro, Mori, Kenji, Emi, guard, Hamada, Aoi, Rei', [
        ('before', [(s(size, 'before-lineup'), 'before')]),
        ('after', [(s(size, 'after-lineup'), 'after')]),
    ], 0, 1.0 if tag == 'desktop' else 0.6)
    sheet(f'counter-{tag}', f'Kuro at the head office counter, the game\'s own camera, {tag} {size}', [
        ('', [(s(size, 'before-kuro-counter'), 'before'), (s(size, 'after-kuro-counter'), 'after')]),
    ], 0, 1.0 if tag == 'desktop' else 0.6)
    rows = [('1. rei-1, Meshy proportions', [(s(size, f'before-rei-{v}'), c) for v, c in VIEWS])]
    if tag == 'desktop':
        # rei-1 with the build was shot before the new model went in, without a walk frame (the capture held the idle)
        rows.append(('2. rei-1, her build', [(s(size, f'rei1build-rei-{v}'), c) for v, c in VIEWS[:3]]))
        rows.append(('3. rei-2, Meshy proportions', [(s(size, f'rei2plain-rei-{v}'), c) for v, c in VIEWS]))
    rows.append(('4. rei-2, her build', [(s(size, f'after-rei-{v}'), c) for v, c in VIEWS]))
    sheet(f'rei-{tag}', f'Rei, every step in order, {tag} {size}', rows, half, sc)

sheet('others-desktop', 'Mori, Kenji, Emi and Hamada: small tweaks, before and after (desktop)', [
    ('before', [(s('1366x860', f'before-{w}-{v}'), f'{w} {v}') for w in ('mori', 'kenji', 'emi', 'kuroda') for v in ('front', 'side')]),
    ('after', [(s('1366x860', f'after-{w}-{v}'), f'{w} {v}') for w in ('mori', 'kenji', 'emi', 'kuroda') for v in ('front', 'side')]),
], 200)

INP = os.path.join(PARTS, 'chibi-proportions-1/inputs')
sheet('rei-inputs', 'Rei input pictures, in order (FLUX.2 Klein 4B, 4 steps, cfg 1; prompts in prompts.json)', [
    ('', [(os.path.join(PARTS, 'chibi-cast-meshy-2/inputs/rei-b-101-flip.png'), 'round 2: rei-b-101-flip (made rei-1)')]
     + [(os.path.join(INP, f'rei-c-{n}.png'), f'rei-c-{n}' + (' (went to Meshy)' if n == 101 else '')) for n in (101, 102, 103)]),
    ('', [(os.path.join(INP, f'rei-d-{n}.png'), f'rei-d-{n}') for n in (101, 102, 103)]),
], 0, 0.5)
M = os.path.join(PARTS, 'chibi-proportions-1/meshy')
sheet('rei-2-meshy', 'rei-2 as Meshy made it (Meshy\'s own previews), beside rei-1', [
    ('rei-1', [(os.path.join(PARTS, f'chibi-cast-meshy-2/meshy/rei-1-{v}.png'), v) for v in ('front', 'left', 'right', 'back')]),
    ('rei-2', [(os.path.join(M, f'rei-2-{v}.png'), v) for v in ('front', 'left', 'right', 'back')]),
], 0, 1.0)
