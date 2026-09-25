"""Asset prep for the anime opening (CPU only, so it never competes for the GPU):
  upscale  <in.png> <out.png> [scale]   RealESRGAN x4 anime (spandrel) then Lanczos down to `scale` (default 2)
  sprites                               approved sprites: upscale 2x, cut out with BiRefNet HR matting -> art/opening/sprites/
  depth    <in.png> ...                 Depth Anything V2 Large -> <in>-d.png (near = white), smoothed and edge-grown for parallax
  web                                   write proto2/opening/img/*.webp (+ lite/) from art/opening/final/*.png
Run with ~/ai/sd/venv/bin/python tools/opening/prep.py <cmd> ..."""
import os, sys, subprocess, glob
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
ART = os.path.join(ROOT, 'art', 'opening')
UPS = os.path.expanduser('~/ai/ComfyUI/models/upscale_models/RealESRGAN_x4plus_anime_6B.pth')
SPRITES = {
    'mc': 'art/production/M/02-it-guy-601.png', 'emi': 'art/slice/emi2/r3/rdbt/work-41.png', 'emilaugh': 'art/slice/ch/emi-laughing.png',
    'mio': 'art/production/B/mio-bored.png', 'rei': 'art/production/B/rei-smirk.png', 'aoi': 'art/production/B/aoi-grin.png',
    'kaori': 'art/production/B/kaori-smile.png', 'kuro': 'art/production/A/luna-s101.png',
}
_model = None


def upscale(src, dst, scale=2.0):
    global _model
    import torch, spandrel
    torch.set_num_threads(os.cpu_count())
    if _model is None:
        _model = spandrel.ModelLoader().load_from_file(UPS).eval()
    im = Image.open(src).convert('RGB')
    x = torch.from_numpy(np.asarray(im)).permute(2, 0, 1).float().unsqueeze(0) / 255
    out = []
    T = 256  # tiles with overlap
    _, _, h, w = x.shape
    y4 = torch.zeros(1, 3, h * 4, w * 4)
    wt = torch.zeros(1, 1, h * 4, w * 4)
    ov = 16
    with torch.no_grad():
        for ty in range(0, h, T):
            for tx in range(0, w, T):
                y0, x0 = max(0, ty - ov), max(0, tx - ov)
                y1, x1 = min(h, ty + T + ov), min(w, tx + T + ov)
                r = _model(x[:, :, y0:y1, x0:x1]).clamp(0, 1)
                y4[:, :, y0 * 4:y1 * 4, x0 * 4:x1 * 4] += r
                wt[:, :, y0 * 4:y1 * 4, x0 * 4:x1 * 4] += 1
    y4 /= wt
    big = Image.fromarray((y4[0].permute(1, 2, 0).numpy() * 255 + 0.5).astype(np.uint8))
    big.resize((int(w * scale), int(h * scale)), Image.LANCZOS).save(dst)
    return dst


def cutout(src, dst):
    """BiRefNet HR matting in its own venv (soft alpha for hair)."""
    tmp = os.path.join(ART, 'tmp-cut')
    os.makedirs(tmp, exist_ok=True)
    subprocess.run([os.path.expanduser('~/ai/rmbg/hf/bin/python'), os.path.join(ROOT, 'tools', 'rmbg_local.py'), '--method', 'birefnet-hr-matting',
                    src, '--out', tmp], check=True)
    os.replace(os.path.join(tmp, os.path.basename(src)), dst)


def depth(paths):
    import torch
    from transformers import pipeline
    torch.set_num_threads(os.cpu_count())
    p = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Large-hf', device='cpu')
    for f in paths:
        im = Image.open(f).convert('RGB')
        d = np.asarray(p(im)['depth'].resize(im.size, Image.BICUBIC)).astype(np.float32)
        d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        dm = Image.fromarray((d * 255).astype(np.uint8))
        # grow near regions a little (max filter) so foreground edges carry their own pixels, then smooth
        dm = dm.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(6))
        out = f[:-4] + '-d.png'
        dm.save(out)
        print('depth', out, flush=True)


# final plate name -> (source under art/opening or repo, make a depth map?)
FINAL = {
    'sky': ('hires/sky-tall.png', False), 'bay': ('hires/bay-side2.png', True), 'oncoming': ('hires/oncoming2.png', False),
    'forward': ('hires/forward.png', True), 'luggage': ('hires/luggage.png', False), 'cabin': ('hires/interior.png', True),
    'pano': ('hires/window-pano.png', True), 'mcwin': ('hires/mc-window2.png', True), 'skyline': ('hires/skyline.png', True),
    'station': ('hires/station2.png', True), 'gate': ('hires/gate.png', True),
    'towerup': ('hires/tower-up.png', False), 'copy': ('hires/copyroom.png', True), 'basement': ('BASEMENT', True),
    'miogame': ('hires/mio-gaming.png', True), 'button': ('hires/elevator-button.png', True), 'doors': ('hires/elevator-doors2.png', True),
    'stairs': ('hires/stairs.png', True),
    's-mc': ('sprites/mc.png', False), 's-mcopen': ('sprites/mc-open.png', False), 's-emi': ('sprites/emi.png', False),
    's-emi-blink': ('sprites/emi-blink.png', False), 's-emilaugh': ('sprites/emilaugh.png', False), 's-mio': ('sprites/mio.png', False),
    's-mio-blink': ('sprites/mio-blink.png', False), 's-rei': ('sprites/rei.png', False), 's-rei-blink': ('sprites/rei-blink.png', False),
    's-aoi': ('sprites/aoi.png', False), 's-kaori': ('sprites/kaori.png', False), 's-kuro': ('sprites/kuro.png', False),
}


def final(names):
    import shutil
    fd = os.path.join(ART, 'final')
    os.makedirs(fd, exist_ok=True)
    need_depth = []
    for n in names or FINAL:
        src, dep = FINAL[n]
        if src == 'BASEMENT':  # the approved basement office (option 2), upscaled 2x without repainting
            src_p = os.path.join(ART, 'basement-up.png')
            if not os.path.exists(src_p):
                upscale(os.path.join(ROOT, 'art', 'production', 'O', 'office-basement-502.png'), src_p)
        else:
            src_p = os.path.join(ART, src)
        if not os.path.exists(src_p):
            print('missing', n, src_p); continue
        dst = os.path.join(fd, n + '.png')
        shutil.copy(src_p, dst)
        if dep:
            need_depth.append(dst)
    if need_depth:
        depth(need_depth)
    if 'cabin' in (names or FINAL) and os.path.exists(os.path.join(fd, 'cabin.png')):
        window_mask(os.path.join(fd, 'cabin.png'))


def window_mask(path):
    """Cut the windows out of the carriage plate (far depth + bright sky/sea colour) so the moving bay view shows through."""
    src = os.path.join(ART, FINAL[os.path.basename(path)[:-4]][0])
    im = Image.open(src).convert('RGB')
    d = np.asarray(Image.open(path[:-4] + '-d.png').convert('L').resize(im.size)).astype(np.float32) / 255
    a = np.asarray(im).astype(np.float32) / 255
    far = d < 0.2
    xs = np.linspace(0, 1, im.width)[None, :].repeat(im.height, 0)
    far &= (xs < 0.36) | (xs > 0.64)   # keep the front window (sun ahead) as painted
    m = far.astype(np.uint8) * 255
    mi = Image.fromarray(m).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(1.2))
    alpha = Image.fromarray(255 - np.asarray(mi))
    out = im.copy(); out.putalpha(alpha)
    out.save(path)
    Image.fromarray(np.asarray(mi)).save(path[:-4] + '-winmask.png')
    print('window mask', path, flush=True)


def web():
    src = os.path.join(ART, 'final')
    out = os.path.join(ROOT, 'proto2', 'opening', 'img')
    os.makedirs(os.path.join(out, 'lite'), exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.png'))):
        n = os.path.basename(f)[:-4]
        if n.endswith('-winmask'):
            continue
        im = Image.open(f)
        isdepth = n.endswith('-d')
        maxw = 1024 if isdepth else (2600 if not n.startswith('s-') else 1800)
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        q = 80 if isdepth else 86
        if isdepth:
            im = im.convert('L').convert('RGB')
        im.save(os.path.join(out, n + '.webp'), 'WEBP', quality=q, method=6)
        lw = max(1, im.width // 2)
        im.resize((lw, round(im.height * lw / im.width)), Image.LANCZOS).save(os.path.join(out, 'lite', n + '.webp'), 'WEBP', quality=q, method=6)
        print('web', n, im.size, flush=True)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'upscale':
        upscale(sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 2.0)
    elif cmd == 'sprites':
        d = os.path.join(ART, 'sprites')
        os.makedirs(d, exist_ok=True)
        for k in (sys.argv[2:] or SPRITES):
            up = os.path.join(d, f'{k}-up.png')
            if not os.path.exists(up):
                upscale(os.path.join(ROOT, SPRITES[k]), up)
                print('up', k, flush=True)
            cut = os.path.join(d, f'{k}.png')
            if not os.path.exists(cut):
                cutout(up, cut)
                print('cut', k, flush=True)
    elif cmd == 'variant':
        # variant <eye frame png> <base cutout png> <out png>: same geometry as the base sprite, so reuse its alpha
        src, cut, dst = sys.argv[2:5]
        up = dst[:-4] + '-up.png'
        upscale(src, up)
        im = Image.open(up).convert('RGB')
        a = Image.open(cut).getchannel('A').resize(im.size, Image.LANCZOS)
        im.putalpha(a)
        im.save(dst)
        print('variant', dst, flush=True)
    elif cmd == 'depth':
        depth(sys.argv[2:])
    elif cmd == 'web':
        web()
    elif cmd == 'final':
        final(sys.argv[2:])
    elif cmd == 'winmask':
        window_mask(sys.argv[2])
