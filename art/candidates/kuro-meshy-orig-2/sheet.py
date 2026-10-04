"""Contact sheet of pictures or renders for reviews/kuro-meshy-orig-2, each labelled with its id, in the order given.
  python3 art/candidates/kuro-meshy-orig-2/sheet.py <out.webp> <cell height> <label>=<image> ...
Paths are relative to the main checkout's art/parts/kuro-meshy-orig-2/ unless absolute. Transparent images go on white.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ART = '/home/jorgen/repo/japanese/art/parts/kuro-meshy-orig-2'


def main():
    out, h, pairs = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
    cells = []
    for p in pairs:
        label, path = p.split('=', 1)
        im = Image.open(path if os.path.isabs(path) else os.path.join(ART, path)).convert('RGBA')
        bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im); im = bg.convert('RGB')
        im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
        cells.append((label, im))
    pad, top = 12, 34
    W = sum(im.width for _, im in cells) + pad * (len(cells) + 1)
    sheet = Image.new('RGB', (W, h + top + pad), (236, 238, 241))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    x = pad
    for label, im in cells:
        sheet.paste(im, (x, top))
        d.text((x + 2, 7), label, fill=(29, 35, 39), font=font)
        x += im.width + pad
    out = out if os.path.isabs(out) else os.path.join(ART, out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out, quality=90)
    print(out, sheet.size)


if __name__ == '__main__':
    main()
