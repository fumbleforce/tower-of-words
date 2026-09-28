"""Remove the red rim light from Eric's old approved portrait (art/production/RF/mc-it-guy.png, the full-size source of
art/approved/mc/mc-it-guy-after.webp) by a local colour correction, no regeneration.
1. Red outline strokes and dark maroon shadow fills (hue near 0, saturated) outside the inner face -> the dark navy outline colour of the drawing,
   keeping how dark each stroke pixel was.
2. Peach rim-light bands on the jacket and hood (peach pixels below the chin that are not his skin) -> filled with the
   colour of the cloth right next to them (normalised convolution from the neighbouring non-band cloth pixels, which
   leaves out outlines and the background), so each band takes the flat cel colour of the fabric it sits on.
Run: ~/ai/sd/venv/bin/python derim.py <src.png> <out.png> [debug.png]   (LINES_ONLY=1: step 1 only)"""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'tools'))
from portrait_candidates import _rgb2hsv, _hsv2rgb

src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(float) / 255
hsv = _rgb2hsv(a)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
h, w = V.shape
yy, xx = np.mgrid[:h, :w]
face = ((xx - 530) / 118) ** 2 + ((yy - 490) / 125) ** 2 < 1  # inner face: lips, brows, lids keep their own reds

red = ((H < 16) | (H > 335)) & (S > 0.42) & (V > 0.01) & ~face  # includes the dark maroon shadow fills on the jacket
peach = (H >= 5) & (H < 42) & (S > 0.12) & (V > 0.5)
neck = Image.new('L', (w, h), 0)
ImageDraw.Draw(neck).polygon([(415, 540), (612, 540), (592, 650), (578, 760), (560, 805), (455, 805), (420, 700)], fill=255)
skin = peach & ((yy < 560) | (np.asarray(neck) > 0))  # face, ears, hair highlights and the neck stay as drawn
red &= ~((np.asarray(neck) > 0) & (V <= 0.12))  # the near-black shadow under his beard stays as drawn
band = peach & ~skin & ~red
if os.environ.get('LINES_ONLY'):  # second pass after a face repaint: only red strokes on the outline (next to the background),
    band[:] = False               # never the skin shading lines inside the face and neck
    nearbg = ndimage.binary_dilation((V > 0.7) & (S < 0.12), iterations=12)  # the pale grey-green background, whatever its gradient
    head = (((xx - 530) / 175) ** 2 + ((yy - 430) / 215) ** 2 < 1) & (yy < 535)  # head down to the chin; below it only hood and jacket
    orange = (H < 24) & (S > 0.45) & (V > 0.2)  # the repaint draws the rim orange rather than red
    red = (red | orange) & nearbg & ~head & ~(np.asarray(neck) > 0)
band = ndimage.binary_dilation(band, iterations=1) & ~skin & (V > 0.35) if band.any() else band  # take the soft anti-aliased edge with it
bgc = np.median(a[:40, :40].reshape(-1, 3), 0)
bgish = np.sqrt(((a - bgc) ** 2).sum(-1)) < 0.08
warm = ((H < 45) | (H > 330)) & (S > 0.18)  # skin and its shadow never feed the cloth colour
valid = ~band & ~red & (V > 0.16) & ~bgish & ~skin & ~warm & (yy > 540)
fill = np.zeros_like(a)
done = np.zeros((h, w), bool)
for sigma in (3, 6, 12, 24):  # nearest cloth colour, widening until every band pixel has one
    wv = ndimage.gaussian_filter(valid.astype(float), sigma)
    col = np.stack([ndimage.gaussian_filter(a[..., c] * valid, sigma) for c in range(3)], -1) / np.maximum(wv, 1e-6)[..., None]
    ok = (wv > 0.02) & ~done
    fill[ok] = col[ok]
    done |= ok
res = a.copy()
res[band] = fill[band]
line = hsv[(V < 0.14) & (yy > 700)]
lh, ls = np.median(line[:, 0]), np.median(line[:, 1])
r = hsv[red]
r[:, 0], r[:, 1], r[:, 2] = lh, ls, np.minimum(r[:, 2] * 0.35, 0.16)
nr = hsv.copy(); nr[red] = r
inneck = red & (np.asarray(neck) > 0)  # salmon lines drawn on the neck become skin-shadow lines, not navy
sh = hsv[inneck]
sh[:, 0], sh[:, 1], sh[:, 2] = 8, 0.42, sh[:, 2] * 0.62
nr[inneck] = sh
res[red] = _hsv2rgb(nr)[red]
Image.fromarray((res * 255 + 0.5).clip(0, 255).astype('uint8')).save(out)
if len(sys.argv) > 3:
    o = (a * 0.35 * 255).astype(np.uint8)
    o[red] = [255, 0, 0]; o[band] = [255, 220, 0]; o[skin] = [0, 200, 255]
    Image.fromarray(o).save(sys.argv[3])
print('red px', int(red.sum()), 'band px', int(band.sum()))
