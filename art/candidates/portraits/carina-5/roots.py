"""carina-5 root / stripe pass. The model would not draw a thin dark root band or thin dark stripes in blonde hair at any prompt weight
(attempts a1-a8, prompts-a*.json). So: a2 render + a masked img2img (RDBT, tools/workflows/anima-img2img-masked.json) where only
the hair near the forehead hairline (root band) or a few thin near-vertical streaks of the hair (stripes) are repainted dark brown.
The mask is built by geometry (forehead skin, distance to it, ragged edge), the repaint is the model's own, so linework and cel steps match.
Usage: python roots.py <name> <in.webp> root|stripe <seed> [denoise]   (needs the GPU lock)"""
import sys, os, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
HERE = os.path.dirname(os.path.abspath(__file__))
def geometry(rgb):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV); h, s, v = [hsv[..., i].astype(int) for i in range(3)]
    bg = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[:, :8].reshape(-1, 3)]), axis=0)
    fg = np.abs(rgb.astype(int) - bg).sum(2) > 40
    skin = (h <= 13) & (s >= 35) & (s <= 130) & (v >= 150)
    hair0 = (h >= 13) & (h <= 27) & (s >= 105) & (v >= 70)
    skin[int(rgb.shape[0] * 0.55):] = False
    sk, n = ndi.label(ndi.binary_opening(skin, iterations=1) & ~ndi.binary_dilation(hair0, iterations=2))
    sizes = ndi.sum(sk > 0, sk, range(1, n + 1)); face = sk == (1 + int(np.argmax(sizes)))
    ys = np.where(face.any(1))[0]; y0, y1 = ys[0], ys[-1]
    xsf = np.where(face[int(y0 + 0.2 * (y1 - y0))])[0] if False else None
    fore = face.copy(); fore[int(y0 + 0.34 * (y1 - y0)):] = False
    hull = cv2.convexHull(np.argwhere(fore)[:, ::-1].astype(np.int32)); fm = np.zeros(face.shape, np.uint8); cv2.fillConvexPoly(fm, hull, 1)
    fore = fm.astype(bool)                                  # forehead with the brows inside
    fh = cv2.convexHull(np.argwhere(face)[:, ::-1].astype(np.int32)); fh_m = np.zeros(face.shape, np.uint8); cv2.fillConvexPoly(fh_m, fh, 1)
    xs = np.where(fore.any(0))[0]; fw = xs[-1] - xs[0]
    return fg, face, fore, fh_m.astype(bool), (y0, y0 + int(fw * 1.35))
def fg_filled(fg):
    return ndi.binary_fill_holes(ndi.binary_closing(fg, iterations=4))
def build_mask(rgb, kind, seed):
    """returns a float alpha (0..1): the root band (fading out toward the temples) and, for 'stripe', thin streaks in the hair."""
    rng = np.random.default_rng(seed); fg, face, fore, faceh, (y0, y1) = geometry(rgb)
    fsize = (y1 - y0)                                         # face height in px
    noise = cv2.GaussianBlur(rng.random(face.shape).astype(np.float32), (0, 0), 18); noise = (noise - noise.mean()) / (noise.std() + 1e-6)
    yy = np.arange(face.shape[0])[:, None]
    hairish = fg_filled(fg) & ~ndi.binary_dilation(face, iterations=3) & ~faceh & (yy < y1 + 0.35 * fsize)
    d = ndi.distance_transform_edt(~fore); T = 0.17 * fsize                       # about a thumb-width of root
    root = hairish & (d < (T if kind == 'root' else 0.8 * T) * (1 + 0.3 * noise))
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hue = (hsv[..., 0] >= 13) & (hsv[..., 0] <= 28) & (hsv[..., 1] >= 100)    # only blonde / shaded blonde, never skin, ear or glasses
    root = ndi.binary_opening(ndi.binary_fill_holes(ndi.binary_closing(root, iterations=3)), iterations=1) & ~faceh
    root &= ndi.binary_closing(hue, iterations=3) & ~ndi.binary_dilation(ndi.binary_opening(hue == 0, iterations=0) & (hsv[..., 1] < 100) & (yy > y0 + 0.1 * fsize), iterations=2)
    vfade = np.clip((y0 + 0.16 * fsize * HIGH - yy) / (0.12 * fsize * HIGH), 0, 1)       # roots fade out toward the temples instead of ending on a line
    alpha = cv2.GaussianBlur(root.astype(np.float32), (0, 0), 1.3) * vfade
    if kind == 'stripe':
        xs = np.where(fg.any(0))[0]; cx = (xs[0] + xs[-1]) / 2
        cand = np.argwhere(hairish & (d > T) & (yy < y0 + 0.25 * fsize))
        st = np.zeros(face.shape, np.uint8)
        if len(cand):
            for i in range(6):
                y, x = cand[rng.integers(len(cand))]; pts = [(x, y)]; lean = np.sign(x - cx) * (0.12 + 0.2 * rng.random()); L = int(fsize * (0.35 + 0.4 * rng.random()))
                for j in range(L // 6):
                    x += lean * 6 + rng.normal(0, 0.35); y += 6; pts.append((x, y))
                cv2.polylines(st, [np.array(pts, np.int32)], False, 1, int(max(3, fsize * 0.024)))
        st = (st > 0) & hairish & ndi.binary_opening(hue, iterations=1)
        alpha = np.maximum(alpha, cv2.GaussianBlur(st.astype(np.float32), (0, 0), 1.0))
    return alpha, face, fore
HIGH = float(os.environ.get('ROOT_HIGH', '1'))   # 1 = default; <1 ends the roots higher up (re-roll for the glasses options, whose temple hair got dark)
DARK = np.array([72, 44, 26], float)    # dark brown, RGB; the golden mid-tone of the render maps onto this, shadow and highlight steps keep their ratio
def recolor(rgb, m):
    f = rgb.astype(float); lum = f @ [0.299, 0.587, 0.114]
    ref = np.percentile(lum[m > 0.5], 60) if (m > 0.5).any() else 150
    k = np.clip(lum / ref, 0.0, 1.15)[..., None]
    dark = np.clip(DARK[None, None, :] * k, 0, 255)
    # pixels that are already linework (very dark) stay as they are
    a = m.astype(np.float32)[..., None] * (lum > 45)[..., None]
    return (f * (1 - a) + dark * a).clip(0, 255).astype(np.uint8)
def make(inp, out, kind, seed):
    rgb = np.asarray(Image.open(inp).convert('RGB')); m, face, fore = build_mask(rgb, kind, seed)
    Image.fromarray(recolor(rgb, m)).save(out, quality=92)
    return m
if __name__ == '__main__':
    inp, out, kind = sys.argv[1:4]; seed = int(sys.argv[4]) if len(sys.argv) > 4 else 1
    m = make(inp, out, kind, seed); print(out, 'mask px', int((m > 0.5).sum()))
