"""Stack sheets (sheet.py's one-row sheets) top to bottom into one, left aligned, so a long strip reads in rows.
  python3 art/candidates/crowd-pilot-2/stack.py <out.webp> <sheet> [<sheet> ...]
"""
import sys
from PIL import Image

out, parts = sys.argv[1], [Image.open(p).convert('RGB') for p in sys.argv[2:]]
W = max(p.width for p in parts)
im = Image.new('RGB', (W, sum(p.height for p in parts)), (236, 238, 241))
y = 0
for p in parts:
    im.paste(p, (0, y))
    y += p.height
im.save(out, quality=90)
print(out, im.size)
