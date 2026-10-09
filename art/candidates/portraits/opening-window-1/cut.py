"""Cut-outs for opening-window-1 (CPU): BiRefNet-HR matting, then tools/matte_refine.py, with Mio's glasses frame forced
solid (--opaque, art/PROMPTS.md "Mio's glasses"). Writes <name>-cut.webp (RGBA, full resolution) here.
Usage: python3 cut.py <name> ...   (names as in prompts.json: eric-ipa-4101, miophone-i2i-4201, look-...)"""
import os, sys, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(ROOT, 'art/production/opening-window-1')
CUT = os.path.join(RAW, 'cut')


def source(name):
    for suffix in ('-glasses.png', '-final.png', '.png'):
        p = os.path.join(RAW, name + suffix)
        if os.path.exists(p) and not (suffix == '.png' and os.path.exists(os.path.join(RAW, name + '-final.png'))):
            return p
    raise FileNotFoundError(name)


def opaque(name):
    """The frame mask on the source canvas, or None (Eric: his frame is not masked here)."""
    import re
    mt = re.search(r'miophone-(?:ipa|i2i|ipa3q)-\d+', name)
    base = mt.group(0) if mt else name
    p = os.path.join(RAW, base + '-frame.png')
    if os.path.exists(p):
        return p
    if base.startswith('miophone-i2i-'):
        out = os.path.join(RAW, 'mio-phone-frame.png')
        if not os.path.exists(out):   # made with ~/ai/sd/venv/bin/python (numpy, scipy)
            sys.path.insert(0, HERE)
            import gen
            Image.fromarray((gen.mio_phone_frame() * 255).astype('uint8')).save(out)
        return out
    return None


def cut(names):
    os.makedirs(CUT, exist_ok=True)
    srcs = {n: source(n) for n in names}
    # rmbg names outputs after the input file; copy each source under its round name first
    ins = []
    for n, s in srcs.items():
        p = os.path.join(CUT, n + '-src.png')
        Image.open(s).convert('RGB').save(p)
        ins.append(p)
    todo = [p for n, p in zip(names, ins) if not os.path.exists(os.path.join(CUT, 'model', n + '-src.png'))
            or os.path.getmtime(os.path.join(CUT, 'model', n + '-src.png')) < os.path.getmtime(srcs[n])]
    if todo:
        subprocess.run(['python3', os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'birefnet-hr-matting', *todo, '--out',
                        os.path.join(CUT, 'model'), '--overwrite'], check=True)
    for n in names:
        src = os.path.join(CUT, n + '-src.png')
        model = os.path.join(CUT, 'model', n + '-src.png')
        ref = os.path.join(CUT, n + '-refined.png')
        cmd = [os.path.expanduser('~/ai/rmbg/rembg/bin/python'), os.path.join(ROOT, 'tools/matte_refine.py'), src, model, ref]
        op = opaque(n)
        if op:
            cmd += ['--opaque', op]
        subprocess.run(cmd, check=True)
        Image.open(ref).save(os.path.join(HERE, n + '-cut.webp'), quality=92, method=6)
        print('cut', n, '(frame solid)' if op else '', flush=True)


if __name__ == '__main__':
    cut(sys.argv[1:])

# Eric, eric-flip-4103: the far lens (his left, image right) overhangs the background and the matte made its frame
# partly see-through (imgqa matte frame 0.44). RAW/eric-flip-4103-frame.png is that lens and frame, drawn by hand as a
# polygon on the 1024x1152 render: (733,341) (818,357) (822,371) (806,409) (766,410) (738,383).
