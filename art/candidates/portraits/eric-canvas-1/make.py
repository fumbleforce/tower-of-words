"""eric-canvas-1: widen Eric's game portraits to the right so his left shoulder and arm (image right) end inside the
picture instead of in a straight vertical cut at x 597.

No outpaint is needed: the approved render r4-909 already has the whole arm (its cut-out reaches source x ~790), and the
game crop (art/PROMPTS.md "Game crop": scale 1.051125, source box from x 167.30, y -47.35) simply stopped at x 735.27.
So the same transform is run on a wider box (W px instead of 597) and only the new columns x >= 597 are appended to each
approved game file. Columns 0..596 (face, glasses, expression) are the approved files' own pixels, untouched, so FACE.eric
f=[112,208,348,399] still holds; only FACE.eric.W changes (597 -> W). The body below the face is the same pixels in all
three expressions (they were face-only repaints of r4-909), so the strip is shared.

Run: ~/ai/sd/venv/bin/python art/candidates/portraits/eric-canvas-1/make.py
Out (local only, never committed): art/candidates/portraits/eric-canvas-1/eric-<face>.webp and eric-<face>.png"""
import os
import numpy as np
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(REPO, 'art/production/eric-portrait-final/eric-r4-909-cutout-full.png')
S, L, T = 1.051125, 167.30, -47.35   # game crop of r4-909 (zoom.py): out = (src - (L, T)) * S
W0, H, W = 597, 768, 648             # old width, height, new width (arm ends at x ~626; 22 px of air)
PAD = 300                            # the crop starts above the render's top edge


def strip():
    r = Image.open(SRC).convert('RGBA')
    big = Image.new('RGBA', (r.width, r.height + PAD), (0, 0, 0, 0))
    big.paste(r, (0, PAD))
    box = (L, T + PAD, L + W / S, T + PAD + H / S)
    return np.asarray(big.convert('RGBa').resize((W, H), Image.LANCZOS, box=box).convert('RGBA'))


def main():
    wide = strip()
    for face in ('neutral', 'surprised', 'tired'):
        old = np.asarray(Image.open(os.path.join(REPO, f'game3d/assets/portraits/eric-{face}.webp')).convert('RGBA'))
        assert old.shape == (H, W0, 4), old.shape
        seam = np.abs(old[:, W0 - 6:].astype(int) - wide[:, W0 - 6:W0].astype(int)).mean()
        out = np.concatenate([old, wide[:, W0:]], 1)
        im = Image.fromarray(out, 'RGBA')
        im.save(os.path.join(HERE, f'eric-{face}.png'))
        im.save(os.path.join(HERE, f'eric-{face}.webp'), 'WEBP', quality=90, method=6)
        a = out[..., 3]
        right = max(np.where(a[y] > 128)[0].max() for y in range(H) if (a[y] > 128).any())
        edge = (a[:, -3:] > 16).sum()
        print(f'{face}: {W}x{H}, seam diff {seam:.2f}, figure right edge x {right}, opaque px in last 3 cols {edge}')


if __name__ == '__main__':
    main()
