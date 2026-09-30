"""Sheets for style-align-1, every picture framed the same way: 597x768 with the face on Kenji's face box (FACE.kenji in
game3d/js/ui/portraits.js: x 221-384, y 167-335), the rule the group-1 sheet used. Face boxes from imgutils' detector.

  lineup.webp        row 1 the current game portraits, row 2 one aligned attempt each (PICK), Mio's and Kuro's anchors
                     at both ends of both rows.
  attempts-<who>.webp every attempt for one person, in order, after the current portrait.

Usage: ~/ai/consist/.venv/bin/python art/candidates/portraits/style-align-1/sheet.py"""
import os, json
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
CW, CH, KF = 597, 768, (221, 167, 384, 335)
GREY = (210, 218, 225)  # the anchors' background (Mio), so each render's own background runs into it
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
SMALL = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
P = os.path.join(ROOT, 'game3d/assets/portraits')
ORDER = ['eric', 'kenji', 'mori', 'emi', 'mio', 'aoi', 'kuroda', 'guard']
NAME = {'eric': 'Eric', 'kenji': 'Kenji', 'mori': 'Mr. Mori', 'emi': 'Emi', 'mio': 'Mio', 'aoi': 'Aoi', 'kuroda': 'Mr. Hamada',
        'guard': 'Guard (Ishibashi)'}
PICK = json.load(open(os.path.join(HERE, 'pick.json'))) if os.path.exists(os.path.join(HERE, 'pick.json')) else {}


def framed(path):
    from imgutils.detect import detect_faces
    im = Image.open(path).convert('RGBA')
    fs = sorted([f[0] for f in detect_faces(im.convert('RGB')) if f[2] > 0.5], key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))
    can = Image.new('RGBA', (CW, CH), GREY + (255,))
    if not fs:
        can.alpha_composite(im.resize((CW, round(im.height * CW / im.width))))
        return can
    f = fs[0]
    s = (KF[3] - KF[1]) / (f[3] - f[1])
    big = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    ox = round((KF[0] + KF[2]) / 2 - (f[0] + f[2]) / 2 * s)
    oy = round(KF[3] - f[3] * s)
    can.alpha_composite(big, (ox, oy))
    return can


def grid(rows, out, label_w=260, scale=0.5):
    """rows: [(row label, [(caption, path), ...])]"""
    w, h = round(CW * scale), round(CH * scale)
    n = max(len(r[1]) for r in rows)
    sheet = Image.new('RGB', (label_w + n * (w + 8), len(rows) * (h + 40) + 10), 'white')
    d = ImageDraw.Draw(sheet)
    for ri, (lab, cells) in enumerate(rows):
        y = 10 + ri * (h + 40)
        d.multiline_text((10, y + 10), lab, fill='black', font=FONT)
        for ci, (cap, path) in enumerate(cells):
            x = label_w + ci * (w + 8)
            sheet.paste(framed(path).convert('RGB').resize((w, h), Image.LANCZOS), (x, y + 30))
            d.text((x, y + 4), cap, fill='black', font=SMALL)
    sheet.save(out, quality=90)
    print(out, sheet.size)


STEPS = ['i2i55', 'i2i70', 'stykuro70', 'stymio70', 'ipakuro70', 'n60', 'n60e', 'n60ek', 'n60l', 'base', 'ink', 'ink75', 'm35', 'm45',
         'm45s']  # the order the round made them in (gen.py JOBS)


def step_key(name):
    _, step, seed = name.split('-')
    return STEPS.index(step), int(seed)


def current(who):
    return os.path.join(P, f'{who}-neutral.webp')


def main():
    L = json.load(open(os.path.join(HERE, 'prompts.json')))
    mio_a = os.path.join(ROOT, 'art/approved/mio/mio-after.webp')
    kuro_a = os.path.join(ROOT, 'art/approved/kuro/kuro-after.webp')
    have = [w for w in ORDER if w in PICK]
    grid([('Current game\nportraits', [('Mio (anchor)', mio_a)] + [(NAME[w], current(w)) for w in have] + [('Kuro (anchor)', kuro_a)]),
          ('Aligned\n(one attempt\neach)', [('Mio (anchor)', mio_a)] + [(PICK[w], os.path.join(HERE, PICK[w] + '.webp')) for w in have]
           + [('Kuro (anchor)', kuro_a)])],
         os.path.join(HERE, 'lineup.webp'), label_w=200, scale=0.42)
    for who in ORDER:
        names = sorted((n for n in L if L[n]['who'] == who), key=step_key)
        if not names:
            continue
        cells = [('current', current(who))] + [(n, os.path.join(HERE, n + '.webp')) for n in names]
        rows = [(NAME[who] if i == 0 else '', cells[i:i + 6]) for i in range(0, len(cells), 6)]
        grid(rows, os.path.join(HERE, f'attempts-{who}.webp'), label_w=200, scale=0.42)


if __name__ == '__main__':
    main()
