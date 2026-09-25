"""Candidate for the opening's cabin slot: the carriage plate (interior-42) with its windows replaced, so the view agrees
with the staging: side windows show the bay from about 15 m up (window-pano-221), the front window shows the guideway
running ahead toward the island (forward-233). Masks come from the Depth Anything map (far = window).
Run: ~/ai/sd/venv/bin/python tools/opening/cabin_comp.py  -> art/opening/base/cabin-comp-42.png"""
import os, numpy as np
from PIL import Image, ImageFilter
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'opening')
room = Image.open(f'{R}/hires/interior.png').convert('RGB')
W, H = room.size
d = np.asarray(Image.open(f'{R}/final/cabin-d.png').convert('L').resize(room.size)).astype(np.float32) / 255
xs = np.linspace(0, 1, W)[None, :].repeat(H, 0)
far = d < 0.2
side = far & ((xs < 0.36) | (xs > 0.64))
def m(a):
    return Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(1.2))
def view(path, horizon_frac, horizon_y, scale):
    """The view plate scaled to `scale` x room width, placed so its horizon (fraction of its height) sits at horizon_y."""
    v = Image.open(path).convert('RGB')
    vw = int(W * scale); vh = int(v.height * vw / v.width)
    v = v.resize((vw, vh), Image.LANCZOS)
    img = Image.new('RGB', room.size, (120, 170, 220))
    img.paste(v, ((W - vw) // 2, int(horizon_y * H - horizon_frac * vh)))
    return img
left = side & (xs < 0.5)
right = side & (xs >= 0.5)
# about 15 m up: the horizon sits in the lower part of each side window (windows span roughly 0.1-0.62 of the frame height)
limg = view(f'{R}/hires/window-pano.png', 0.53, 0.47, 1.25)
rimg = view(f'{R}/base/pano-curve-321.png', 0.5, 0.44, 1.05)
out = Image.composite(limg, room, m(left))
out = Image.composite(rimg, out, m(right))
out.save(f'{R}/base/cabin-comp-42.png')
open(f'{R}/base/cabin-comp-42.prompt.txt', 'w').write('Composite: carriage interior-42; left windows window-pano-221 (the bay from about 15 m up); right windows pano-curve-321 (his own train and the guideway curving ahead toward the island); the far door is left as painted. Window masks from Depth Anything V2.')
print('ok')
