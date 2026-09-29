"""Before/after sheets for eric-canvas-1: the approved 597 px files beside the 648 px candidates on dark, light and a
checkerboard, and a 2x close-up of the new strip (his left shoulder and arm, image right) over a checkerboard.
Run: ~/ai/sd/venv/bin/python art/candidates/portraits/eric-canvas-1/sheet.py"""
import os
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 22)
FACES = ('neutral', 'surprised', 'tired')


def checker(w, h, n=16):
    im = Image.new('RGBA', (w, h), (200, 200, 200, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, h, n):
        for x in range(0, w, n):
            if (x // n + y // n) % 2:
                d.rectangle((x, y, x + n - 1, y + n - 1), fill=(150, 150, 150, 255))
    return im


def tile(im, bg):
    b = checker(im.width, im.height) if bg == 'checker' else Image.new('RGBA', im.size, bg)
    b.alpha_composite(im)
    d = ImageDraw.Draw(b)
    d.line((596.5, 0, 596.5, 10), fill=(255, 60, 60, 255), width=1)  # where the old image ended
    return b


def main():
    old = {f: Image.open(os.path.join(REPO, f'game3d/assets/portraits/eric-{f}.webp')).convert('RGBA') for f in FACES}
    new = {f: Image.open(os.path.join(HERE, f'eric-{f}.webp')).convert('RGBA') for f in FACES}
    W, H, gap, head = 648, 768, 16, 40
    bgs = [(28, 32, 40, 255), (236, 236, 232, 255), 'checker']
    for tag, src in (('before', old), ('after', new)):
        sheet = Image.new('RGBA', (3 * (W + gap), 3 * (H + gap) + head), (60, 60, 64, 255))
        d = ImageDraw.Draw(sheet)
        d.text((10, 8), f'{tag}: {src["neutral"].width}x{H}, on dark / light / checker (red tick = old right edge x 597)',
               font=FONT, fill=(255, 255, 255, 255))
        for j, bg in enumerate(bgs):
            for i, f in enumerate(FACES):
                sheet.alpha_composite(tile(src[f], bg), (i * (W + gap), head + j * (H + gap)))
        sheet.convert('RGB').save(os.path.join(HERE, f'sheet-{tag}.webp'), 'WEBP', quality=88)
    # close-up of the strip, 2x, before and after side by side
    box = (430, 420, 648, 768)
    tiles = []
    for tag, src in (('before', old), ('after', new)):
        im = src['neutral']
        c = Image.new('RGBA', (648, 768), (0, 0, 0, 0)); c.paste(im, (0, 0))
        crop = tile(c, 'checker').crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.LANCZOS)
        tiles.append((tag, crop))
    cw, ch = tiles[0][1].size
    out = Image.new('RGB', (2 * cw + gap, ch + head), (60, 60, 64))
    d = ImageDraw.Draw(out)
    for k, (tag, crop) in enumerate(tiles):
        out.paste(crop.convert('RGB'), (k * (cw + gap), head))
        d.text((k * (cw + gap) + 8, 8), f'{tag}, 2x', font=FONT, fill=(255, 255, 255))
    out.save(os.path.join(HERE, 'closeup-shoulder.webp'), 'WEBP', quality=90)


if __name__ == '__main__':
    main()
