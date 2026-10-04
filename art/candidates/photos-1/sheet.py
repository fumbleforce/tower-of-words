"""Contact sheet for round photos-1: one row per find, the current in-game drawing first, then every attempt in the
order made (prompts.json), each labelled with its id. Also saves the current drawings as webp for the review.
Usage: ~/ai/sd/venv/bin/python art/candidates/photos-1/sheet.py
Reads art/production/photos-1/current/<print>.png (capture-current.mjs). Writes sheet.webp and current-<print>.webp here."""
import json, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
CUR = os.path.join(ROOT, 'art', 'production', 'photos-1', 'current')
SHOTS = [('monorail', 'Early train'), ('cherry', 'Spring garden'), ('pigeons', 'At the fountain'),
         ('cat', 'Office company'), ('fireworks', 'Summer night')]
TW, TH, LAB = 480, 360, 30

log = json.load(open(os.path.join(HERE, 'prompts.json')))
font = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 20) if os.path.exists(
    '/usr/share/fonts/TTF/DejaVuSans.ttf') else ImageFont.load_default()
rows = []
for shot, title in SHOTS:
    cur = Image.open(os.path.join(CUR, shot + '.png')).convert('RGB')
    cur.save(os.path.join(HERE, f'current-{shot}.webp'), quality=90)
    cells = [(f'NOW: {title} (current drawing)', cur)]
    cells += [(e['id'], Image.open(os.path.join(HERE, e['id'] + '.webp'))) for e in log if e['shot'] == shot]
    rows.append(cells)
cols = max(len(r) for r in rows)
sheet = Image.new('RGB', (cols * (TW + 8) + 8, len(rows) * (TH + LAB + 8) + 8), (34, 36, 40))
d = ImageDraw.Draw(sheet)
for ri, cells in enumerate(rows):
    for ci, (label, im) in enumerate(cells):
        x, y = 8 + ci * (TW + 8), 8 + ri * (TH + LAB + 8)
        sheet.paste(im.convert('RGB').resize((TW, TH), Image.LANCZOS), (x, y + LAB))
        d.text((x + 4, y + 4), label, fill=(240, 240, 240), font=font)
sheet.save(os.path.join(HERE, 'sheet.webp'), quality=85)
print(sheet.size)
