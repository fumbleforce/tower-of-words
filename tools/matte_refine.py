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

4. --opaque MASK: pixels that must be solid whatever the matte thinks (a greyscale mask on the source canvas, 255 =
   solid). Thin parts that cross the plain background, such as Mio's glasses frame where the left lens overhangs the gap
   between her hair and cheek, came out partly see-through (alpha down to 11 on her approved game portraits). They are
   definite foreground in the trimap, alpha is at least the mask, and the colour there is the source's.
   --post-only applies just this to an existing cut-out (<model_cutout.png>), without matting again.

Usage: ~/ai/rmbg/rembg/bin/python tools/matte_refine.py <source.png> <model_cutout.png> <out.png> [--band 40 --key 14 --erode 6]
       [--opaque mask.png [--post-only]]
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


def load_mask(path, size):
    m = Image.open(path).convert('L')
    if size[0] < m.width:  # shrinking: target pixels at least half covered are solid, the rest untouched (a max filter
        # grew the mask onto the frame's light anti-aliased edge, which then showed as grey specks on dark backgrounds)
        return (np.asarray(m.resize(size, Image.BOX)).astype(np.float64) / 255 >= 0.5).astype(np.float64)
    return np.asarray(m.resize(size, Image.BILINEAR)).astype(np.float64) / 255


def force_opaque(img, fg, alpha, keep):
    """alpha >= keep; where that raises alpha, the colour moves to the source's (the matte's foreground estimate at a
    near-zero alpha is unreliable)."""
    new = np.maximum(alpha, keep)
    w = np.where(new > 0, (new - alpha) / np.maximum(new, 1e-6), 0)[..., None]
    return fg * (1 - w) + img * w, new


def refine(src, cut, out, band=40, key=14, erode=6, dilate=6, opaque=None, post_only=False):
    if post_only:  # at the cut-out's own size (a game portrait is a scaled copy of the source canvas)
        c = Image.open(cut).convert('RGBA')
        rgba0 = np.asarray(c).astype(np.float64) / 255
        img = np.asarray(Image.open(src).convert('RGB').resize(c.size, Image.LANCZOS)).astype(np.float64) / 255
        fg, alpha = force_opaque(img, rgba0[..., :3], rgba0[..., 3], load_mask(opaque, c.size))
        rgba = np.dstack([np.clip(fg, 0, 1), np.clip(alpha, 0, 1)])
        Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(out, **({'quality': 95} if out.endswith('.webp') else {}))
        return
    img = np.asarray(Image.open(src).convert('RGB')).astype(np.float64) / 255
    a = np.asarray(Image.open(cut).convert('RGBA'))[..., 3].astype(np.float64) / 255
    keep = load_mask(opaque, img.shape[1::-1]) if opaque else np.zeros(a.shape)
    bg = bg_field(img, a)
    fg_def = ndimage.binary_erosion(a > 0.95, iterations=erode)
    bg_def = ~ndimage.binary_dilation(a > 0.05, iterations=dilate)
    near = ndimage.distance_transform_edt(a > 0.5) <= band
    dist = np.sqrt(((img - bg) ** 2).sum(-1)) * 255
    keyed = near & (dist < key) & (a < 0.97)  # the model is sure about solid cloth (Kenji's white shirt reads ~0.996)
    tri = np.full(a.shape, 0.5)
    tri[fg_def] = 1.0
    tri[bg_def | keyed] = 0.0
    tri[keep > 0.5] = 1.0
    alpha = estimate_alpha_cf(img, tri)
    fg = estimate_foreground_ml(img, alpha)
    fg, alpha = force_opaque(img, fg, alpha, keep)
    rgba = np.dstack([np.clip(fg, 0, 1), np.clip(alpha, 0, 1)])
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), 'RGBA').save(out)
    Image.fromarray((tri * 255).astype(np.uint8)).save(out.replace('.png', '-trimap.png'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('cut'); ap.add_argument('out')
    ap.add_argument('--band', type=int, default=40); ap.add_argument('--key', type=float, default=14); ap.add_argument('--erode', type=int, default=6)
    ap.add_argument('--opaque'); ap.add_argument('--post-only', action='store_true')
    a = ap.parse_args()
    refine(a.src, a.cut, a.out, a.band, a.key, a.erode, opaque=a.opaque, post_only=a.post_only)
    print('ok', a.out, flush=True)
