"""Project the built-in imagegen mouth edit into the existing UV texture, keeping other texels unchanged.
The generated full front view is preserved as source.png; only the mouth region is transferred.
Usage: python project-mouth.py a|b generated.png
"""
import json
from pathlib import Path
import shutil
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
import facepaint as F

model, source = sys.argv[1:]
root = Path('/home/jorgen/repo/japanese/art/parts')
previous = root / 'crowd-pilot-3' / 'takes' / f'{model}-t6'
out = previous.with_name(f'{model}-t7')
out.mkdir(exist_ok=True)
shutil.copy2(source, out / 'source.png')
glb = root / 'crowd-pilot-2' / 'rig' / f'{model}-rigged.glb'
base = previous / 'base.webp'
front, z = F.front(str(glb), str(base))
h, w = front.shape[:2]
edit = np.asarray(Image.open(source).convert('RGB').resize((w, h), Image.Resampling.LANCZOS))
# Existing front projection uses 4000 pixels/metre. Restrict to bare lower face.
x0, y0, x1, y1 = (620, 1580, 1310, 1760) if model == 'a' else (780, 1440, 1130, 1560)
patch = edit[y0:y1, x0:x1].astype(float)
skin = np.median(front[y0-20:y0, x0:x1].reshape(-1, 3), axis=0)
# Only the generated mouth ink is new art. Use the unchanged skin outside its dark pixels.
ink = patch[..., 0] < 175
alpha = np.clip(ndimage.gaussian_filter(ink.astype(float), 0.7), 0, 1)
layer = np.zeros((h, w, 4), dtype=np.uint8)
if model == 'a':
    # Clear the old pale smeared line within the lower-face patch.
    feather = np.zeros((h, w)); feather[y0:y1, x0:x1] = 1
    feather = ndimage.gaussian_filter(feather, 10)
    layer[..., :3] = skin.astype(np.uint8)
    layer[..., 3] = np.clip(feather * 255, 0, 255).astype(np.uint8)
    layer[y0:y1, x0:x1, :3] = np.clip(patch * alpha[..., None] + skin * (1-alpha[..., None]),0,255)
else:
    layer[y0:y1, x0:x1, :3] = patch
    layer[y0:y1, x0:x1, 3] = (alpha * 255).astype(np.uint8)
Image.fromarray(layer).save(out/'paint.png')
F.project(str(glb), str(base), layer, out=str(out/'base.webp'), zbuf=z)
after, _ = F.front(str(glb), str(out/'base.webp'))
Image.fromarray(after).save(out/'front.png')
(out/'settings.json').write_text(json.dumps({'source':'built-in imagegen', 'parent':f'{model}-t6','projection_rect':[x0,y0,x1,y1], 'change':'mouth only; existing eyes, rig, clips and weights retained'},indent=2)+'\n')
shutil.copy2(out/'base.webp',root/'crowd-pilot-3'/'game'/model/'base.webp')
(root/'crowd-pilot-3'/'game'/model/'take.txt').write_text(f'{model}-t7\n')
print(out)
