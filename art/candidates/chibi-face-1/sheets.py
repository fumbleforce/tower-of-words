"""Contact sheets for the "Rei face" and "Kuro face" sections of reviews/chibi-proportions-1.
  python3 sheets.py rei current rei-f1 [...]
One row per face, in order: the head picture the edit started from or made (straight on, the texture's own colour),
then in the game with ?chibi=1 (game3d/tools/chibi-proportions.mjs, TAG=<face>): her face straight on, her face from
her left, her whole figure from the front and from her left 3/4. 'current' is the face as it is (rei-2 / kuro-1).
Writes art/parts/chibi-face-1/<who>-faces-<size>.webp in the main checkout (local, git-ignored, served on 8771).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
MAIN = ROOT.split('/.claude/worktrees/')[0]
SHOTS = os.path.join(ROOT, 'game3d/shots/chibi-proportions')
OUT = os.path.join(MAIN, 'art/parts/chibi-face-1')
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
# the face in the 1024 px head picture
HEAD = {'rei': (212, 200, 812, 700), 'kuro': (212, 400, 812, 900)}
BIG = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 26)


def cell(path, box, h):
    im = Image.open(path).convert('RGB')
    if box:
        im = im.crop(box(im.size))
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def main(who, faces, size='1366x860'):
    phone = size.startswith('390')
    h = 360 if not phone else 520
    mid = lambda half: (lambda s: (s[0] // 2 - half, 0, s[0] // 2 + half, s[1]))
    views = [('face', 'face, straight on', None if phone else mid(420)),
             ('face34', 'face, from her left', None if phone else mid(420)),
             ('front', 'front', None if phone else mid(260)),
             ('34', 'her left 3/4', None if phone else mid(260))]
    rows = []
    for f in faces:
        head = os.path.join(OUT, 'work', f'{who}-front-white.png') if f == 'current' else os.path.join(OUT, 'edits', f + '-on.png')
        r = [(cell(head, lambda s: HEAD[who], h), 'texture, straight on')]
        r += [(cell(os.path.join(SHOTS, size, f"{f.split('-')[-1]}-{who}-{v}.png"), b, h), c) for v, c, b in views]
        rows.append((f, r))
    pad, lab, top = 10, 34, 50
    W = pad + max(sum(im.width + pad for im, _ in r) for _, r in rows)
    H = top + len(rows) * (h + lab + pad)
    o = Image.new('RGB', (W, H), (236, 238, 242))
    d = ImageDraw.Draw(o)
    name = {'rei': 'Rei', 'kuro': 'Kuro'}[who]
    d.text((pad, 12), f'{name}\'s face, every attempt in order, in the game at {size} (?chibi=1)', fill=(20, 20, 20), font=BIG)
    for y, (f, r) in enumerate(rows):
        x = pad
        py = top + y * (h + lab + pad)
        for im, cap in r:
            o.paste(im, (x, py))
            d.text((x, py + h + 4), f'{f}: {cap}', fill=(20, 20, 20), font=FONT)
            x += im.width + pad
    dst = os.path.join(OUT, f'{who}-faces-{"phone" if phone else "desktop"}.webp')
    o.save(dst, 'WEBP', quality=88, method=6)
    print(dst, o.size)


if __name__ == '__main__':
    args = sys.argv[1:]
    size = os.environ.get('SIZE', '1366x860')
    main(args[0], args[1:], size)
