# char-mio-i2i: prepare the pictures that get projected onto the model (mio_i2i_tex.py).
#   ~/ai/sd/venv/bin/python tools/style-concepts/mio_i2i_views.py <gen job> <view set> [tag ...]
# front: the target itself, masked by ref/mask.png. Other tags: gen/<job>/<tag>.png masked by where the picture
# isn't background AND where our model is (its source render's alpha, so floor shadows never count).
# Each output, claude-mioi2i/views/<view set>/<tag>.png, is RGBA: A the mask, RGB the picture with every pixel outside the mask
# set to the colour of the nearest pixel inside it (so a slightly misaligned edge picks up her colours, not grey).
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

import mio_i2i_cam as C


def bg_mask(a):
    """Figure pixels of a picture on the light grey background (as mio_i2i_ref.mask, without the shadow cut)."""
    bg = np.median(np.concatenate([a[:, :120], a[:, -120:]], axis=1), axis=1, keepdims=True)
    d = np.abs(a - bg).max(axis=2)
    m = d > 16
    blue = (a[..., 2] > a[..., 0] + 18) & (a.mean(axis=2) < 205)  # cast shadows are blue-grey
    m &= ~blue | (d > 90)
    return ndimage.binary_opening(m, iterations=1)


def fill_out(rgb, m):
    idx = ndimage.distance_transform_edt(~m, return_distances=False, return_indices=True)
    return rgb[idx[0], idx[1]]


MATCH = False
REF = 't1'


def front_src():
    return C.REFS[REF][0]


def front_mask():
    return os.path.join(C.OUT, C.REFS[REF][1], 'mask.png')


def prep(tag, job, vset):
    out = os.path.join(C.OUT, 'views', vset)
    os.makedirs(out, exist_ok=True)
    if tag == 'front':
        rgb = np.asarray(Image.open(front_src()).convert('RGB'))
        m = np.asarray(Image.open(front_mask()).convert('L').resize(rgb.shape[1::-1])) > 127
    else:
        rgb = np.asarray(Image.open(os.path.join(C.OUT, 'gen', job, tag + '.png')).convert('RGB'))
        src = 'src-clean' if REF == 'clean' else 'src'  # the renders the job was painted over
        a = np.asarray(Image.open(os.path.join(C.OUT, src, tag + '.png')).getchannel('A')) > 230
        m = bg_mask(rgb.astype(np.float32)) & ndimage.binary_dilation(a, iterations=3)
    m = ndimage.binary_erosion(m, iterations=1)  # leave out the anti-aliased rim
    if tag != 'front' and MATCH:
        # the generated views drift warmer and browner: match each channel's mean and spread over the figure to the
        # front picture's
        ref = np.asarray(Image.open(front_src()).convert('RGB').resize((1024, 1024))).astype(np.float32)
        rm = np.asarray(Image.open(front_mask()).convert('L').resize((1024, 1024))) > 127
        f = rgb.astype(np.float32)
        for c in range(3):
            a, b = f[..., c][m], ref[..., c][rm]
            f[..., c] = (f[..., c] - a.mean()) / (a.std() + 1e-6) * b.std() + b.mean()
        rgb = np.clip(f, 0, 255).astype(np.uint8)
    filled = fill_out(rgb, m)
    Image.fromarray(np.dstack([filled, (m * 255).astype(np.uint8)])).save(os.path.join(out, tag + '.png'))
    print('view', tag, 'mask', round(float(m.mean()), 4))


if __name__ == '__main__':
    # options: --ref clean (the front picture and mask), --match (colour-match the generated views to it)
    a = sys.argv[1:]
    if '--ref' in a:
        k = a.index('--ref')
        REF = a[k + 1]
        a = a[:k] + a[k + 2:]
    if '--match' in a:
        MATCH = True
        a.remove('--match')
    sys.argv = [sys.argv[0]] + a
    job, vset = sys.argv[1], sys.argv[2]
    for t in sys.argv[3:] or ['front', 'l40', 'l90', 'back', 'r90', 'r40']:
        prep(t, job, vset)
