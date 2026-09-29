"""Check the glasses frame of Mio pictures is whole: the colour (is the frame drawn there, or does the face show through?)
and, for cut-outs, the alpha, along the entire frame of both lenses, split into segments (top/bottom/outer/inner of each
lens, bridge, hinge).

Frame pixels: for the transplant pictures, the approved frame warped onto her face (composite.py, wm > 0.5) minus the
hair lock in front of it; for the approved portrait, tools/portrait_candidates.mio_frame_mask.
Usage: ~/ai/consist/.venv/bin/python check_frame.py"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = '/home/jorgen/repo/japanese'
sys.path.insert(0, os.path.join(HERE, '..', 'mio-phone-3'))
sys.path.insert(0, os.path.join(REPO, 'tools'))
import composite  # noqa: E402
from portrait_candidates import mio_frame_mask  # noqa: E402
from geom import APPR  # noqa: E402

R3 = os.path.join(REPO, 'art/production/mio-phone-3')
R4 = os.path.join(REPO, 'art/production/mio-phone-4')
CANVAS = (1008, 1296)


def segments(mask, eyes):
    """Split frame pixels by lens (nearer eye) and by side (angle around that eye)."""
    ys, xs = np.nonzero(mask)
    d = [np.hypot(xs - ex, ys - ey) for ex, ey in eyes]
    lens = np.argmin(d, 0)
    out = {}
    for i, name in enumerate(('left lens', 'right lens')):
        sel = lens == i
        ang = np.degrees(np.arctan2(ys[sel] - eyes[i][1], xs[sel] - eyes[i][0]))
        for seg, lo, hi in (('top', -135, -45), ('outer' if i == 0 else 'inner', 135, 225), ('bottom', 45, 135),
                            ('inner' if i == 0 else 'outer', -45, 45)):
            a = (ang - lo) % 360 < (hi - lo)
            out[f'{name} {seg}'] = (ys[sel][a], xs[sel][a])
    return out


def frame_ref(pasted_on_bare=True):
    composite.PADS_TOO = True
    composite.build(1.0, None)
    return composite.LAST['wm'], composite.LAST['warped']


def colour_report(path, wm, warped, eyes=composite.ET):
    """Per segment: the share of the frame's core pixels that look like frame (taupe grey or its dark outline: low
    saturation, not bright), and the number of cross-sections through the bar with no frame-like pixel at all (a gap
    where the face shows through)."""
    img = np.asarray(Image.open(path).convert('RGB')).astype(float)
    m = (wm > 0.95) & (composite.hair_mask(Image.open(path)) < 0.5)
    v, sat = img.max(-1), img.max(-1) - img.min(-1)
    ok = (sat < 50) & (v < 160)
    rows = []
    for seg, (ys, xs) in segments(m, eyes).items():
        across = xs if ('top' in seg or 'bottom' in seg) else ys   # cross-sections: columns of a horizontal bar
        gaps = sum(1 for c in np.unique(across) if not ok[ys[across == c], xs[across == c]].any())
        rows.append((seg, ok[ys, xs].mean(), gaps))
    return rows


def alpha_report(path, mask, eyes):
    """At the cut-out's own size: the frame's core pixels there (mask shrunk by averaging, > 0.9)."""
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)[..., 3]
    sx, sy = im.width / CANVAS[0], im.height / CANVAS[1]
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize(im.size, Image.BOX)) > 230
    eyes = [(x * sx, y * sy) for x, y in eyes]
    rows = []
    for seg, (ys, xs) in segments(mask, eyes).items():
        rows.append((seg, int(a[ys, xs].min()), (a[ys, xs] < 250).mean()))
    return rows


if __name__ == '__main__':
    wm, warped = frame_ref()
    names = ['mio-phone3-exact-3401-v2', 'mio-phone3-blendk20-3501-exact-3401-v2', 'mio-phone3-blendk25-3501-exact-3401-v2',
             'mio-phone3-exact-3403-v2', 'mio-phone3-blendk20-3501-exact-3403-v2']
    print('frame drawn: share of frame-like core pixels, and gaps (cross-sections with no frame), round 3 -> round 4')
    for n in names:
        r3 = os.path.join(R3, n + '.png')
        r4 = os.path.join(R4, n + '.png')
        a = colour_report(r3, wm, warped) if os.path.exists(r3) else None
        b = colour_report(r4, wm, warped) if os.path.exists(r4) else None
        print(' ', n.replace('mio-phone3-', ''))
        for i, row in enumerate(b or a or []):
            f3 = f'{a[i][1]:.2f} gaps {a[i][2]:2d}' if a else '   (new)   '
            f4 = f'{b[i][1]:.2f} gaps {b[i][2]:2d}' if b else '(not yet)'
            print(f'    {row[0]:18s} {f3} -> {f4}')
    print('cut-out alpha on the frame (min alpha, share < 250)')
    fm = (wm > 0.5) & (composite.hair_mask(Image.open(os.path.join(R4, names[0] + '.png'))) < 0.5)
    for d in (R3 + '/cut', R4 + '/cut'):
        for n in names:
            p = os.path.join(d, n + '-refined.png')
            if os.path.exists(p):
                print(' ', os.path.relpath(p, REPO))
                for seg, mn, frac in alpha_report(p, fm, composite.ET):
                    print(f'    {seg:18s} min {mn:3d}  holes {frac:.3f}')
    from scipy import ndimage
    # the frame without its 1 px anti-aliased edge (grow=0 would dilate until nothing changes in scipy)
    am = ndimage.binary_erosion(mio_frame_mask(APPR, grow=1), iterations=1)
    import glob
    print('approved portrait cut-outs, worst frame segment: before (art/production/mio-phone-4/portraits-before) -> now')
    for p in sorted(glob.glob(REPO + '/game3d/assets/portraits/mio-*.webp')) + [REPO + '/game3d/assets/portraits-v2/mio-neutral.webp']:
        b = os.path.join(R4, 'portraits-before', os.path.basename(os.path.dirname(p)) + '-' + os.path.basename(p))
        worst = []
        for q in (b, p):
            rows = alpha_report(q, am, composite.EA) if os.path.exists(q) else []
            w = max(rows, key=lambda r: r[2]) if rows else None
            worst.append(f'{w[0]} min {w[1]:3d} holes {w[2]:.3f}' if w else '-')
        print(f'  {os.path.relpath(p, REPO):45s} {worst[0]}  ->  {worst[1]}')
