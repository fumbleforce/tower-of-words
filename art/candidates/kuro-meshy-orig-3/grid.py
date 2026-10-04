"""Measuring aid: crop a figure to its bounding box (non-white or non-transparent pixels) and draw a numbered row
grid every 10 px, so the crown, chin and soles can be read off by eye for measure.json.

  python3 art/candidates/kuro-meshy-orig-3/grid.py <in.png> <out.png>
"""
import sys
import numpy as np
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, 'white'); bg.alpha_composite(im)
a = np.asarray(bg.convert('RGB')).astype(int)
fg = (a.min(axis=2) < 225)
ys, xs = np.where(fg)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
print(src, 'figure rows', y0, y1, 'cols', x0, x1)
crop = bg.convert('RGB').crop((x0 - 60, y0 - 10, x1 + 10, y1 + 10))
d = ImageDraw.Draw(crop)
for y in range((y0 // 10) * 10, y1 + 10, 10):
    yy = y - (y0 - 10)
    d.line((50, yy, crop.width, yy), fill=(255, 0, 0) if y % 50 == 0 else (255, 180, 180), width=1)
    if y % 50 == 0:
        d.text((2, yy - 6), str(y), fill=(255, 0, 0))
crop.save(out)
