"""Contact sheet for opening-window-1: per shot, the approved portrait first, then every attempt in the order made, all at
the same height, labelled. Usage: python3 sheet.py   (reads prompts.json; writes sheet-<shot>.webp and sheet.webp)"""
import os, json
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
TH = 480
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
APPROVED = {'eric-window': ('game3d/assets/portraits/eric-neutral.webp', 'approved eric-neutral'),
            'mio-window-phone': ('game3d/assets/portraits/mio-phone.webp', 'approved mio-phone'),
            'mio-window-look': ('game3d/assets/portraits/mio-deadpan.webp', 'approved mio-deadpan')}
BG = (205, 210, 216)


def tile(path, text):
    im = Image.open(os.path.join(ROOT, path))
    if im.mode == 'RGBA':
        g = Image.new('RGBA', im.size, BG + (255,))
        g.alpha_composite(im)
        im = g
    im = im.convert('RGB')
    im = im.resize((round(im.width * TH / im.height), TH), Image.LANCZOS)
    t = Image.new('RGB', (im.width, TH + 34), (20, 24, 28))
    t.paste(im, (0, 34))
    ImageDraw.Draw(t).text((8, 5), text, fill=(240, 240, 240), font=FONT)
    return t


def row(tiles):
    w = sum(t.width + 8 for t in tiles)
    r = Image.new('RGB', (w, TH + 34), (20, 24, 28))
    x = 0
    for t in tiles:
        r.paste(t, (x, 0))
        x += t.width + 8
    return r


if __name__ == '__main__':
    L = json.load(open(os.path.join(HERE, 'prompts.json')))
    rows = []
    for shot, (ap, at) in APPROVED.items():
        names = [n for n, e in L.items() if e['shot'] == shot]
        if not names:
            continue
        tiles = [tile(ap, at)] + [tile(L[n]['file'], n) for n in names]
        # at most 5 per line
        lines = [row(tiles[i:i + 5]) for i in range(0, len(tiles), 5)]
        W = max(l.width for l in lines)
        s = Image.new('RGB', (W, sum(l.height + 8 for l in lines)), (20, 24, 28))
        y = 0
        for l in lines:
            s.paste(l, (0, y))
            y += l.height + 8
        s.save(os.path.join(HERE, f'sheet-{shot}.webp'), quality=88)
        rows.append(s)
        print('sheet', shot, len(names))
    # shot 3 close-ups: each look beside its source, the face crop it was repainted on (the eyes are small at sheet size)
    looks = [n for n, e in L.items() if e['shot'] == 'mio-window-look']
    tiles = []
    for n in looks:
        e = L[n]
        src = Image.open(os.path.join(ROOT, e['source'])).convert('RGB').crop(e['crop'])
        out = Image.open(os.path.join(ROOT, e['file'])).convert('RGB').crop(e['crop'])
        for im, t in ((src, 'source'), (out, n.replace('look-miophone-', ''))):
            im = im.resize((360, 360), Image.LANCZOS)
            tt = Image.new('RGB', (360, 394), (20, 24, 28))
            tt.paste(im, (0, 34))
            ImageDraw.Draw(tt).text((8, 5), t, fill=(240, 240, 240), font=FONT)
            tiles.append(tt)
    lines = [tiles[i:i + 6] for i in range(0, len(tiles), 6)]
    s = Image.new('RGB', (6 * 368, len(lines) * 402), (20, 24, 28))
    for li, l in enumerate(lines):
        for ti, t in enumerate(l):
            s.paste(t, (ti * 368, li * 402))
    s.save(os.path.join(HERE, 'sheet-mio-window-look-faces.webp'), quality=88)
    print('sheet look faces', len(looks))
