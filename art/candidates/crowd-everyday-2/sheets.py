"""Sheets and option images for Review crowd-everyday-2 from capture.mjs's stills and Meshy's own shape previews.
Writes .webp into the main checkout's art/parts/crowd-everyday-2/sheets/ (git-ignored; pushed for the public page).
  ~/ai/sd/venv/bin/python art/candidates/crowd-everyday-2/sheets.py
"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np

A = '/home/jorgen/repo/japanese/art/parts/crowd-everyday-2'
CAP, OUT = A + '/captures', A + '/sheets'
SRC = '/home/jorgen/repo/japanese/art/parts/crowd-everyday-1/pics'
C = [f'{p}-{n}' for p in ('casual', 'older', 'service') for n in (1, 2)]
REF = {'casual': 'office-b', 'older': 'office-a', 'service': 'office-a'}
try:
    FONT = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 26)
except OSError:
    FONT = ImageFont.load_default()


def im(name):
    return Image.open(f'{CAP}/{name}.png').convert('RGB')


def body(name):
    """The middle figure of a whole-body close-up, cropped to its outline plus a margin."""
    x = im(name)
    a = np.asarray(x).astype(int)
    w = a.shape[1]
    mid = a[:, w // 2 - 230:w // 2 + 230]
    bg = np.median(mid[:, :8], axis=1, keepdims=True)
    mask = np.abs(mid - bg).sum(2) > 60
    mask[-60:] = False
    ys, xs = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    pad = 40
    return x.crop((w // 2 - 230, max(0, y0 - pad), w // 2 + 230, min(x.height, y1 + pad)))


def band(name):
    x = im(name)
    return x.crop((0, 270, x.width, 720))


def grid(tiles, cols, size, labels=None):
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * size[0], rows * size[1]), 'white')
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(tiles):
        t = t.copy()
        t.thumbnail(size)
        x, y = (i % cols) * size[0], (i // cols) * size[1]
        sheet.paste(t, (x + (size[0] - t.width) // 2, y + (size[1] - t.height) // 2))
        if labels and labels[i]:
            d.text((x + 10, y + 6), labels[i], fill='black', font=FONT)
    return sheet


def save(img, name):
    img.save(f'{OUT}/{name}.webp', quality=88, method=6)


def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    save(grid([Image.open(f'{SRC}/{p}-01.png').convert('RGB') for p in ('casual', 'older', 'service')], 3, (700, 700),
              ['casual-01', 'older-01', 'service-01']), 'source')
    tiles, labels = [], []
    for c in C:
        for v in ('front', 'left', 'right'):
            tiles.append(Image.open(f'{A}/meshy/{c}-{v}.png').convert('RGB'))
            labels.append(f'{c} {v}' if v == 'front' else '')
    save(grid(tiles, 3, (520, 520), labels), 'shapes')
    save(band('row-front'), 'row-front')
    save(band('row-34'), 'row-34')
    for p in ('casual', 'older', 'service'):
        save(grid([band(f'{p}-{v}') for v in ('front', '34', 'side', 'back')], 2, (1140, 450)), f'{p}-turn')
        keys = [REF[p], f'{p}-1', f'{p}-2']
        save(grid([im(f'{k}-face-{v}') for k in keys for v in ('front', 'left', 'right')], 3, (760, 600),
                  [k if v == 'front' else '' for k in keys for v in ('front', 'left', 'right')]), f'{p}-faces')
        save(grid([band(f'{p}-sit')] + [band(f'{p}-walk-{i}') for i in range(4)], 1, (1140, 450)), f'{p}-motion')
    for k in C + ['office-a', 'office-b']:
        b = [body(f'{k}-body-front'), body(f'{k}-body-34')]
        card = grid(b, 2, (460, max(x.height for x in b)))
        save(card, f'{k}-body')
        save(im(f'{k}-face-front'), f'{k}-face-front')
        save(im(f'{k}-face-left'), f'{k}-face-left')
        save(im(f'{k}-face-right'), f'{k}-face-right')
    print('sheets in', OUT)


if __name__ == '__main__':
    main()
