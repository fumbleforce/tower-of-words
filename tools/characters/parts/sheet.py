"""Contact sheet for one attempt of reviews/char-mio-parts-1: the target picture, then the turnaround and face renders.

  python3 sheet.py <renders dir> <out.webp> [label]
Run with ~/ai/sd/venv/bin/python (PIL). Light grey background, each view labelled; the target is cropped the same way.
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

TARGET = '/home/jorgen/repo/japanese/art/parts/style-concepts/mio-ref-clean/final.png'
VIEWS = [('front', 'front'), ('l45', 'her left 3/4'), ('l90', 'her left side'), ('back', 'back'), ('r45', 'her right 3/4'),
         ('face', 'face'), ('face-l40', 'face, her left 3/4')]
CELL = 480


def font(n):
    try: return ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', n)
    except OSError: return ImageFont.load_default()


def cell(im, label):
    c = Image.new('RGB', (CELL, CELL + 34), (236, 238, 241))
    if im.mode == 'RGBA':
        bg = Image.new('RGBA', im.size, (236, 238, 241, 255)); bg.alpha_composite(im); im = bg
    im = im.convert('RGB'); im.thumbnail((CELL, CELL), Image.LANCZOS)
    c.paste(im, ((CELL - im.width) // 2, 0))
    ImageDraw.Draw(c).text((10, CELL + 6), label, fill=(30, 35, 40), font=font(20))
    return c


def main():
    d, out = sys.argv[1], sys.argv[2]
    t = Image.open(TARGET)
    cells = [cell(t.crop((636, 100, 2436, 2958)).resize((1800 * CELL // 2858, CELL)), 'target picture'),
             cell(t.crop((1150, 220, 1950, 1020)), 'target face')]
    cells += [cell(Image.open(os.path.join(d, v + '.png')), lab) for v, lab in VIEWS if os.path.exists(os.path.join(d, v + '.png'))]
    cols = 5
    rows = (len(cells) + cols - 1) // cols
    head = 44 if len(sys.argv) > 3 else 0
    sh = Image.new('RGB', (cols * CELL, rows * (CELL + 34) + head), (236, 238, 241))
    if head: ImageDraw.Draw(sh).text((12, 10), sys.argv[3], fill=(20, 25, 30), font=font(24))
    for i, c in enumerate(cells):
        sh.paste(c, ((i % cols) * CELL, head + (i // cols) * (CELL + 34)))
    sh.save(out, quality=88)
    print(out)


if __name__ == '__main__':
    main()
