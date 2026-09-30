"""kenji-expressions-1: cut out and frame every attempt for the game canvas, plus the review sheets.

One cut-out for all faces, as in eric-expressions-1: h4 cut with BiRefNet-HR matting and tools/matte_refine.py, the desk
things at the bottom left (pen pot, books, keyboard edge) cleared from the matte. For each repaint only the face pixels
inside the repaint polygon, where h4's cut-out is solid, are swapped in, so outline and hair edges are identical across faces.

Framing: the 597x768 canvas the other cast portraits use. h4's detected face box (imgutils, [322, 167, 570, 425]) is scaled
to 168 px high (mio 169, mori 167, the old kenji 161), its centre x to 300 and its bottom to y 335. The render's right
edge falls at canvas x ~593, so his left arm (image right) ends in the canvas edge, as the render does.

Run: ~/ai/rmbg/rembg/bin/python art/candidates/portraits/kenji-expressions-1/post.py
Needs art/production/PC/kenji-expr1/h4-refined.png (matte_refine output of the h4 cut-out)."""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, HERE)
from gen import POLY, RAW, BASE

W, H = 597, 768
FB = (322, 167, 570, 425)                     # h4 face box (imgutils detect_faces)
S = 168 / (FB[3] - FB[1])
L = (FB[0] + FB[2]) / 2 - 300 / S
T = FB[3] - 335 / S
BOX = (L, T, L + W / S, T + H / S)
CLEAR = [(0, 780, 50, 1152), (0, 1010, 160, 1152), (140, 1100, 240, 1152)]   # desk things, source coords
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)


def place(rgba):
    """Source RGBA (896x1152) -> the 597x768 game canvas, transparent outside the render."""
    pad = 200
    big = Image.new('RGBA', (rgba.width + 2 * pad, rgba.height + 2 * pad), (0, 0, 0, 0))
    big.paste(rgba, (pad, pad))
    box = tuple(v + pad for v in BOX)
    return big.convert('RGBa').resize((W, H), Image.LANCZOS, box=box).convert('RGBA')


def base_cut():
    ref = Image.open(os.path.join(RAW, 'h4-refined.png')).convert('RGBA')
    a = np.asarray(ref).copy()
    for x0, y0, x1, y1 in CLEAR:
        a[y0:y1, x0:x1, 3] = 0
    return Image.fromarray(a, 'RGBA')


def face_swap(ref, src_png):
    new = Image.open(src_png).convert('RGB')
    pm = Image.new('L', ref.size, 0)
    ImageDraw.Draw(pm).polygon(POLY, fill=255)
    feather = np.asarray(pm.filter(ImageFilter.GaussianBlur(3)))
    solid = ndimage.binary_erosion(np.asarray(ref)[..., 3] == 255, iterations=1)
    w = Image.fromarray((feather * solid).astype(np.uint8))
    full = Image.composite(new, ref.convert('RGB'), w).convert('RGBA')
    full.putalpha(ref.getchannel('A'))
    return full


def over(img, bg):
    b = Image.new('RGB', img.size, bg)
    b.paste(img, (0, 0), img)
    return b


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, im.width, 28), fill=(0, 0, 0))
    d.text((8, 4), text, fill=(255, 255, 255), font=FONT)
    return im


def main():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    ref = base_cut()
    items = [('g0-h4', ref)] + [(n, face_swap(ref, os.path.join(RAW, f'kenji-{n}.png'))) for n in log]
    framed = {}
    for n, full in items:
        full.save(os.path.join(RAW, f'kenji-{n}-cut-full.png'))
        fin = place(full)
        fin.save(os.path.join(HERE, f'kenji-{n}.webp'), 'WEBP', quality=90, method=6)
        fin.save(os.path.join(RAW, f'kenji-{n}-597.png'))
        framed[n] = fin
    # every attempt in order, h4 first: face close-ups (source coords) and the framed cut-outs on the dark game colour
    cols, t = 6, 300
    rows = (len(items) + cols - 1) // cols
    faces = Image.new('RGB', (cols * t, rows * (t + 30)), (245, 245, 245))
    game = Image.new('RGB', (cols * 300, rows * (386 + 30)), (18, 20, 28))
    d1, d2 = ImageDraw.Draw(faces), ImageDraw.Draw(game)
    for i, (n, full) in enumerate(items):
        x, y = (i % cols), (i // cols)
        src = Image.open(BASE if n == 'g0-h4' else os.path.join(RAW, f'kenji-{n}.png')).convert('RGB')
        faces.paste(src.crop((300, 130, 600, 430)).resize((t, t), Image.LANCZOS), (x * t, y * (t + 30) + 30))
        d1.text((x * t + 6, y * (t + 30) + 5), f'{i + 1}. {n}', fill=(20, 20, 20), font=FONT)
        g = over(framed[n], (18, 20, 28)).resize((300, 386), Image.LANCZOS)
        game.paste(g, (x * 300, y * 416 + 30))
        d2.text((x * 300 + 6, y * 416 + 5), f'{i + 1}. {n}', fill=(230, 230, 230), font=FONT)
    faces.save(os.path.join(HERE, 'all-attempts-faces.webp'), 'WEBP', quality=88)
    game.save(os.path.join(HERE, 'all-attempts-framed.webp'), 'WEBP', quality=88)
    # per attempt: h4 | attempt, framed, at game size, for the review cards
    for n, fin in framed.items():
        pair = Image.new('RGB', (W * 2 + 12, H), (18, 20, 28))
        pair.paste(over(framed['g0-h4'], (18, 20, 28)), (0, 0))
        pair.paste(over(fin, (18, 20, 28)), (W + 12, 0))
        label(pair, f'h4 (picked)                         {n}')
        pair.save(os.path.join(HERE, f'pair-{n}.webp'), 'WEBP', quality=90)
        # the face close up, from the full-size render: h4 | attempt
        src = Image.open(BASE if n == 'g0-h4' else os.path.join(RAW, f'kenji-{n}.png')).convert('RGB')
        h4 = Image.open(BASE).convert('RGB')
        z = Image.new('RGB', (450 * 2 + 12, 450), (18, 20, 28))
        z.paste(h4.crop((300, 130, 600, 430)).resize((450, 450), Image.LANCZOS), (0, 0))
        z.paste(src.crop((300, 130, 600, 430)).resize((450, 450), Image.LANCZOS), (462, 0))
        label(z, f'face: h4 | {n}')
        z.save(os.path.join(HERE, f'face-{n}.webp'), 'WEBP', quality=90)
    print('box', [round(v, 2) for v in BOX], 'scale', round(S, 5), len(items), 'attempts')


if __name__ == '__main__':
    main()
