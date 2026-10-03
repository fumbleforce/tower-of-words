"""rei-body-1: cut out each extended render and put the picked cut-out's own pixels back on top.

For each id (e.g. b-s11): the full-size composite art/production/PC/rei-body-1/<id>.png is cut out (isnet-anime, then
tools/matte_refine.py, the skill's matte steps), then the picked cut-out art/candidates/portraits/rei-portrait-1/
rei-i65-2102-cut.webp (896x1152, matte check 0 holes) is pasted over the top: rows above the job's blend row are
exactly that cut-out (colour and alpha), the blend rows fade into the new one. Output here: <id>-cut.webp (full size,
896x1408) and <id>-game.webp (scaled so her face is the cast's 169 px, as rei-portrait-1/post.py 'game' did: 0.5951).

Run: ~/ai/rmbg/rembg/bin/python cut.py <id> [id ...]"""
import sys, os, json, subprocess
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(ROOT, 'art/production/PC/rei-body-1')
PICKED = os.path.join(ROOT, 'art/candidates/portraits/rei-portrait-1/rei-i65-2102-cut.webp')
SCALE = json.load(open(os.path.join(ROOT, 'art/candidates/portraits/rei-portrait-1/game-canvas.json')))['rei-i65-2102']['scale']


def blend_of(i):
    log = {e['id']: e for e in json.load(open(os.path.join(HERE, 'prompts.json')))}
    return log[i]['blend']


def cut(i):
    src = os.path.join(RAW, f'{i}.png')
    cdir = os.path.join(RAW, 'cut')
    os.makedirs(cdir, exist_ok=True)
    model = os.path.join(cdir, f'{i}.png')
    if not os.path.exists(model):
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools/rmbg_local.py'), '--method', 'isnet-anime', src, '--out', cdir], check=True)
    ref = os.path.join(cdir, f'{i}-ref.png')
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools/matte_refine.py'), src, model, ref], check=True)
    old = np.asarray(Image.open(PICKED).convert('RGBA')).astype(float)
    new = np.asarray(Image.open(ref).convert('RGBA')).astype(float)
    y0, n = blend_of(i)
    h0 = old.shape[0]
    t = np.zeros((h0, 1, 1))
    t[:y0] = 1
    t[y0:y0 + n] = np.linspace(1, 0, n)[:, None, None]
    out = new.copy()
    out[:h0] = old * t + new[:h0] * (1 - t)
    im = Image.fromarray(out.round().clip(0, 255).astype('uint8'), 'RGBA')
    im.save(os.path.join(HERE, f'{i}-cut.webp'), 'WEBP', lossless=True)
    g = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
    g.save(os.path.join(HERE, f'{i}-game.webp'), 'WEBP', lossless=True)
    same = np.abs(out[:y0] - old[:y0]).max()
    print(i, 'cut', im.size, 'game', g.size, '| max change vs picked cut-out above the blend:', same, flush=True)


if __name__ == '__main__':
    for i in sys.argv[1:]:
        cut(i)
