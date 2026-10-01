# char-mio-facets review sheets for one attempt:
#   compare.webp  the clean reference | the flat-coloured front render at the same camera | the mesh's facet edges
#                 (projected from mesh.json through the picture's camera) over the reference
#   turn.webp     flat colours from front, l40, l90, back, r40, r90, and the clay renders with the facet edges below
#   face.webp     the reference's face | the render's face, same camera and crop
#   game.webp     the game shots (desk and phone, crops), when they exist
#   ~/ai/cv-venv/bin/python tools/style-concepts/mio_facets_sheets.py <attempt> [...]
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import mio_i2i_cam as C
from mio_facets_lift import F, cam
from mio_facets_wire import OUT

BG = (224, 227, 230)
FONT = ImageFont.load_default(size=22)
BOX = (300, 40, 724, 990)


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


def ref(size=1024):
    return Image.open(C.CLEAN).convert('RGB').resize((size, size), Image.LANCZOS)


def project(P, yaw=0):
    pos, fwd, right, up = cam(yaw)
    q = np.asarray(P) - pos
    z = q @ fwd
    return np.stack([512 + F * (q @ right) / z, 512 - F * (q @ up) / z], axis=1)


def facet_edges(data, side='front'):
    """Edges between two different facets (or on a facet's open border), for faces seen from `side`."""
    cnt = {}
    for f in data['faces']:
        if f['side'] != side:
            continue
        k = (f['part'], f.get('facet'))
        v = f['v']
        for a, b in zip(v, v[1:] + v[:1]):
            e = (min(a, b), max(a, b))
            cnt.setdefault(e, set()).add(k)
    tri_edges = {}
    for f in data['faces']:
        if f['side'] != side:
            continue
        v = f['v']
        for a, b in zip(v, v[1:] + v[:1]):
            e = (min(a, b), max(a, b))
            tri_edges[e] = tri_edges.get(e, 0) + 1
    facet = [e for e, n in tri_edges.items() if n == 1 or len(cnt[e]) > 1]
    inner = [e for e, n in tri_edges.items() if n > 1 and len(cnt[e]) == 1]
    return facet, inner


def wire_over(data, base, scale=2, yaw=0, side='front'):
    V = project(data['verts'], yaw) * scale
    im = base.resize((1024 * scale, 1024 * scale), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    facet, inner = facet_edges(data, side)
    for a, b in inner:
        d.line([tuple(V[a]), tuple(V[b])], fill=(255, 210, 0), width=1)
    for a, b in facet:
        d.line([tuple(V[a]), tuple(V[b])], fill=(255, 0, 170), width=2)
    return im


def compare(att):
    d = os.path.join(OUT, att)
    data = json.load(open(os.path.join(d, 'mesh.json')))
    tgt = ref()
    ours = on_bg(os.path.join(d, 'renders', 'front.png'))
    wire = wire_over(data, tgt).resize((1024, 1024), Image.LANCZOS)
    tiles = [label(tgt.crop(BOX), 'clean reference'), label(ours.crop(BOX), att + ' flat colours, same camera'),
             label(wire.crop(BOX), att + ' mesh facet edges on the reference')]
    w, h = tiles[0].size
    sheet = Image.new('RGB', (w * 3 + 20, h), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * (w + 10), 0))
    sheet.save(os.path.join(d, 'compare.webp'), quality=90)
    # the full-size wire overlay, for zooming in
    big = wire_over(data, tgt, scale=2)
    big.crop((560, 60, 1480, 1990)).save(os.path.join(d, 'wire.webp'), quality=90)


def turn(att):
    d = os.path.join(OUT, att)
    rows = []
    for prefix, tags in (('', ['front', 'l40', 'l90', 'back', 'r40', 'r90']), ('clay-', ['front', 'l40', 'l90', 'back'])):
        tiles = []
        for t in tags:
            p = os.path.join(d, 'renders', prefix + t + '.png')
            if os.path.exists(p):
                tiles.append(label(on_bg(p).crop(BOX), (prefix or 'flat ') + t))
        rows.append(tiles)
    w, h = rows[0][0].size
    cols = max(len(r) for r in rows)
    sheet = Image.new('RGB', (cols * (w + 6), len(rows) * (h + 6)), (255, 255, 255))
    for j, r in enumerate(rows):
        for i, t in enumerate(r):
            sheet.paste(t, (i * (w + 6), j * (h + 6)))
    sheet.save(os.path.join(d, 'turn.webp'), quality=88)


def face(att):
    d = os.path.join(OUT, att)
    box = (400, 60, 624, 300)
    tgt = ref(2048).crop(tuple(x * 2 for x in box)).resize((448, 480), Image.LANCZOS)
    ours = on_bg(os.path.join(d, 'renders', 'front.png')).crop(box).resize((448, 480), Image.LANCZOS)
    tiles = [label(tgt, 'reference'), label(ours, att + ' front')]
    p = os.path.join(d, 'renders', 'face-l32.png')
    if os.path.exists(p):
        tiles.append(label(on_bg(p).resize((480, 480), Image.LANCZOS).crop((16, 0, 464, 480)), att + ' face, 32 deg'))
    sheet = Image.new('RGB', (len(tiles) * 458, 480), (255, 255, 255))
    for i, t in enumerate(tiles):
        sheet.paste(t, (i * 458, 0))
    sheet.save(os.path.join(d, 'face.webp'), quality=90)


def game(att):
    d = os.path.join(OUT, att, 'renders')
    names = ['game-forecourt-desk.png', 'game-forecourt-desk-crop.png', 'game-forecourt-phone-crop.png']
    ims = [Image.open(os.path.join(d, n)).convert('RGB') for n in names if os.path.exists(os.path.join(d, n))]
    if not ims:
        return
    h = 560
    ims = [im.resize((int(im.size[0] * h / im.size[1]), h), Image.LANCZOS) for im in ims]
    sheet = Image.new('RGB', (sum(im.size[0] + 8 for im in ims), h), (255, 255, 255))
    x = 0
    for im in ims:
        sheet.paste(im, (x, 0))
        x += im.size[0] + 8
    sheet.save(os.path.join(OUT, att, 'game.webp'), quality=88)


if __name__ == '__main__':
    for a in sys.argv[1:]:
        compare(a)
        turn(a)
        face(a)
        game(a)
        print('sheets', a)
