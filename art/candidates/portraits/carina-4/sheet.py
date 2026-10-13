"""carina-4 contact sheet: anchors (Mio, Kuro) first, then the 12 finals, then the extra seeds; STYLE and check marks in the labels.
Also pads the top of finals whose headroom is under 34 px (edge colour extended), writing <name>-final.webp."""
import json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 15)
FB = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', 20)
import os
R = json.load(open('results.json')) if os.path.exists('results.json') else {}
def headroom(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    bg = np.median(a[:6, :], axis=(0, 1))
    d = np.abs(a - bg).sum(2) > 60
    rows = np.where(d[:, 150:-150].sum(1) > 3)[0]
    return int(rows[0]) if len(rows) else 0
def pad(src, dst, want=40):
    im = Image.open(src).convert('RGB'); h = headroom(im)
    if h >= 34: im.save(dst, quality=92); return h, 0
    add = want - h
    out = Image.new('RGB', (im.width, im.height + add)); out.paste(im, (0, add))
    top = np.asarray(im)[:4].mean(axis=0).astype('uint8')
    for y in range(add): out.paste(Image.fromarray(top[None, :, :]), (0, y))
    out.save(dst, quality=92); return h, add
W, H = 392, 504
def tile(path, title, sub, ok):
    t = Image.new('RGB', (W, H + 86), (22, 26, 30))
    t.paste(Image.open(path).convert('RGB').resize((W, H)), (0, 86))
    d = ImageDraw.Draw(t)
    a, _, b = title.partition(', ')
    d.text((8, 3), a, font=FB, fill=(245, 245, 245))
    d.text((8, 30), b, font=F, fill=(200, 200, 205))
    d.text((8, 56), sub, font=F, fill=(120, 220, 140) if ok else (240, 170, 90))
    return t
if __name__ == '__main__':
    tiles = []
    for p, n in (('../../../approved/mio/mio-after.webp', 'anchor: Mio'), ('../../../approved/kuro/kuro-after.webp', 'anchor: Kuro')):
        tiles.append(tile(p, n, 'style reference', True))
    for n in range(1, 13):
        r = R[str(n)]
        tiles.append(tile(r['final'], f"{n}. {r['name']}", f"STYLE {r['style']} | {r['mark']}"[:46], r['mark'].startswith('PASS') and r['style'] == 'PASS'))
    for f, lab in R['extras']:
        tiles.append(tile(f, lab[0], lab[1], lab[1].startswith('PASS')))
    cols = 6; rows = (len(tiles) + cols - 1) // cols
    s = Image.new('RGB', (cols * W, rows * (H + 86)), (22, 26, 30))
    for i, t in enumerate(tiles): s.paste(t, ((i % cols) * W, (i // cols) * (H + 86)))
    s.save('sheet.png'); s.save('sheet.webp', quality=88); print(s.size)
