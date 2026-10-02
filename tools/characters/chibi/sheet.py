"""Review sheets for the chibi rounds (reviews/chibi-manual-1, chibi-cast-manual-1): each render flattened onto
white, then one row per set with its reference picture first and the front, her left three-quarter, her left side
and back after it.

  python3 tools/characters/chibi/sheet.py <out dir> <set> <renders dir> <reference> [<set> <renders dir> <reference>...]

A set's renders are <renders dir>/<set>-<view>.png (render.py). Writes <out>/sheet.webp (every row),
<out>/pair-<set>.webp (reference | front), <out>/faces.webp (every face close-up in a row), every render as webp
under <out>/webp/, and for a set named base <out>/face.webp (the reference's head | the face close-up).
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

D, rest = sys.argv[1], sys.argv[2:]
SETS = [rest[i:i + 3] for i in range(0, len(rest), 3)]
os.makedirs(f'{D}/webp', exist_ok=True)
VIEWS = [('front', 'front'), ('l45', 'her left 3/4'), ('l90', 'her left side'), ('back', 'back')]
try:
    FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 26)
except OSError:
    FONT = ImageFont.load_default()


def flat(p):
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGBA', im.size, (253, 253, 253, 255))
    return Image.alpha_composite(bg, im).convert('RGB')


def square(p):
    """A reference picture on white, fitted into a square (portraits are taller than wide)."""
    im = flat(p)
    s = max(im.size)
    sq = Image.new('RGB', (s, s), (253, 253, 253))
    sq.paste(im, ((s - im.width) // 2, s - im.height))
    return sq


def tile(im, label, s=512):
    im = im.resize((s, s), Image.LANCZOS)
    ImageDraw.Draw(im).text((14, 10), label, fill=(90, 90, 90), font=FONT)
    return im


rows, faces = [], []
for which, R, refp in SETS:
    if not os.path.exists(f'{R}/{which}-front.png'):
        continue
    ref = square(refp)
    tiles = [tile(ref, 'reference')]
    for v, label in VIEWS:
        im = flat(f'{R}/{which}-{v}.png')
        im.save(f'{D}/webp/{which}-{v}.webp', quality=90)
        tiles.append(tile(im, label))
    face = flat(f'{R}/{which}-face.png')
    face.save(f'{D}/webp/{which}-face.webp', quality=90)
    faces.append(tile(face, which, 768))
    row = Image.new('RGB', (512 * len(tiles), 512), 'white')
    for i, t in enumerate(tiles): row.paste(t, (512 * i, 0))
    rows.append(row)
    pair = Image.new('RGB', (2048, 1024), 'white')
    pair.paste(ref.resize((1024, 1024), Image.LANCZOS), (0, 0))
    pair.paste(flat(f'{R}/{which}-front.png').resize((1024, 1024), Image.LANCZOS), (1024, 0))
    pair.save(f'{D}/pair-{which}.webp', quality=90)
    if which == 'base':                    # the reference's head region beside the close-up render
        head = Image.open(refp).convert('RGB').crop((272, 40, 982, 750)).resize((768, 768), Image.LANCZOS)
        fp = Image.new('RGB', (1536, 768), 'white'); fp.paste(head, (0, 0)); fp.paste(face.resize((768, 768)), (768, 0))
        fp.save(f'{D}/face.webp', quality=90)
sheet = Image.new('RGB', (rows[0].width, 512 * len(rows)), 'white')
for i, r in enumerate(rows): sheet.paste(r, (0, 512 * i))
sheet.save(f'{D}/sheet.webp', quality=88)
strip = Image.new('RGB', (768 * len(faces), 768), 'white')
for i, f in enumerate(faces): strip.paste(f, (768 * i, 0))
strip.save(f'{D}/faces.webp', quality=90)
print('SHEETS', D)
