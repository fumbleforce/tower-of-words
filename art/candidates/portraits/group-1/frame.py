"""Cut each character out of a group shot and frame them on the game portrait canvas, for a 1:1 comparison with the
standalone portraits.

Canvas 597x768 with the face placed on Kenji's face box (FACE.kenji in game3d/js/ui/portraits.js: x 221-384, y 167-335,
face height 168), the same rule every group-derived portrait here follows. The face box is imgutils' detector (the one
imgqa uses); faces are matched to characters left to right (Eric, Mio, Kenji, Mori, Emi).

Cut-out: BiRefNet-HR matting on the whole group picture (tools/rmbg_local.py). tools/matte_refine.py is not used: it
needs a plain grey backdrop and this one is the office. Neighbours are split off along the vertical line halfway between
two faces, then only the matte region joined to this face is kept.

Usage: ~/ai/consist/.venv/bin/python art/candidates/portraits/group-1/frame.py <group.png> [<tag>]
Writes art/production/PC/group-1/<tag>-<who>-cut.png and webp copies here: group1-<tag>-<who>.webp (on grey, for the sheet)
and group1-<tag>-<who>-cut.webp (RGBA)."""
import os, sys, subprocess
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(ROOT, 'art/production/PC/group-1')
ORDER = ['eric', 'mio', 'kenji', 'mori', 'emi']
CW, CH, KF = 597, 768, (221, 167, 384, 335)
GREY = (200, 200, 205)


def faces(img):
    from imgutils.detect import detect_faces
    fs = [f[0] for f in detect_faces(img) if f[2] > 0.5]
    fs = sorted(fs, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1]))[:5]
    return sorted(fs, key=lambda b: b[0])


def matte(src):
    out = os.path.join(RAW, 'matte')
    dst = os.path.join(out, os.path.basename(src))
    if not os.path.exists(dst):
        subprocess.run(['python3', os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting',
                        src, '--out', out], check=True)
    return np.asarray(Image.open(dst).convert('RGBA'))[..., 3]


def main(src, tag):
    img = Image.open(src).convert('RGB')
    fs = faces(img)
    if len(fs) != 5:
        sys.exit(f'{len(fs)} faces found in {src}, need 5: {fs}')
    a = matte(src).astype(np.float32) / 255
    Hh, Ww = a.shape
    cx = [(f[0] + f[2]) / 2 for f in fs]
    cuts = [0] + [(cx[i] + cx[i + 1]) / 2 for i in range(4)] + [Ww]
    rgba = np.dstack([np.asarray(img), np.zeros((Hh, Ww), np.uint8)])
    out = {}
    for i, who in enumerate(ORDER):
        x0, x1 = int(cuts[i]), int(cuts[i + 1])
        m = np.zeros_like(a)
        m[:, x0:x1] = a[:, x0:x1]
        lab, _ = ndimage.label(m > 0.5)
        fx, fy = int(cx[i]), int((fs[i][1] + fs[i][3]) / 2)
        keep = lab == lab[fy, fx] if lab[fy, fx] else lab > 0
        keep = ndimage.binary_dilation(keep, iterations=3)
        al = (m * keep * 255).astype(np.uint8)
        fig = rgba.copy()
        fig[..., 3] = al
        fig = Image.fromarray(fig, 'RGBA')
        # scale and shift so this face box lands on Kenji's
        f = fs[i]
        s = (KF[3] - KF[1]) / (f[3] - f[1])
        fig = fig.resize((round(Ww * s), round(Hh * s)), Image.LANCZOS)
        ox = round((KF[0] + KF[2]) / 2 - (f[0] + f[2]) / 2 * s)
        oy = round(KF[3] - f[3] * s)
        can = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        can.alpha_composite(fig, (ox, oy))
        can.save(os.path.join(RAW, f'{tag}-{who}-cut.png'))
        can.save(os.path.join(HERE, f'group1-{tag}-{who}-cut.webp'), lossless=True)
        g = Image.new('RGBA', (CW, CH), GREY + (255,))
        g.alpha_composite(can)
        g.convert('RGB').save(os.path.join(HERE, f'group1-{tag}-{who}.webp'), quality=92)
        out[who] = {'face': [round(v) for v in f], 'scale': round(s, 3)}
        print(who, out[who], flush=True)
    return out


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(os.path.basename(sys.argv[1]))[0])
