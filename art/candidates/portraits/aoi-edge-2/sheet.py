"""aoi-edge-2: sheets for Review aoi-edge-2, on the game's dark colour.

closeup-<name>.webp: the original (in the game now) and the attempt side by side at 100% on the 960x1216 source canvas:
the hair on her left (image right) and the shoulder and sleeve. sheet.webp: every attempt in order, framed for the game
(597x768, 100%), the original first.

Run: ~/ai/consist/.venv/bin/python sheet.py <name> ...   (names as in prompts.json, in order)"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = '/home/jorgen/repo/japanese/art/production/PC/aoi-edge-2'
ORIG = '/home/jorgen/repo/japanese/art/production/PC/cast-faces-1/aoi-refined.png'
ORIG_FRAMED = '/home/jorgen/repo/japanese/art/production/PC/cast-faces-1/aoi-neutral-framed.png'
DARK = (18, 20, 28)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
CROPS = [(480, 40, 820, 440), (600, 470, 940, 870), (640, 820, 940, 1216)]   # hair, shoulder, sleeve


def over(im):
    im = im.convert('RGBA')
    b = Image.new('RGB', im.size, DARK)
    b.paste(im, (0, 0), im)
    return b


def closeup(name):
    a, b = over(Image.open(ORIG)), over(Image.open(os.path.join(RAW, f'{name}-canvas.png')))
    w = sum(c[2] - c[0] for c in CROPS) + 20 * (len(CROPS) - 1)
    h = max(c[3] - c[1] for c in CROPS)
    sheet = Image.new('RGB', (w, 2 * (h + 30)), DARK)
    d = ImageDraw.Draw(sheet)
    for row, (label, im) in enumerate([('original (in the game now)', a), (name, b)]):
        y = row * (h + 30)
        d.text((6, y + 4), label, fill=(230, 230, 230), font=FONT)
        x = 0
        for c in CROPS:
            sheet.paste(im.crop(c), (x, y + 30))
            x += c[2] - c[0] + 20
    sheet.save(os.path.join(HERE, f'closeup-{name}.webp'), 'WEBP', quality=92, method=6)


def overview(names):
    items = [('original (in the game now)', Image.open(ORIG_FRAMED))] + \
            [(n, Image.open(os.path.join(RAW, f'{n}-framed.png'))) for n in names]
    W, H = 597, 768
    cols = 4
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * W, rows * (H + 30)), DARK)
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(items):
        x, y = (i % cols) * W, (i // cols) * (H + 30)
        d.text((x + 6, y + 4), f'{i}. {n}', fill=(230, 230, 230), font=FONT)
        sheet.paste(over(im), (x, y + 30))
    sheet.save(os.path.join(HERE, 'sheet.webp'), 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    for n in sys.argv[1:]:
        closeup(n)
    overview(sys.argv[1:])
