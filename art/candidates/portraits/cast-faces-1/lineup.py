"""cast-faces-1: the new in-game cast side by side, placed the way the game places them (game3d/js/ui/portraits.js FACE:
the same face height, chins on one line, cut 2.25 face heights below the chin), Mio and Kuro at the ends. Also every
face each person has in the game now, one row per person.

Run: ~/ai/rmbg/rembg/bin/python lineup.py   -> lineup.webp, faces-installed.webp in bible/shots/showcase/cast-faces-1/
(a synced root, so Showcase cast-faces-1 still has them after this worktree is gone)"""
import os, re
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
P = os.path.join(WT, 'game3d/assets/portraits')
OUT = os.path.join(WT, 'bible/shots/showcase/cast-faces-1')
DARK = (18, 20, 28)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20)
ORDER = ['mio', 'eric', 'kenji', 'emi', 'aoi', 'guard', 'mori', 'kuroda', 'kuro']
NAME = {'mio': 'Mio (kept)', 'eric': 'Eric', 'kenji': 'Kenji', 'emi': 'Emi', 'aoi': 'Aoi', 'guard': 'Ishibashi',
        'mori': 'Mr. Mori', 'kuroda': 'Mr. Hamada', 'kuro': 'Kuro'}
F, CHIN, CUT = 150, 260, 2.25   # face height, chin line, cut below the chin in face heights (desktop)


def face_table():
    js = open(os.path.join(WT, 'game3d/js/ui/portraits.js')).read()
    # (W, H, face box, size): size scales one person about the chin, as the game does (FACE.kuro)
    return {m[0]: (int(m[1]), int(m[2]), [int(v) for v in m[3].split(',')], float(m[4] or 1))
            for m in re.findall(r'(\w+): \{ W: (\d+), H: (\d+), f: \[([\d, ]+)\](?:, size: ([\d.]+))? \}', js)}


def placed(who, face, table):
    W, H, f, k = table[who]
    s = F * k / (f[3] - f[1])
    im = Image.open(os.path.join(P, f'{who}-{face}.webp')).convert('RGBA').resize((round(W * s), round(H * s)), Image.LANCZOS)
    return im, (f[0] + f[2]) / 2 * s, f[3] * s


def strip(items, table, col=290):
    h = int(CHIN + CUT * F) + 34
    out = Image.new('RGB', (col * len(items), h), DARK)
    d = ImageDraw.Draw(out)
    for i, (who, face, label) in enumerate(items):
        im, cx, chin = placed(who, face, table)
        x, y = round(i * col + col / 2 - cx), round(CHIN - chin)
        layer = Image.new('RGBA', out.size, (0, 0, 0, 0))
        layer.paste(im, (x, y))
        layer = layer.crop((i * col, 0, (i + 1) * col, int(CHIN + CUT * F)))
        out.paste(layer, (i * col, 0), layer)
        d.text((i * col + 8, h - 28), label, fill=(230, 230, 230), font=FONT)
    return out


def main():
    t = face_table()
    os.makedirs(OUT, exist_ok=True)
    strip([(w, 'neutral', NAME[w]) for w in ORDER], t).save(os.path.join(OUT, 'lineup.webp'), 'WEBP', quality=90)
    faces = {'eric': ['neutral', 'surprised', 'tired'], 'kenji': ['neutral', 'grin', 'sheepish'], 'guard': ['neutral', 'stern', 'amused'],
             'mori': ['neutral', 'smile', 'flustered'], 'kuroda': ['neutral', 'sleepy', 'panicked'], 'emi': ['neutral'], 'aoi': ['neutral']}
    rows = [strip([(w, f, f'{NAME[w]}: {f}') for f in fs] + [], t, col=300) for w, fs in faces.items()]
    sheet = Image.new('RGB', (900, sum(r.height for r in rows)), DARK)
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    sheet.save(os.path.join(OUT, 'faces-installed.webp'), 'WEBP', quality=88)


if __name__ == '__main__':
    main()
