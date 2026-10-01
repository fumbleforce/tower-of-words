"""Side-by-side sheet of every attempt of mio-ref-clean, in order: full figures (original, each step, final, cut-out),
then the hoodie front for every step-03 attempt and the eyes for every step-04 attempt at full resolution.
~/ai/consist/.venv/bin/python sheet.py  -> sheet.webp (main checkout folder) and the per-image webps the Showcase entry uses."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = '/home/jorgen/repo/japanese/art/parts/style-concepts/mio-ref-clean'
SRC = '/home/jorgen/repo/japanese/art/parts/style-concepts/claude-facetface/gen/i2i-cf04/mio-front-d60.png'
SHOW = '/home/jorgen/repo/japanese/bible/shots/showcase/mio-ref-clean'
FONT = ImageFont.truetype('/usr/share/fonts/noto/NotoSans-Regular.ttf', 30)
W = 768


def load(name):
    im = Image.open(SRC if name == 'original' else f'{OUT}/{name}.png')
    if im.mode == 'RGBA':                       # cut-out on a checker so the see-through parts show
        bg = Image.new('RGBA', im.size)
        d = ImageDraw.Draw(bg)
        for y in range(0, im.size[1], 96):
            for x in range(0, im.size[0], 96):
                d.rectangle((x, y, x + 95, y + 95), fill=(200, 200, 200, 255) if (x + y) // 96 % 2 else (240, 240, 240, 255))
        bg.alpha_composite(im)
        im = bg
    im = im.convert('RGB')
    return im.resize((3072, 3072), Image.LANCZOS) if im.size[0] == 1024 else im


def row(items, box, h):
    """items: (image name, label). Crops `box` from the 3072 canvas, scales to width W, labels under each."""
    x0, y0, x1, y1 = box
    ph = int(W * (y1 - y0) / (x1 - x0))
    r = Image.new('RGB', (W * len(items), ph + 50), (250, 250, 250))
    d = ImageDraw.Draw(r)
    for i, (name, label) in enumerate(items):
        r.paste(load(name).crop(box).resize((W, ph), Image.LANCZOS), (i * W, 0))
        d.text((i * W + 12, ph + 8), label, fill=(20, 20, 20), font=FONT)
    return r


full = [('original', 'original 1024 (char-face-1 pick)'), ('step-01-upscale', '01 upscale 3072'), ('step-02-no-shadow', '02 no shadow'),
        ('step-03-no-strings', '03 no strings (= 03e)'), ('step-04-no-glasses', '04 no glasses (= 04d)'), ('final', 'final'),
        ('final-cutout', 'final cut-out')]
strings = [('step-02-no-shadow', 'before (02)'), ('step-03a-no-strings-s301', '03a seed 301 d0.95 (rejected)'),
           ('step-03b-no-strings-s302', '03b seed 302 d0.95 (rejected)'), ('step-03c-no-strings-rowfill', '03c CPU fill (start for d, e)'),
           ('step-03d-no-strings-refine-d50', '03d 03c + d0.50'), ('step-03e-no-strings-refine-d65', '03e 03c + d0.65 (used)')]
glasses = [('step-03-no-strings', 'before (03)'), ('step-04a-no-glasses-d70', '04a d0.70 (rejected)'), ('step-04b-no-glasses-d85', '04b d0.85 (rejected)'),
           ('step-04c-no-glasses-cvfill', '04c CPU fill (start for d, e)'), ('step-04d-no-glasses-refine-d45', '04d 04c + d0.45 (used)'),
           ('step-04e-no-glasses-refine-d60', '04e 04c + d0.60')]

rows = [row(full, (0, 0, 3072, 3072), W), row(strings, (1300, 780, 1800, 1480), W), row(glasses, (1270, 440, 1830, 760), W)]
sheet = Image.new('RGB', (max(r.size[0] for r in rows), sum(r.size[1] for r in rows)), (250, 250, 250))
y = 0
for r in rows:
    sheet.paste(r, (0, y))
    y += r.size[1]
sheet.save(f'{OUT}/sheet.webp', quality=90)

# webps for the Showcase entry (synced copies; the PNGs stay in OUT)
os.makedirs(SHOW, exist_ok=True)
sheet.save(f'{SHOW}/sheet.webp', quality=90)
for name in ['final', 'final-cutout']:
    Image.open(f'{OUT}/{name}.png').save(f'{SHOW}/{name}.webp', quality=92, method=6)
for name, label in full[1:5]:
    load(name).resize((1536, 1536), Image.LANCZOS).save(f'{SHOW}/{name}.webp', quality=90)
print(sheet.size)
