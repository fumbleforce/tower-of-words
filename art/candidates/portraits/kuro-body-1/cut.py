"""kuro-body-1: cut out each candidate and put the installed portrait's own pixels back on top.

For each id (e.g. a-s11): the full-size composite art/production/KB/<id>.png is cut out (isnet-anime, then
tools/matte_refine.py), scaled to game size (630 wide, 809 rows for the old part, as kuro-neutral.webp was), and then
the installed game3d/assets/portraits/kuro-neutral.webp is pasted over the top: rows above BLEND px from its bottom are
exactly the installed file (colour and alpha), the BLEND rows blend into the new cut-out. Output <id>-cut.webp here.

Run: ~/ai/rmbg/rembg/bin/python cut.py <id> [id ...]"""
import sys, os, subprocess
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
WT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = '/home/jorgen/repo/japanese/art/production/KB'
INSTALLED = os.path.join(WT, 'game3d/assets/portraits/kuro-neutral.webp')
BLEND = 10


def cut(i):
    src = os.path.join(RAW, f'{i}.png')
    cdir = os.path.join(RAW, 'cut')
    os.makedirs(cdir, exist_ok=True)
    model = os.path.join(cdir, f'{i}.png')
    if not os.path.exists(model):
        subprocess.run([sys.executable, os.path.join(WT, 'tools/rmbg_local.py'), '--method', 'isnet-anime', src, '--out', cdir], check=True)
    ref = os.path.join(cdir, f'{i}-ref.png')
    subprocess.run([sys.executable, os.path.join(WT, 'tools/matte_refine.py'), src, model, ref], check=True)
    inst = Image.open(INSTALLED).convert('RGBA')
    w, h0 = inst.size
    full = Image.open(ref).convert('RGBA')
    gh = h0 + round((full.height - 1408) * h0 / 1408)
    new = np.asarray(full.resize((w, gh), Image.LANCZOS)).astype(float)
    old = np.asarray(inst).astype(float)
    out = new.copy()
    t = np.ones((h0, 1, 1))
    t[h0 - BLEND:] = np.linspace(1, 0, BLEND)[:, None, None]
    out[:h0] = old * t + new[:h0] * (1 - t)
    Image.fromarray(out.round().clip(0, 255).astype('uint8'), 'RGBA').save(os.path.join(HERE, f'{i}-cut.webp'), 'WEBP', lossless=True)
    same = np.abs(out[:h0 - BLEND] - old[:h0 - BLEND]).max()
    print(i, 'cut', (w, gh), '| max change vs installed above the blend rows:', same, flush=True)


if __name__ == '__main__':
    for i in sys.argv[1:]:
        cut(i)
