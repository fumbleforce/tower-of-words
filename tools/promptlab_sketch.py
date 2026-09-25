"""Quick 2D composition guides for the prompt lab (no Blender): a flat depth map and a line sketch of the reference layout
(horizon at 42%, a curving elevated beam on pillars from the lower left to an island skyline on the right, a train on the beam).
Writes tools/promptlab_guides/bay-{depth,lines}.png at 1216x832. Near = bright in the depth map; lines are black on white."""
import os, math
from PIL import Image, ImageDraw, ImageFilter
W, H = 1216, 832
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'promptlab_guides')
HZ = int(H * 0.42)


def beam_pts(n=60):
    # quadratic curve from lower-left (off-frame) to the island shore on the right
    p0, p1, p2 = (-60, H * 0.86), (W * 0.72, H * 0.74), (W * 0.86, HZ + 8)
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        pts.append((x, y, 1 - t))  # 1 = near
    return pts


def draw(depth=True):
    im = Image.new('L', (W, H), 0 if depth else 255)
    d = ImageDraw.Draw(im)
    ink = 0
    if depth:
        for y in range(HZ, H):  # sea: far = dark, near = brighter
            d.line([(0, y), (W, y)], fill=int(25 + 110 * (y - HZ) / (H - HZ)))
    else:
        d.line([(0, HZ), (W, HZ)], fill=ink, width=2)
    # island and towers on the right half of the horizon
    isl = [(W * 0.42, HZ + 4), (W * 0.48, HZ - 6), (W * 1.0, HZ - 8), (W, HZ + 10), (W * 0.42, HZ + 10)]
    towers = [(0.47, 0.20, 0.03), (0.52, 0.30, 0.025), (0.56, 0.12, 0.035), (0.61, 0.24, 0.03), (0.66, 0.08, 0.03), (0.70, 0.18, 0.028),
              (0.75, 0.27, 0.03), (0.80, 0.16, 0.035), (0.85, 0.26, 0.025), (0.90, 0.22, 0.03), (0.95, 0.30, 0.025)]
    if depth:
        d.polygon(isl, fill=45)
        for x, top, w in towers:
            d.rectangle([W * x, H * top, W * (x + w), HZ], fill=40 + int(10 * x))
    else:
        d.line(isl + [isl[0]], fill=ink, width=2)
        for x, top, w in towers:
            d.rectangle([W * x, H * top, W * (x + w), HZ], outline=ink, width=2)
    # pillars every few points, then the beam on top
    pts = beam_pts()
    for i in range(3, len(pts) - 2, 7):
        x, y, nr = pts[i]
        pw = 8 + 40 * nr ** 1.5
        foot = y + (H - y) * 0.0 + 30 + 260 * nr ** 1.3  # pillar down to the water line under the beam
        foot = min(foot, H + 50)
        if depth:
            d.rectangle([x - pw / 2, y, x + pw / 2, foot], fill=int(60 + 150 * nr))
        else:
            d.rectangle([x - pw / 2, y, x + pw / 2, foot], outline=ink, width=2)
    for (x0, y0, n0), (x1, y1, n1) in zip(pts, pts[1:]):
        th = 6 + 60 * n0 ** 1.4
        poly = [(x0, y0 - th * 0.5), (x1, y1 - th * 0.5), (x1, y1 + th * 0.5), (x0, y0 + th * 0.5)]
        if depth:
            d.polygon(poly, fill=int(70 + 170 * n0))
        else:
            d.line([(x0, y0 - th * 0.5), (x1, y1 - th * 0.5)], fill=ink, width=2)
            d.line([(x0, y0 + th * 0.5), (x1, y1 + th * 0.5)], fill=ink, width=2)
    # a short train of four cars on the beam, lower left
    for i in range(10, 28, 4):
        x0, y0, n0 = pts[i]
        x1, y1, n1 = pts[i + 4 if i + 4 < 28 else 27]
        hgt = 20 + 75 * n0 ** 1.3
        poly = [(x0, y0 - 0.5 * (6 + 60 * n0 ** 1.4) - hgt), (x1, y1 - 0.5 * (6 + 60 * n1 ** 1.4) - hgt * 0.95),
                (x1, y1 - 0.5 * (6 + 60 * n1 ** 1.4)), (x0, y0 - 0.5 * (6 + 60 * n0 ** 1.4))]
        if depth:
            d.polygon(poly, fill=int(80 + 170 * n0))
        else:
            d.polygon(poly, outline=ink, width=2)
    if depth:
        im = im.filter(ImageFilter.GaussianBlur(2))
    return im.convert('RGB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    draw(True).save(os.path.join(OUT, 'bay-depth.png'))
    draw(False).save(os.path.join(OUT, 'bay-lines.png'))
