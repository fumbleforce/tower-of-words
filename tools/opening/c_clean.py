"""Clean plate for option C (the train removed from the sky above the beam) by Poisson cloning: the sky just above the train is
shifted down into the train's place and blended with cv2.seamlessClone, so it meets the horizon glow without a seam; the beam's
top edge (where the wheels sat) is copied from the clean, level beam further right.
Run: ~/ai/opening/venv/bin/python tools/opening/c_clean.py  -> art/opening/pilot/c-clean.png"""
import os
import cv2, numpy as np
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'opening', 'pilot')
x0, y0, x1, y1 = 515, 1496, 1285, 1567
im = cv2.imread(os.path.join(P, 'c.png'))
ty0, ty1 = y0 - 10, y1 - 5
h = ty1 - ty0
f = im.astype(np.float32)
xa, xb = x0 - 14, x1 + 14
# base colour per row: blend between the sky just left and just right of the train (averaged over 12 px) -> the true horizon gradient
L = f[ty0:ty1, xa - 12:xa].mean(1)
R = f[ty0:ty1, xb:xb + 12].mean(1)
L = cv2.GaussianBlur(L[:, None, :], (0, 0), sigmaX=0.1, sigmaY=4)[:, 0]
R = cv2.GaussianBlur(R[:, None, :], (0, 0), sigmaX=0.1, sigmaY=4)[:, 0]
t = np.linspace(0, 1, xb - xa)[None, :, None]
base = L[:, None] * (1 - t) + R[:, None] * t
# detail: the sky from just above, minus its own blur
cp = f[ty0 - h:ty1 - h, xa:xb]
detail = cp - cv2.GaussianBlur(cp, (0, 0), 18)
fill = base + detail
# feather the left/right ends into the original
w = np.clip(np.minimum(np.arange(xb - xa), np.arange(xb - xa)[::-1]) / 10.0, 0, 1)[None, :, None]
f[ty0:ty1, xa:xb] = fill * w + f[ty0:ty1, xa:xb] * (1 - w)
out = f.clip(0, 255).astype(np.uint8)
out[y1 - 9:y1 + 6, x0 - 14:x1 + 14] = im[y1 - 9:y1 + 6, x0 - 14 + 820:x1 + 14 + 820]
cv2.imwrite(os.path.join(P, 'c-clean.png'), out)
print('ok')
