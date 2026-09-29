"""Recolour the pick's amber irises to the portrait's light tan: only saturated yellow-orange pixels inside the eye band,
hue set to the portrait's iris hue and saturation scaled to its level; brightness and shading kept."""
import sys, numpy as np
sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
from PIL import Image
import portrait_candidates as pc
src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float) / 255
hsv = pc._rgb2hsv(a)
m = np.zeros(a.shape[:2], bool)
m[430:540, 340:620] = True  # eye band inside the glasses
sel = m & (hsv[..., 0] > 20) & (hsv[..., 0] < 75) & (hsv[..., 1] > 0.35) & (hsv[..., 2] > 0.3)
new = hsv.copy()
new[sel, 0] = 42.9
new[sel, 1] = np.clip(hsv[sel, 1] * 0.45, 0, 1)
new[sel, 2] = np.clip(hsv[sel, 2] * 0.8, 0, 1)
Image.fromarray((pc._hsv2rgb(new) * 255 + .5).clip(0, 255).astype('uint8')).save(out)
print('pixels', int(sel.sum()))
