"""CPU steps of mio-ref-clean (see gen.py): step 02 shadow out; the cut-out of the final.
  ~/ai/consist/.venv/bin/python clean.py shadow   (needs the isnet-anime cut-out of step 01 in $SCRATCH/cut1/)
  ~/ai/consist/.venv/bin/python clean.py cutout   (final.png -> final-cutout.png)"""
import os, sys, json, subprocess
import numpy as np
from PIL import Image, ImageFilter

OUT = '/home/jorgen/repo/japanese/art/parts/style-concepts/mio-ref-clean'
HERE = os.path.dirname(os.path.abspath(__file__))
SCRATCH = os.environ.get('SCRATCH', '/tmp/claude-1000/mio-ref-clean')


def bg_fit(img, keep):
    """Quadratic fit of the background colour over the pixels in `keep` (the plain floor and wall)."""
    h, w = keep.shape
    yy, xx = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    A = lambda y, x: np.stack([np.ones_like(y), y, x, y * y, x * x, x * y], -1)
    sel = keep[::4, ::4]
    M = A(yy[::4, ::4][sel], xx[::4, ::4][sel])
    fit = np.zeros(img.shape, float)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(M, img[::4, ::4, c][sel], rcond=None)
        fit[..., c] = A(yy, xx) @ coef
    return fit


def cutout_alpha(png):
    os.makedirs(SCRATCH, exist_ok=True)
    subprocess.run(['python3', '/home/jorgen/repo/japanese/tools/rmbg_local.py', '--method', 'isnet-anime', png, '--out', SCRATCH], check=True)
    return np.array(Image.open(os.path.join(SCRATCH, os.path.basename(png))))[..., 3].astype(float)


def shadow():
    src = f'{OUT}/step-01-upscale.png'
    img = np.array(Image.open(src).convert('RGB')).astype(float)
    alpha = cutout_alpha(src)
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    floor = yy > 2400
    # the floor shadow falls to her left (image right) of her left shoe; that shoe's outer edge runs from (1730, 2740) to (1760, 2873)
    edge = 1733 + 0.2256 * (yy - 2740)
    hard = floor & (((yy > 2725) & (xx > edge)) | (xx > 1765))
    fit = bg_fit(img, (alpha < 2) & ~hard)
    lum = img.mean(-1) - fit.mean(-1)
    blue, green = img[..., 2] - img[..., 0], img[..., 1] - img[..., 0]
    # the shadow is blue-teal (about 60,85,118); the shoe soles and outlines are grey-blue with no green (59,59,88)
    soft = (yy > 2720) & (alpha < 245) & (lum < -6) & (blue > 40) & (green > 15)
    hard = Image.fromarray(hard.astype(np.uint8) * 255)
    mask = np.maximum(np.array(hard), soft.astype(np.uint8) * 255)
    m = Image.fromarray(mask).filter(ImageFilter.GaussianBlur(1.5))
    m = np.array(m)[..., None] / 255.0
    out = img * (1 - m) + fit * m
    Image.fromarray(out.round().clip(0, 255).astype(np.uint8)).save(f'{OUT}/step-02-no-shadow.png')
    Image.fromarray((m[..., 0] * 255).astype(np.uint8)).save(f'{SCRATCH}/mask-02-shadow.png')
    log = json.load(open(f'{HERE}/prompts.json'))
    log['step-02-no-shadow'] = {'method': 'CPU: isnet-anime cut-out of step 01 to find the figure; floor pixels right of her left (image right) shoe outer edge, a line from (1730,2740) to (1760,2873), plus blue-teal shadow-coloured pixels below y 2720 and outside the figure (cut-out alpha < 245; green-red > 15, blue-red > 40; the soles have no green), filled with a quadratic fit of the background colour (feather 1.5 px). Figure pixels untouched.', 'script': 'clean.py shadow'}
    json.dump(log, open(f'{HERE}/prompts.json', 'w'), indent=1)


def cutout():
    """final.png -> final-cutout.png: isnet-anime cut-out, then tools/matte_refine.py (opens the background pockets
    between her hair and the hood)."""
    src = f'{OUT}/final.png'
    cutout_alpha(src)
    subprocess.run([os.path.expanduser('~/ai/rmbg/rembg/bin/python'), '/home/jorgen/repo/japanese/tools/matte_refine.py', src,
                    os.path.join(SCRATCH, 'final.png'), f'{OUT}/final-cutout.png'], check=True)


def mask_strings():
    """Mask for step 03: the two drawstrings, their eyelets and the shadow they cast, as light pixels in the strip
    x 1460-1620, y 850-1450 (the hoodie there is dark), grown 14 px, kept off her neck."""
    img = np.array(Image.open(f'{OUT}/step-02-no-shadow.png').convert('RGB')).astype(float)
    lum = img.mean(-1)
    m = np.zeros(lum.shape, np.uint8)
    m[876:1450, 1460:1620] = (lum[876:1450, 1460:1620] > 110) * 255
    m[876:900, 1512:1562] = 0                                        # the bottom of her neck between the eyelets
    m = np.array(Image.fromarray(m).filter(ImageFilter.MaxFilter(29)))
    m[:868] = 0
    m[:897, 1512:1562] = 0
    mi = Image.fromarray(m)
    os.makedirs(SCRATCH, exist_ok=True)
    mi.save(f'{OUT}/mask-03-strings.png')


def prefill_strings():
    """Attempt 03c (CPU): inside a rectangle round both strings and the shadows they cast (x 1450-1630, y 874-1465,
    stepping round the bottom of her neck), each row is a straight blend from the hoodie colour just left of it to the
    colour just right of it. The model in 03d/03e then starts from a picture with no strings, and the rectangle (its
    mask) does not hint at strings the way the string-shaped mask of 03a/03b did."""
    img = np.array(Image.open(f'{OUT}/step-02-no-shadow.png').convert('RGB')).astype(float)
    rect = np.zeros(img.shape[:2], np.uint8)
    x0, x1 = 1450, 1630
    rect[874:1465, x0:x1] = 255
    rect[:899, 1512:1562] = 0
    out = img.copy()
    t = np.linspace(0, 1, x1 - x0)[:, None]
    for y in range(874, 1465):
        cols = np.where(rect[y, x0:x1] > 0)[0] + x0
        for seg in np.split(cols, np.where(np.diff(cols) > 1)[0] + 1):
            a, b = seg[0] - 1, seg[-1] + 1
            L, R = img[y, a - 3:a + 1].mean(0), img[y, b:b + 4].mean(0)
            tt = np.linspace(0, 1, len(seg))[:, None]
            out[y, seg] = L * (1 - tt) + R * tt
    Image.fromarray(out.round().astype(np.uint8)).save(f'{OUT}/step-03c-no-strings-rowfill.png')
    Image.fromarray(rect).save(f'{OUT}/mask-03-rect.png')


def mask_glasses():
    """Mask for step 04: both lenses (ellipses round the frame rims), the bridge and the arms to her ear and hair.
    Her right lens is image left. Grown 10 px and feathered by the inpaint paste."""
    from PIL import ImageDraw
    m = Image.new('L', (3072, 3072), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((1362, 552, 1514, 676), fill=255)      # her right lens (image left)
    d.ellipse((1550, 552, 1722, 676), fill=255)      # her left lens (image right)
    d.rectangle((1500, 578, 1565, 612), fill=255)    # bridge
    d.rectangle((1330, 585, 1370, 615), fill=255)    # arm into the hair, her right (image left)
    d.rectangle((1712, 585, 1745, 618), fill=255)    # arm to her left ear (image right)
    m.filter(ImageFilter.MaxFilter(21)).save(f'{OUT}/mask-04-glasses.png')


LENSES = [((1443, 615), (73, 52)), ((1636, 614), (74, 52))]     # her right lens (image left), her left lens (image right): centre, radii of the rim


def prefill_glasses():
    """Attempt 04c (CPU): find the frame (dark pixels on a band round each rim ellipse, on the bridge, and on the arm to her
    left ear, image right), grow it 3 px and fill it from the pixels round it (OpenCV Telea). Also writes the mask for the
    model pass in 04d/04e: the frame grown 12 px, so the model only redraws the strip where the frame was."""
    import cv2
    img = cv2.imread(f'{OUT}/step-03-no-strings.png')
    lum = img.mean(-1)
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]]
    band = np.zeros(lum.shape, bool)
    for (cx, cy), (rx, ry) in LENSES:
        r = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        band |= np.abs(r - 0.93) < 0.09
    band[585:618, 1512:1567] = True        # bridge
    band[588:615, 1705:1745] = True        # arm to her left ear (image right)
    frame = (band & (lum < 110)).astype(np.uint8) * 255
    k = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * n + 1, 2 * n + 1))
    fill = cv2.dilate(frame, k(3))
    out = cv2.inpaint(img, fill, 7, cv2.INPAINT_TELEA)
    cv2.imwrite(f'{OUT}/step-04c-no-glasses-cvfill.png', out)
    cv2.imwrite(f'{OUT}/mask-04-frame.png', cv2.dilate(frame, k(12)))


if __name__ == '__main__':
    globals()[sys.argv[1].replace("-", "_")]()
