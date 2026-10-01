"""aoi-edge-2: find the cream rim along Aoi's left side (image right) on the cast-faces-1 source canvas (960x1216).

The rim is painted into the render: a flat cream band (about 249, 220, 195), fully opaque, just inside the black outer
outline, on the top of her hair, down her hair on her left (image right), and on the shoulder and sleeve. Her skin is a
similar light colour but has green about equal to blue; the cream has green 15 to 35 over blue.

band(): the cream pixels within 45 px of the cut-out edge that belong to a connected run touching the edge (inside 14 px),
so the neck, the white top and the lanyard card stay out. Also the ID card and stripes on the cuffs are far from the edge
or below Y1. outline(): the dark outer contour (dark pixels within 8 px of the edge).

Run as a script to write band.png, outline.png and an overlay for checking:
~/ai/consist/.venv/bin/python band.py"""
import os
import numpy as np, cv2
from PIL import Image

RAW = '/home/jorgen/repo/japanese/art/production/PC/cast-faces-1'
OUT = '/home/jorgen/repo/japanese/art/production/PC/aoi-edge-2'
SRC = os.path.join(RAW, 'base-aoi.png')          # the render with the patch fix, light grey background
CUT = os.path.join(RAW, 'aoi-refined.png')       # its cut-out (alpha), same canvas
Y1 = 1080          # the cuff stripes below are real white


def load():
    rgb = np.array(Image.open(SRC).convert('RGB')).astype(np.int32)
    a = np.array(Image.open(CUT).convert('RGBA'))[..., 3]
    return rgb, a


def edge_dist(a):
    inside = (a >= 128).astype(np.uint8)
    return cv2.distanceTransform(inside, cv2.DIST_L2, 5)


def band(rgb, a):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = edge_dist(a)
    cream = (r > 215) & (g > 185) & (b > 150) & ((g - b) >= 12) & ((r - g) < 45) & (a > 0) & (d < 45)
    cream[Y1:] = False
    n, lab = cv2.connectedComponents(cream.astype(np.uint8), connectivity=8)
    near = np.unique(lab[cream & (d < 14)])
    keep = np.isin(lab, near[near > 0])
    # close small gaps (anti-aliased line crossings inside the band)
    keep = cv2.morphologyEx(keep.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0
    return keep & (a > 0)


def outline(rgb, a):
    lum = (rgb[..., 0] * 299 + rgb[..., 1] * 587 + rgb[..., 2] * 114) // 1000
    return (edge_dist(a) < 8) & (lum < 50) & (a > 0)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    rgb, a = load()
    m, o = band(rgb, a), outline(rgb, a)
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(OUT, 'band.png'))
    Image.fromarray((o * 255).astype(np.uint8)).save(os.path.join(OUT, 'outline.png'))
    ov = rgb.copy().astype(np.uint8)
    ov[m] = (0, 200, 255)
    ov[o & ~m] = (255, 0, 0)
    Image.fromarray(ov).save(os.path.join(OUT, 'band-overlay.png'))
    print('band px', int(m.sum()))
