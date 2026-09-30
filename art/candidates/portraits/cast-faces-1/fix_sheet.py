"""cast-faces-1: the patch fixes, the picked base's patch first, then every attempt in order. Run: ~/ai/rmbg/rembg/bin/python fix_sheet.py"""
import os
from PIL import Image, ImageDraw, ImageFont
from gen import RAW, FIXES, BASE
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 16)
ROWS = [('guard-plate', 'd75', [1, 2, 3]), ('guard-patch', 'd75', [1, 2, 3]), ('guard-collar', 'd75', [1, 2]),
        ('aoi-patch', 'd75', [1, 2, 3]), ('aoi-patch', 'd90', [1, 2, 3])]
T = 300
s = Image.new('RGB', (T * 4, (T + 26) * len(ROWS)), (30, 30, 30))
d = ImageDraw.Draw(s)
for r, (fx, dn, seeds) in enumerate(ROWS):
    who, box, crop, _ = FIXES[fx]
    y = r * (T + 26)
    tiles = [('base ' + who, BASE[who]['src'])] + [(f'fix-{fx}-{dn}-{sd}', os.path.join(RAW, f'fix-{fx}-{dn}-{sd}.png')) for sd in seeds]
    for c, (lab, p) in enumerate(tiles):
        s.paste(Image.open(p).convert('RGB').crop(crop).resize((T, T)), (c * T, y + 26))
        d.text((c * T + 6, y + 4), lab, fill=(235, 235, 235), font=FONT)
s.save(os.path.join(HERE, 'fix-sheet.webp'), 'WEBP', quality=88)
