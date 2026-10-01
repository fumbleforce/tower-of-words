# char-mio-i2i: the target picture Jørgen picked (char-face-1, gen-i2i mio-front-d60) as a modelling reference.
# Cuts the figure out (mask without the cast shadow), measures its width row by row in metres at the target's own
# camera (mio_i2i_cam), and writes ref/mask.png, ref/rows.json and ref/target-cut.png (figure on transparent).
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_ref.py
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

import mio_i2i_cam as C

OUT = os.path.join(C.OUT, 'ref')


def mask(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    # the background: a smooth light grey; per row, the median of the left margin (the shadow is on the right)
    bg = np.median(a[:, :250], axis=1, keepdims=True)
    d = np.abs(a - bg).max(axis=2)
    m = d > 16
    yy, xx = np.mgrid[:h, :w]
    m &= ~((xx > 592) & (yy > 820))  # the cast shadow, image right of her feet
    blue = (a[..., 2] > a[..., 0] + 18) & (a.mean(axis=2) < 205)
    m &= ~((xx > 560) & (yy > 860) & blue)  # where the shadow touches her left shoe (image right)
    m = ndimage.binary_closing(m, iterations=2)
    # fill the holes inside the figure, except big ones that are plain background (the gap between her legs)
    holes, n = ndimage.label(ndimage.binary_fill_holes(m) & ~m)
    for i in range(1, n + 1):
        hm = holes == i
        if hm.sum() < 60 or (d[hm] < 8).mean() < 0.8:
            m |= hm
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = 1 + int(np.argmax(sizes))
    m = lab == keep
    return m


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(C.TARGET).convert('RGB')
    m = mask(im)
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(OUT, 'mask.png'))
    rgba = np.dstack([np.asarray(im), (m * 255).astype(np.uint8)])
    Image.fromarray(rgba).save(os.path.join(OUT, 'target-cut.png'))
    rows = {}
    for v in range(0, 1024, 4):
        xs = np.nonzero(m[v])[0]
        if len(xs) == 0:
            continue
        # runs of figure pixels in the row (legs, arms and body are separate runs)
        runs = []
        start = xs[0]
        for a, b in zip(xs, xs[1:]):
            if b != a + 1:
                runs.append((int(start), int(a)))
                start = b
        runs.append((int(start), int(xs[-1])))
        z = C.unproject_z(v)
        rows[v] = dict(z=round(z, 4), runs=[[round(C.unproject_x(u0, z), 4), round(C.unproject_x(u1, z), 4)]
                                            for u0, u1 in runs], px=runs)
    json.dump(rows, open(os.path.join(OUT, 'rows.json'), 'w'), indent=0)
    ys = np.nonzero(m.any(axis=1))[0]
    print('figure rows', ys.min(), ys.max(), 'top z', C.unproject_z(ys.min()), 'bottom z', C.unproject_z(ys.max()))


if __name__ == '__main__':
    main()
