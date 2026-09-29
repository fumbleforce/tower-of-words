"""Make the glasses frame solid on Mio's approved game portraits (game3d/assets/portraits/mio-*.webp and
portraits-v2/mio-neutral.webp).

Their matte left the bottom bar of the left lens partly see-through where it crosses the gap between her hair and her
cheek (alpha down to 11): the matte took the thin frame against the grey background for background. The frame mask is
the approved portrait's own frame by colour (tools/portrait_candidates.mio_frame_mask on art/production/RF/mio.png, the
canvas all of these are scaled copies of); tools/matte_refine.py --opaque --post-only raises alpha to it, nothing else
changes. The originals are kept in art/production/mio-phone-4/portraits-before/.
Usage: ~/ai/consist/.venv/bin/python fix_portraits.py"""
import os, sys, glob, shutil, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(REPO, 'tools'))
from portrait_candidates import mio_frame_mask  # noqa: E402

SRC = os.path.join(REPO, 'art/production/RF/mio.png')
OUT = os.path.join(REPO, 'art/production/mio-phone-4')
BEFORE = os.path.join(OUT, 'portraits-before')

if __name__ == '__main__':
    os.makedirs(BEFORE, exist_ok=True)
    # the frame itself, without the 1 px grown edge: that edge is half grey background in the source and showed as a
    # light halo on dark backgrounds; the matte keeps its own soft alpha there
    f = ndimage.binary_erosion(mio_frame_mask(SRC, grow=1), iterations=1).astype(float)
    # and only its dark body: its light edge pixels are frame mixed with the grey background and turned into grey specks
    v = np.asarray(Image.open(SRC).convert('RGB')).max(-1)
    m = f * (v < 130)
    mask = os.path.join(OUT, 'approved-frame-mask.png')
    Image.fromarray((m.clip(0, 1) * 255).astype('uint8')).save(mask)
    paths = sorted(glob.glob(os.path.join(REPO, 'game3d/assets/portraits/mio-*.webp'))) + \
        [os.path.join(REPO, 'game3d/assets/portraits-v2/mio-neutral.webp')]
    for p in paths:
        keep = os.path.join(BEFORE, os.path.basename(os.path.dirname(p)) + '-' + os.path.basename(p))
        if not os.path.exists(keep):
            shutil.copy2(p, keep)
        subprocess.run([os.path.expanduser('~/ai/rmbg/rembg/bin/python'), os.path.join(REPO, 'tools/matte_refine.py'),
                        SRC, keep, p, '--opaque', mask, '--post-only'], check=True)
        a0 = np.asarray(Image.open(keep).convert('RGBA'))[..., 3].astype(int)
        a1 = np.asarray(Image.open(p).convert('RGBA'))[..., 3].astype(int)
        print(os.path.relpath(p, REPO), 'alpha raised on', int((a1 > a0 + 2).sum()), 'px', flush=True)
