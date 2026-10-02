"""Sheets for reviews/chibi-manual-1: each render flattened onto white, then per set (base, office) one row with
Jørgen's reference picture first and the front, her left three-quarter, her left side and back after it.

  python3 tools/characters/chibi/sheet.py <attempt dir with renders/> <ref base.png> <ref office.png>

Writes <dir>/sheet.webp (both rows), <dir>/pair-base.webp and <dir>/pair-office.webp (reference | front, same
height), <dir>/face.webp (reference face | render face) and every render as webp under <dir>/webp/.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

D, REF = sys.argv[1], {'base': sys.argv[2], 'office': sys.argv[3]}
R = f'{D}/renders'
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


def tile(im, label, s=512):
    im = im.resize((s, s), Image.LANCZOS)
    ImageDraw.Draw(im).text((14, 10), label, fill=(90, 90, 90), font=FONT)
    return im


rows = []
for which in ('base', 'office'):
    if not os.path.exists(f'{R}/{which}-front.png'):      # a01 was only rendered dressed
        continue
    ref = Image.open(REF[which]).convert('RGB')
    tiles = [tile(ref, 'reference')]
    for v, label in VIEWS:
        im = flat(f'{R}/{which}-{v}.png')
        im.save(f'{D}/webp/{which}-{v}.webp', quality=90)
        tiles.append(tile(im, label))
    face = flat(f'{R}/{which}-face.png')
    face.save(f'{D}/webp/{which}-face.webp', quality=90)
    row = Image.new('RGB', (512 * len(tiles), 512), 'white')
    for i, t in enumerate(tiles): row.paste(t, (512 * i, 0))
    rows.append(row)
    pair = Image.new('RGB', (2048, 1024), 'white')
    pair.paste(ref.resize((1024, 1024), Image.LANCZOS), (0, 0))
    pair.paste(flat(f'{R}/{which}-front.png').resize((1024, 1024), Image.LANCZOS), (1024, 0))
    pair.save(f'{D}/pair-{which}.webp', quality=90)
sheet = Image.new('RGB', (rows[0].width, 512 * len(rows)), 'white')
for i, r in enumerate(rows): sheet.paste(r, (0, 512 * i))
sheet.save(f'{D}/sheet.webp', quality=88)

# faces: the reference's head region beside the close-up render
if not os.path.exists(f'{R}/base-face.png'):
    sys.exit(print('SHEETS', D, '(no base face)'))
ref = Image.open(REF['base']).convert('RGB').crop((272, 40, 982, 750)).resize((768, 768), Image.LANCZOS)
f = flat(f'{R}/base-face.png').resize((768, 768), Image.LANCZOS)
pair = Image.new('RGB', (1536, 768), 'white'); pair.paste(ref, (0, 0)); pair.paste(f, (768, 0))
pair.save(f'{D}/face.webp', quality=90)
print('SHEETS', D)
