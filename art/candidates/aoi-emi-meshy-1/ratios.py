"""Head-to-body numbers for reviews/aoi-meshy-1 and emi-meshy-1, measured the way Kuro round 3 did
(kuro-meshy-orig-3/ratios.py): the chin row of each picture is read off its grid by eye (kuro-meshy-orig-3/grid.py)
and passed in; the rest is counted.
  height share = (top of the figure, hair included, to the chin) / (top to soles)
  head width   = widest row above the chin / widest row of the legs (at 80 % of the height, below the hands)

  python3 art/candidates/aoi-emi-meshy-1/ratios.py <out.json> <name>=<picture>:<chin row> ...
"""
import json, sys
import numpy as np
from PIL import Image


def mask(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(int)
    if a[..., 3].min() < 255:
        return a[..., 3] > 128
    return a[..., :3].min(axis=2) < 225


def main():
    out = {}
    for arg in sys.argv[2:]:
        name, rest = arg.split('=', 1)
        path, chin = rest.rsplit(':', 1)
        chin = int(chin)
        m = mask(path)
        rows = np.where(m.any(axis=1))[0]
        top, sole = rows.min(), rows.max()
        width = lambda r: (lambda c: c.max() - c.min() + 1 if len(c) else 0)(np.where(m[r])[0])
        head_w = max(width(r) for r in range(top, chin))
        legs = top + int((sole - top) * 0.8)
        out[name] = {'height_share': round((chin - top) / (sole - top), 3),
                     'head_over_legs_width': round(head_w / max(width(legs), 1), 2), 'chin_row': chin}
        print(f'{name:28s} height share {out[name]["height_share"]:.2f}   head width / legs width {out[name]["head_over_legs_width"]:.2f}')
    json.dump(out, open(sys.argv[1], 'w'), indent=1)


if __name__ == '__main__':
    main()
