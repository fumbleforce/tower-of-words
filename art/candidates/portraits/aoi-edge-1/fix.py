"""aoi-edge-1: repaint the pale cream band along Aoi's left side (image right), on her hair, collar and jacket.

The band is painted, fully opaque, just inside her outline (left from the render's cream background). This finds
the pale runs (pixels that are neither pink hair, teal jacket black outline nor skin, within 40 px of the cut-out edge, on the right of the picture) that hold at
least 40 cream pixels within 16 px of the edge (so specks on the neck skin stay), and fills each one with the colour of the nearest
opaque hair or jacket pixel further in (never from the dark outline or the transparent outside). Soft edge pixels
(alpha under 255) in the band, and the light or grey blend pixels on its outer rim, get the outline's dark colour. Alpha and every other pixel stay as they are.

Run: ~/ai/consist/.venv/bin/python fix.py IN.webp OUT.webp [mask.png]"""
import sys
import numpy as np, cv2
from scipy import ndimage
from PIL import Image

X0 = 230           # the right part of the picture and the top of her head; her image-left rim is purple, not cream
Y1 = 660           # stop above the cuffs, whose white stripes are real
NEAR = 16          # px from the cut-out edge, for the cream seed
WIDE = 40          # px from the edge the pale run may reach
MIN_RUN = 40       # px in a connected run
OUTLINE = (10, 8, 10)  # her outline colour


def band(im):
    r, g, b, a = [im[..., i].astype(int) for i in range(4)]
    outside = (a < 128).astype(np.uint8)
    dist = cv2.distanceTransform(1 - outside, cv2.DIST_L2, 3)
    lum = (r * 299 + g * 587 + b * 114) // 1000
    region = np.zeros(r.shape, bool)
    region[:Y1, X0:] = True
    cream = (r > 190) & (g > 160) & (b > 120) & ((r - b) < 110) & (a > 0) & (dist < NEAR) & region
    # the whole pale run: anything that is neither the hair's pink, the jacket's teal nor the black outline (the band and its greyish soft edges) up to WIDE px in
    coloured = ((b > g + 30) & (r > g + 30)) | ((b > r + 30) & (g > r + 30))   # pink hair, teal jacket
    skin = ((g - b) < 12) & ((r - g) > 20)        # her neck and ear: green about equal to blue; the cream has green 20-30 over blue
    pale = ~coloured & ~skin & (lum >= 90) & (a > 0) & (dist < WIDE) & region
    n, lab, stats, _ = cv2.connectedComponentsWithStats(pale.astype(np.uint8), connectivity=8)
    keep = np.zeros_like(pale)
    for i in range(1, n):
        comp = lab == i
        if (comp & cream).sum() >= MIN_RUN:
            keep |= comp
    return keep, dist, lum, coloured


def main(src, dst, mask_out=None):
    im = np.array(Image.open(src).convert('RGBA'))
    m, dist, lum, coloured = band(im)
    a = im[..., 3]
    outline = (dist < WIDE) & (lum < 30)   # the black outline; the dark teal jacket (lum ~48) stays a source
    known = (a == 255) & ~m & ~outline & coloured
    _, (iy, ix) = ndimage.distance_transform_edt(~known, return_indices=True)
    fill = im[iy, ix, :3]
    # soften the nearest-pixel streaks, averaging over band pixels only (no outline or outside pulled in)
    w = m.astype(np.float32)
    num = cv2.GaussianBlur(fill.astype(np.float32) * w[..., None], (0, 0), 1.5)
    den = cv2.GaussianBlur(w, (0, 0), 1.5)[..., None]
    fill = np.clip(num / np.maximum(den, 1e-6), 0, 255).astype(np.uint8)
    out = im.copy()
    out[m, :3] = fill[m]
    # the outer rim of the band: soft pixels in it, and light or grey pixels 3 px or less from the outside next to
    # it (the blend of cream and outline), become the outline colour
    by = cv2.dilate(m.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    rim = (m & (a < 255)) | (by & (dist <= 3) & ~coloured & (lum >= 45) & (a > 0))
    out[rim, :3] = OUTLINE
    m = m | rim
    Image.fromarray(out).save(dst, 'WEBP', quality=90, method=6) if dst.endswith('.webp') else Image.fromarray(out).save(dst)
    if mask_out:
        Image.fromarray((m * 255).astype(np.uint8)).save(mask_out)
    print(f'{src} -> {dst}: {int(m.sum())} px repainted, alpha unchanged')


if __name__ == '__main__':
    main(*sys.argv[1:])
