"""cast-faces-1: cut-outs, face swaps, game framing and sheets.

One cut-out per base (BiRefNet-HR matting, then tools/matte_refine.py; Mori's and Hamada's are the npc-base-1 ones of the
same renders). For each face only the repainted pixels inside the repaint oval, where the base's cut-out is solid, are
swapped in, so outline, hair and clothes are identical across a person's faces. Eric's glasses frame is pasted back from
the base on top (frame-eric.png, by colour inside the glasses band).

Framing: the 597x768 canvas and the face-box rule of kenji-expressions-1 and npc-base-1: the detected face box scaled to
168 px high, its centre x at 300 and its bottom at y 335. Eric keeps his approved canvas (648x768, face 25% bigger,
reviews/eric-portrait-final-3 and eric-canvas-1): his render is his game canvas at 1.5x, so it maps straight back.

Run: ~/ai/rmbg/rembg/bin/python post.py"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen import RAW, BASE, oval, fixed_base, FACES

W, H, FACE_H, CX, CHIN = 597, 768, 168, 300, 335
DARK = (18, 20, 28)
FONT = ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf', 18)
ORDER = ['eric', 'kenji', 'emi', 'aoi', 'guard', 'mori', 'hamada']
NEUTRAL = {w: [] for w in ORDER}


def ref_cut(who):
    return Image.open(os.path.join(RAW, f'{who}-refined.png')).convert('RGBA')


def place(who, rgba):
    if who == 'eric':
        return rgba.crop((0, 0, 972, 1152)).convert('RGBa').resize((648, 768), Image.LANCZOS).convert('RGBA')
    fb = BASE[who]['box']
    s = FACE_H / (fb[3] - fb[1])
    L = (fb[0] + fb[2]) / 2 - CX / s
    T = fb[3] - CHIN / s
    pad = 400
    big = Image.new('RGBA', (rgba.width + 2 * pad, rgba.height + 2 * pad), (0, 0, 0, 0))
    big.paste(rgba, (pad, pad))
    box = (L + pad, T + pad, L + pad + W / s, T + pad + H / s)
    return big.convert('RGBa').resize((W, H), Image.LANCZOS, box=box).convert('RGBA')


def face_swap(who, ref, png):
    new = Image.open(png).convert('RGB')
    pm = Image.new('L', ref.size, 0)
    ImageDraw.Draw(pm).ellipse(oval(who), fill=255)
    feather = np.asarray(pm.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    solid = ndimage.binary_erosion(np.asarray(ref)[..., 3] == 255, iterations=1)
    w = Image.fromarray((feather * solid).astype(np.uint8))
    out = Image.composite(new, ref.convert('RGB'), w)
    if who == 'eric':   # the frame stays the base's
        fm = Image.open(os.path.join(RAW, 'frame-eric.png')).convert('L').filter(ImageFilter.GaussianBlur(0.7))
        out = Image.composite(Image.open(fixed_base(who)).convert('RGB'), out, fm)
    out = out.convert('RGBA')
    out.putalpha(ref.getchannel('A'))
    return out


def over(img, bg=DARK):
    b = Image.new('RGB', img.size, bg)
    b.paste(img, (0, 0), img)
    return b


def main():
    log = json.load(open(os.path.join(HERE, 'prompts.json')))
    attempts = {w: [] for w in ORDER}          # (name, framed RGBA, full RGBA source-canvas)
    for who in ORDER:
        if not os.path.exists(os.path.join(RAW, f'{who}-refined.png')):
            continue
        ref = ref_cut(who)
        attempts[who].append(('neutral', place(who, ref), ref))
        for name, e in log.items():
            if e.get('kind') == 'face' and e['who'] == who and os.path.exists(os.path.join(RAW, name + '.png')):
                full = face_swap(who, ref, os.path.join(RAW, name + '.png'))
                attempts[who].append((name, place(who, full), full))
    for who, items in attempts.items():
        if not items:
            continue
        for n, fin, full in items:
            fin.save(os.path.join(RAW, f'{who}-{n}-framed.png'))
            fin.save(os.path.join(HERE, f'{who}-{n}.webp'), 'WEBP', quality=90, method=6)
        # every attempt in order: framed on the game colour, and the face close-up from the source canvas
        cols, tw, th = 5, 300, 386
        rows = (len(items) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * tw, rows * (th + 30)), DARK)
        faces = Image.new('RGB', (cols * tw, rows * (tw + 30)), (245, 245, 245))
        d1, d2 = ImageDraw.Draw(sheet), ImageDraw.Draw(faces)
        b = BASE[who]['box']
        cx, cy, s = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2, max(b[2] - b[0], b[3] - b[1]) * 0.62
        for i, (n, fin, full) in enumerate(items):
            x, y = i % cols, i // cols
            g = over(fin)
            g.thumbnail((tw, th), Image.LANCZOS)
            sheet.paste(g, (x * tw, y * (th + 30) + 30))
            d1.text((x * tw + 6, y * (th + 30) + 5), f'{i + 1}. {n}', fill=(230, 230, 230), font=FONT)
            fc = over(full, (215, 220, 226)).crop((int(cx - s), int(cy - s), int(cx + s), int(cy + s))).resize((tw, tw), Image.LANCZOS)
            faces.paste(fc, (x * tw, y * (tw + 30) + 30))
            d2.text((x * tw + 6, y * (tw + 30) + 5), f'{i + 1}. {n}', fill=(20, 20, 20), font=FONT)
        sheet.save(os.path.join(HERE, f'attempts-{who}.webp'), 'WEBP', quality=88)
        faces.save(os.path.join(HERE, f'faces-{who}.webp'), 'WEBP', quality=88)
        print(who, len(items), 'attempts')


if __name__ == '__main__':
    main()
