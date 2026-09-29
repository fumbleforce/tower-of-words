"""Glasses geometry for the mio-phone-3 fix: frame masks of the approved portrait and of ipa7a-1001, lens interiors."""
import numpy as np
from PIL import Image
from scipy import ndimage

REPO = '/home/jorgen/repo/japanese'
APPR = REPO + '/art/production/RF/mio.png'                       # approved portrait, 1008x1296 canvas
TGT = REPO + '/art/production/mio-phone-2/mio-phone2-ipa7a-1001-rf.png'  # the pick, same canvas


def frame_mask(path, box, vmin, vmax, satmax, keep_frac=0.08):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    x0, y0, x1, y1 = box
    sub = im[y0:y1, x0:x1]
    r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
    v, sat = sub.max(-1), sub.max(-1) - sub.min(-1)
    m = (v > vmin) & (v < vmax) & (r >= b) & (r >= g - 3) & (sat < satmax)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    ids = [i + 1 for i in range(n) if sizes[i] >= keep_frac * sizes.max()]
    full = np.zeros(im.shape[:2], bool)
    full[y0:y1, x0:x1] = np.isin(lab, ids)
    return full


def lenses(frame, close=4):
    """Lens interiors: holes enclosed by the (closed) frame, the two biggest."""
    f = ndimage.binary_closing(frame, iterations=close)
    filled = ndimage.binary_fill_holes(f)
    holes = filled & ~f
    lab, n = ndimage.label(holes)
    sizes = ndimage.sum(holes, lab, range(1, n + 1))
    order = np.argsort(sizes)[::-1][:2]
    out = []
    for i in order:
        ys, xs = np.nonzero(lab == i + 1)
        out.append(dict(cx=xs.mean(), cy=ys.mean(), x0=xs.min(), x1=xs.max(), y0=ys.min(), y1=ys.max(), area=int(sizes[i])))
    return sorted(out, key=lambda d: d['cx'])


if __name__ == '__main__':
    import sys
    sys.path.insert(0, REPO + '/tools')
    from portrait_candidates import mio_frame_mask
    a = mio_frame_mask(APPR, grow=1)
    t = frame_mask(TGT, (330, 450, 625, 610), 95, 200, 40)
    for name, m in (('approved', a), ('target', t)):
        print(name, int(m.sum()), [{k: round(float(v), 1) for k, v in L.items()} for L in lenses(m)])
    im = np.asarray(Image.open(TGT).convert('RGB')).copy()
    im[~t] = (im[~t] * 0.3 + 255 * 0.7).astype('uint8')
    Image.fromarray(im).crop((320, 440, 740, 640)).resize((840, 400)).save(sys.argv[1])
