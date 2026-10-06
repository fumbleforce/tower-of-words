"""Heads from the front at one scale (facepaint.front, 4000 px per metre): the cast (Kenji, Kuro, Aoi, Emi) beside the
takes given, for checking a face pass against the bar.
  python3 art/candidates/crowd-pilot-3/compare.py <out.png> <label>=<front.png> ...
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import facepaint as F
C = '/home/jorgen/repo/japanese/game3d/assets/characters'
CACHE = '/home/jorgen/repo/japanese/art/parts/crowd-pilot-3/cast-front'


def cast(n):
    p = f'{CACHE}/{n}.png'
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        Image.fromarray(F.front(f'{C}/{n}/walk.glb', f'{C}/{n}/base.webp')[0]).save(p)
    return p


out, *pairs = sys.argv[1:]
cells = [(n.capitalize(), cast(n)) for n in ('kenji', 'kuro', 'aoi', 'emi')] + [p.split('=', 1) for p in pairs]
cw, ch = 480, 500
cols = min(len(cells), 4)
rows = (len(cells) + cols - 1) // cols
sheet = Image.new('RGB', (cw * cols, (ch + 30) * rows), (236, 238, 241))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20)
except OSError:
    font = ImageFont.load_default()
for i, (lab, p) in enumerate(cells):
    x, y = (i % cols) * cw, (i // cols) * (ch + 30)
    sheet.paste(Image.open(p).convert('RGB').crop((0, 0, 1920, 2000)).resize((cw, ch), Image.LANCZOS), (x, y + 30))
    d.text((x + 8, y + 5), lab, fill=(20, 20, 20), font=font)
sheet.save(out)
print(out)
