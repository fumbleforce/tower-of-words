"""Refine a model cut-out of a portrait on a plain background (runs in ~/ai/rmbg/rembg, which has pymatting and scipy).

The cast portraits sit on a plain, softly graded grey background, so the background colour is known almost everywhere.
Steps:
1. Background colour field: average the source pixels the model marked as background (alpha < 0.05), spread into the
   figure by normalised convolution (a wide blur of colour*weight divided by a blur of weight).
2. Trimap from the model's alpha: definite foreground = alpha > 0.95 eroded by ERODE px; definite background =
   alpha < 0.05; the rest is unknown. Near the outline (within BAND px of the model's edge), pixels whose colour is
   within KEY of the local background colour, and that the model isn't sure of (alpha < 0.97), are also set to definite
   background. That opens the gaps between hair
   strands and inside the bun that the models fill in.
3. Closed-form matting (pymatting) on that trimap, then multilevel foreground estimation so edge pixels lose the
   background tint (no light fringe on dark game backgrounds).

Usage: ~/ai/rmbg/rembg/bin/python tools/matte_refine.py <source.png> <model_cutout.png> <out.png> [--band 40 --key 14 --erode 6]
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage
from pymatting import estimate_alpha_cf, estimate_foreground_ml


def bg_field(img, alpha, sigma=40):
    w = (alpha < 0.05).astype(np.float64)
    num = np.stack([ndimage.gaussian_filter(img[..., c] * w, sigma) for c in range(3)], -1)
    den = ndimage.gaussian_filter(w, sigma)[..., None]
    f = num / np.maximum(den, 1e-6)
    # far inside the figure den is ~0; fall back to the global background mean there
    mean = (img * w[..., None]).sum((0, 1)) / max(w.sum(), 1)
    return np.where(den > 1e-3, f, mean)


def refine(src, cut, out, band=40, key=14, erode=6, dilate=6):
    img = np.asarray(Image.open(src).convert('RGB')).astype(np.float64) / 255
    a = np.asarray(Image.open(cut).convert('RGBA'))[..., 3].astype(np.float64) / 255
    bg = bg_field(img, a)
    fg_def = ndimage.binary_erosion(a > 0.95, iterations=erode)
    bg_def = ~ndimage.binary_dilation(a > 0.05, iterations=dilate)
    near = ndimage.distance_transform_edt(a > 0.5) <= band
    dist = np.sqrt(((img - bg) ** 2).sum(-1)) * 255
    keyed = near & (dist < key) & (a < 0.97)  # the model is sure about solid cloth (Kenji's white shirt reads ~0.996)
    tri = np.full(a.shape, 0.5)
    tri[fg_def] = 1.0
    tri[bg_def | keyed] = 0.0
    alpha = estimate_alpha_cf(img, tri)
    fg = estimate_foreground_ml(img, alpha)
    rgba = np.dstack([np.clip(fg, 0, 1), np.clip(alpha, 0, 1)])
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(out)
    Image.fromarray((tri * 255).astype(np.uint8)).save(out.replace('.png', '-trimap.png'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('cut'); ap.add_argument('out')
    ap.add_argument('--band', type=int, default=40); ap.add_argument('--key', type=float, default=14); ap.add_argument('--erode', type=int, default=6)
    a = ap.parse_args()
    refine(a.src, a.cut, a.out, a.band, a.key, a.erode)
    print('ok', a.out, flush=True)
