"""Transplant the approved portrait's glasses onto ipa7a-1001 (CPU part of the mio-phone-3 fix).

1. The approved frame (colour mask of the taupe-grey frame, tools/portrait_candidates.mio_frame_mask) is warped onto the
   pick: each lens rigidly (similarity transform that maps the approved eye onto the pick's eye, same face scale), the bridge
   stretched between them, since the pick faces the camera more squarely than the portrait.
2. The pick's own silver frame is removed first (OpenCV Telea inpaint of its colour mask).
3. Hair strands that cross the frame (her long lock over the right lens) stay on top; see hair_mask.
Usage: composite.py <scale> <rot_deg> <out.png> [<mask_out.png>]"""
import sys
import numpy as np
import cv2
from PIL import Image
from scipy import ndimage

sys.path.insert(0, '/home/jorgen/repo/japanese/tools')
from portrait_candidates import mio_frame_mask  # noqa: E402
from geom import APPR, TGT, frame_mask  # noqa: E402

# eye centres from imgutils detect_eyes (portrait_candidates.eye_boxes): left = viewer's left
EA = np.array([[388.0, 487.5], [508.0, 458.5]])   # approved
ET = np.array([[410.0, 545.5], [546.0, 520.5]])   # ipa7a-1001
PADS = [(447, 560), (500, 555)]                    # her clear nose pads (kept)
LAST = {}
APADS = [(420, 496, 12), (461, 491, 13)]           # the portrait's clear nose pads (x, y, r)
PADS_TOO = False


def hair_mask(img):
    """Hair strands that hang in front of the frame, taken from the picture the frame goes onto.
    Round 3 took every dark pixel (v < 60) of the original pick in two bands over the lens tops. Over the left lens that
    caught the lower outline of her fringe and her upper lash line, which run along the frame's top bar, so the frame was
    cut there and the face showed through ("transparent frame on the top of the left glass", every composite attempt).
    A strand in front of the glasses crosses the frame; an outline or lash line runs along it. So only dark runs at
    least 11 px tall count (vertical opening), and only in the band where her long lock crosses the right lens and hinge."""
    T = np.asarray(img.convert('RGB') if hasattr(img, 'convert') else img)
    dark = T.max(-1).astype(int) < 60
    band = np.zeros_like(dark)
    band[440:620, 560:640] = True   # the long lock in front of her face, over the right lens and hinge
    tall = ndimage.binary_opening(dark, structure=np.ones((11, 1), bool))
    return (tall & band).astype(np.float32)


def fill_hidden_bar(A, am):
    """The portrait's fringe hangs in front of the top bar of her left lens (the lens on the image's right) between x 464
    and 518, so that stretch of bar isn't in the portrait at all: the colour mask stops at x 471 and starts again at 511.
    Transplanted onto ipa7a-1001, whose fringe ends higher, that left a gap in the bar that showed the face through it
    (Jørgen, rounds 3 and 4: "transparent frame on the top of the left glass", her left). Fill it with the bar's own
    cross-section (the median of columns 521-529, where the bar is whole), slid along the line joining the two ends."""
    cols = range(521, 530)
    prof = np.median(np.stack([A[414:438, x] for x in cols]), 0)
    pm = np.max(np.stack([am[414:438, x] for x in cols]), 0)
    y_end, y_start = 426.0, 441.0          # bar centre at x 519 and x 463
    keep = (pm > 0.5) & (prof.max(-1) < 175) & (prof.max(-1) - prof.min(-1) < 45)   # the bar, not the skin in the grown mask
    src = np.arange(414, 438, dtype=np.float32)
    k0, k1 = src[keep].min() - 0.5, src[keep].max() + 0.5   # the bar's extent in the profile
    for x in range(462, 521):
        t = (x - 463) / (519 - 463)
        dy = (1 - t) * y_start + t * y_end - 426   # sub-pixel shift, so the bar edge doesn't step
        rows = np.arange(int(np.floor(414 + dy)), int(np.ceil(438 + dy)) + 1)
        sy = rows - dy                              # where each row samples the profile
        cov = np.clip(np.minimum(sy - k0, k1 - sy) + 0.5, 0, 1)   # 1 inside the bar, fractional at its edges
        col = np.stack([np.interp(sy, src[keep], prof[keep][:, c]) for c in range(3)], -1)
        A[rows, x] = A[rows, x] * (1 - cov[:, None]) + col * cov[:, None]
        am[rows, x] = np.maximum(am[rows, x], cov)
    return A, am


def build(scale=1.0, rot=None, ramp=(0.30, 0.46)):
    A = np.asarray(Image.open(APPR).convert('RGB')).astype(np.float32)
    T = np.asarray(Image.open(TGT).convert('RGB'))
    H, W = T.shape[:2]
    am = mio_frame_mask(APPR, grow=2).astype(np.float32)
    # the frame's anti-aliased edge: soften the mask a little
    if PADS_TOO:  # the portrait's clear nose pads come along with the frame
        yy0, xx0 = np.mgrid[0:am.shape[0], 0:am.shape[1]]
        for px, py, r in APADS:
            am[(xx0 - px) ** 2 + (yy0 - py) ** 2 < r * r] = 1
    # no hair: the portrait's navy hair strands where they cross the frame (hinge) are not frame
    Av = A.max(-1)
    am[(A[..., 2] > A[..., 0] + 6) & (Av < 110)] = 0
    A, am = fill_hidden_bar(A, am)
    am = cv2.GaussianBlur(am, (0, 0), 0.7)

    ang_a = np.arctan2(*(EA[1] - EA[0])[::-1])
    ang_t = np.arctan2(*(ET[1] - ET[0])[::-1])
    th = (ang_t - ang_a) if rot is None else np.deg2rad(rot)
    c, s = np.cos(-th), np.sin(-th)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    maps = []
    for i in range(2):  # backward map: pick pixel -> approved pixel, per eye
        dx, dy = (xx - ET[i, 0]) / scale, (yy - ET[i, 1]) / scale
        maps.append((c * dx - s * dy + EA[i, 0], s * dx + c * dy + EA[i, 1]))
    u = (ET[1] - ET[0]) / np.linalg.norm(ET[1] - ET[0])
    t = ((xx - ET[0, 0]) * u[0] + (yy - ET[0, 1]) * u[1]) / np.linalg.norm(ET[1] - ET[0])
    w = np.clip((t - ramp[0]) / (ramp[1] - ramp[0]), 0, 1)
    w = w * w * (3 - 2 * w)
    mx = (1 - w) * maps[0][0] + w * maps[1][0]
    my = (1 - w) * maps[0][1] + w * maps[1][1]
    warped = cv2.remap(A, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    wm = cv2.remap(am, mx, my, cv2.INTER_LINEAR, borderValue=0)

    # remove the pick's own frame
    old0 = frame_mask(TGT, (330, 450, 625, 610), 95, 200, 40)
    eyes = np.zeros_like(old0)
    for x0, y0, x1, y1 in [(372, 529, 448, 562), (505, 503, 587, 538)]:
        eyes[y0:y1, x0:x1] = True
    # the frame with its dark outline (grown 4 px); inside the eyes only the grey frame itself (grown 1 px), so lashes stay
    old = (ndimage.binary_dilation(old0, iterations=4) & ~eyes) | (ndimage.binary_dilation(old0, iterations=1) & eyes)
    # her clear nose pads stay (the portrait's frame has the same pads)
    yy0, xx0 = np.mgrid[0:H, 0:W]
    for px, py in PADS:
        old &= ~((xx0 - px) ** 2 + (yy0 - py) ** 2 < 11 ** 2)
    clean = cv2.inpaint(T, old.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)

    alpha = wm * (1 - hair_mask(T))
    out = clean.astype(np.float32) * (1 - alpha[..., None]) + warped * alpha[..., None]
    LAST.update(alpha=alpha, old=old, warped=warped, wm=wm)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8)), (np.maximum(wm, old.astype(np.float32)) > 0.05)


if __name__ == '__main__':
    scale, rot, out = float(sys.argv[1]), (None if sys.argv[2] == 'auto' else float(sys.argv[2])), sys.argv[3]
    img, m = build(scale, rot)
    img.save(out)
    if len(sys.argv) > 4:
        Image.fromarray((m * 255).astype(np.uint8)).save(sys.argv[4])
