"""Hand size from the straight-on flat-colour renders (kuro-meshy-orig-3/front_bl.py, full height fills the frame), for
Aoi round 2: skin-coloured pixels below the neck and outside the middle of the body (so the hands, not the face or
the chest), per hand, as a share of the figure's height squared; the hand's length is the square root. Hands that
are as big as the others need no change; otherwise the hand bones are scaled at load by the ratio of lengths.

  python3 art/candidates/aoi-emi-meshy-2/hand_area.py <out.json> <name>=<render.png>:<neck row> ...
"""
import json, sys
import numpy as np
from PIL import Image


def main():
    out = {}
    for arg in sys.argv[2:]:
        name, rest = arg.split('=', 1)
        path, neck = rest.rsplit(':', 1)
        a = np.asarray(Image.open(path).convert('RGBA')).astype(int)
        fig = a[..., 3] > 128 if a[..., 3].min() < 255 else a[..., :3].min(2) < 225
        rows = np.where(fig.any(1))[0]
        top, sole = rows.min(), rows.max()
        H = sole - top
        cols = np.where(fig.any(0))[0]
        mid = (cols.min() + cols.max()) / 2
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        skin = fig & (r > 200) & (g > 165) & (b > 130) & (r - b > 25) & (r - b < 110)
        yy, xx = np.mgrid[:a.shape[0], :a.shape[1]]
        hands = skin & (yy > int(neck)) & (np.abs(xx - mid) > H * 0.12)
        left, right = hands & (xx < mid), hands & (xx >= mid)
        area = (left.sum() + right.sum()) / 2 / H ** 2
        out[name] = {'hand_area_over_h2': round(float(area), 5), 'hand_length_over_h': round(float(area ** 0.5), 4)}
        print(f'{name:16s} hand area {area * 1e4:.1f}e-4 H^2, length {area ** 0.5:.3f} H')
    json.dump(out, open(sys.argv[1], 'w'), indent=1)


if __name__ == '__main__':
    main()
