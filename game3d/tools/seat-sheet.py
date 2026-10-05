#!/usr/bin/env python3
"""Contact sheet for seat-check.mjs: every seat still with who sits there and how deep the body goes into the
furniture round it (the seat's own cushion doesn't count).
  python3 game3d/tools/seat-sheet.py <seat-check out dir>     -> <dir>/sheet.webp
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BG, FG, OK, BAD = (16, 19, 27), (236, 238, 243), (120, 200, 150), (240, 110, 110)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf', 20)
SMALL = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 16)

src = Path(sys.argv[1])
log = json.loads((src / 'log.json').read_text())


def result(scene, tag):
    """The measurement for a still: <who>-placed, or <seat>-<who>."""
    r = log.get(scene) or {}
    if tag.endswith('-placed'):
        who = tag[: -len('-placed')]
        return next((p for p in r.get('placed', []) if p['id'] == who), None)
    seat, who = tag.rsplit('-', 1)
    return next((t for t in r.get('tried', []) if t['seat'] == seat and t['id'] == who), None)


files = sorted(src.glob('*--*.jpg'))
if not files:
    sys.exit('no stills')
W = 520
cells = []
for f in files:
    scene, tag = f.stem.split('--', 1)
    im = Image.open(f).convert('RGB')
    # the middle of the frame, where the close shot puts the seat
    w, h = im.size
    cw, ch = min(w, round(h * 1.25)), h
    im = im.crop(((w - cw) // 2, 0, (w + cw) // 2, ch)).resize((W, round(ch * W / cw)), Image.LANCZOS)
    m = result(scene, tag)
    over = m and m['over']
    line2 = 'no measurement' if not m else (
        f"into {over[0]['what'].split(' @')[0]} {over[0]['depth'] * 100:.1f} cm" if over else 'clear of desk/table'
    )
    cells.append((im, f'{scene} · {tag}', line2, BAD if (not m or over) else OK))
cols = 4
H, pad, lab = cells[0][0].height, 10, 52
rows = (len(cells) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W + (cols + 1) * pad, rows * (H + lab) + (rows + 1) * pad), BG)
d = ImageDraw.Draw(sheet)
for i, (im, t1, t2, col) in enumerate(cells):
    x, y = pad + (i % cols) * (W + pad), pad + (i // cols) * (H + lab + pad)
    d.text((x + 4, y + 4), t1, font=FONT, fill=FG)
    d.text((x + 4, y + 28), t2, font=SMALL, fill=col)
    sheet.paste(im.resize((W, H)), (x, y + lab))
sheet.save(src / 'sheet.webp', quality=84)
print('sheet', src / 'sheet.webp')
