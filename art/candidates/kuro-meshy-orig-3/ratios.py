"""Head-to-body numbers for reviews/kuro-meshy-orig-3, from measure.sh's straight-on pictures and the ChatGPT
pictures. The chin row of each is read off its grid by eye (CHIN below, image rows); the rest is counted:
  height share = (top of the figure, hair and buns included, to the chin) / (top to soles)
  head width   = widest row above the chin / widest row of the legs (at 80 % of the height, below the hands)

  python3 art/candidates/kuro-meshy-orig-3/ratios.py
"""
import json, os
import numpy as np
from PIL import Image

J = '/home/jorgen/repo/japanese/art/parts'
M = f'{J}/kuro-meshy-orig-3/renders/measure'
CHIN = {  # name: (picture, chin row)
    'Eric (in game)': (f'{M}/eric.png', 248), 'Mio (in game)': (f'{M}/mio.png', 390),
    'Kuro round 2 model': (f'{M}/kuro-2.png', 485), 'Kuro round 3 model': (f'{M}/kuro-3.png', 418),
    'd2 (round 2 picture)': (f'{J}/kuro-meshy-orig-2/pics/d2.png', 495),
    'e1': (f'{J}/kuro-meshy-orig-3/pics/e1.png', 440), 'e2': (f'{J}/kuro-meshy-orig-3/pics/e2.png', 455),
    'e3': (f'{J}/kuro-meshy-orig-3/pics/e3.png', 465), 'e4': (f'{J}/kuro-meshy-orig-3/pics/e4.png', 520),
    'e5': (f'{J}/kuro-meshy-orig-3/pics/e5.png', 452), 'e6': (f'{J}/kuro-meshy-orig-3/pics/e6.png', 425),
}


def mask(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(int)
    if a[..., 3].min() < 255:
        return a[..., 3] > 128
    return a[..., :3].min(axis=2) < 225


def main():
    out = {}
    for name, (p, chin) in CHIN.items():
        m = mask(p)
        rows = np.where(m.any(axis=1))[0]
        top, sole = rows.min(), rows.max()
        width = lambda r: (lambda c: c.max() - c.min() + 1 if len(c) else 0)(np.where(m[r])[0])
        head_w = max(width(r) for r in range(top, chin))
        legs = top + int((sole - top) * 0.8)
        out[name] = {'height_share': round((chin - top) / (sole - top), 3),
                     'head_over_legs_width': round(head_w / max(width(legs), 1), 2)}
        print(f'{name:24s} height share {out[name]["height_share"]:.2f}   head width / legs width {out[name]["head_over_legs_width"]:.2f}')
    json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ratios.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
