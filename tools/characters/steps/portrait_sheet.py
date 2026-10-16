"""Framed previews and a contact sheet for a portrait round (portrait-round skill, step 11).

Each raw render is cropped to the game's portrait frame (597x768) with the crop box tools/imgqa.py measured for it (its
face box matched to the approved portrait's), and any strip the render lacks above or at the sides is filled with the
render's own background colour. That is a preview of the framing only: the picked render still gets a real outpaint for
its headroom (art/PROMPTS.md, Headroom fix). The preview is saved next to the render as <render>-framed.webp.
The sheet puts the approved portrait first, then every render in the order given, labelled, at the same scale.

    ~/ai/consist/.venv/bin/python tools/characters/steps/portrait_sheet.py <out-sheet.webp> --approved <approved.webp> \
        --qa <dir with imgqa.json> [--qa ...] <label=render.webp ...> [--cols 4]

First made for round art/candidates/portraits/mori-hamada-1 (#662)."""
import argparse, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
GW, GH = 597, 768
FONT = '/usr/share/fonts/TTF/DejaVuSans.ttf'


def framed(path, crop):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im)
    corners = np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3)])
    bg = tuple(int(v) for v in np.median(corners, 0))
    x0, y0, x1, y1 = [round(v) for v in crop]
    canvas = Image.new('RGB', (x1 - x0, y1 - y0), bg)
    canvas.paste(im, (-x0, -y0))
    return canvas.resize((GW, GH), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('items', nargs='+', help='label=render.webp, in order')
    ap.add_argument('--approved', required=True)
    ap.add_argument('--qa', action='append', default=[])
    ap.add_argument('--cols', type=int, default=4)
    a = ap.parse_args()
    boxes = {}
    for q in a.qa:
        for i in json.load(open(os.path.join(q, 'imgqa.json')))['images']:
            boxes[os.path.realpath(os.path.join(REPO, i['path']))] = i['framing']['crop']
    port = Image.open(a.approved).convert('RGBA')
    flat = Image.new('RGBA', port.size, (217, 220, 224, 255))
    flat.alpha_composite(port)
    cells = [('approved now', flat.convert('RGB').resize((GW, GH), Image.LANCZOS))]
    for item in a.items:
        label, path = item.split('=', 1)
        fr = framed(path, boxes[os.path.realpath(path)])
        fr.save(path[:-5] + '-framed.webp', quality=90)
        cells.append((label, fr))
    cw, ch, head = GW // 2, GH // 2, 34
    rows = (len(cells) + a.cols - 1) // a.cols
    sheet = Image.new('RGB', (a.cols * cw, rows * (ch + head)), 'white')
    d, font = ImageDraw.Draw(sheet), ImageFont.truetype(FONT, 22)
    for k, (label, im) in enumerate(cells):
        x, y = (k % a.cols) * cw, (k // a.cols) * (ch + head)
        sheet.paste(im.resize((cw, ch), Image.LANCZOS), (x, y + head))
        d.text((x + 8, y + 5), label, fill='black', font=font)
    sheet.save(a.out, quality=88)
    print(a.out, len(cells) - 1, 'renders')


if __name__ == '__main__':
    main()
