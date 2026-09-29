"""Eric in the old style: the old approved portrait (art/production/RF/mc-it-guy.png = art/approved/mc/mc-it-guy-after.webp at
full size, from gallery M-02-it-guy-601), changed as little as possible.
  derim   red rim light off by local colour correction (derim.py), CPU
  hood    edge repaint of the one patch the colour fix leaves smeared (the lit right side of the hood), GPU
  faces   face-only repaints with his glasses pasted back pixel for pixel, then the red-line fix again, GPU
          (no iris recolour: the repaints come out blue already, and match_iris painted his lower lids blue)
Uses tools/portrait_candidates.py (face_expr, inpaint_wf, match_iris). Work files in $WORK (default: /tmp/claude-1000/eric-oldstyle).
Run: ~/ai/sd/venv/bin/python make.py derim|hood|faces|all"""
import sys, os, json, shutil, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import portrait_candidates as pc
import comfy
from production import Q

WORK = os.environ.get('WORK', '/tmp/claude-1000/eric-oldstyle')
os.makedirs(WORK, exist_ok=True)
pc.OWNER = 'eric-oldstyle-agent'
pc.PC = WORK  # face_expr's tmp files
pc.LOG = os.path.join(HERE, 'log.json')
SRC = os.path.join(ROOT, 'art', 'production', 'RF', 'mc-it-guy.png')
IRIS_REF = os.path.join(ROOT, 'art', 'approved', 'mc', 'eric-v2-734.webp')
NEG = pc.NEG + ', closed eyes, rim light, red rim light, backlighting'
DESC = 'Eric, a 34-year-old Scandinavian man, short dark-blond hair, short dark-blond beard, fair pale skin, glasses with clear lenses, blue eyes'
FACES = {  # name: (words, extra negative, denoise)
    'neutral': ('calm neutral expression, eyes open looking at the viewer, mouth closed', '', 0.72),
    'surprised': ('surprised, eyes wide open, eyebrows raised, mouth slightly open', '', 0.72),
    # the 811 wording Jørgen liked on 734
    'tired': ('weary tired expression, half-lidded eyes looking at the viewer, mouth a flat line with slightly drooping corners, no smile',
              ', smile, smiling, grin, blush, flushed cheeks, drunk', 0.72),
}
SEEDS = (831, 832, 833, 834)


def glasses_keep(path):
    """His glasses frame by colour: the frame is a cool blue-grey charcoal (hue ~197), the brows, lashes and hair are warm.
    Pieces over 150 px inside the eye band, closed and grown 3 px (like Mio's), plus the bridge and the two nose pads."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    hsv = pc._rgb2hsv(a)
    H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    yy, xx = np.mgrid[:V.shape[0], :V.shape[1]]
    box = (xx >= 418) & (xx <= 668) & (yy >= 393) & (yy <= 500)
    m = box & (((H > 120) & (H < 280)) | (S < 0.1)) & (V < 0.75)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = np.isin(lab, [i + 1 for i in range(n) if sizes[i] > 150])
    extra = Image.new('L', (V.shape[1], V.shape[0]), 0)
    d = ImageDraw.Draw(extra)
    d.rectangle((533, 419, 553, 436), fill=255)  # bridge
    d.ellipse((498, 441, 518, 463), fill=255); d.ellipse((550, 450, 568, 472), fill=255)  # nose pads
    k = k | (np.asarray(extra) > 0)
    k = ndimage.binary_closing(k, iterations=2)
    return ndimage.binary_dilation(k, iterations=3)


def derim():
    out = os.path.join(WORK, 'base-derim.png')
    subprocess.run([sys.executable, os.path.join(HERE, 'derim.py'), SRC, out, os.path.join(WORK, 'derim-debug.png')], check=True)
    return out


HOOD = (560, 540, 800, 780)  # crop around the lit right side of the hood and the right shoulder seam


def hood(seed=841, denoise=0.5):
    """Masked img2img over the band pixels derim.py recoloured on the hood (only there), at a middling denoise so the shapes stay."""
    base = os.path.join(WORK, 'base-derim.png')
    out = os.path.join(WORK, f'base-derim-hood-{seed}.png')
    if os.path.exists(out):
        return out
    pc.check_lock()
    band = np.asarray(Image.open(os.path.join(WORK, 'derim-debug.png')).convert('RGB'))
    band = (band[..., 0] == 255) & (band[..., 1] == 220)
    bm = np.zeros(band.shape, bool)
    x0, y0, x1, y1 = HOOD
    bm[y0:y1, x0:x1] = band[y0:y1, x0:x1]
    bm = ndimage.binary_dilation(bm, iterations=6)
    img = Image.open(base).convert('RGB')
    UP = 1024
    crop = img.crop(HOOD).resize((UP, UP), Image.LANCZOS)
    mk = Image.fromarray((bm * 255).astype('uint8')).crop(HOOD).resize((UP, UP), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10))
    cp, mp, raw = (os.path.join(WORK, f) for f in ('hood-crop.png', 'hood-mask.png', 'hood-raw.png'))
    crop.save(cp); mk.convert('RGB').save(mp)
    p = f'{Q}, safe, 1boy, solo, close-up of the shoulder of a man, a navy blazer over a dark slate-blue hoodie with the hood down, flat even studio light, plain light grey background'
    wf = pc.inpaint_wf(cp, mp, p, seed, denoise, NEG)
    comfy.run(wf, raw)
    json.dump(wf, open(os.path.join(HERE, 'workflow-hood-repaint.json'), 'w'), indent=1)
    new = Image.open(raw).convert('RGB').resize((x1 - x0, y1 - y0), Image.LANCZOS)
    pm = Image.fromarray((bm * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(3))
    full = img.copy(); full.paste(new, HOOD[:2])
    Image.composite(full, img, pm).save(out)
    pc.log({'file': os.path.relpath(out, ROOT), 'kind': 'hood edge repaint', 'base': os.path.relpath(base, ROOT), 'prompt': p, 'negative': NEG,
            'seed': seed, 'denoise': denoise, 'crop': HOOD})
    print('ok hood', seed, flush=True)
    return out


def faces(base, seeds=SEEDS, names=None, tag=''):
    keep = glasses_keep(SRC)
    wfsave = os.path.join(ROOT, 'tools', 'workflows', 'anima-face-expression.json')
    saved = open(wfsave).read() if os.path.exists(wfsave) else None
    try:
        for name, (words, xneg, dn) in FACES.items():
            if names and name not in names:
                continue
            dn = float(os.environ.get('DENOISE', dn))
            for seed in seeds:
                raw = os.path.join(WORK, f'eric-old-{name}{tag}-{seed}-raw.png')
                pc.face_expr(base, DESC, name, words, raw, seed=seed, denoise=dn, neg=NEG + xneg, keep=keep)
                out = os.path.join(WORK, f'eric-old-{name}{tag}-{seed}.png')
                if not os.path.exists(out):  # the repaint can draw the orange rim again along the hood: same colour fix, lines only
                    subprocess.run([sys.executable, os.path.join(HERE, 'derim.py'), raw, out], check=True, env=dict(os.environ, LINES_ONLY='1'))
    finally:  # face_expr writes its workflow into tools/workflows; keep that file as it was and save ours here
        if hasattr(pc.inpaint_wf, 'last'):
            json.dump(pc.inpaint_wf.last, open(os.path.join(HERE, 'workflow-face-repaint.json'), 'w'), indent=1)
        if saved is not None:
            open(wfsave, 'w').write(saved)
        elif os.path.exists(wfsave):
            os.remove(wfsave)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd in ('derim', 'all'):
        derim()
    if cmd in ('hood', 'all'):
        hood(seed=842)  # 841 (grey hoodie wording) came out cream; 842 with 'dark slate-blue hoodie' picked, 843 had a teal streak
    if cmd in ('faces', 'all'):
        faces(os.environ.get('BASE') or os.path.join(WORK, 'base-derim-hood-842.png'), names=sys.argv[2:] or None, tag=os.environ.get('TAG', ''))
