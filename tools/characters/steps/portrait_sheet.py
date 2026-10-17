"""Framed previews and a contact sheet for a portrait round (portrait-round skill, step 11).

Each raw render is cropped to the game's portrait frame (597x768) with the crop box tools/imgqa.py measured for it (its
face box matched to the approved portrait's), and any strip the render lacks above or at the sides is filled with the
render's own background colour. That is a preview of the framing only: the picked render still gets a real outpaint for
its headroom (art/PROMPTS.md, Headroom fix). The preview is saved next to the render as <render>-framed.webp.
The sheet puts the approved portrait first, then every render in the order given, labelled, at the same scale.

    ~/ai/consist/.venv/bin/python tools/characters/steps/portrait_sheet.py <out-sheet.webp> --approved <approved.webp> \
        --qa <dir with imgqa.json> [--qa ...] <label=render.webp ...> [--cols 4]

Lineup (--lineup <who>): the cast's game portraits (--cast mio,eric,...) and the given framed previews side by side at
the size the game shows them on a 1080p desktop: every face 124 px high, chins level, cut at the waist 2.25 face heights
below the chin (layoutStage and FACE in game3d/js/ui/portraits.js). Framed previews use <who>'s face box, the box
the framing matched them to.

    python3 tools/characters/steps/portrait_sheet.py <out-lineup.webp> --lineup mori --cast mio,eric,kenji,kuroda,mori \
        <label=render-framed.webp ...> [--cols N]

First made for round art/candidates/portraits/mori-hamada-1 (#662)."""
import argparse, json, os, re
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


def faces():
    """The FACE table of game3d/js/ui/portraits.js: who -> (W, H, [x0, y0, x1, y1], size)."""
    js = open(os.path.join(REPO, 'game3d/js/ui/portraits.js')).read()
    out = {}
    for m in re.finditer(r"^  (\w+): \{ W: (\d+), H: (\d+), f: \[([\d, ]+)\](?:, size: ([\d.]+))? \}", js, re.M):
        out[m[1]] = (int(m[2]), int(m[3]), [int(v) for v in m[4].split(',')], float(m[5] or 1))
    return out


def lineup(out, who, cast, items, cols=0, F=124, cut=2.25):
    """Every picture placed as the game's desktop stage places it, side by side on its grey."""
    fb = faces()
    cells = [(c, os.path.join(REPO, f'game3d/assets/portraits/{c}-neutral.webp'), fb[c]) for c in cast]
    cells += [(lab, path, (GW, GH, fb[who][2], 1)) for lab, path in (i.split('=', 1) for i in items)]
    placed = []
    for lab, path, (W, H, f, size) in cells:
        im = Image.open(path).convert('RGBA')
        k = F * size / (f[3] - f[1]) * im.width / W
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        cx, chin = (f[0] + f[2]) / 2 * im.width / W, f[3] * im.height / H
        placed.append((lab, im, cx, chin))
    top, cw, head = max(p[3] for p in placed), round(3.6 * F), 34
    h, cols = round(top + cut * F), cols or len(placed)
    rows = (len(placed) + cols - 1) // cols
    sheet = Image.new('RGB', (cw * min(cols, len(placed)), rows * (h + head)), 'white')
    d, font = ImageDraw.Draw(sheet), ImageFont.truetype(FONT, 20)
    for n, (lab, im, cx, chin) in enumerate(placed):
        x, y = (n % cols) * cw, (n // cols) * (h + head)
        cell = Image.new('RGB', (cw, h), (217, 220, 224))
        cell.paste(im, (round(cw / 2 - cx), round(top - chin)), im)
        sheet.paste(cell, (x, y + head))
        d.text((x + 8, y + 6), lab, fill='black', font=font)
    sheet.save(out, quality=90)
    print(out, sheet.size, len(placed), 'portraits')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('items', nargs='+', help='label=render.webp, in order')
    ap.add_argument('--approved')
    ap.add_argument('--approved-label', default='approved now', help='label of the first cell (a new concept shows its parent)')
    ap.add_argument('--lineup', metavar='WHO', help="a lineup at game size; framed previews sit on WHO's face box")
    ap.add_argument('--cast', default='', help='game portraits first in the lineup, comma separated')
    ap.add_argument('--qa', action='append', default=[])
    ap.add_argument('--cols', type=int, help='per row (sheet: 4; lineup: all in one row)')
    a = ap.parse_args()
    if a.lineup:
        return lineup(a.out, a.lineup, [c for c in a.cast.split(',') if c], a.items, a.cols or 0)
    a.cols = a.cols or 4
    boxes = {}
    for q in a.qa:
        for i in json.load(open(os.path.join(q, 'imgqa.json')))['images']:
            boxes[os.path.realpath(os.path.join(REPO, i['path']))] = i['framing']['crop']
    port = Image.open(a.approved).convert('RGBA')
    flat = Image.new('RGBA', port.size, (217, 220, 224, 255))
    flat.alpha_composite(port)
    cells = [(a.approved_label, flat.convert('RGB').resize((GW, GH), Image.LANCZOS))]
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
