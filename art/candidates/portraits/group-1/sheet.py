"""Side-by-side sheet: the standalone game portraits (row 1) against portraits cut from group shots (one row per tag),
every picture framed the same way (face on Kenji's face box, 597x768, see frame.py), on the same grey.

Usage: ~/ai/consist/.venv/bin/python art/candidates/portraits/group-1/sheet.py <out-name> <tag>[=label] ...
Writes art/candidates/portraits/group-1/<out-name>.webp."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, HERE)
from frame import ORDER, CW, CH, KF, GREY, faces

FONT = '/usr/share/fonts/TTF/DejaVuSans.ttf'
NAMES = {'eric': 'Eric', 'mio': 'Mio', 'kenji': 'Kenji', 'mori': 'Mr. Mori', 'emi': 'Emi'}


def standalone(who):
    """The game portrait, framed like frame.py does (face box from the same detector onto Kenji's box)."""
    im = Image.open(os.path.join(ROOT, f'game3d/assets/portraits/{who}-neutral.webp')).convert('RGBA')
    g = Image.new('RGBA', im.size, GREY + (255,))
    g.alpha_composite(im)
    f = faces(g.convert('RGB'))
    f = max(f, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]))
    s = (KF[3] - KF[1]) / (f[3] - f[1])
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    can = Image.new('RGBA', (CW, CH), GREY + (255,))
    can.alpha_composite(im, (round((KF[0] + KF[2]) / 2 - (f[0] + f[2]) / 2 * s), round(KF[3] - f[3] * s)))
    return can.convert('RGB')


def main(name, tags):
    rows = [('Standalone (game portraits now)', [standalone(w) for w in ORDER])]
    for t in tags:
        tag, _, label = t.partition('=')
        rows.append((label or tag, [Image.open(os.path.join(HERE, f'group1-{tag}-{w}.webp')).convert('RGB') for w in ORDER]))
    k = 0.6
    w, h, T, L = round(CW * k), round(CH * k), 40, 260
    img = Image.new('RGB', (L + w * 5, T + (h + 8) * len(rows)), 'white')
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, 22)
    fs = ImageFont.truetype(FONT, 18)
    for i, wname in enumerate(ORDER):
        d.text((L + i * w + 10, 8), NAMES[wname], fill='black', font=f)
    for r, (label, ims) in enumerate(rows):
        y = T + r * (h + 8)
        words, line, lines = label.split(), '', []
        for wd in words:
            if d.textlength(line + ' ' + wd, font=fs) > L - 16:
                lines.append(line)
                line = wd
            else:
                line = (line + ' ' + wd).strip()
        lines.append(line)
        for j, ln in enumerate(lines):
            d.text((8, y + 10 + j * 24), ln, fill='black', font=fs)
        for i, im in enumerate(ims):
            img.paste(im.resize((w, h), Image.LANCZOS), (L + i * w, y))
    img.save(os.path.join(HERE, name + '.webp'), quality=90)
    print(os.path.join(HERE, name + '.webp'))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2:])
