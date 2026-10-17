"""vace-cut: a VACE clip of a cut-out portrait (rendered on its plain background) back to a cut-out loop at the game
file's size: crop the padding, scale to the game picture's size, cut out every frame (rembg ISNet anime, then
tools/matte_refine.py on the known plain background, CPU), and encode the loop as VP9 with alpha.

  ~/ai/sd/venv/bin/python tools/characters/steps/vace_cut.py pingpong <out dir> [--fps 16] [--crf 30]
      out dir-pingpong.webm: the cut frames forward and back (0..n-1, n-2..1), a loop with no seam by construction
  ~/ai/sd/venv/bin/python tools/characters/steps/vace_cut.py <frames dir> <out dir> --crop x0,y0,x1,y1 --size W,H
          [--fps 16] [--drop-last] [--crf 30] [--jobs 8] [--opaque-region region.png]
      out dir/src/%05d.png (cropped, scaled), out dir/isnet/, out dir/cut/%05d.png (RGBA), out dir.webm (the loop)
      --drop-last: leave out the clip's last frame (it repeats frame 0 when the clip was pinned at both ends).
      --opaque-region: where a thin solid part can be in any frame (Mio's glasses frame, grown by the motion), at the
      game size; in each frame its frame-coloured pixels (the colour rule of tools/portrait_candidates.py
      mio_frame_mask) are kept solid (matte_refine --opaque), as for her approved cut-outs."""
import os, subprocess, sys, glob
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
REFINE_PY = os.path.expanduser('~/ai/rmbg/rembg/bin/python')


def opaque_mask(frame_png, region, out_png):
    import numpy as np
    from scipy import ndimage
    im = np.asarray(Image.open(frame_png).convert('RGB')).astype(float)
    v, sat = im.max(-1), im.max(-1) - im.min(-1)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    m = (v > 50) & (v < 175) & (r >= b) & (r >= g - 3) & (sat < 45) & region
    m = ndimage.binary_dilation(ndimage.binary_closing(m, iterations=1), iterations=1)
    Image.fromarray((m * 255).astype('uint8')).save(out_png)


def main(src, out, crop, size, fps=16, drop_last=False, crf=30, jobs=8, opaque_region=None):
    fs = sorted(glob.glob(os.path.join(src, '*.png')))
    if drop_last:
        fs = fs[:-1]
    for d in ('src', 'isnet', 'cut'):
        os.makedirs(os.path.join(out, d), exist_ok=True)
    for i, f in enumerate(fs):
        Image.open(f).convert('RGB').crop(crop).resize(size, Image.LANCZOS).save(os.path.join(out, 'src', f'{i:05d}.png'))
    subprocess.run(['python3', os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'isnet-anime',
                    '--overwrite', os.path.join(out, 'src'), '--out', os.path.join(out, 'isnet')], check=True, stdout=subprocess.DEVNULL)

    region = None
    if opaque_region:
        import numpy as np
        region = np.asarray(Image.open(opaque_region).convert('L')) > 127
        os.makedirs(os.path.join(out, 'opaque'), exist_ok=True)

    def refine(i):
        n = f'{i:05d}.png'
        extra = []
        if region is not None:
            opaque_mask(os.path.join(out, 'src', n), region, os.path.join(out, 'opaque', n))
            extra = ['--opaque', os.path.join(out, 'opaque', n)]
        subprocess.run([REFINE_PY, os.path.join(ROOT, 'tools/matte_refine.py'), os.path.join(out, 'src', n),
                        os.path.join(out, 'isnet', n), os.path.join(out, 'cut', n), *extra], check=True, stdout=subprocess.DEVNULL)
    with ThreadPoolExecutor(jobs) as ex:
        list(ex.map(refine, range(len(fs))))
    os.makedirs(os.path.join(out, 'trimap'), exist_ok=True)  # matte_refine writes a trimap beside each cut-out
    for f in glob.glob(os.path.join(out, 'cut', '*-trimap.png')):
        os.replace(f, os.path.join(out, 'trimap', os.path.basename(f)))
    webm = out.rstrip('/') + '.webm'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(out, 'cut', '%05d.png'),
                    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', str(crf), '-auto-alt-ref', '0',
                    '-row-mt', '1', webm], check=True)
    print(webm, len(fs), 'frames', os.path.getsize(webm), 'bytes')


def pingpong(out, fps=16, crf=30):
    fs = sorted(f for f in glob.glob(os.path.join(out, 'cut', '*.png')) if os.path.basename(f)[:-4].isdigit())
    seq = fs + fs[-2:0:-1]
    lst = os.path.join(out, 'pingpong.txt')
    with open(lst, 'w') as fh:
        for f in seq:
            fh.write(f"file '{os.path.abspath(f)}'\nduration {1 / fps}\n")
    webm = out.rstrip('/') + '-pingpong.webm'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-r', str(fps), '-c:v', 'libvpx-vp9',
                    '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', str(crf), '-auto-alt-ref', '0', '-row-mt', '1', webm], check=True)
    print(webm, len(seq), 'frames', os.path.getsize(webm), 'bytes')


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'pingpong':
        o = dict(zip(a[2::2], a[3::2]))
        pingpong(a[1], int(o.get('--fps', 16)), int(o.get('--crf', 30)))
        sys.exit()
    if len(a) < 2:
        raise SystemExit(__doc__)
    o = {}
    pos = []
    i = 0
    while i < len(a):
        if a[i] == '--drop-last':
            o['drop_last'] = True
            i += 1
        elif a[i].startswith('--'):
            o[a[i][2:]] = a[i + 1]
            i += 2
        else:
            pos.append(a[i])
            i += 1
    main(pos[0], pos[1], tuple(int(v) for v in o['crop'].split(',')), tuple(int(v) for v in o['size'].split(',')),
         int(o.get('fps', 16)), o.get('drop_last', False), int(o.get('crf', 30)), int(o.get('jobs', 8)), o.get('opaque-region'))
