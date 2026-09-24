"""Find see-through holes inside cutout sprites, and optionally fill them.
A hole = pixels inside the filled silhouette (largest component) whose alpha is well below opaque.
Usage: python3 tools/alpha_holes.py check <files...>
       python3 tools/alpha_holes.py fill <in.png> <out.png>   (alpha = max(alpha, filled silhouette eroded by 3px))"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

def silhouette(a):
    solid = a > 128
    lab, n = ndimage.label(solid)
    if n == 0:
        return solid
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    main = lab == (np.argmax(sizes) + 1)
    return ndimage.binary_fill_holes(main)

def check(path):
    a = np.array(Image.open(path).convert('RGBA'))[:, :, 3]
    sil = silhouette(a)
    inner = ndimage.binary_erosion(sil, iterations=4)  # ignore the soft outer edge
    holes = inner & (a < 200)
    lab, n = ndimage.label(holes)
    big = [s for s in ndimage.sum(holes, lab, range(1, n + 1))] if n else []
    return int(holes.sum()), int(sum(1 for s in big if s > 40)), 100 * holes.sum() / max(1, inner.sum())

def fill(src, dst):
    im = np.array(Image.open(src).convert('RGBA'))
    a = im[:, :, 3]
    sil = ndimage.binary_erosion(silhouette(a), iterations=3)
    im[:, :, 3] = np.maximum(a, (sil * 255).astype(np.uint8))
    Image.fromarray(im).save(dst)

if __name__ == '__main__':
    if sys.argv[1] == 'check':
        for f in sys.argv[2:]:
            px, blobs, pct = check(f)
            print(f'{"HOLES" if blobs else "ok   "} {f.split("/")[-1]:32} holes_px={px:6d} blobs>40px={blobs:3d} {pct:.2f}%')
    else:
        fill(sys.argv[2], sys.argv[3])
