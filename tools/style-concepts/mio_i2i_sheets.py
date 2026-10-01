# char-mio-i2i sheets: each attempt beside the target at the same camera, and its turnaround.
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_sheets.py <attempt> [...]
# Writes <attempt>/compare.webp (target | attempt | the attempt's outline over the target), <attempt>/turn.webp
# (front, l40, l90, back, r40, r90, cropped to the figure), <attempt>/face.webp (the face close-ups beside the
# target's face, same scale) and, when the game shots exist, <attempt>/game.webp.
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

import mio_i2i_cam as C

BG = (224, 227, 230)
FONT = ImageFont.load_default(size=22)


def on_bg(path, bg=BG):
    im = Image.open(path).convert('RGBA')
    b = Image.new('RGBA', im.size, bg + (255,))
    b.alpha_composite(im)
    return b.convert('RGB')


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.size[0], 34], fill=(255, 255, 255))
    d.text((10, 6), text, fill=(20, 20, 20), font=FONT)
    return im


def outline(alpha):
    m = np.asarray(alpha) > 127
    return m ^ ndimage.binary_erosion(m, iterations=2)


CLEAN_ATT = ('mi-06', 'mi-07', 'mi-08', 'mi-09', 'mi-10')


def ref_for(att):
    if att in CLEAN_ATT:
        return Image.open(C.CLEAN).convert('RGB').resize((1024, 1024), Image.LANCZOS), 'clean target'
    return Image.open(C.TARGET).convert('RGB'), 'target (mio-front-d60)'


def compare(att):
    d = os.path.join(C.OUT, att)
    tgt, tname = ref_for(att)
    r = os.path.join(d, 'renders', 'front.png')
    ours = on_bg(r)
    edge = outline(Image.open(r).getchannel('A'))
    ov = np.asarray(tgt).copy()
    ov[edge] = (255, 0, 160)
    box = (300, 40, 724, 990)
    tiles = [label(tgt.crop(box), tname), label(ours.crop(box), att + ' front, same camera'),
             label(Image.fromarray(ov).crop(box), att + ' outline on the target')]
    w, h = tiles[0].size
    sheet = Image.new('RGB', (w * 3 + 20, h), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * (w + 10), 0))
    sheet.save(os.path.join(d, 'compare.webp'), quality=92)


def turn(att):
    d = os.path.join(C.OUT, att, 'renders')
    tags = ['front', 'l40', 'l90', 'back', 'r40', 'r90']
    names = {'front': 'front', 'l40': 'three-quarter, her left', 'l90': 'side, her left', 'back': 'back',
             'r40': 'three-quarter, her right', 'r90': 'side, her right'}
    box = (330, 40, 694, 990)
    tiles = [label(on_bg(os.path.join(d, t + '.png')).crop(box), names[t]) for t in tags]
    w, h = tiles[0].size
    sheet = Image.new('RGB', (w * 3 + 20, h * 2 + 10), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 3) * (w + 10), (i // 3) * (h + 10)))
    sheet.save(os.path.join(C.OUT, att, 'turn.webp'), quality=92)


def face(att):
    d = os.path.join(C.OUT, att, 'renders')
    tgt = ref_for(att)[0].crop((400, 60, 620, 280)).resize((768, 768), Image.LANCZOS)
    tiles = [label(tgt, 'target face')]
    for t, n in (('face', 'front'), ('face-l32', 'turned 32 degrees, her left')):
        im = on_bg(os.path.join(d, t + '.png'))
        tiles.append(label(im.resize((768, 768), Image.LANCZOS), n))
    sheet = Image.new('RGB', (768 * 3 + 20, 768), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * 778, 0))
    sheet.save(os.path.join(C.OUT, att, 'face.webp'), quality=92)


def game(att):
    d = os.path.join(C.OUT, att, 'renders')
    shots = [('game-forecourt-desk-crop.png', 'forecourt, desktop'), ('game-office-desk-crop.png', 'office, desktop'),
             ('game-forecourt-phone-crop.png', 'forecourt, phone'), ('game-office-phone-crop.png', 'office, phone')]
    tiles = []
    for f, n in shots:
        p = os.path.join(d, f)
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            im = im.resize((im.size[0] * 2, im.size[1] * 2), Image.NEAREST)
            tiles.append(label(im, n))
    if not tiles:
        return
    w = max(t.size[0] for t in tiles)
    h = max(t.size[1] for t in tiles)
    sheet = Image.new('RGB', (w * 2 + 10, h * ((len(tiles) + 1) // 2) + 10), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % 2) * (w + 10), (i // 2) * (h + 10)))
    sheet.save(os.path.join(C.OUT, att, 'game.webp'), quality=92)


if __name__ == '__main__':
    for att in sys.argv[1:]:
        compare(att)
        turn(att)
        face(att)
        game(att)
        print('sheets', att)


def gen_sheet(job, tags=('front', 'l40', 'l90', 'l140', 'back', 'r140', 'r90', 'r40'), with_src=True, src='src'):
    """The generated turnaround, each over its source render: claude-mioi2i/gen/<job>/sheet.webp."""
    d = os.path.join(C.OUT, 'gen', job)
    box = (300, 40, 724, 990)
    rows = []
    for t in tags:
        p = os.path.join(d, t + '.png')
        if not os.path.exists(p):
            continue
        g = label(Image.open(p).convert('RGB').crop(box), t)
        if with_src:
            s = label(on_bg(os.path.join(C.OUT, src, t + '.png'), (229, 232, 236)).crop(box), t + ' source')
            rows.append((s, g))
        else:
            rows.append((g,))
    w, h = rows[0][0].size
    n = len(rows)
    cols = 4
    per = len(rows[0])
    sheet = Image.new('RGB', ((w * per + 10) * cols, (h + 10) * ((n + cols - 1) // cols)), (255, 255, 255))
    for i, r in enumerate(rows):
        x0 = (i % cols) * (w * per + 10)
        y0 = (i // cols) * (h + 10)
        for j, t in enumerate(r):
            sheet.paste(t, (x0 + j * w, y0))
    sheet.save(os.path.join(d, 'sheet.webp'), quality=90)
    print('sheet', d)


def overview(atts, name='overview', tag='front'):
    """Both targets, then every attempt from one camera (tag), in order: claude-mioi2i/<name>.webp."""
    box = (322, 40, 702, 990)
    tiles = [label(Image.open(C.TARGET).convert('RGB').crop(box), 'target'),
             label(Image.open(C.CLEAN).convert('RGB').resize((1024, 1024), Image.LANCZOS).crop(box), 'clean target')]
    for a in atts:
        p = os.path.join(C.OUT, a, 'renders', tag + '.png')
        if os.path.exists(p):
            tiles.append(label(on_bg(p).crop(box), a))
    w, h = tiles[0].size
    cols = 7
    sh = Image.new('RGB', (cols * (w + 6), ((len(tiles) + cols - 1) // cols) * (h + 6)), (255, 255, 255))
    for i, t in enumerate(tiles):
        sh.paste(t, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
    sh.save(os.path.join(C.OUT, name + '.webp'), quality=88)


def wire_sheet():
    """The wireframes: read off the clean front and the t3 views, and the two the image model drew."""
    d = os.path.join(C.OUT, 'wire')
    tiles = []
    for n, lab in (('front', 'measured, clean front'), ('t3-l90', 'measured, side (her left)'),
                   ('t3-back', 'measured, back'), ('t3-r90', 'measured, side (her right)')):
        im = Image.open(os.path.join(d, n + '.webp')).convert('RGB')
        im.thumbnail((520, 1100))
        tiles.append(label(im, lab))
    for n in ('wire-d55', 'wire-d75'):
        im = Image.open(os.path.join(C.OUT, 'gen', 'w1', n + '.png')).convert('RGB').crop((322, 40, 702, 990))
        tiles.append(label(im, 'generated, ' + n))
    h = max(t.size[1] for t in tiles)
    sh = Image.new('RGB', (sum(t.size[0] + 8 for t in tiles), h), (255, 255, 255))
    x = 0
    for t in tiles:
        sh.paste(t, (x, 0))
        x += t.size[0] + 8
    sh.save(os.path.join(d, 'sheet.webp'), quality=90)
