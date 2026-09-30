# Contact sheet: rows of images with a label over each, for comparing renders.
#   ~/ai/flat-venv/bin/python tools/creator/blender/sheet.py out.webp "row label" a.png b.png -- "row 2" c.png d.png
# Each row is a label then image paths; rows are separated by "--". Images are scaled to one height.
import sys

from PIL import Image, ImageDraw

out, rest = sys.argv[1], sys.argv[2:]
rows, cur = [], []
for a in rest:
    if a == '--':
        rows.append(cur)
        cur = []
    else:
        cur.append(a)
if cur:
    rows.append(cur)
H = int(__import__('os').environ.get('SHEET_H', 360))
pad, top = 6, 18
built = []
for row in rows:
    label, paths = row[0], row[1:]
    ims = []
    for p in paths:
        im = Image.open(p)
        if im.mode in ('RGBA', 'LA', 'P'):   # transparent parts over grey
            im = im.convert('RGBA')
            bg = Image.new('RGBA', im.size, '#8a939c')
            bg.alpha_composite(im)
            im = bg
        im = im.convert('RGB')
        ims.append((p.rsplit('/', 1)[-1].rsplit('.', 1)[0], im.resize((round(im.width * H / im.height), H))))
    w = sum(i.width for _, i in ims) + pad * (len(ims) + 1)
    canvas = Image.new('RGB', (max(w, 400), H + top * 2 + pad), '#f4f6f8')
    d = ImageDraw.Draw(canvas)
    d.text((pad, 2), label, fill='#1a2733')
    x = pad
    for name, im in ims:
        canvas.paste(im, (x, top * 2))
        d.text((x, top), name, fill='#44576a')
        x += im.width + pad
    built.append(canvas)
W = max(c.width for c in built)
sheet = Image.new('RGB', (W, sum(c.height for c in built)), '#f4f6f8')
y = 0
for c in built:
    sheet.paste(c, (0, y))
    y += c.height
sheet.save(out, quality=88)
print(out, sheet.size)
