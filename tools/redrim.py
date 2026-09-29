"""Red rim check for portraits on a plain background: counts reddish pixels in a thin band along the figure's outline.
The figure mask is everything that differs from the corner background colour. Prints the share of band pixels that are red.
Usage: ~/ai/sd/venv/bin/python tools/redrim.py <image> [...]"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage


def red_rim(path, band=5):
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    h, w, _ = im.shape
    corners = np.concatenate([im[:20, :20].reshape(-1, 3), im[:20, -20:].reshape(-1, 3)])
    bg = np.median(corners, 0)
    fg = np.abs(im - bg).sum(-1) > 45
    fg = ndimage.binary_opening(fg, iterations=2)
    lab, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        fg = lab == (int(np.argmax(sizes)) + 1)
    fg = ndimage.binary_fill_holes(fg)
    ring = fg & ~ndimage.binary_erosion(fg, iterations=band)
    ring[int(h * 0.97):] = False  # the bottom crop edge is not an outline
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    red = (r > 90) & (r - g > 45) & (r - b > 45)
    return red[ring].mean() if ring.any() else 0.0


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(f'{red_rim(p) * 100:5.2f}%  {p}')
