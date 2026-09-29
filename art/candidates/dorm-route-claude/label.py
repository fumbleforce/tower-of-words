"""Label the top-down render of the dorm-route diorama: the walk as a line, the places along it, a 10 m scale bar.
   python3 art/candidates/dorm-route-claude/label.py <layout.png> <layout.anchors.json> <out.png>
Positions come from the diorama's own plan (scene/diorama.js, window.__anchors), so labels sit on the render."""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

src, anchors, out = sys.argv[1:4]
im = Image.open(src).convert("RGB")
A = json.load(open(anchors))
k = im.width / (A.get("w") or im.width)  # anchors are in CSS px; the png may be at a higher pixel ratio
k = A.get("dpr", 1)
d = ImageDraw.Draw(im, "RGBA")
F = "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"
f = ImageFont.truetype(F, int(17 * k), index=0)
fb = ImageFont.truetype(F, int(20 * k), index=0)
INK, PAPER, ROUTE = (24, 28, 36, 255), (246, 246, 242, 235), (0, 168, 150, 255)


def P(key):
    x, y = A[key]
    return x * k, y * k


# the walk
pts = [(x * k, y * k) for x, y in A["route"]]
for a, b in zip(pts, pts[1:]):
    d.line([a, b], fill=(255, 255, 255, 200), width=int(11 * k))
for a, b in zip(pts, pts[1:]):
    d.line([a, b], fill=ROUTE, width=int(6 * k))
for x, y in (pts[0], pts[-1]):
    r = 9 * k
    d.ellipse([x - r, y - r, x + r, y + r], fill=ROUTE, outline=(255, 255, 255, 255), width=int(3 * k))


def label(key, text, dx, dy, bold=False, dot=True):
    x, y = P(key)
    font = fb if bold else f
    lines = text.split("\n")
    w = max(d.textlength(t, font=font) for t in lines)
    lh = font.size * 1.25
    h = lh * len(lines)
    bx, by = x + dx * k, y + dy * k
    if dot:
        d.line([(x, y), (bx + w / 2, by + h / 2)], fill=(24, 28, 36, 170), width=int(2 * k))
        r = 4 * k
        d.ellipse([x - r, y - r, x + r, y + r], fill=INK)
    pad = 6 * k
    d.rounded_rectangle([bx - pad, by - pad, bx + w + pad, by + h + pad * 0.6], radius=6 * k, fill=PAPER, outline=(24, 28, 36, 90))
    for i, t in enumerate(lines):
        d.text((bx, by + i * lh), t, font=font, fill=INK)


label("hqDoor", "1  Head office doors (本社)\nIT is on B2 below", -280, -95, bold=True)
label("station", "Honsha station\n(covered link, west)", 0, -95, dot=False)
label("racks", "2  Bike racks (駐輪場)", -60, 40)
label("arcade", "Covered shopping street\n(both rows, as on island-03)", -120, -110)
label("fountain", "Fountain square", -60, -70, dot=False)
label("promenade", "3  Promenade along the sea", -120, 38)
label("konbini", "4  Konbini (コンビニ)\nshop front onto the promenade", 40, 50)
label("izakaya", "Izakaya", -30, -60)
label("laundry", "5  Coin laundry", -120, 60)
label("sento", "6  Sento (銭湯)", 30, 55)
label("dormDoor", "7  Dorm entrance (寮)", -250, -40, bold=True)
label("shelter", "Dorm bike shelter", -150, 22)
label("room", "Eric's room (block A, ground floor, back).\nIts window faces block B's bare\nconcrete wall, 2 m away", -300, -215)
label("blockA", "Dorm block A", 20, 40, dot=False)
label("beach", "Beach", -30, -20, dot=False)

# scale bar: 10 m is 6.67 units
u = A["unitPx"] * k
x0, y0 = 30 * k, im.height - 40 * k
d.rectangle([x0 - 8 * k, y0 - 30 * k, x0 + u * 6.67 + 90 * k, y0 + 16 * k], fill=PAPER)
d.line([(x0, y0), (x0 + u * 6.67, y0)], fill=INK, width=int(4 * k))
for x in (x0, x0 + u * 6.67):
    d.line([(x, y0 - 8 * k), (x, y0 + 8 * k)], fill=INK, width=int(3 * k))
d.text((x0, y0 - 28 * k), "10 m", font=f, fill=INK)
d.text((x0 + u * 6.67 + 12 * k, y0 - 12 * k), "N up", font=f, fill=INK)
im.save(out)
print(out, im.size)
