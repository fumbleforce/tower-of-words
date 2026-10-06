"""Round 3 face pass for the two crowd pilots (Review crowd-pilot-3, #232): new painted eyes in the cast's style (white,
iris with a dark top and lighter bottom, pupil, two highlights, a thick upper lash line, a short lower line), and for B
the skin patch at her hair parting painted over in her hair colour. Everything is drawn on the front view of the head
(facepaint.front) and projected into the texture (facepaint.project), so it lands where it shows; the rest of the
texture is untouched. Brows, hair, mouth, body: unchanged. The rig, clips and weights are round 2's.

  python3 art/candidates/crowd-pilot-3/eyes.py <a|b> <take> [key=value ...]
Reads round 2's files in the main checkout's art/parts/crowd-pilot-2/, writes
art/parts/crowd-pilot-3/takes/<m>-<take>/base.webp and front.png (the head from the front, after).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import facepaint as F

P2 = '/home/jorgen/repo/japanese/art/parts/crowd-pilot-2'
P3 = '/home/jorgen/repo/japanese/art/parts/crowd-pilot-3'
SS = 4  # supersampling for clean edges

# Front-view pixels (facepaint: 4000 px per metre; x right = the model's left). Eye centres are round 2's.
MODELS = {
    'a': dict(eyes=[(708, 1330), (1207, 1330)], w=232, h=262, skin=(252, 216, 183),
              erase=[(596, 1158, 822, 1494), (1094, 1158, 1320, 1494)],
              iris_top=(46, 34, 30), iris_bot=(128, 92, 66), ring=(28, 20, 18), pupil=(22, 16, 14),
              lash=(24, 20, 20), lash_t=0.15, wing=0.10, lower=0.45, iris_w=0.60, iris_h=0.80, lashes=0),
    'b': dict(eyes=[(705, 1250), (1209, 1250)], w=262, h=300, skin=(254, 216, 183),
              erase=[(536, 1052, 874, 1432), (1040, 1052, 1384, 1432)],
              iris_top=(20, 30, 62), iris_bot=(66, 118, 170), ring=(16, 22, 44), pupil=(12, 16, 34),
              lash=(30, 22, 22), lash_t=0.17, wing=0.22, lower=0.40, iris_w=0.62, iris_h=0.80, lashes=2,
              hair=(53, 40, 33),
              # the parting: skin showed up to the crown between the two bangs ("a pale forehead patch in the hair
              # parting looks like a hole"); hair now closes over it, leaving a short forehead V between the bangs
              part=[(780, 470), (1330, 470), (1246, 722), (1150, 690), (1030, 746), (790, 576)]),
}


def ell(d, cx, cy, rx, ry, **kw):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], **kw)


def eye(c, side):
    """One eye on a local RGBA canvas (supersampled, then reduced). side: -1 the model's right eye (image left), +1 the
    model's left eye (image right); the outer corner is toward `side`."""
    w, h = c['w'] * SS, c['h'] * SS
    W, H = int(w * 1.7), int(h * 1.6)
    cx, cy = W / 2, H / 2
    out = side
    Y, X = np.mgrid[0:H, 0:W]
    img = np.zeros((H, W, 4))

    def mask(draw):
        m = Image.new('L', (W, H), 0)
        draw(ImageDraw.Draw(m))
        return np.asarray(m) > 0
    # the opening: an ellipse
    S = mask(lambda d: ell(d, cx, cy, w / 2, h / 2, fill=255))
    img[S] = [250, 250, 252, 255]
    # iris: dark at the top, lighter below; the pupil; the iris outline
    ix, iy = cx - out * w * 0.03, cy + h * 0.03
    rx, ry = w * c['iris_w'] / 2, h * c['iris_h'] / 2
    I = mask(lambda d: ell(d, ix, iy, rx, ry, fill=255)) & S
    g = np.clip((Y - (iy - ry)) / (2 * ry), 0, 1) ** 1.2
    top, bot = np.array(c['iris_top'], float), np.array(c['iris_bot'], float)
    col = top * (1 - g[..., None]) + bot * g[..., None]
    img[I, :3] = col[I]
    Pp = mask(lambda d: ell(d, ix, iy - ry * 0.06, rx * 0.46, ry * 0.52, fill=255)) & S
    img[Pp, :3] = np.array(c['pupil']) * 0.55 + col[Pp] * 0.45
    R = mask(lambda d: ell(d, ix, iy, rx, ry, outline=255, width=int(w * 0.03))) & S
    img[R, :3] = c['ring']
    # highlights: one big up and to image left, one small low and to image right (one light for both eyes)
    Hm = mask(lambda d: (ell(d, ix - rx * 0.34, iy - ry * 0.36, w * 0.105, w * 0.105, fill=255),
                         ell(d, ix + rx * 0.40, iy + ry * 0.44, w * 0.048, w * 0.048, fill=255))) & I
    img[Hm, :3] = [255, 255, 255]
    # the upper lash line along the top of the opening, from the inner corner to past the outer one, thickest at the
    # outer end, which flicks out a little (wing)
    a_in, a_out = np.radians(168), np.radians(8)     # angles on the ellipse, measured from the outer side
    n = 48
    th0, th1 = h * c['lash_t'] * 0.55, h * c['lash_t'] * 1.25
    upper, lower = [], []
    for k in range(n + 1):
        s = k / n
        a = a_in + (a_out - a_in) * s
        ex, ey = cx + out * np.cos(a) * w / 2 * 1.03, cy - np.sin(a) * h / 2 * 1.03
        t = th0 + (th1 - th0) * s ** 1.6
        upper.append((ex, ey - t * 0.75))
        lower.append((ex, ey + t * 0.25))
    tip = (cx + out * w / 2 * (1.03 + c['wing']), cy - h * 0.10)
    poly = upper + [tip] + lower[::-1]
    L = mask(lambda d: d.polygon(poly, fill=255))
    for j in range(c['lashes']):  # short lash points above the outer end
        bx, by = upper[-4 - 7 * j]
        L |= mask(lambda d: d.polygon([(bx - out * w * 0.05, by + 2 * SS), (bx + out * w * 0.09, by - h * 0.08),
                                       (bx + out * w * 0.05, by + 8 * SS)], fill=255))
    img[L, :3] = c['lash']
    img[L, 3] = 255
    # the lower line: thin, along the outer part of the bottom (PIL angles run clockwise from +x)
    span = 180 * c['lower']
    a0, a1 = (90 - span, 80) if out > 0 else (100, 90 + span)
    Lw = mask(lambda d: d.arc([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], start=a0, end=a1, fill=255,
                              width=max(2, int(h * 0.028))))
    img[Lw, :3] = c['lash']
    img[Lw, 3] = 255
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA')
    return im.convert('RGBa').resize((W // SS, H // SS), Image.LANCZOS).convert('RGBA')


def fill(layer, rgb, alpha):
    """Composite a flat colour over the layer through an L mask (straight alpha, so its edge keeps the colour)."""
    over = Image.new('RGBA', layer.size, tuple(rgb) + (0,))
    over.putalpha(alpha)
    layer.alpha_composite(over)


def paint_layer(c, before):
    Hh, Ww = before.shape[:2]
    layer = Image.new('RGBA', (Ww, Hh), (0, 0, 0, 0))
    # erase round 2's eyes: inside the boxes, every pixel that is not skin (and a few pixels round it) becomes skin
    from scipy import ndimage
    A = before.astype(float)
    off = np.abs(A - np.array(c['skin'], float)).max(2) > 16
    box = np.zeros(off.shape, bool)
    for x0, y0, x1, y1 in c['erase']:
        box[y0:y1, x0:x1] = True
    m = ndimage.binary_dilation(off & box, iterations=8) & box
    soft = ndimage.gaussian_filter(m.astype(float), 1.2)
    er = Image.fromarray((np.clip(soft * 1.6, 0, 1) * 255).astype(np.uint8))
    fill(layer, c['skin'], er)
    if 'part' in c:
        pm = Image.new('L', (Ww * SS, Hh * SS), 0)
        ImageDraw.Draw(pm).polygon([(x * SS, y * SS) for x, y in c['part']], fill=255)
        pm = pm.resize((Ww, Hh), Image.LANCZOS)
        fill(layer, c['hair'], pm)
    for (ex, ey), side in zip(c['eyes'], (-1, 1)):
        e = eye(c, side)
        layer.alpha_composite(e, (int(ex - e.width / 2), int(ey - e.height / 2)))
    return layer


def main():
    m, take, *kv = sys.argv[1:]
    c = dict(MODELS[m])
    for s in kv:
        k, v = s.split('=', 1)
        c[k] = json.loads(v)
    glb, tex = f'{P2}/rig/{m}-rigged.glb', f'{P2}/game/{m}/base.webp'
    out = f'{P3}/takes/{m}-{take}'
    os.makedirs(out, exist_ok=True)
    img, z = F.front(glb, tex)
    layer = paint_layer(c, img)
    layer.save(f'{out}/paint.png')
    F.project(glb, tex, np.asarray(layer), out=f'{out}/base.webp', zbuf=z)
    after, _ = F.front(glb, f'{out}/base.webp')
    Image.fromarray(after).save(f'{out}/front.png')
    json.dump({k: v for k, v in c.items()}, open(f'{out}/settings.json', 'w'), indent=1)
    print(out)


if __name__ == '__main__':
    main()
