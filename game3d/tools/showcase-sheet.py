#!/usr/bin/env python3
"""Overview sheet for the texture-avenues showcase: the same view of every look side by side, labelled.
  python3 game3d/tools/showcase-sheet.py <shots dir> <out.jpg> [view=desk|close|phone]
"""
import sys
from PIL import Image, ImageDraw, ImageFont

LOOKS = [(0, 'Today'), (2, '2 Procedural'), (3, '3 Decals'), (4, '4 Vertex colour'), (7, '7 Trim sheet'), (8, '8 Modelled detail')]
BG, FG = (16, 19, 27), (236, 238, 243)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', 26)

src, out = sys.argv[1], sys.argv[2]
view = sys.argv[3] if len(sys.argv) > 3 else 'desk'
ims = [Image.open(f'{src}/look{n}-{view}.jpg').convert('RGB') for n, _ in LOOKS]
cols = 3 if view != 'phone' else 6
W = 900 if view != 'phone' else 390
ims = [im.resize((W, round(im.height * W / im.width)), Image.LANCZOS) for im in ims]
H, pad, lab = ims[0].height, 12, 44
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols + 1) * pad, rows * (H + lab) + (rows + 1) * pad), BG)
d = ImageDraw.Draw(sheet)
for i, (im, (_, name)) in enumerate(zip(ims, LOOKS)):
    x, y = pad + (i % cols) * (W + pad), pad + (i // cols) * (H + lab + pad)
    d.text((x + 4, y + 8), name, font=FONT, fill=FG)
    sheet.paste(im, (x, y + lab))
sheet.save(out, quality=88)
