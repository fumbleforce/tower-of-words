"""Review images for mio-phone-4.
- glasses-<n>.webp: the glasses beside the approved portrait's at the same scale (as round 3).
- frame-<n>.webp: round 3 and round 4 of the same pick, the left lens on a checkerboard (the cut-out), 3x.
- bg-<n>.webp: the round-4 cut-out on dark, light and a checkerboard.
- approved-frame.webp: her approved game portrait (mio-neutral) before and after, left lens bottom, on the three backgrounds.
Usage: python3 sheet4.py"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(HERE, '..', 'mio-phone-3'))
import sheet as s3  # noqa: E402

R3 = os.path.join(REPO, 'art/production/mio-phone-3')
R4 = os.path.join(REPO, 'art/production/mio-phone-4')
NAMES = ['blendk20-3501-exact-3401-v2', 'blendk25-3501-exact-3401-v2', 'exact-3401-v2', 'blendk20-3501-exact-3403-v2']
LENS = (330, 470, 520, 620)    # her left lens (viewer's left) and the bridge, on the 1008x1296 canvas
DARK, LIGHT = (18, 20, 30), (245, 245, 240)
FONT = s3.FONT


def checker(size, sq=8):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    c = np.where(((xx // sq + yy // sq) % 2) == 0, 235, 160).astype('uint8')
    return Image.fromarray(np.dstack([c, c, c, np.full(c.shape, 255, 'uint8')]))


def over(im, bg):
    base = checker(im.size) if bg == 'checker' else Image.new('RGBA', im.size, bg + (255,))
    base.alpha_composite(im)
    return base.convert('RGB')


def titled(img, text):
    out = Image.new('RGB', (img.width, img.height + 40), (20, 24, 28))
    ImageDraw.Draw(out).text((10, 6), text, fill=(240, 240, 240), font=FONT)
    out.paste(img, (0, 40))
    return out


def row(tiles, gap=12):
    out = Image.new('RGB', (sum(t.width for t in tiles) + gap * (len(tiles) - 1), max(t.height for t in tiles)), (20, 24, 28))
    x = 0
    for t in tiles:
        out.paste(t, (x, 0))
        x += t.width + gap
    return out


def cut(d, n):
    return Image.open(os.path.join(d, 'cut', f'mio-phone3-{n}-refined.png')).convert('RGBA')


if __name__ == '__main__':
    s3.RAW = R4
    s3.HERE = HERE
    for n in NAMES:
        full = 'mio-phone3-' + n
        s3.pair(os.path.join(R4, full + '.png'), n).save(os.path.join(HERE, f'glasses-{n}.webp'), quality=90)
        Image.open(os.path.join(R4, full + '.png')).convert('RGB').resize((597, 768), Image.LANCZOS).save(
            os.path.join(HERE, full + '.webp'), quality=92)
        c4 = cut(R4, n)
        c4.resize((597, 768), Image.LANCZOS).save(os.path.join(HERE, full + '-cut.webp'), quality=92)
        z = lambda im: im.crop(LENS).resize(((LENS[2] - LENS[0]) * 3, (LENS[3] - LENS[1]) * 3), Image.LANCZOS)
        tiles = []
        if os.path.exists(os.path.join(R3, 'cut', f'mio-phone3-{n}-refined.png')):
            tiles.append(titled(over(z(cut(R3, n)), 'checker'), 'round 3'))
        elif os.path.exists(os.path.join(R3, full + '.png')):
            tiles.append(titled(z(Image.open(os.path.join(R3, full + '.png')).convert('RGB')), 'round 3 (no cut-out)'))
        tiles.append(titled(over(z(c4), 'checker'), 'round 4'))
        row(tiles).save(os.path.join(HERE, f'frame-{n}.webp'), quality=90)
        box = (300, 420, 720, 680)
        g = c4.crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.LANCZOS)
        row([titled(over(g, DARK), 'dark'), titled(over(g, LIGHT), 'light'), titled(over(g, 'checker'), 'checkerboard')]).save(
            os.path.join(HERE, f'bg-{n}.webp'), quality=90)
    # the approved game portrait
    box = (170, 265, 300, 350)
    rows = []
    for label, p in (('before', os.path.join(R4, 'portraits-before', 'portraits-mio-neutral.webp')),
                     ('after', os.path.join(REPO, 'game3d/assets/portraits/mio-neutral.webp'))):
        im = Image.open(p).convert('RGBA').crop(box)
        im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS)
        rows.append(row([titled(over(im, DARK), f'{label}: dark'), titled(over(im, LIGHT), f'{label}: light'),
                         titled(over(im, 'checker'), f'{label}: checkerboard')]))
    sheet = Image.new('RGB', (rows[0].width, sum(r.height + 12 for r in rows)), (20, 24, 28))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 12
    sheet.save(os.path.join(HERE, 'approved-frame.webp'), quality=90)
    print('ok')
