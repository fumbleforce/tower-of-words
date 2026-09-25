"""Frame guard for character portraits: flags heads, hair, hands or feet that touch or leave the frame.
The figure is found with the local rembg ISNet-anime model (~/ai/rmbg/rembg venv, CPU, about 1.5 s; masks cached in
~/.cache/framecheck). A plain colour-difference test is the fallback, but it mistakes background gradients for the figure.
The bottom edge is expected to cut a waist-up portrait and is only reported.

Usage: ~/ai/sd/venv/bin/python tools/framecheck.py <png> [...]   (prints one line per image, exit 1 if any fails)
In code: check(path) -> list of problems (empty = fine). production.run, decide2.img2img and reframe.py call it."""
import sys, os, hashlib, subprocess
import numpy as np
from PIL import Image

MIN_HEADROOM = 0.03   # the top of the hair must sit at least 3% of the height below the top edge
SIDE_TOUCH = 0.015    # more than 1.5% of a side edge covered by the figure counts as touching


REMBG_PY = os.path.expanduser('~/ai/rmbg/rembg/bin/python')
CACHE = os.path.expanduser('~/.cache/framecheck')


def figure_mask(path):
    """Boolean (h, w) array, True on the character. rembg ISNet-anime when available, else colour difference."""
    im = Image.open(path).convert('RGB')
    key = hashlib.sha1(im.tobytes()).hexdigest()[:16]
    mp = os.path.join(CACHE, key + '.png')
    if not os.path.exists(mp) and os.path.exists(REMBG_PY):
        os.makedirs(CACHE, exist_ok=True)
        code = ('import sys\nfrom rembg import new_session, remove\nfrom PIL import Image\n'
                "remove(Image.open(sys.argv[1]).convert('RGB'), session=new_session('isnet-anime'), only_mask=True).save(sys.argv[2])")
        subprocess.run([REMBG_PY, '-c', code, path, mp], check=False, capture_output=True)
    if os.path.exists(mp):
        return np.asarray(Image.open(mp).convert('L')) > 128
    a = np.asarray(im).astype(int)
    k = max(8, a.shape[1] // 30)
    bg = np.median(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3)]), 0)
    return np.abs(a - bg).sum(2) > 45


def measure(path):
    fg = figure_mask(path)
    h, w = fg.shape
    rows = np.where(fg.mean(1) > 0.01)[0]
    return {'w': w, 'h': h, 'top_px': int(rows[0]) if len(rows) else h,
            # Sides: only the upper 60% counts. Lower down, arms and hips leaving the frame belong to the bottom crop of a waist-up shot.
            'left': float(fg[:int(h * .6), :3].mean()), 'right': float(fg[:int(h * .6), -3:].mean()), 'bottom': float(fg[-3:].mean())}


def check(path):
    m = measure(path)
    out = []
    if m['top_px'] < MIN_HEADROOM * m['h']:
        out.append(f"head/hair {m['top_px']}px from the top edge (want >= {int(MIN_HEADROOM * m['h'])})")
    for side in ('left', 'right'):
        if m[side] > SIDE_TOUCH:
            out.append(f"figure touches the {side} edge ({m[side]:.0%} of it)")
    return out


def warn(path):
    """Print a warning line for a fresh portrait render; returns the problems."""
    p = check(path)
    if p:
        print('FRAME WARN', path.split('/')[-1], '; '.join(p), flush=True)
    return p


if __name__ == '__main__':
    bad = 0
    for p in sys.argv[1:]:
        probs = check(p)
        bad += bool(probs)
        print(('FAIL ' if probs else 'ok   ') + p.split('/')[-1], '; '.join(probs))
    sys.exit(1 if bad else 0)
